import prisma from "../lib/prisma.js";

async function recalculateStandings(turneuId){
    // 1. Get all matches for this tournament that have a result
    const matches = await prisma.matches.findMany({
        where: {
            turneu_id: turneuId,
            matchresults: {isNot: null},
        },
        include: {
            matchresults: true
        },
    }); 

    // 2. Build a stats map: ekipi_id -> { stats }

    const statsMap = new Map();

    const getOrCreate = (ekipiId) => {
        if(!statsMap.has(ekipiId)) {
            statsMap.set(ekipiId, {
                ndeshjet_luajtura: 0,
                fitoret: 0,
                barazimet: 0,
                humbjet: 0,
                golat_shenuar: 0,
                golat_pranuar: 0,
                piket: 0,
            });
        }
        return statsMap.get(ekipiId);
    };

    // 3. Loop through each match and update both teams' stats

    for(const match of matches){
        const result = match.matchresults;
        if(!result) continue;

        const homeId = match.ekipi_shtepiak_id;
        const awayId = match.ekipi_mysafir_id;
        const homeGoals = result.golat_shtepiak;
        const awayGoals = result.golat_mysafir;

        const homeStats = getOrCreate(homeId);
        const awayStats = getOrCreate(awayId);

        // Both played a match
        homeStats.ndeshjet_luajtura += 1;
        awayStats.ndeshjet_luajtura += 1;

        homeStats.golat_shenuar += homeGoals;
        homeStats.golat_pranuar += awayGoals;
        awayStats.golat_shenuar += awayGoals;
        awayStats.golat_pranuar += homeGoals;

        // Determine Win/Loss/Draw for both

        if(homeGoals > awayGoals){
            homeStats.fitoret += 1;
            awayStats.humbjet += 1;
        }else if(homeGoals < awayGoals){
            awayStats.fitoret += 1;
            homeStats.humbjet += 1;
        }else{
            homeStats.barazimet += 1;
            awayStats.barazimet += 1;
        }
    }

    // 4. Calculate points for each team

    for(const stats of statsMap.values()){
        stats.piket = (stats.fitoret * 3) + (stats.barazimet * 1);
    }

    // 5. Delete old standings for this tournament

    await prisma.standings.deleteMany({
        where: {
            turneu_id: turneuId,
        }
    });

    // 6. Create new standings rows

    const creates = [];

    for(const [ekipiId, stats] of statsMap.entries()){
        creates.push(
            prisma.standings.create({
                data: {
                    turneu_id: turneuId,
                    ekipi_id: ekipiId,
                    ...stats
                    
                },
            })
        );
    }

    await Promise.all(creates);
    
}

export default recalculateStandings;
