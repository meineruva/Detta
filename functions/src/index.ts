import * as admin from "firebase-admin";

// Initialize Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
    admin.initializeApp();
}

export * from "./functions/analyzeCheckIn";
export * from "./functions/bulkImportStudents";
export * from "./functions/closeDay";
export * from "./functions/healthCheck";
export * from "./functions/manageStaff";
export * from "./functions/manualOverrideAttendance";
export * from "./functions/resetStudentDevice";
export * from "./functions/reviewAbsence";
export * from "./functions/reviewFlaggedCheckIn";
export * from "./functions/setStaffClaims";
export * from "./functions/submitAttendance";
