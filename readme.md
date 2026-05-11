# MES Backend & Operator Frontend — Change Log (May 2026)

This document summarizes engineering updates applied across **`D:\MES`** (backend) and **`D:\mes-operator\operator`** (operator frontend).

---

## 1. Backend: removed route modules

The following HTTP route groups are **no longer mounted** under `/api` (handlers may still exist on disk but are unreachable):

| Removed prefix | Former purpose |
|----------------|----------------|
| `/api/inventory` | Materials / consumption |
| `/api/quality` | Quality inspections |
| `/api/scheduling` | Scheduling |
| `/api/shifts` | Shift management |
| `/api/audit-logs` | Audit log listing |

**File:** `src/routes/index.js` — imports and `router.use(...)` entries for the above were removed. The `/api/health` feature list was trimmed accordingly.

---

## 2. Production rules (work order assignment)

### Ingest (`POST /api/ingest/:pathId`)

- **Before:** Any machine with a valid ingest path could increment production.
- **After:** Ingest returns **`403`** with a clear message if the machine is **not** assigned to an **active** work order (`work_orders.status` not `COMPLETED` / `CANCELLED`).

**Files:** `src/services/machineService.js` (`handleIngest`), `src/controllers/MachineController.js` (403 mapping).

### Manual production (`POST /api/production`)

- If `produced_count > 0`, the machine must have an **active** assignment; otherwise **`403`**.
- If `work_order_id` is omitted but production is recorded, the **active** work order id is inferred and stored on the log.
- If `work_order_id` is sent and does not match the active assignment → **`400`**.

**File:** `src/services/productionService.js`

---

## 3. Breakdown → maintenance display; resolve → running

- **Open breakdown** (any row with `status != 'RESOLVED'`) forces API **`status: MAINTENANCE`** for:
  - `GET /api/machines` (list)
  - `GET /api/machines/:id/details`
  - `GET /api/machines/:id/dashboard`
- **Resolving** a breakdown (`updateBreakdownStatus` → `RESOLVED`) sets the machine to **`RUNNING`** (was `NOT_STARTED`).

**Files:** `src/models/MachineBreakdown.js` (`findOpenByMachine`), `src/services/machineService.js`, `src/services/operatorService.js`

---

## 4. Work order aggregates (production / acceptance / rejection)

### Logic change (`_computeWorkOrderTotals`)

- **`total_produced`** = **SUM** of `production_count` across all rows in `work_order_machines` for that work order.
- **`total_rejected`** = **SUM** of `rejected_count` across those rows.
- **`total_accepted`** = `max(0, total_produced - total_rejected)`.

**File:** `src/services/productionService.js`

### New endpoint (alias for aggregated metrics)

- **`GET /api/work-orders/:workOrderId/production-metrics`**  
  **Auth:** Bearer (same as other work-order routes)  
  **Response:** Same JSON body as **`GET /api/work-orders/:workOrderId/summary`** without `group_by` (i.e. the object with `produced`, `accepted`, `rejected`, `target`, `targeted_end_date`, `completion_percentage`, etc.).

**Files:** `src/routes/workOrderRoutes.js`, `src/controllers/ProductionController.js`

#### Example response (`200`)

```json
{
  "success": true,
  "data": {
    "work_order_id": "WO-001",
    "work_order_name": "Sample WO",
    "status": "IN_PROGRESS",
    "target": 1000,
    "produced": 420,
    "accepted": 400,
    "rejected": 20,
    "remaining": 580,
    "completion_percentage": 42,
    "targeted_end_date": "2026-05-30"
  }
}
```

---

## 5. Machine visualization — monthly

- **`GET /api/machines/:machineId/visualization?filter=monthly&month=YYYY-MM`**
  - `month` defaults to the **current** `YYYY-MM` if omitted when `filter=monthly`.
  - Returns under `data.visualization.monthly`: `days[]` (per-day buckets), `total_production_count`, `total_rejected_count`, `total_accepted_count`, `month`, `month_label`, `start_date`, `end_date`.

**Files:** `src/services/machineService.js`, `src/controllers/MachineController.js`, `src/config/swagger.js` (query params documented).

---

## 6. Part rejections & rework

### `rework_reason` on `POST /api/operator/rejections`

- **Before:** Only `SCRATCH_MARK` and `OILY_CONTENT` were accepted → common `400` errors.
- **After:** Any non-empty text is **normalized** (uppercase, spaces → underscores, max 80 chars) and stored. Predefined list remains available via rework-reason helpers for UI hints.

### Completing rework (`markReworkCompleted`)

- **`rework_reason`** is optional when resolving; falls back to existing DB value or `REWORK_COMPLETED`.
- On completion, **decrements** open rejection totals:
  - `work_orders.total_rejected`
  - `work_order_machines.rejected_count` / recomputed `accepted_count`
  - `daily_production.rejected_count` for the **original rejection date**
- **Totals exposed to operators** (`getTotalRejectedByMachine` / `getTotalRejectedByWorkOrder`) now sum only rows where **`rework_status` is `NULL` or `PENDING`** (reworked rows no longer inflate counts).

**Files:** `src/services/operatorService.js`, `src/models/PartRejection.js`, `src/models/WorkOrder.js`, `src/models/WorkOrderMachine.js`, `src/models/DailyProduction.js`

---

## 7. Auth — operator & admin (business): register = login, guided flows

### Operator (`/api/operator/auth/*`)

- **`POST /api/operator/auth/register`**: after OTP verification returns **`accessToken`**, **`refreshToken`**, **`user`** in `data` (same shape as login); refresh token + last login updated server-side. No second login step.
- **`POST .../register/request-otp`**: existing email → **`409`** — *"This email is already registered. Please sign in instead."*
- **`POST .../login/request-otp`**: unknown email → **`401`** — *"No account found for this email. Please register first."*

### Admin / business (`/api/business/auth/*`)

Same behaviour as operator for parity:

- **`POST .../register`**: returns JWT + user in `data` (auto sign-in after successful registration).
- **`POST .../register/request-otp`**: existing email → **`409`** — *"This email is already registered as an admin. Please sign in instead."*
- **`POST .../login/request-otp`**: unknown email → **`401`** — *"No admin account found for this email. Please register first."*

**Files:** `src/services/operatorAuthService.js`, `src/controllers/OperatorAuthController.js`, `src/services/businessAuthService.js`, `src/controllers/BusinessAuthController.js`, `src/config/swagger.js`

#### Register response (`201`) — operator or business

```json
{
  "success": true,
  "message": "Account created. You are now signed in.",
  "data": {
    "user": { "id": 1, "username": "john_a1b2c3", "email": "a@b.com", "role": "operator", "userType": "operator" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

## 8. Swagger (`src/config/swagger.js`)

- Removed path documentation for **inventory, quality, scheduling, shifts, audit-logs** (including duplicate blocks).
- Documented **`403`** on **`POST /ingest/{pathId}`**.
- Extended **`/machines/{machineId}/visualization`** with `filter=monthly` and `month=YYYY-MM`.
- Added **`/work-orders/{workOrderId}/production-metrics`**.
- Updated **`/operator/auth/register`** and **`/business/auth/register`** response schemas to **`AuthData`** (tokens + user).
- Register **request-otp** (operator + business) documents **`409`** for already-registered email.

---

## 9. Operator frontend (`D:\mes-operator\operator`)

| Area | Change |
|------|--------|
| **Machine detail** (`MachineDetailPage.jsx`) | Removed **Report Rejection** button and modal; removed **Assigned Operators** card; fixed visualization parsing (`data.visualization`); added **Monthly** chart tab + month picker; passes `month` query for monthly filter. |
| **Machine list** (`MachineChecklistPage.jsx`) | Merge checklist + `/machines` so **`status` from `/machines` wins** (shows **MAINTENANCE** during open breakdown). |
| **Work order detail** (`WorkOrderDetailPage.jsx`) | Fetches **`GET /work-orders/:id/production-metrics`**; stat cards show **Target, Production, Acceptance, Rejections, Progress** from API. |
| **API** (`workOrderApi.js`) | Added `getProductionMetrics`. |
| **Register** (`RegisterPage.jsx`) | **409** → inline *Sign in instead* CTA; prefilled email via `location.state` / `?email=`; hint banner when coming from login (*no account*); after successful register always **`navigate('/', { replace: true })`** (session from JWT). |
| **Login** (`LoginPage.jsx`) | **401** on OTP request → *Create account* CTA; prefilled email; hint when coming from register (*already registered*). |
| **AuthContext** | Failed login/register return **`statusCode`** for smarter UI. |

The **`AuthContext`** persists tokens on register when the API returns **`accessToken`** (operator and business backends now both do).

---

## 10. Quick API reference (new / changed behavior)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/ingest/:pathId` | **403** if machine not on active WO |
| `POST` | `/api/production` | **403** if `produced_count > 0` and no active WO |
| `GET` | `/api/machines/:id/visualization` | `filter=monthly`, optional `month=YYYY-MM` |
| `GET` | `/api/work-orders/:id/production-metrics` | Aggregated metrics (same as `/summary`) |
| — | `/api/inventory/*`, `/quality/*`, `/scheduling/*`, `/shifts/*`, `/audit-logs` | **Removed** from router |

---

## 11. Verification

From `D:\MES`:

```powershell
node -e "require('./src/routes/index'); require('./src/config/swagger'); console.log('OK');"
```

---

*Generated as part of the MES engineering update. Adjust client base URLs and JWT storage to match your deployment.*
