import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const reviewFlaggedCheckIn = functions.https.onCall(async (data, context) => {
    // 1. Auth Check (Staff/Admin only)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const token = context.auth.token;
    if (token.role !== 'staff' && token.role !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Unauthorized. Staff/Admin only.");
    }

    const { flagId, action, notes } = data;

    if (!flagId || !action) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const allowedActions = ['Dismissed', 'Escalated', 'Resolved'];
    if (!allowedActions.includes(action)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid action.");
    }

    const flagRef = db.collection("flaggedCheckIns").doc(flagId);

    await flagRef.update({
        status: action,
        reviewedBy: context.auth.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewNotes: notes || ""
    });

    return { success: true };
});
