"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStaffMember = exports.addStaffMember = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
// Helper to check if caller is admin
async function isAdmin(uid) {
    const callerDoc = await db.collection("users").doc(uid).get();
    const callerData = callerDoc.data();
    if (!callerData)
        return false;
    // Check whitelist for role 'admin'
    const lowerEmail = callerData.email.toLowerCase();
    const whitelistDoc = await db.collection("staffWhitelist").doc(lowerEmail).get();
    if (!whitelistDoc.exists)
        return false;
    const data = whitelistDoc.data();
    return data.role === 'admin';
}
exports.addStaffMember = functions.https.onCall(async (data, context) => {
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
exports.removeStaffMember = functions.https.onCall(async (data, context) => {
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
//# sourceMappingURL=manageStaff.js.map