# 🏭 MES Backend - Complete Postman API Testing Guide

**Base URL:** `http://localhost:3000`  
**API Prefix:** `/api`

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Business Auth APIs](#1-business-level-auth)
3. [Operator Auth APIs](#2-operator-level-auth)
4. [Work Order APIs](#3-work-orders)
5. [Machine APIs](#4-machines)
6. [Operator Feature APIs](#5-operator-features)
7. [Alert APIs](#6-alerts)
8. [Workflow APIs](#7-workflows)

---

## Setup Instructions

### Step 1: Create Postman Environment Variables

In Postman, go to **Environments** → **Create New** → Name it `MES Local`

Add these variables:

| Variable             | Initial Value                  |
|----------------------|--------------------------------|
| `base_url`           | `http://localhost:3000/api`    |
| `business_token`     | *(leave empty)*                |
| `operator_token`     | *(leave empty)*                |

### Step 2: Auto-Save Tokens

For **Business Login** and **Operator Login** requests, add this script in the **Tests** tab to auto-save the token:

```javascript
// Paste this in the "Tests" tab of login requests
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    // For business login:
    pm.environment.set("business_token", jsonData.data.accessToken);
    // For operator login:
    // pm.environment.set("operator_token", jsonData.data.accessToken);
}
```

### Step 3: Set Authorization Header

For all protected routes, go to **Authorization** tab:
- Type: `Bearer Token`
- Token: `{{business_token}}` or `{{operator_token}}`

Or manually add Header:
- Key: `Authorization`
- Value: `Bearer {{business_token}}`

---

## 1. Business Level Auth

### 1.1 Register Business User (Admin)

```
POST {{base_url}}/business/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
    "username": "admin_rohit",
    "email": "rohit@business.com",
    "password": "admin123",
    "full_name": "Rohit Shidling"
}
```

**Expected Response (201):**
```json
{
    "success": true,
    "message": "Business user registered successfully",
    "data": {
        "id": 1,
        "username": "admin_rohit",
        "email": "rohit@business.com",
        "full_name": "Rohit Shidling",
        "role": "admin"
    }
}
```

---

### 1.2 Login Business User

```
POST {{base_url}}/business/auth/login
```

**Body (JSON):**
```json
{
    "email": "rohit@business.com",
    "password": "admin123"
}
```

**Tests Tab Script (auto-save token):**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("business_token", jsonData.data.accessToken);
    pm.environment.set("business_refresh_token", jsonData.data.refreshToken);
}
```

**Expected Response (200):**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "username": "admin_rohit",
            "email": "rohit@business.com",
            "full_name": "Rohit Shidling",
            "role": "admin",
            "userType": "business"
        },
        "accessToken": "eyJhbG...",
        "refreshToken": "eyJhbG..."
    }
}
```

---

### 1.3 Get Business Profile

```
GET {{base_url}}/business/auth/me
```

**Authorization:** `Bearer {{business_token}}`

---

### 1.4 Refresh Business Token

```
POST {{base_url}}/business/auth/refresh
```

**Body (JSON):**
```json
{
    "refreshToken": "{{business_refresh_token}}"
}
```

---

### 1.5 Logout Business User

```
POST {{base_url}}/business/auth/logout
```

**Authorization:** `Bearer {{business_token}}`

---

## 2. Operator Level Auth

### 2.1 Register Operator

```
POST {{base_url}}/operator/auth/register
```

**Body (JSON):**
```json
{
    "username": "operator_ravi",
    "email": "ravi@operator.com",
    "password": "operator123",
    "full_name": "Ravi Kumar"
}
```

---

### 2.2 Login Operator

```
POST {{base_url}}/operator/auth/login
```

**Body (JSON):**
```json
{
    "email": "ravi@operator.com",
    "password": "operator123"
}
```

**Tests Tab Script (auto-save token):**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("operator_token", jsonData.data.accessToken);
    pm.environment.set("operator_refresh_token", jsonData.data.refreshToken);
}
```

---

### 2.3 Get Operator Profile

```
GET {{base_url}}/operator/auth/me
```

**Authorization:** `Bearer {{operator_token}}`

---

### 2.4 Refresh Operator Token

```
POST {{base_url}}/operator/auth/refresh
```

**Body (JSON):**
```json
{
    "refreshToken": "{{operator_refresh_token}}"
}
```

---

### 2.5 Logout Operator

```
POST {{base_url}}/operator/auth/logout
```

**Authorization:** `Bearer {{operator_token}}`

---

## 3. Work Orders

> **Authorization:** Use `Bearer {{business_token}}` for all Work Order APIs

### 3.1 Create Work Order

```
POST {{base_url}}/work-orders
```

**Body (JSON):**
```json
{
    "work_order_name": "Dosa Tawa - Large",
    "target": 1000,
    "description": "Make 1000 Dosa Tawa with 2mm thickness, 30cm radius, black non-stick coating, wooden handle"
}
```

**Tests Tab (save work_order_id):**
```javascript
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("work_order_id", jsonData.data.work_order_id);
}
```

---

### 3.2 Create Another Work Order

```
POST {{base_url}}/work-orders
```

**Body (JSON):**
```json
{
    "work_order_name": "Frying Pan - Medium",
    "target": 500,
    "description": "Make 500 medium frying pans, 24cm diameter, aluminum body, ceramic coating, stainless steel handle"
}
```

---

### 3.3 Get All Work Orders

```
GET {{base_url}}/work-orders
```

---

### 3.4 Get Single Work Order

```
GET {{base_url}}/work-orders/{{work_order_id}}
```

---

### 3.5 Update Work Order

```
PUT {{base_url}}/work-orders/{{work_order_id}}
```

**Body (JSON):**
```json
{
    "target": 1200,
    "status": "IN_PROGRESS",
    "description": "Updated: Make 1200 Dosa Tawa with 2mm thickness, 30cm radius, black non-stick coating"
}
```

---

### 3.6 Assign Machine to Work Order

```
POST {{base_url}}/work-orders/{{work_order_id}}/machines
```

**Body (JSON):**
```json
{
    "machine_id": "MACH-XXXXXXXX"
}
```

> ⚠️ Replace `MACH-XXXXXXXX` with an actual machine_id from `GET /api/machines`

---

### 3.7 Get All Machines for a Work Order

```
GET {{base_url}}/work-orders/{{work_order_id}}/machines
```

**Expected Response:** Shows all machines working on this work order with their status, production count, rejections, etc.

---

### 3.8 Unassign Machine from Work Order

```
DELETE {{base_url}}/work-orders/{{work_order_id}}/machines/MACH-XXXXXXXX
```

---

### 3.9 Get Rejections per Work Order

```
GET {{base_url}}/work-orders/{{work_order_id}}/rejections
```

---

### 3.10 Delete Work Order

```
DELETE {{base_url}}/work-orders/{{work_order_id}}
```

---

## 4. Machines

> **Authorization:** Use `Bearer {{business_token}}` or `Bearer {{operator_token}}`

### 4.1 Create Machine

```
POST {{base_url}}/machines
```

**Body (form-data):**

| Key             | Type | Value                |
|-----------------|------|----------------------|
| `machine_name`  | Text | `CNC Lathe Machine 1`|
| `ingest_path`   | Text | `/cnc-lathe-1`       |
| `machine_image` | File | *(select image file)* |

**Tests Tab (save machine_id):**
```javascript
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("machine_id_1", jsonData.machine_id);
}
```

---

### 4.2 Create More Machines

Create several machines for testing:

**Machine 2:**
```
machine_name: Forming Press A
ingest_path: /forming-press-a
```

**Machine 3:**
```
machine_name: Coating Station B
ingest_path: /coating-station-b
```

**Machine 4:**
```
machine_name: Welding Unit C
ingest_path: /welding-unit-c
```

---

### 4.3 Get All Machines

```
GET {{base_url}}/machines
```

**Expected Response:** All machines with status, image (base64), production counts, rejections.

---

### 4.4 Get Machine Details (Full)

```
GET {{base_url}}/machines/{{machine_id_1}}/details
```

**Expected Response:** Complete machine info including operators, breakdowns, run history.

---

### 4.5 Get Machine Dashboard

```
GET {{base_url}}/machines/{{machine_id_1}}/dashboard
```

---

### 4.6 Get Machine Visualization (Hourly/Daily/Calendar)

**All data (hourly + daily):**
```
GET {{base_url}}/machines/{{machine_id_1}}/visualization
```

**Hourly filter:**
```
GET {{base_url}}/machines/{{machine_id_1}}/visualization?filter=hourly
```

**Daily filter:**
```
GET {{base_url}}/machines/{{machine_id_1}}/visualization?filter=daily
```

**Calendar/Date range filter:**
```
GET {{base_url}}/machines/{{machine_id_1}}/visualization?filter=daily&start_date=2026-03-01&end_date=2026-03-09
```

---

### 4.7 Get Machine History (Hourly Buckets)

```
GET {{base_url}}/machines/{{machine_id_1}}/history
```

---

### 4.8 Ingest Data (Simulate Production Count)

```
POST {{base_url}}/ingest/cnc-lathe-1
```

> No body needed. Each call increments the production count by 1.  
> Call this multiple times to simulate production.

---

### 4.9 Stop Machine

```
POST {{base_url}}/machines/{{machine_id_1}}/stop
```

---

## 5. Operator Features

> **Authorization:** Use `Bearer {{operator_token}}` for all Operator APIs

### 5.1 Machine Status Checklist

#### Get Machine Checklist
```
GET {{base_url}}/operator/checklist
```

#### Update Machine Status
```
POST {{base_url}}/operator/checklist/update
```

**Body (JSON):**
```json
{
    "machine_id": "MACH-XXXXXXXX",
    "status": "RUNNING"
}
```

**Valid statuses:** `RUNNING`, `MAINTENANCE`, `NOT_STARTED`

---

### 5.2 Part Rejections

#### Report Part Rejection

```
POST {{base_url}}/operator/rejections
```

**Body (form-data):**

| Key                | Type | Value                              |
|--------------------|------|------------------------------------|
| `machine_id`       | Text | `MACH-XXXXXXXX`                    |
| `work_order_id`    | Text | `WO-XXXXXXXX` *(optional)*         |
| `rejection_reason` | Text | `Surface crack found on the tawa`  |
| `rejected_count`   | Text | `3`                                |
| `part_image`       | File | *(select image of rejected part)*  |

---

#### Get All Rejections

```
GET {{base_url}}/operator/rejections
```

---

#### Get Rejections by Machine

```
GET {{base_url}}/operator/rejections/machine/{{machine_id_1}}
```

---

### 5.3 Operator Skill Set

#### Update My Skills

```
POST {{base_url}}/operator/skills
```

**Body (JSON):**
```json
{
    "operator_name": "Ravi Kumar",
    "skill_set": [
        "CNC Machine Operation",
        "Lathe Operation",
        "Quality Inspection",
        "Welding - MIG",
        "Welding - TIG",
        "Machine Maintenance"
    ]
}
```

---

#### Get My Skills

```
GET {{base_url}}/operator/skills/me
```

---

#### Get All Operators' Skills

```
GET {{base_url}}/operator/skills
```

---

### 5.4 Machine-Operator Assignment

#### Assign Myself to a Machine

```
POST {{base_url}}/operator/assign
```

**Body (JSON):**
```json
{
    "machine_id": "MACH-XXXXXXXX",
    "mentor_name": "Suresh Kumar"
}
```

---

#### Get My Assigned Machines

```
GET {{base_url}}/operator/my-machines
```

---

#### Get Operators for a Machine

```
GET {{base_url}}/operator/machine-operators/{{machine_id_1}}
```

---

#### Get All Assignments

```
GET {{base_url}}/operator/assignments
```

---

#### Unassign from Machine

```
DELETE {{base_url}}/operator/assign/{{machine_id_1}}
```

---

### 5.5 Machine Breakdowns

#### Report Breakdown

```
POST {{base_url}}/operator/breakdowns
```

**Body (JSON):**
```json
{
    "machine_id": "MACH-XXXXXXXX",
    "problem_description": "Spindle motor overheating. Unusual vibration and noise from the bearing assembly. Machine stopped automatically.",
    "severity": "HIGH"
}
```

**Valid severity levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

> ⚠️ Reporting a breakdown automatically sets the machine status to `MAINTENANCE`

---

#### Update Breakdown Status

```
PATCH {{base_url}}/operator/breakdowns/1/status
```

**Body (JSON):**
```json
{
    "status": "IN_REPAIR"
}
```

**Valid statuses:** `REPORTED`, `ACKNOWLEDGED`, `IN_REPAIR`, `RESOLVED`

> ⚠️ Setting status to `RESOLVED` automatically sets the machine status back to `NOT_STARTED`

---

#### Get Active Breakdowns

```
GET {{base_url}}/operator/breakdowns/active
```

---

#### Get Breakdowns by Machine

```
GET {{base_url}}/operator/breakdowns/machine/{{machine_id_1}}
```

---

#### Get All Breakdowns

```
GET {{base_url}}/operator/breakdowns
```

---

## 6. Alerts

> **Authorization:** Use `Bearer {{business_token}}`

### 6.1 Get All Alerts

```
GET {{base_url}}/alerts
```

**Expected Response:**
```json
{
    "success": true,
    "data": {
        "stopped_and_maintenance_machines": [
            {
                "machine_id": "MACH-XXXXXXXX",
                "machine_name": "CNC Lathe Machine 1",
                "status": "MAINTENANCE",
                "latest_breakdown_reason": "Spindle motor overheating...",
                "breakdown_severity": "HIGH",
                "breakdown_reported_at": "2026-03-09T05:10:00.000Z"
            }
        ],
        "active_breakdowns": [...],
        "total_alerts": 2
    }
}
```

---

## 7. Workflows

> **Authorization:** Use `Bearer {{business_token}}` or `Bearer {{operator_token}}`

### 7.1 Add Workflow Steps (Bulk)

```
POST {{base_url}}/workflows/{{work_order_id}}/steps/bulk
```

**Body (JSON):**
```json
{
    "steps": [
        {
            "step_order": 1,
            "step_name": "Raw Material Procurement",
            "step_description": "Procure aluminum sheets, 2mm thickness, Grade 3003"
        },
        {
            "step_order": 2,
            "step_name": "Sheet Cutting",
            "step_description": "Cut aluminum sheets into 35cm circular blanks"
        },
        {
            "step_order": 3,
            "step_name": "Deep Drawing / Forming",
            "step_description": "Form the tawa shape using hydraulic press, maintaining 30cm diameter",
            "assigned_machine_id": "MACH-XXXXXXXX"
        },
        {
            "step_order": 4,
            "step_name": "Surface Treatment",
            "step_description": "Sand blast and clean the formed tawa surface"
        },
        {
            "step_order": 5,
            "step_name": "Non-Stick Coating",
            "step_description": "Apply 3-layer PTFE non-stick black coating",
            "assigned_machine_id": "MACH-XXXXXXXX"
        },
        {
            "step_order": 6,
            "step_name": "Handle Welding",
            "step_description": "Weld wooden handle bracket using spot welding",
            "assigned_machine_id": "MACH-XXXXXXXX"
        },
        {
            "step_order": 7,
            "step_name": "Quality Inspection",
            "step_description": "Check coating thickness, handle strength, surface finish"
        },
        {
            "step_order": 8,
            "step_name": "Packaging",
            "step_description": "Pack in branded box with bubble wrap protection"
        }
    ]
}
```

---

### 7.2 Add Single Workflow Step

```
POST {{base_url}}/workflows/{{work_order_id}}/steps
```

**Body (JSON):**
```json
{
    "step_order": 9,
    "step_name": "Dispatch",
    "step_description": "Load packaged tawas for shipping to warehouse"
}
```

---

### 7.3 Get Workflow (All Steps for Work Order)

```
GET {{base_url}}/workflows/{{work_order_id}}
```

**Expected Response:** Work order details + all workflow steps in order.

---

### 7.4 Update Step Status

```
PATCH {{base_url}}/workflows/steps/1/status
```

**Body (JSON):**
```json
{
    "status": "IN_PROGRESS"
}
```

**Valid statuses:** `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`

---

### 7.5 Update Step Details

```
PUT {{base_url}}/workflows/steps/1
```

**Body (JSON):**
```json
{
    "step_name": "Raw Material - Aluminum Procurement",
    "step_description": "Updated: Procure aluminum sheets Grade 5052 instead of 3003"
}
```

---

### 7.6 Delete a Step

```
DELETE {{base_url}}/workflows/steps/9
```

---

## 🔄 Complete Testing Flow (Step-by-Step)

Follow this order to test the full system:

### Phase 1: Setup Users
1. ✅ Register Business User → `POST /api/business/auth/register`
2. ✅ Login Business User → `POST /api/business/auth/login` (save token)
3. ✅ Register Operator → `POST /api/operator/auth/register`
4. ✅ Login Operator → `POST /api/operator/auth/login` (save token)

### Phase 2: Create Machines (Business Token)
5. ✅ Create Machine 1 → `POST /api/machines` (form-data)
6. ✅ Create Machine 2 → `POST /api/machines`
7. ✅ Create Machine 3 → `POST /api/machines`
8. ✅ Get All Machines → `GET /api/machines`

### Phase 3: Create Work Orders (Business Token)
9. ✅ Create Work Order 1 → `POST /api/work-orders`
10. ✅ Create Work Order 2 → `POST /api/work-orders`
11. ✅ Assign machines to work order → `POST /api/work-orders/:id/machines`
12. ✅ Get work order machines → `GET /api/work-orders/:id/machines`

### Phase 4: Add Workflows (Business Token)
13. ✅ Add bulk workflow steps → `POST /api/workflows/:workOrderId/steps/bulk`
14. ✅ Get workflow → `GET /api/workflows/:workOrderId`
15. ✅ Update step status → `PATCH /api/workflows/steps/:stepId/status`

### Phase 5: Operator Operations (Operator Token)
16. ✅ Get machine checklist → `GET /api/operator/checklist`
17. ✅ Update machine status → `POST /api/operator/checklist/update`
18. ✅ Update operator skills → `POST /api/operator/skills`
19. ✅ Assign to machine → `POST /api/operator/assign`
20. ✅ Report rejection → `POST /api/operator/rejections` (form-data with image)
21. ✅ Report breakdown → `POST /api/operator/breakdowns`

### Phase 6: Simulate Production (Business/Operator Token)
22. ✅ Ingest data multiple times → `POST /api/ingest/cnc-lathe-1` (call 10 times)
23. ✅ Get machine visualization → `GET /api/machines/:id/visualization`
24. ✅ Get machine details → `GET /api/machines/:id/details`

### Phase 7: Check Alerts (Business Token)
25. ✅ Get alerts → `GET /api/alerts`
26. ✅ Resolve breakdown → `PATCH /api/operator/breakdowns/:id/status`
27. ✅ Check alerts again → `GET /api/alerts` (should show fewer alerts)

### Phase 8: View Results (Business Token)
28. ✅ Get all work orders → `GET /api/work-orders`
29. ✅ Get work order rejections → `GET /api/work-orders/:id/rejections`
30. ✅ Get machine history → `GET /api/machines/:id/history`

---

## 🌐 Socket.IO Testing

### Connect using Socket.IO client (or Postman WebSocket)

**URL:** `ws://localhost:3000/machines`

**Auth:** Pass token in handshake:
```javascript
const socket = io("http://localhost:3000/machines", {
    auth: { token: "YOUR_JWT_TOKEN_HERE" }
});
```

### Available Socket Events (Client → Server):

| Event                      | Payload                                      |
|----------------------------|----------------------------------------------|
| `machine:getAll`           | `{}`                                         |
| `machine:getDashboard`     | `{ machineId: "MACH-XXX" }`                 |
| `machine:getDetails`       | `{ machineId: "MACH-XXX" }`                 |
| `machine:getVisualization` | `{ machineId: "MACH-XXX", filter: "daily" }`|
| `machine:getHistory`       | `{ machineId: "MACH-XXX" }`                 |
| `machine:create`           | `{ machine_name, ingest_path }`              |
| `machine:ingest`           | `{ pathId: "cnc-lathe-1" }`                 |
| `machine:stop`             | `{ machineId: "MACH-XXX" }`                 |
| `operator:updateStatus`    | `{ machine_id, status }`                     |
| `operator:reportRejection` | `{ machine_id, rejection_reason, ... }`      |
| `operator:reportBreakdown` | `{ machine_id, problem_description, ... }`   |
| `alerts:get`               | `{}`                                         |
| `workorder:getAll`         | `{}`                                         |
| `workorder:getMachines`    | `{ workOrderId: "WO-XXX" }`                 |
| `workflow:get`             | `{ workOrderId: "WO-XXX" }`                 |
| `machine:subscribe`        | `{ machineId: "MACH-XXX" }`                 |
| `machine:unsubscribe`      | `{ machineId: "MACH-XXX" }`                 |

### Real-time Events (Server → Client):

| Event                   | When                                  |
|-------------------------|---------------------------------------|
| `machine:update`        | Machine created/ingested/stopped      |
| `machine:status_changed`| Operator changed machine status       |
| `rejection:reported`    | Operator reported part rejection      |
| `breakdown:reported`    | Operator reported machine breakdown   |
| `breakdown:updated`     | Breakdown status changed              |
| `alerts:updated`        | Alert data changed                    |
| `workorder:created`     | New work order created                |
| `workorder:updated`     | Work order updated                    |
| `workorder:deleted`     | Work order deleted                    |
| `workflow:step_added`   | Workflow step added                   |
| `workflow:step_updated` | Workflow step status changed          |
