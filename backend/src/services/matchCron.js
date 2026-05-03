import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { startSimulator } from "./matchSimulator.js";

export function startMatchCron(io, simulatorMap) {
  cron.schedule("* * * * *", async () => {
    try {
      const toLive = await prisma.$queryRaw`
        UPDATE matches
        SET statusi = 'Live'
        WHERE statusi = 'Planifikuar'
          AND (data_ndeshjes + COALESCE(ora_fillimit, TIME '00:00:00')) <= NOW()
        RETURNING id, ekipi_shtepiak_id, ekipi_mysafir_id, kohezgjatja
      `;

      for (const match of toLive) {
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
          match.kohezgjatja,
        );

        simulatorMap.set(match.id, cancelSimulator);

        io.emit("match_live", {
          matchId: match.id,
        });
      }

      const toFinished = await prisma.$queryRaw`
        UPDATE matches
        SET statusi = 'Përfunduar'
        WHERE statusi = 'Live'
          AND kohezgjatja IS NOT NULL
          AND (
            data_ndeshjes
            + COALESCE(ora_fillimit, TIME '00:00:00')
            + (kohezgjatja || ' minutes')::INTERVAL
          ) <= NOW()
        RETURNING id
      `;

      for (const match of toFinished) {
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
