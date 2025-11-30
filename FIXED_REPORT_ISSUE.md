# ✅ Fixed: Report Listing 403 Forbidden Error

## Problem
When users tried to report a listing, they got a `403 Forbidden` error.

## Root Cause
The `/v1/reports` POST endpoint only allowed `"seller"` and `"admin"` roles, but:
- New users who sign up get the `"buyer"` role by default
- Buyers should be able to report listings (makes sense for a marketplace)

## Solution Applied

### Backend Router Update
Updated `backend/internal/transport/http/router.go`:
- **Before**: `v1.POST("/reports", middleware.JWT(..., "seller", "admin"), ...)`
- **After**: `v1.POST("/reports", middleware.JWT(..., "buyer", "seller", "admin"), ...)`

Now all authenticated users (buyer, seller, admin) can create reports.

## ⚠️ ACTION REQUIRED: Restart Backend Server

The backend server is still running with the old code. You MUST restart it:

1. **Stop the backend server** (press `Ctrl+C`)

2. **Restart it**:
   ```bash
   cd backend
   go run cmd/api/main.go
   ```

3. **Try reporting a listing again**

## After Restart

- ✅ Buyers can report listings
- ✅ Sellers can report listings  
- ✅ Admins can report listings
- ✅ All authenticated users can create reports

## Test

After restarting, try:
1. Sign in as a buyer user
2. Go to browse page
3. Click "Report" on any listing
4. Enter a reason
5. Should successfully create the report

## Note

The report creation requires:
- Valid JWT token (user must be signed in)
- `listingId` - ID of the listing to report
- `reporterId` - ID of the user creating the report (from JWT token)
- `reason` - Text description of why reporting

The frontend should automatically include the `userId` from the auth context when calling `api.reportListing()`.

