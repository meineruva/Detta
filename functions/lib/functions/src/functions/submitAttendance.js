"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAttendance = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const geolib = require("geolib");
const date_fns_tz_1 = require("date-fns-tz");
const db = admin.firestore();
exports.submitAttendance = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const userId = context.auth.uid;
    const { latitude, longitude, osDeviceId } = data;
    // 0. Enforce Device Binding 
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    if (!userData) {
        throw new functions.https.HttpsError("not-found", "User not found.");
    }
    if (userData.boundDevice) {
        if (userData.boundDevice.osDeviceId !== osDeviceId) {
            throw new functions.https.HttpsError("permission-denied", "Device mismatch. Attendance rejected.");
        }
    }
    else {
        await userRef.update({
            boundDevice: {
                platform: ((_a = data.deviceModel) === null || _a === void 0 ? void 0 : _a.includes('iPhone')) ? 'ios' : 'android',
                osDeviceId: osDeviceId || "unknown",
                deviceModel: data.deviceModel || "unknown",
                osVersion: data.osVersion || "unknown",
                appVersion: data.appVersion || "unknown",
                boundAt: admin.firestore.Timestamp.now(),
                resetCount: 0,
                lastResetAt: null
            }
        });
    }
    // 1. Validate Time Window (WIB UTC+7)
    const now = new Date();
    const timeZone = 'Asia/Jakarta';
    const wibTime = (0, date_fns_tz_1.utcToZonedTime)(now, timeZone);
    // Comment 2: Weekend validation
    const dayOfWeek = wibTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new functions.https.HttpsError('failed-precondition', 'Attendance is only allowed on school days (Monday-Friday)');
    }
    const hour = wibTime.getHours();
    const minute = wibTime.getMinutes();
    const startTime = process.env.ATTENDANCE_START_TIME || "06:30";
    const endTime = process.env.ATTENDANCE_END_TIME || "08:00";
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const timeInMinutes = hour * 60 + minute;
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    if (timeInMinutes < startInMinutes || timeInMinutes > endInMinutes) {
        throw new functions.https.HttpsError("failed-precondition", "Outside attendance window.");
    }
    // 2. Validate Geofence
    const polygonEnv = process.env.GEOFENCE_POLYGON;
    let isWithinGeofence = false;
    if (polygonEnv) {
        const polygon = JSON.parse(polygonEnv);
        isWithinGeofence = geolib.isPointInPolygon({ latitude, longitude }, polygon);
    }
    else {
        console.warn("GEOFENCE_POLYGON not configured.");
    }
    if (!isWithinGeofence) {
        throw new functions.https.HttpsError("failed-precondition", "Outside school geofence.");
    }
    // Comment 3: Android WiFi SSID enforcement
    const platform = ((_b = data.deviceModel) === null || _b === void 0 ? void 0 : _b.includes('iPhone')) ? 'ios' : 'android';
    if (platform === 'android') {
        const requiredSsid = process.env.SCHOOL_WIFI_SSID || 'SMAN12_Student_Wifi';
        if (data.ssid !== requiredSsid) {
            throw new functions.https.HttpsError('failed-precondition', `Invalid WiFi network. Must be connected to ${requiredSsid}`);
        }
    }
    // 3. Deduplicate
    // Comment 1: updated date string format
    const dateStr = (0, date_fns_tz_1.format)(wibTime, 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' });
    const recordRef = db.doc(`attendance/${dateStr}/records/${userId}`);
    const recordSnap = await recordRef.get();
    if (recordSnap.exists) {
        throw new functions.https.HttpsError("already-exists", "Attendance already recorded for today.");
    }
    // 4. Determine Status
    const lateThreshold = process.env.LATE_THRESHOLD_TIME || "06:40";
    const [lateHour, lateMinute] = lateThreshold.split(":").map(Number);
    const lateInMinutes = lateHour * 60 + lateMinute;
    const status = timeInMinutes > lateInMinutes ? "Late" : "Present";
    // 5. Write Record
    const record = {
        userId,
        date: dateStr,
        timestamp: admin.firestore.Timestamp.now(),
        status,
        source: "student",
        location: {
            lat: latitude,
            lng: longitude,
            accuracyM: data.accuracy || null,
        },
        wifi: {
            ssid: data.ssid || null,
            bssid: data.bssid || null,
        },
        device: {
            osDeviceId: data.osDeviceId || "unknown",
            deviceModel: data.deviceModel || "unknown",
            osVersion: data.osVersion || "unknown",
            appVersion: data.appVersion || "unknown",
        },
        flags: [],
        flagged: null,
        riskScore: 0,
        audit: {
            ip: context.rawRequest.ip || null,
            networkType: null,
        }
    };
    await recordRef.set(record);
    // 6. Update Summary
    const summaryRef = db.doc(`attendance/${dateStr}/summary/daily`);
    await summaryRef.set({
        [status.toLowerCase()]: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true, status };
});
//# sourceMappingURL=submitAttendance.js.map