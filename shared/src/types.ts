// User Types
export interface User {
    username: string;
    email: string;
    name: string;
    classId: string;
    role: 'student' | 'staff';
    createdAt: Timestamp;
    inviteStatus: 'pending' | 'active';
    termsAcceptedAt: Timestamp | null;
    boundDevice: BoundDevice | null;
}

export interface BoundDevice {
    platform: 'android' | 'ios';
    osDeviceId: string;
    deviceModel: string;
    osVersion: string;
    appVersion: string;
    boundAt: Timestamp;
    resetCount: number;
    lastResetAt: Timestamp | null;
}

// Attendance Types
export interface AttendanceRecord {
    userId: string;
    date: string; // YYYY-MM-DD
    timestamp: Timestamp;
    status: 'Present' | 'Late' | 'Absent' | 'Excused';
    source: 'student' | 'staff' | 'system';
    location: {
        lat: number;
        lng: number;
        accuracyM: number | null;
    };
    wifi: {
        ssid: string | null;
        bssid: string | null;
    };
    device: {
        osDeviceId: string;
        deviceModel: string;
        osVersion: string;
        appVersion: string;
    };
    flags: string[];
    flagged: { metadata: Record<string, any>; } | null;
    riskScore: number | null;
    audit: {
        ip: string | null;
        networkType: string | null;
    };
}

export interface DailySummary {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    lastUpdated: Timestamp;
}

// Absence Request Types
export interface AbsenceRequest {
    userId: string;
    studentName: string;
    studentClass: string;
    dates: string[]; // YYYY-MM-DD format
    reason: 'Sick' | 'Medical Appointment' | 'Family Emergency' | 'Religious Observance' | 'Other';
    notes: string | null;
    photoURL: string | null;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt: Timestamp;
    reviewedBy: string | null;
    reviewedAt: Timestamp | null;
    rejectionReason: string | null;
}

// Security & Audit Types
export interface FlaggedCheckIn {
    userId: string;
    classId: string;
    attendanceRecordRef: string;
    wibDate: string; // YYYY-MM-DD
    flags: string[];
    flagDetails: { reason: string; evidence?: string[]; };
    createdAt: Timestamp;
    status: 'Pending' | 'Reviewed' | 'Dismissed' | 'Escalated';
    reviewedBy: string | null;
    reviewedAt: Timestamp | null;
    notes: string | null;
}

export interface DeviceResetLog {
    userId: string;
    classId: string;
    performedBy: string;
    performedAt: Timestamp;
    reason: string | null;
}

export interface StaffWhitelist {
    email: string;
    name: string | null;
    role: 'admin' | 'staff';
    addedBy: string;
    addedAt: Timestamp;
}

export interface Class {
    classId: string;
    name: string;
    homeroomStaffUid: string;
    updatedAt: Timestamp;
}

// Common Utility Types
// For compatibility with both Firebase SDK and Admin SDK
export type Timestamp = {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
};
