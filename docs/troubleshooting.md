# Troubleshooting Guide

## Common Issues

### Device Binding
*   **Problem**: Student cannot check in ("Device Mismatch").
*   **Cause**: Student is using a different phone than the one they first logged in with.
*   **Solution**:
    1.  Verify the student's identity.
    2.  Go to **Dashboard > Students**.
    3.  Find the student and click **Reset Device**.
    4.  Ask the student to log in again on their new device.

### Location Errors
*   **Problem**: "You are too far from school."
*   **Cause**: GPS accuracy is low or student is physically away.
*   **Solution**:
    *   Ensure Wi-Fi is ON (improves accuracy).
    *   Open Google Maps to calibrate the compass/GPS.
    *   If persistent, check if the school coordinates in the database match the physical location.

### Login Issues
*   **Problem**: "User not found" or "Wrong password".
*   **Solution**:
    *   Verify the email spelling.
    *   Reset password via the "Forgot Password" link (if enabled) or Admin console.

### CSV Import Failures
*   **Problem**: "Invalid CSV format".
*   **Solution**: Ensure the CSV has exactly these headers: `name`, `class`, `email`. Remove any empty rows at the bottom.
