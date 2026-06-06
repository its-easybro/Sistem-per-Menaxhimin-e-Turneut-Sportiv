// Defines request rate limiting middleware to protect API endpoints from excessive traffic.
import rateLimit from "express-rate-limit"

// API limiter
export const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 2000000, // 200 requests per 10 min
    message: { message: "Too many requests, please try again later."},
    standardHeaders: true,
    legacyHeaders: false
})

export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 10, // 10 requests per 10 min
    message: { message: "Too many requests, please try again later."},
    standardHeaders: true,
    legacyHeaders: false
})

export const forgotPwLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: { message: "Too many password reset attempts, please try again later."},
    standardHeaders: true,
    legacyHeaders: false
})
