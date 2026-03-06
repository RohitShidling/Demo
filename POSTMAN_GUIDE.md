# Postman API Testing Guide (v2 - JWT Authentication)

## 🔐 Authentication Flow

### 1. Register User
**URL**: `http://localhost:3000/api/auth/register`
**Method**: `POST`
**Body**: `raw JSON`
```json
{
    "username": "rohit",
    "email": "rohit@example.com",
    "password": "password123",
    "full_name": "Rohit Shidling",
    "role": "admin"
}
```

**Expected Response** (201):
```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "id": 1,
        "username": "rohit",
        "email": "rohit@example.com",
        "full_name": "Rohit Shidling",
        "role": "admin"
    }
}
```

### 2. Login
**URL**: `http://localhost:3000/api/auth/login`
**Method**: `POST`
**Body**: `raw JSON`
```json
{
    "username": "rohit",
    "password": "password123"
}
```

**Expected Response** (200):
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": { "id": 1, "username": "rohit", "role": "admin" },
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi..."
    }
}
```

> **⚠️ IMPORTANT**: Copy the `accessToken`. All subsequent API calls need it in the `Authorization` header.

### 3. Set Authorization Header
For ALL protected endpoints, add this header:
- **Key**: `Authorization`
- **Value**: `Bearer <your_access_token>`

> **💡 TIP**: In Postman, go to the Collection settings → Authorization → Set type to "Bearer Token" → Paste your token.

### 4. Get Current User Profile
**URL**: `http://localhost:3000/api/auth/me`
**Method**: `GET`
**Headers**: `Authorization: Bearer <token>`

### 5. Refresh Token
**URL**: `http://localhost:3000/api/auth/refresh`
**Method**: `POST`
**Body**: `raw JSON`
```json
{
    "refreshToken": "eyJhbGciOi..."
}
```

### 6. Logout
**URL**: `http://localhost:3000/api/auth/logout`
**Method**: `POST`
**Headers**: `Authorization: Bearer <token>`

---

## 🏭 Machine APIs (All require `Authorization: Bearer <token>`)

### 7. Configure Machine
**URL**: `http://localhost:3000/api/machines`
**Method**: `POST`
**Headers**: `Authorization: Bearer <token>`
**Body**: `form-data`
- Key: `machine_name` | Value: `Press Machine A`
- Key: `ingest_path` | Value: `press-01`
- Key: `machine_image` | Value: [Select File]

**Expected Response** (201):
```json
{
    "machine_id": "MACH-FA34B1CC",
    "machine_name": "Press Machine A",
    "ingest_path": "/press-01"
}
```

### 8. Get All Machines
**URL**: `http://localhost:3000/api/machines`
**Method**: `GET`
**Headers**: `Authorization: Bearer <token>`

### 9. Ingest Data (Simulate Production)
**URL**: `http://localhost:3000/api/ingest/press-01`
**Method**: `POST`
**Headers**: `Authorization: Bearer <token>`
**Body**: Empty

**Logic**:
- First request: Starts the machine run, sets status RUNNING.
- Subsequent requests: Increments count in the current hour's bucket.
- **Tip**: Use Postman "Runner" to send 50 requests with 500ms delay to simulate production.

### 10. Live Dashboard
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1CC/dashboard`
**Method**: `GET`
**Headers**: `Authorization: Bearer <token>`

### 11. Get Production History (Hourly)
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1CC/history`
**Method**: `GET`
**Headers**: `Authorization: Bearer <token>`

### 12. Stop Machine
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1CC/stop`
**Method**: `POST`
**Headers**: `Authorization: Bearer <token>`

---

## 🔄 WebSocket (Socket.IO) - JWT Protected

### Connection
```javascript
const socket = io('http://localhost:3000/machines', {
    auth: {
        token: 'your_jwt_access_token'
    }
});
```

### Events
All socket events work the same as before, but connection requires JWT token.

---

## 🧪 Simulation Steps
1. **Register** a user (POST /api/auth/register)
2. **Login** to get access token (POST /api/auth/login)
3. **Create** a machine with path `press-01` (POST /api/machines)
4. **Ingest** data: POST /api/ingest/press-01 → verifies status becomes RUNNING
5. Hit ingest 5 more times → Dashboard count should be 6
6. **Stop** the machine (POST /api/machines/{id}/stop)
7. Hit ingest again → Starts a **NEW** run (Run ID increments)
