import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AttendanceRecord, FlaggedCheckIn } from "@detta/shared";

const db = admin.firestore();

export const analyzeCheckIn = functions.firestore
    .document("attendance/{date}/records/{userId}")
    .onCreate(async (snapshot, context) => {
        const record = snapshot.data() as AttendanceRecord;
        const { date, userId } = context.params;
        const flags: string[] = [];
        const flagDetails: { reason: string; evidence?: string[] }[] = [];

        // 1. Device Mismatch (Redundant if submitAttendance blocks it, but good for audit if bypassed)
        // Check user bound device
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        if (userData?.boundDevice) {
            if (userData.boundDevice.osDeviceId !== record.device.osDeviceId) {
                flags.push("DeviceMismatch");
                flagDetails.push({
                    reason: "Check-in device does not match bound device",
                    evidence: [`Record: ${record.device.osDeviceId}`, `Bound: ${userData.boundDevice.osDeviceId}`]
                });
            }
        }

        // 2. Shared Device (Multiple users same osDeviceId in one day)
        // Query other records for same day with same osDeviceId
        const sameDeviceSnap = await db.collection(`attendance/${date}/records`)
            .where("device.osDeviceId", "==", record.device.osDeviceId)
            .get();

        if (sameDeviceSnap.size > 1) {
            // Check if different users
            const otherUsers = sameDeviceSnap.docs.filter(d => d.id !== userId);
            if (otherUsers.length > 0) {
                flags.push("SharedDevice");
                flagDetails.push({
                    reason: "Device used by multiple students today",
                    evidence: otherUsers.map(d => `User ${d.id}`)
                });
            }
        }

        // 3. Unusual Network (BSSID) - Placeholder logic
        // In real world, check against user's history or known school BSSIDs roster if strict.
        // Here we just flag if Wifi was reported but SSID is null/unknown while location is high accuracy (suspicious?)
        // Or if location is mocked (accuracy == 0 or very bad) -> Risk Score
        if (record.location.accuracyM && record.location.accuracyM > 100) {
            flags.push("LowAccuracy");
            flagDetails.push({ reason: "Location accuracy > 100m" });
        }

        // If flags detected, write to FlaggedCheckIns and update Record
        if (flags.length > 0) {
            const flagDoc: FlaggedCheckIn = {
                userId,
                classId: userData?.classId || "unknown",
                attendanceRecordRef: snapshot.ref.path,
                wibDate: date,
                flags,
                flagDetails: flagDetails[0], // Simplified for type matching, ideally array
                createdAt: admin.firestore.Timestamp.now(),
                status: 'Pending',
                reviewedBy: null,
                reviewedAt: null,
                notes: null
            };

            await db.collection("flaggedCheckIns").add(flagDoc);

            await snapshot.ref.update({
                flags: flags,
                flagged: { metadata: { details: flagDetails } },
                riskScore: flags.length * 20 // Arbitrary score
            });
        }
    });
