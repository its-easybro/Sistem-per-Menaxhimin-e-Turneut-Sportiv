import cron from "node-cron"
import prisma from "../lib/prisma.js"

// Schedule a cron job to run daily at midnight to delete expired sessions
cron.schedule("0 0 * * *", async () => {
    console.log("Running session cleanup task")
    try {
        const res = await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        })
        console.log(`Successfully cleared ${res.count} expired sessions.`)
    } catch (err) {
        console.error("Session cleanup cron failed: ", err.message)
    }
})