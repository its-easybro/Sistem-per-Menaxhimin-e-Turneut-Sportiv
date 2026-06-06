// Runs scheduled match status updates, result creation, socket notifications, and live match simulation.
import cron from "node-cron";
import prisma from "../lib/prisma.js";

const DEFAULT_MATCH_DURATION_MINUTES = 60;

// Extracts only the date part from a Date object or stored date string.
function getDatePart(value) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

// Extracts a HH:mm:ss time value, using midnight when no start time exists.
function getTimePart(value) {
  if (!value) return "00:00:00";

  const text = value instanceof Date ? value.toISOString() : String(value);
  if (text.includes("T")) return text.slice(11, 19);

  return text.length === 5 ? `${text}:00` : text.slice(0, 8);
}

// Combines the stored match date and time into one JavaScript Date.
function getMatchStartTime(match) {
  const datePart = getDatePart(match.data_ndeshjes);
  if (!datePart) return null;

  const startTime = new Date(`${datePart}T${getTimePart(match.ora_fillimit)}`);
  return Number.isNaN(startTime.getTime()) ? null : startTime;
}

// Uses the match duration if it is valid, otherwise falls back to the default.
function getMatchDuration(match) {
  return Number.isInteger(match.kohezgjatja) && match.kohezgjatja > 0
    ? match.kohezgjatja
    : DEFAULT_MATCH_DURATION_MINUTES;
}

// Runs every minute to move matches between Planned, Live, and Finished states.
export function startMatchCron(io) {
  cron.schedule("* * * * *", async () => {
    try {
      // Find planned matches that may need to become live.
      const plannedMatches = await prisma.matches.findMany({
        where: { statusi: "Planifikuar" },
        select: {
          id: true,
          data_ndeshjes: true,
          ora_fillimit: true,
          ekipi_shtepiak_id: true,
          ekipi_mysafir_id: true,
          kohezgjatja: true,
        },
      });

      const now = new Date();

      for (const match of plannedMatches) {
        const startTime = getMatchStartTime(match);
        // Leave the match planned until its start time arrives.
        if (!startTime || startTime > now) continue;

        // Update only if it is still planned, so duplicate cron runs do not conflict.
        const updateResult = await prisma.matches.updateMany({
          where: { id: match.id, statusi: "Planifikuar" },
          data: { statusi: "Live" },
        });

        if (updateResult.count === 0) continue;

        // Make sure every live match has an initial result row.
        await prisma.matchresults.upsert({
          where: { ndeshja_id: match.id },
          update: {},
          create: {
            ndeshja_id: match.id,
            golat_shtepiak: 0,
            golat_mysafir: 0,
          },
        });

        // Notify connected clients that this match is now live.
        io.emit("match_live", {
          matchId: match.id,
        });
      }

      // Find live matches that may need to be reverted or finished.
      const liveMatches = await prisma.matches.findMany({
        where: { statusi: "Live" },
        select: {
          id: true,
          data_ndeshjes: true,
          ora_fillimit: true,
          kohezgjatja: true,
        },
      });

      for (const match of liveMatches) {
        const startTime = getMatchStartTime(match);
        if (!startTime) continue;

        // If a live match was rescheduled into the future, move it back to planned.
        if (startTime > now) {
          const updateResult = await prisma.matches.updateMany({
            where: { id: match.id, statusi: "Live" },
            data: { statusi: "Planifikuar" },
          });

          if (updateResult.count > 0) {
            // Match is no longer live; no simulated events are running in normal app flow.
          }

          continue;
        }

        // Calculate when the match should finish based on start time and duration.
        const finishTime = new Date(
          startTime.getTime() + getMatchDuration(match) * 60 * 1000,
        );

        if (finishTime > now) continue;

        // Finish only matches that are still live at this moment.
        const updateResult = await prisma.matches.updateMany({
          where: { id: match.id, statusi: "Live" },
          data: { statusi: "Përfunduar" },
        });

        if (updateResult.count === 0) continue;

        // Notify connected clients that this match has finished.
        io.emit("match_finished", {
          matchId: match.id,
        });
      }
    } catch (err) {
      console.error("Match cron error:", err.message);
    }
  });
}
