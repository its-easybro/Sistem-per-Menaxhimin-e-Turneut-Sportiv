import prisma from "../lib/prisma.js";

// Picks a random player from the match players list.
function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

const DEFAULT_MAX_MATCH_MINUTES = 60;

// Starts a simple match simulator that creates random card events during a live match.
export function startSimulator(io, matchId, players, kohezgjatja) {
  // If there are no players, there is nothing to simulate.
  if (!players || players.length === 0) {
    return () => {};
  }

  const timeoutRef = {
    current: null,
  };

  async function tick() {
    // Wait 3 to 5 minutes before creating the next simulated event.
    const delay = (Math.floor(Math.random() * 3) + 3) * 60 * 1000;

    timeoutRef.current = setTimeout(async () => {
      try {
        // Randomly choose a player and decide whether the card is yellow or red.
        const player = getRandomItem(players);
        const card = Math.random() < 0.8 ? "E verdhe" : "E kuqe";

        // Read the latest match state so stopped matches do not keep receiving events.
        const match = await prisma.matches.findUnique({
          where: { id: matchId },
          select: {
            data_ndeshjes: true,
            ora_fillimit: true,
            statusi: true,
          },
        });

        if (!match || match.statusi !== "Live") {
          return;
        }

        // Build the match start time from the stored date and time fields.
        const datePart = match.data_ndeshjes.toISOString().slice(0, 10);
        const timePart = match.ora_fillimit
          ? match.ora_fillimit.toISOString().slice(11, 19)
          : "00:00:00";

        const startTime = new Date(`${datePart}T${timePart}`);
        const elapsedMinutes = Math.floor(
          (Date.now() - startTime.getTime()) / 60000,
        );

        // If the match has not started yet, schedule another check later.
        if (elapsedMinutes < 0) {
          tick();
          return;
        }

        // Use the configured match duration when valid, otherwise use the default.
        const maxMinute =
          Number.isInteger(kohezgjatja) && kohezgjatja > 0
            ? kohezgjatja
            : DEFAULT_MAX_MATCH_MINUTES;

        // Stop creating events after the match duration has passed.
        if (elapsedMinutes > maxMinute) {
          return;
        }

        const minuta = Math.min(elapsedMinutes, maxMinute);

        // Save the simulated card event in the database.
        const event = await prisma.matchevents.create({
          data: {
            ndeshja_id: matchId,
            lojtari_id: player.id,
            ekipi_id: player.ekipi_id ?? null,
            lloji: card,
            minuta,
          },
        });

        // Notify connected clients so the UI updates in real time.
        io.emit("card_event", {
          matchId,
          eventId: event.id,
          playerId: player.id,
          playerName: `${player.emri} ${player.mbiemri}`,
          teamId: player.ekipi_id ?? null,
          card,
          minuta,
        });

        // Schedule the next simulated event.
        tick();
      } catch (err) {
        console.error("Match simulator error:", err.message);
        // Keep the simulator running even if one event fails.
        tick();
      }
    }, delay);
  }

  tick();

  // Return a cleanup function so callers can stop the simulator.
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}
