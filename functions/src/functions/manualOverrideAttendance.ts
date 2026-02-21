import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AttendanceRecord } from "@detta/shared";

const db = admin.firestore();

export const manualOverrideAttendance = functions.https.onCall(async (data, context) => {
    // 1. Auth Check (Staff/Admin only)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    // Check custom claims for role
    const token = context.auth.token;
    if (token.role !== 'staff' && token.role !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Unauthorized. Staff/Admin only.");
    }

    const { userId, date, status, reason } = data;

    if (!userId || !date || !status || !reason) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const recordRef = db.doc(`attendance/${date}/records/${userId}`);
    const summaryRef = db.doc(`attendance/${date}/summary/daily`);

    await db.runTransaction(async (transaction) => {
        const recordSnap = await transaction.get(recordRef);
        let oldStatus: string | null = null;

        if (recordSnap.exists) {
            const oldData = recordSnap.data() as AttendanceRecord;
            oldStatus = oldData.status;
        }

        // Update Record
        transaction.set(recordRef, {
            userId,
            date,
            status,
            source: "staff",
            timestamp: admin.firestore.Timestamp.now(), // Override time is now
            // Preserving or Defaulting other fields since we are overwriting or creating
            // Verification requirement: "audit fields per ticket"
            overriddenBy: context.auth!.uid,
            overriddenAt: admin.firestore.FieldValue.serverTimestamp(),
            overrideReason: reason,

            // Minimal required fields if new
            location: { lat: 0, lng: 0, accuracyM: 0 },
            wifi: { ssid: "manual", bssid: "manual" },
            device: { osDeviceId: "manual", deviceModel: "manual", osVersion: "manual", appVersion: "manual" },
            flags: [],
            flagged: null,
            riskScore: 0,
            audit: { ip: context.rawRequest.ip || "manual", networkType: "manual" }
        }, { merge: true });

        // Update Summary
        // Decrement old status if exists
        const summaryUpdates: any = {
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!oldStatus) {
            summaryUpdates['total'] = admin.firestore.FieldValue.increment(1);
        }

        if (oldStatus && oldStatus !== status) {
            summaryUpdates[oldStatus.toLowerCase()] = admin.firestore.FieldValue.increment(-1);
        }

        // Increment new status (only if it changed or is new)
        if (oldStatus !== status) {
            summaryUpdates[status.toLowerCase()] = admin.firestore.FieldValue.increment(1);
        }

        if (Object.keys(summaryUpdates).length > 1) { // more than just lastUpdated
            transaction.set(summaryRef, summaryUpdates, { merge: true });
        }
    });

    return { success: true };
});
