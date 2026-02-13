"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetStudentDevice = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.resetStudentDevice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { studentId, reason } = data;
    const callerUid = context.auth.uid;
    if (!studentId) {
        throw new functions.https.HttpsError("invalid-argument", "Student ID is required.");
    }
    // 1. Get Caller Info (Role Check)
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();
    if (!callerData || callerData.role !== 'staff') {
        throw new functions.https.HttpsError("permission-denied", "Only staff can reset devices.");
    }
    // 2. Get Target Student Info
    const studentRef = db.collection("users").doc(studentId);
    const studentDoc = await studentRef.get();
    const studentData = studentDoc.data();
    if (!studentData) {
        throw new functions.https.HttpsError("not-found", "Student not found.");
    }
    // 3. Authorization: Admin OR Homeroom Teacher
    // Check if caller is in whitelist with role 'admin'
    // For simplicity, we trust the user.role here IF we trust the source, but safer to check whitelist
    const whitelistDoc = await db.collection("staffWhitelist").where("email", "==", callerData.email).get();
    const whitelistEntry = !whitelistDoc.empty ? whitelistDoc.docs[0].data() : null;
    const isAdmin = (whitelistEntry === null || whitelistEntry === void 0 ? void 0 : whitelistEntry.role) === 'admin';
    if (!isAdmin) {
        // Check Homeroom Match
        if (!studentData.classId) {
            throw new functions.https.HttpsError("failed-precondition", "Student has no class assigned.");
        }
        const classDoc = await db.collection("classes").doc(studentData.classId).get();
        const classData = classDoc.data();
        if ((classData === null || classData === void 0 ? void 0 : classData.homeroomStaffUid) !== callerUid) {
            throw new functions.https.HttpsError("permission-denied", "You are not the homeroom teacher for this student.");
        }
    }
    // 4. Reset Device
    await studentRef.update({
        boundDevice: null
    });
    // 5. Log Action
    const log = {
        userId: studentId,
        classId: studentData.classId || "unknown",
        performedBy: callerUid,
        performedAt: admin.firestore.Timestamp.now(),
        reason: reason || null
    };
    await db.collection("deviceResetLogs").add(log);
    return { success: true };
});
//# sourceMappingURL=resetStudentDevice.js.map