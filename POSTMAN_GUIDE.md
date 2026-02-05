# Postman API Testing Guide (v2 - Normalized Architecture)

## 1. Configure Machine
**URL**: `http://localhost:3000/api/machines`
**Method**: `POST`
**Body**: `form-data`
- Key: `machine_name` | Value: `Press Machine A`
- Key: `ingest_path` | Value: `press-01`
- Key: `machine_image` | Value: [Select File]

**Expected Response**:
```json
{
    "machine_id": "MACH-FA34B1",
    "machine_name": "Press Machine A",
    "ingest_path": "/press-01"
}
```

## 2. Ingest Data (Simulate Production)
**URL**: `http://localhost:3000/api/ingest/press-01`
**Method**: `POST`
**Body**: Empty (or any JSON for metadata if extended later)

**Logic**:
- First request: Starts the machine run, sets status RUNNING.
- Subsequent requests: Increments count in the current hour's bucket.
- **Tip**: Use Postman "Runner" to send 50 requests with 500ms delay to simulate production.

## 3. Live Dashboard
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1/dashboard`
**Method**: `GET`

**Expected Response**:
```json
{
    "machine_id": "MACH-FA34B1",
    "machine_name": "Press Machine A",
    "status": "RUNNING",
    "current_run": {
        "start_time": "2023-10-27T10:00:00.000Z",
        "total_count": 50,
        "last_activity": "2023-10-27T10:01:45.000Z"
    }
}
```

## 4. Get Production History (Hourly)
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1/history`
**Method**: `GET`

**Expected Response**:
```json
[
    {
        "hour_start": "2023-10-27T10:00:00.000Z",
        "hour_end": "2023-10-27T11:00:00.000Z",
        "count": 50,
        "run_id": 101
    }
]
```

## 5. Stop Machine
**URL**: `http://localhost:3000/api/machines/MACH-FA34B1/stop`
**Method**: `POST`

**Response**:
```json
{ "status": "stopped", "run_id": 101 }
```

## Simulation Tips
1. Create a machine with path `press-01`.
2. Hit `POST /api/ingest/press-01` and verify status becomes 'RUNNING'.
3. Hit it 5 more times. Dashboard count should be 6.
4. Stop the machine.
5. Hit ingest again -> It should start a **NEW** run (Run ID increments).
