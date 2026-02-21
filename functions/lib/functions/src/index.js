"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
// Initialize Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
else {
    admin.initializeApp();
}
__exportStar(require("./functions/analyzeCheckIn"), exports);
__exportStar(require("./functions/bulkImportStudents"), exports);
__exportStar(require("./functions/closeDay"), exports);
__exportStar(require("./functions/healthCheck"), exports);
__exportStar(require("./functions/manageStaff"), exports);
__exportStar(require("./functions/manualOverrideAttendance"), exports);
__exportStar(require("./functions/resetStudentDevice"), exports);
__exportStar(require("./functions/reviewAbsence"), exports);
__exportStar(require("./functions/reviewFlaggedCheckIn"), exports);
__exportStar(require("./functions/setStaffClaims"), exports);
__exportStar(require("./functions/submitAttendance"), exports);
//# sourceMappingURL=index.js.map