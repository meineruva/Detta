import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AttendanceRecord } from "@detta/shared";
import * as geolib from "geolib";

const db = admin.firestore();

export const submitAttendance = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const userId = context.auth.uid;
    const { latitude, longitude } = data; // client timestamp for reference, but use server time for record

    // 1. Validate Time Window (WIB UTC+7)
    const now = new Date();
    const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
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
        isWithinGeofence = geolib.isPointInPolygon(
            { latitude, longitude },
            polygon
        );
    } else {
        // Fallback or skip if not configured (should be configured)
        console.warn("GEOFENCE_POLYGON not configured.");
    }

    if (!isWithinGeofence) {
        throw new functions.https.HttpsError("failed-precondition", "Outside school geofence.");
    }

    // 3. Deduplicate
    const dateStr = wibTime.toISOString().split("T")[0]; // YYYY-MM-DD
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
    const record: AttendanceRecord = {
        userId,
        date: dateStr,
        timestamp: admin.firestore.Timestamp.now(), // Server timestamp
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
            osDeviceId: data.deviceId || "unknown",
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
        total: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, status };
});
