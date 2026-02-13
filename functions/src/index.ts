import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
    admin.initializeApp();
}

export * from './functions/submitAttendance';
export * from './functions/closeDay';
export * from './functions/reviewAbsence';
export * from './functions/bulkImportStudents';

export const helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});
