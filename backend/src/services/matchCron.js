import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { startSimulator } from "./matchSimulator.js";

const DEFAULT_MATCH_DURATION_MINUTES = 60;

function getDatePart(value) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function getTimePart(value) {
  if (!value) return "00:00:00";

  const text = value instanceof Date ? value.toISOString() : String(value);
  if (text.includes("T")) return text.slice(11, 19);

  return text.length === 5 ? `${text}:00` : text.slice(0, 8);
}

function getMatchStartTime(match) {
  const datePart = getDatePart(match.data_ndeshjes);
  if (!datePart) return null;

  const startTime = new Date(`${datePart}T${getTimePart(match.ora_fillimit)}`);
  return Number.isNaN(startTime.getTime()) ? null : startTime;
}

function getMatchDuration(match) {
  return Number.isInteger(match.kohezgjatja) && match.kohezgjatja > 0
    ? match.kohezgjatja
    : DEFAULT_MATCH_DURATION_MINUTES;
}

export function startMatchCron(io, simulatorMap) {
  cron.schedule("* * * * *", async () => {
    try {
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
        if (!startTime || startTime > now) continue;

        const updateResult = await prisma.matches.updateMany({
          where: { id: match.id, statusi: "Planifikuar" },
          data: { statusi: "Live" },
        });

        if (updateResult.count === 0) continue;

        await prisma.matchresults.upsert({
          where: { ndeshja_id: match.id },
          update: {},
          create: {
            ndeshja_id: match.id,
            golat_shtepiak: 0,
            golat_mysafir: 0,
          },
        });

        const players = await prisma.players.findMany({
          where: {
            ekipi_id: {
              in: [match.ekipi_shtepiak_id, match.ekipi_mysafir_id],
            },
          },
          select: {
            id: true,
            emri: true,
            mbiemri: true,
            ekipi_id: true,
          },
        });

        const cancelSimulator = startSimulator(
          io,
          match.id,
          players,
          getMatchDuration(match),
        );

        simulatorMap.set(match.id, cancelSimulator);

        io.emit("match_live", {
          matchId: match.id,
        });
      }

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

        if (startTime > now) {
          const updateResult = await prisma.matches.updateMany({
            where: { id: match.id, statusi: "Live" },
            data: { statusi: "Planifikuar" },
          });

          if (updateResult.count > 0) {
            const cancelSimulator = simulatorMap.get(match.id);
            if (cancelSimulator) {
              cancelSimulator();
              simulatorMap.delete(match.id);
            }
          }

          continue;
        }

        const finishTime = new Date(
          startTime.getTime() + getMatchDuration(match) * 60 * 1000,
        );

        if (finishTime > now) continue;

        const updateResult = await prisma.matches.updateMany({
          where: { id: match.id, statusi: "Live" },
          data: { statusi: "Përfunduar" },
        });

        if (updateResult.count === 0) continue;

        const cancelSimulator = simulatorMap.get(match.id);
        if (cancelSimulator) {
          cancelSimulator();
          simulatorMap.delete(match.id);
        }

        io.emit("match_finished", {
          matchId: match.id,
        });
      }
    } catch (err) {
      console.error("Match cron error:", err.message);
    }
  });
}
