import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Admin SDK
// Use applicationDefault() for auto-discovery of credentials
// Or use serviceAccount from env in dev if needed
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Local dev with specific service account
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Production / Default
    admin.initializeApp();
}

export const helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});
