# 🔍 Debugging: Report Listing 401 Unauthorized

## Problem
Users get `401 Unauthorized` when trying to report a listing, even after signing in.

## Root Cause Analysis

The 401 error means the JWT token is either:
1. **Not being stored** when user signs in
2. **Not being retrieved** when making the report request
3. **Not being sent** in the Authorization header
4. **Expired or invalid**

## Changes Made

### 1. Backend Router (Already Fixed)
- ✅ Updated to allow `"buyer"` role to create reports
- ✅ **Backend server needs restart** to apply this change

### 2. Frontend Debug Logging Added
- ✅ Added logging in `apiClient.js` to show when token is found/missing
- ✅ Added logging in `LoginPage.jsx` to verify token storage
- ✅ Added logging in `BrowsePage.jsx` to verify token before report

## How to Debug

### Step 1: Check Browser Console
After signing in and trying to report, check the console for:
- `"Storing token: length: XXX"` - confirms token received from backend
- `"Token stored: true"` - confirms token saved to localStorage
- `"Auth token found, length: XXX"` - confirms token retrieved for report request
- `"WARNING: Auth required but no token found"` - means token is missing

### Step 2: Check localStorage
1. Open browser DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Click on "Local Storage" → your domain
4. Look for `authToken` key
5. Check if it has a value (should be a long JWT string)

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Try to report a listing
3. Find the `POST /v1/reports` request
4. Click on it
5. Check "Request Headers" section
6. Look for `Authorization: Bearer <token>`
   - If missing → token not being sent
   - If present → token might be invalid/expired

## Common Issues

### Issue 1: Token Not Stored
**Symptom**: Console shows "Token stored: false" or "WARNING: Auth required but no token found"

**Solution**: 
- Check if `api.setToken(token)` is being called after sign-in
- Verify the sign-in response includes a `token` field
- Check browser console for errors during sign-in

### Issue 2: Token Expired
**Symptom**: Token exists but still getting 401

**Solution**: 
- Sign out and sign in again to get a fresh token
- Check token expiration in JWT payload (if you decode it)

### Issue 3: Token Not Sent
**Symptom**: Network tab shows request without Authorization header

**Solution**: 
- Verify `auth: true` is set in `reportListing` function
- Check if `getAuthToken()` returns the token

## Testing Steps

1. **Sign in** as a user (buyer, seller, or admin)
2. **Check console** for "Token stored: true"
3. **Check localStorage** for `authToken` key
4. **Go to browse page** and click "Report" on a listing
5. **Check console** for "Auth token found" message
6. **Check Network tab** for Authorization header
7. **Submit report** and check response

## Expected Behavior

After fixing:
- ✅ Token is stored in localStorage after sign-in
- ✅ Token is retrieved when making report request
- ✅ Authorization header is sent: `Bearer <token>`
- ✅ Backend accepts the request (200 or 201 status)
- ✅ Report is created successfully

## Next Steps

1. **Restart backend server** (if you haven't already)
2. **Clear browser cache/localStorage** and sign in again
3. **Try reporting** and check console logs
4. **Share console output** if issue persists

