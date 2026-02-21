"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDay = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const date_fns_tz_1 = require("date-fns-tz");
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
    const wibTime = (0, date_fns_tz_1.utcToZonedTime)(now, 'Asia/Jakarta');
    const dateStr = (0, date_fns_tz_1.format)(wibTime, 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' });
    const usersRef = db.collection("users");
    const attendanceRef = db.collection(`attendance/${dateStr}/records`);
    // Get all students
    const studentsSnap = await usersRef.where("role", "==", "student").get();
    let batch = db.batch();
    let batchCount = 0;
    let newAbsences = 0;
    const commitBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
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
    // Update Summary: Recompute Absent (Total - Present - Late - Excused)
    // We do NOT increment total here, as it should be seeded.
    const summaryRef = db.doc(`attendance/${dateStr}/summary/daily`);
    // Check if summary exists to safely update? merge: true handles it.
    // However, to compute absent based on others, we need to read it first or trust the formula.
    // Comment says: "compute absent as total - present - late - excused and update the summary accordingly"
    const summarySnap = await summaryRef.get();
    if (summarySnap.exists) {
        const data = summarySnap.data() || {};
        const total = data.total || 0;
        const present = data.present || 0;
        const late = data.late || 0;
        const excused = data.excused || 0;
        const calculatedAbsent = total - (present + late + excused);
        await summaryRef.set({
            absent: calculatedAbsent,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    else {
        // If summary doesn't exist, maybe just set absent = newAbsences? 
        // But the robust way requested is compuation. 
        // If it doesn't exist, total is effectively 0, so this path is tricky.
        // Assuming seeded summary exists.
        await summaryRef.set({
            absent: newAbsences,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    // Seed Next Day
    const tomorrow = new Date(wibTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = (0, date_fns_tz_1.format)(tomorrow, 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' });
    const nextDaySummaryRef = db.doc(`attendance/${tomorrowStr}/summary/daily`);
    const studentCount = studentsSnap.size; // We already queried users where role == student
    await nextDaySummaryRef.set({
        total: studentCount,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    await commitBatch();
    return { success: true, markedAbsent: newAbsences };
});
//# sourceMappingURL=closeDay.js.map