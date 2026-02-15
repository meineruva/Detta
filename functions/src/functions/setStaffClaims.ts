import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const setStaffClaims = functions.firestore
    .document('staffWhitelist/{email}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const email = context.params.email; // Document ID is email
        const role = data.role || 'staff';

        try {
            const user = await admin.auth().getUserByEmail(email);
            await admin.auth().setCustomUserClaims(user.uid, { role });
            console.log(`Set custom claims for ${email} as ${role}`);
        } catch (error) {
            console.error(`Error setting claims for ${email}:`, error);
            // User might not exist yet. 
            // This is expected if whitelist is populated before user signs up.
        }
    });
