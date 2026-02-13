"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewAbsence = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.reviewAbsence = functions.https.onCall(async (data, context) => {
    // 1. Auth & Validation
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    // Ideally verify role === 'staff' or 'admin' here
    const { requestId, approved, reason } = data;
    if (approved === false && !reason) {
        throw new functions.https.HttpsError("invalid-argument", "Reason is required for rejection.");
    }
    const requestRef = db.collection("absenceRequests").doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Request not found.");
    }
    const request = requestSnap.data();
    if (!request)
        return { success: false };
    if (request.status !== "Pending") {
        throw new functions.https.HttpsError("failed-precondition", "Request already reviewed.");
    }
    // 2. Update Request Status
    const status = approved ? "Approved" : "Rejected";
    await requestRef.update({
        status,
        reviewedBy: context.auth.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewNotes: reason || "",
        rejectionReason: approved ? null : reason
    });
    // 3. If Approved, Create Attendance Records (Multi-date)
    if (approved && Array.isArray(request.dates)) {
        const userId = request.userId;
        const batch = db.batch();
        for (const dateStr of request.dates) {
            const recordRef = db.doc(`attendance/${dateStr}/records/${userId}`);
            const recordSnap = await recordRef.get();
            // Only create if no record exists (don't overwrite Present/Late)
            if (!recordSnap.exists) {
                const record = {
                    userId,
                    date: dateStr,
                    timestamp: admin.firestore.Timestamp.now(),
                    status: "Excused",
                    source: "staff",
                    location: { lat: 0, lng: 0, accuracyM: null },
                    wifi: { ssid: null, bssid: null },
                    device: { osDeviceId: "manual", deviceModel: "manual", osVersion: "manual", appVersion: "manual" },
                    flags: [],
                    flagged: null,
                    riskScore: null,
                    audit: { ip: null, networkType: null }
                };
                batch.set(recordRef, record);
                // Update summary with FLAT fields
                const summaryRef = db.doc(`attendance/${dateStr}/summary/daily`);
                batch.set(summaryRef, {
                    excused: admin.firestore.FieldValue.increment(1),
                    total: admin.firestore.FieldValue.increment(1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
        await batch.commit();
    }
    return { success: true };
});
//# sourceMappingURL=reviewAbsence.js.map