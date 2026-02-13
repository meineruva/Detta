"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDay = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.closeDay = functions.https.onCall(async (data, context) => {
    // 1. Auth Check (Admin/Staff only)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    // Check whitelist or role
    const callerEmail = context.auth.token.email;
    if (!callerEmail) {
        throw new functions.https.HttpsError("unauthenticated", "Email required.");
    }
    const whitelistDoc = await db.collection("staffWhitelist").doc(callerEmail).get();
    if (!whitelistDoc.exists) {
        // Alternatively check custom claim role if set
        throw new functions.https.HttpsError("permission-denied", "Unauthorized.");
    }
    const now = new Date();
    const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const dateStr = wibTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const usersRef = db.collection("users");
    const attendanceRef = db.collection(`attendance/${dateStr}/records`);
    // Get all students
    const studentsSnap = await usersRef.where("role", "==", "student").get();
    const batch = db.batch();
    let batchCount = 0;
    let newAbsences = 0;
    const commitBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batchCount = 0;
        }
    };
    for (const studentDoc of studentsSnap.docs) {
        const userId = studentDoc.id;
        const recordDoc = await attendanceRef.doc(userId).get();
        if (!recordDoc.exists) {
            // Check for absence request (Excused) -> This logic could be complex, simplifying for now
            // Checking if there is an approved absence request is separate.
            // For now, mark as Absent if no record.
            const record = {
                userId,
                date: dateStr,
                timestamp: admin.firestore.Timestamp.now(),
                status: "Absent",
                source: "system",
                location: { lat: 0, lng: 0, accuracyM: null },
                wifi: { ssid: null, bssid: null },
                device: { osDeviceId: "system", deviceModel: "system", osVersion: "system", appVersion: "system" },
                flags: [],
                flagged: null,
                riskScore: null,
                audit: { ip: null, networkType: null }
            };
            batch.set(attendanceRef.doc(userId), record);
            batchCount++;
            newAbsences++;
        }
        if (batchCount >= 400)
            await commitBatch(); // Firestore batch limit is 500
    }
    // Update Summary with FLAT fields
    if (newAbsences > 0) {
        const summaryRef = db.doc(`attendance/${dateStr}/summary/daily`);
        batch.set(summaryRef, {
            absent: admin.firestore.FieldValue.increment(newAbsences),
            total: admin.firestore.FieldValue.increment(newAbsences),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        batchCount++;
    }
    await commitBatch();
    return { success: true, markedAbsent: newAbsences };
});
//# sourceMappingURL=closeDay.js.map