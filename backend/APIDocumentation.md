# 📘 CampusHub Backend API Documentation

**Base URL**
```
http://localhost:8082/v1
```

---

## 🔐 Auth

### Sign Up
**POST** `/auth/sign-up`  
Headers: `Content-Type: application/json`
```json
{
  "name": "Alice",
  "email": "alice@sjsu.edu",
  "role": "seller",
  "password": "StrongPass#1"
}
```

### Sign In
**POST** `/auth/sign-in`  
Headers: `Content-Type: application/json`
```json
{
  "email": "alice@sjsu.edu",
  "password": "StrongPass#1"
}
```
**Response**
```json
{ "data": { "token": "<JWT>", "user": { "id": "uuid", "email": "alice@sjsu.edu", "role": "seller" } } }
```
Use for protected routes:
```
Authorization: Bearer <JWT>
```

---

## 🛍️ Listings

### Create Listing (protected)
**POST** `/listings`  
Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
```json
{
  "sellerId": "11111111-1111-1111-1111-111111111111",
  "title": "CMPE 202 Textbook",
  "description": "Lightly used, pickup at library",
  "category": "Textbooks",
  "price": 35.0,
  "condition": "Good"
}
```

### Get Listing
**GET** `/listings/{id}`

### List Listings
**GET** `/listings?category=Textbooks&status=active&sort=created_desc&limit=20&offset=0`

### Update Listing (protected)
**PATCH** `/listings/{id}`  
Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
```json
{ "price": 30.0, "title": "CMPE 202 Textbook (Updated)" }
```

### Mark as Sold (protected)
**POST** `/listings/{id}/mark-sold`  
Headers: `Authorization: Bearer <JWT>`

### Delete (soft) (protected)
**DELETE** `/listings/{id}`  
Headers: `Authorization: Bearer <JWT>`

---

## 🖼️ Image Uploads

### Step 1: Presign (get S3 PUT URL)
**POST** `/uploads/presign`  
Headers: `Content-Type: application/json`
```json
{ "fileName": "book.jpg", "contentType": "image/jpeg" }
```
**Response**
```json
{ "data": { "url": "https://s3...signed-put...", "key": "uploads/2025/10/<uuid>.jpg" } }
```

### Step 2: Upload to S3 (PUT)
Use the URL from step 1 exactly (do not modify host/query).
```
curl -X PUT "<signed-put-url>" -H "Content-Type: image/jpeg" --data-binary "@/path/to/book.jpg"
```

### Step 3: Complete (attach to listing)
**POST** `/uploads/complete`  
Headers: `Content-Type: application/json`
```json
{
  "listingId": "<listing-uuid>",
  "key": "uploads/2025/10/<uuid>.jpg",
  "isPrimary": true
}
```

### List Images for a Listing
**GET** `/listings/{id}/images`  
**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "key": "uploads/2025/10/<uuid>.jpg",
      "url": "https://s3...signed-get...",
      "isPrimary": true,
      "createdAt": "2025-10-29T22:41:17Z"
    }
  ]
}
```

---

## 🧾 Reports

### Create Report
**POST** `/reports`  
Headers: `Content-Type: application/json`
```json
{
  "listingId": "<listing-uuid>",
  "reporterId": "<user-uuid>",
  "reason": "Listing is duplicate/incomplete"
}
```

### Admin: List Reports (filter by status)
**GET** `/reports?status=open`  
Headers: `Authorization: Bearer <ADMIN_JWT>`

### Admin: Update Report Status
**PATCH** `/reports/{id}/status`  
Headers: `Authorization: Bearer <ADMIN_JWT>`, `Content-Type: application/json`
```json
{ "status": "resolved" }
```
Allowed: `open`, `reviewing`, `resolved`, `dismissed`

---

## 🧑‍💼 Admin

### Metrics
**GET** `/admin/metrics`  
Headers: `Authorization: Bearer <ADMIN_JWT>`

### List Users
**GET** `/admin/users?limit=20&offset=0`  
Headers: `Authorization: Bearer <ADMIN_JWT>`

### Force Remove Listing
**POST** `/admin/listings/{listingId}/remove`  
Headers: `Authorization: Bearer <ADMIN_JWT>`
