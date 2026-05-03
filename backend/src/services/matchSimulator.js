import prisma from "../lib/prisma.js";

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function startSimulator(io, matchId, players, kohezgjatja) {
  if (!players || players.length === 0) {
    return () => {};
  }

  const timeoutRef = {
    current: null,
  };

  async function tick() {
    const delay = (Math.floor(Math.random() * 3) + 3) * 60 * 1000;

    timeoutRef.current = setTimeout(async () => {
      try {
        const player = getRandomItem(players);
        const card = Math.random() < 0.8 ? "E verdhe" : "E kuqe";

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

        const datePart = match.data_ndeshjes.toISOString().slice(0, 10);
        const timePart = match.ora_fillimit
          ? match.ora_fillimit.toISOString().slice(11, 19)
          : "00:00:00";

        const startTime = new Date(`${datePart}T${timePart}`);
        const minuta = Math.floor((Date.now() - startTime.getTime()) / 60000);

        if (minuta < 0) {
          tick();
          return;
        }

        if (kohezgjatja && minuta > kohezgjatja) {
          return;
        }

        const event = await prisma.matchevents.create({
          data: {
            ndeshja_id: matchId,
            lojtari_id: player.id,
            ekipi_id: player.ekipi_id ?? null,
            lloji: card,
            minuta,
          },
        });

        io.emit("card_event", {
          matchId,
          eventId: event.id,
          playerId: player.id,
          playerName: `${player.emri} ${player.mbiemri}`,
          teamId: player.ekipi_id ?? null,
          card,
          minuta,
        });

        tick();
      } catch (err) {
        console.error("Match simulator error:", err.message);
        tick();
      }
    }, delay);
  }

  tick();

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}
