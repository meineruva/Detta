import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { User, UsernameMapping } from "@detta/shared";
import * as sgMail from "@sendgrid/mail";

const db = admin.firestore();

// Initialize SendGrid
const API_KEY = process.env.SENDGRID_API_KEY;
if (API_KEY) {
    sgMail.setApiKey(API_KEY);
}

interface BulkImportRow {
    name: string;
    class: string;
    email: string;
}

interface ImportResult {
    success: number;
    errors: { email: string; error: string }[];
    emailsSent: number;
    emailsFailed: number;
}

export const bulkImportStudents = functions.https.onCall(async (data: { students: BulkImportRow[] }, context) => {
    // 1. Auth Check
    if (!context.auth || !context.auth.token.email) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const CallerEmail = context.auth.token.email;
    const whitelistDoc = await db.collection("staffWhitelist").doc(CallerEmail).get();
    if (!whitelistDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "User is not authorized to import students.");
    }

    const students = data.students;
    if (!Array.isArray(students) || students.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "No students provided.");
    }

    const results: ImportResult = {
        success: 0,
        errors: [],
        emailsSent: 0,
        emailsFailed: 0,
    };

    // Store details needed for email: { uid, email, name, username, class }
    const createdUsers: { uid: string; email: string; name: string; username: string; className: string }[] = [];

    // 2. Process Rows
    const currentYearShort = new Date().getFullYear().toString().slice(-2);

    for (const student of students) {
        const { name, class: className, email } = student;

        if (!name || !className || !email) {
            results.errors.push({ email: email || "unknown", error: "Missing required fields." });
            continue;
        }

        try {
            // Check if user already exists
            try {
                await admin.auth().getUserByEmail(email);
                results.errors.push({ email, error: "User already exists in Auth." });
                continue;
            } catch (e: any) {
                if (e.code !== 'auth/user-not-found') {
                    throw e;
                }
            }

            // Generate Username
            const parts = name.trim().split(/\s+/);
            const firstInitial = parts[0][0].toLowerCase();
            const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : parts[0].toLowerCase();
            const baseUsername = `${firstInitial}${lastName}${currentYearShort}`.replace(/[^a-z0-9]/g, "");

            let username = baseUsername;
            let counter = 1;

            while (true) {
                const suffix = counter > 1 ? `_${counter}` : "";
                const candidate = `${baseUsername}${suffix}`;
                const mappingDoc = await db.collection("users_by_username").doc(candidate).get();
                if (!mappingDoc.exists) {
                    username = candidate;
                    break;
                }
                counter++;
            }

            // Create User
            const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!"; // Randomized
            const userRecord = await admin.auth().createUser({
                email,
                password: tempPassword,
                displayName: name,
            });

            const uid = userRecord.uid;

            // Write DB Records
            const userDoc: User = {
                username,
                email,
                name,
                classId: className,
                role: "student",
                createdAt: admin.firestore.Timestamp.now(),
                inviteStatus: "active",
                termsAcceptedAt: null,
                boundDevice: null,
            };

            const mappingDoc: UsernameMapping = {
                userId: uid,
                email,
            };

            const batch = db.batch();
            batch.set(db.collection("users").doc(uid), userDoc);
            batch.set(db.collection("users_by_username").doc(username), mappingDoc);
            await batch.commit();

            createdUsers.push({ uid, email, name, username, className });
            results.success++;

        } catch (error: any) {
            results.errors.push({ email, error: error.message });
        }
    }

    // 3. Batch Emails with SendGrid
    const BATCH_SIZE = 100;
    const DELAY_MS = 1000;
    const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@sman12jakarta.sch.id";

    for (let i = 0; i < createdUsers.length; i += BATCH_SIZE) {
        const batch = createdUsers.slice(i, i + BATCH_SIZE);

        const emailPromises = batch.map(async (u) => {
            try {
                // Generate Reset Link
                const link = await admin.auth().generatePasswordResetLink(u.email);

                // Send Email via SendGrid
                const msg = {
                    to: u.email,
                    from: EMAIL_FROM,
                    subject: 'Welcome to Detta - Account Activation',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Welcome to Detta, ${u.name}!</h2>
                            <p>Your account has been created.</p>
                            <ul>
                                <li><strong>Name:</strong> ${u.name}</li>
                                <li><strong>Class:</strong> ${u.className}</li>
                                <li><strong>Username:</strong> ${u.username}</li>
                                <li><strong>Email:</strong> ${u.email}</li>
                            </ul>
                            <p>Please click the link below to set your password and activate your account:</p>
                            <p><a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Activate Account</a></p>
                            <p>Or copy this link: ${link}</p>
                            <p>Best regards,<br/>SMAN 12 Jakarta IT Team</p>
                        </div>
                    `,
                };

                await sgMail.send(msg);
                console.log(`Email sent successfully to ${u.email}`);
                return true;
            } catch (error: any) {
                console.error(`Failed to send email to ${u.email}:`, error);
                if (error.response) {
                    console.error(error.response.body);
                }
                return false;
            }
        });

        const batchResults = await Promise.all(emailPromises);
        const successCount = batchResults.filter(r => r).length;
        const failCount = batchResults.filter(r => !r).length;

        results.emailsSent += successCount;
        results.emailsFailed += failCount;

        if (i + BATCH_SIZE < createdUsers.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    return results;
});
