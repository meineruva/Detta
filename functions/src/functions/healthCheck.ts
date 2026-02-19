import * as functions from "firebase-functions";
import * as crypto from "crypto";

let version = "unknown";
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require("../../package.json");
    version = pkg.version || "unknown";
} catch (e) {
    console.error("[healthCheck] Failed to load package.json:", e);
}

export const healthCheck = functions.https.onRequest((request, response) => {
    const secret = process.env.HEALTH_CHECK_SECRET;

    // 1. Check for Secret Config
    if (!secret) {
        response.status(503).json({ error: "Health check not configured" });
        return;
    }

    // 2. Parse Bearer Token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).json({ error: "Unauthorized" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];

    // 3. Timing Safe Comparison
    const secretBuffer = Buffer.from(secret);
    const tokenBuffer = Buffer.from(token);

    if (secretBuffer.length !== tokenBuffer.length) {
        response.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!crypto.timingSafeEqual(secretBuffer, tokenBuffer)) {
        response.status(401).json({ error: "Unauthorized" });
        return;
    }

    // 4. Success Response
    response.status(200).json({
        status: "ok",
        version: version,
        timestamp: new Date().toISOString()
    });
});
