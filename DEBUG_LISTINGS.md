# Debugging Listings Not Showing

## ✅ Backend is Working
- API returns 15 listings correctly
- Public access works (no auth required)
- Authenticated access works

## Frontend Debugging Steps

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab. You should see:
- `[API] GET http://localhost:8082/v1/listings?...` logs
- `Loading listings with params:` logs
- `Listings API response:` logs

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Look for request to `/v1/listings`
4. Check:
   - Status code (should be 200)
   - Response payload (should have `data.items` array)
   - Request headers (should not require Authorization for public access)

### 3. Check localStorage
Open DevTools → Application tab → Local Storage:
- Check if `authToken` exists (optional, not required for browsing)
- Check if `isAuthenticated` is set

### 4. Verify API Base URL
The frontend should be calling: `http://localhost:8082/v1/listings`

### 5. Common Issues

**Issue: Empty array returned**
- Check if `res.items` exists and is an array
- Check console logs for response structure

**Issue: CORS error**
- Backend CORS is configured for port 5173
- Make sure frontend is running on the correct port

**Issue: 401 Unauthorized**
- Listings endpoint is now public, should not require auth
- If you see this, backend server needs restart

## Quick Test

Run this in browser console:
```javascript
fetch('http://localhost:8082/v1/listings?status=active&limit=5')
  .then(r => r.json())
  .then(d => console.log('Items:', d.data?.items?.length || 0, d))
  .catch(e => console.error('Error:', e))
```

This should show 5 listings. If it works, the issue is in the frontend code.

