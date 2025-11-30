# 🔍 Debugging 401 Error on Report

## Current Status
- ✅ Backend router allows "buyer" role (needs restart)
- ✅ Backend API works with valid token (tested with curl)
- ❌ Frontend getting 401 when reporting

## Enhanced Debug Logging Added

The console will now show detailed information about:
1. **Token storage** during sign-in
2. **Token retrieval** when making report request
3. **Authorization header** presence
4. **Error details** from backend

## What to Check

### Step 1: Sign In
1. Open browser DevTools (F12) → Console tab
2. Sign in as a user
3. Look for these logs:
   - `[API] signIn: Storing token from result.token, length: XXX`
   - `[API] signIn: Token stored in localStorage: true`
   - `Sign-in result: {user: ..., token: ...}`
   - `Token stored: true`

### Step 2: Check localStorage
1. DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Local Storage → your domain
3. Verify `authToken` key exists and has a value

### Step 3: Try to Report
1. Go to browse page
2. Click "Report" on a listing
3. Look for these logs:
   - `Reporting listing: {listingId: ..., reporterId: ..., reason: ...}`
   - `Auth token present: true length: XXX`
   - `[API] POST http://localhost:8082/v1/reports {hasAuth: true, ...}`
   - `[API] Auth token found, length: XXX`

### Step 4: Check Network Tab
1. DevTools → Network tab
2. Find `POST /v1/reports` request
3. Click on it
4. Check **Request Headers**:
   - Should see: `Authorization: Bearer <long-token-string>`
   - If missing → token not being sent

## Common Issues

### Issue 1: Token Not Stored
**Symptoms**: 
- Console shows `[API] signIn: No token in result`
- `Token stored: false`

**Solution**: 
- Check backend response structure
- Verify `handleResponse` is extracting `data` correctly

### Issue 2: Token Missing When Reporting
**Symptoms**: 
- Console shows `[API] WARNING: Auth required but no token found`
- `Auth token present: false`

**Solution**: 
- Token might have been cleared
- Check if localStorage is being cleared somewhere
- Sign out and sign in again

### Issue 3: Token Sent But Still 401
**Symptoms**: 
- Authorization header present in Network tab
- Still getting 401

**Solution**: 
- Token might be expired
- Token might be invalid
- Backend might not be recognizing the token
- Check backend logs for JWT parsing errors

## Next Steps

1. **Clear browser cache/localStorage** and sign in fresh
2. **Check console logs** during sign-in and report
3. **Check Network tab** for Authorization header
4. **Share console output** if issue persists

The enhanced logging will help identify exactly where the token is being lost.

