import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { User, StaffWhitelist } from "@detta/shared";

const db = admin.firestore();

// Helper to check if caller is admin
async function isAdmin(uid: string): Promise<boolean> {
    const callerDoc = await db.collection("users").doc(uid).get();
    const callerData = callerDoc.data() as User | undefined;

    if (!callerData) return false;

    // Check whitelist for role 'admin'
    const whitelistDoc = await db.collection("staffWhitelist").where("email", "==", callerData.email).get();
    if (whitelistDoc.empty) return false;

    return whitelistDoc.docs[0].data().role === 'admin';
}

export const addStaffMember = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    if (!(await isAdmin(context.auth.uid))) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can add staff.");
    }

    const { email, name, role, homeroomClassId } = data;

    if (!email || !name || !role) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const lowerEmail = email.toLowerCase();

    // Store using email as ID for uniqueness
    await db.collection("staffWhitelist").doc(lowerEmail).set({
        email: lowerEmail,
        name,
        role, // 'admin' or 'staff'
        homeroomClassId: homeroomClassId || null,
        addedBy: context.auth.uid,
        addedAt: admin.firestore.Timestamp.now()
    });

    return { success: true };
});

export const removeStaffMember = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    if (!(await isAdmin(context.auth.uid))) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can remove staff.");
    }

    const { email } = data;

    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    }

    await db.collection("staffWhitelist").doc(email.toLowerCase()).delete();

    return { success: true };
});
