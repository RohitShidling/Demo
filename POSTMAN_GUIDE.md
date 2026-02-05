# Postman API Testing Guide

## 1. Start Machine and Create Entry
**URL**: `http://localhost:3000/api/production/start`
**Method**: `POST`
**Body**: `form-data`
- Key: `machine_id` | Value: `MACH-001`
- Key: `machine_name` | Value: `Molding Machine A`
- Key: `machine_image` | Value: [Select a File] (Type: File)

**Expected Response**:
```json
{
    "id": 1,
    "status": "started"
}
```

## 2. Update Production Count
**URL**: `http://localhost:3000/api/production/update`
**Method**: `POST`
**Body**: `JSON` (raw)
```json
{
    "machine_id": "MACH-001",
    "count": 50
}
```

**Expected Response**:
```json
{
    "id": 1,
    "count": 50,
    "status": "updated"
}
```

## 3. Get Real-Time Data (Latest Active)
**URL**: `http://localhost:3000/api/production/MACH-001`
**Method**: `GET`

**Expected Response**:
```json
{
    "machine_id": "MACH-001",
    "machine_name": "Molding Machine A",
    "machine_image": "<Base64 String>",
    "start_time": "2023-10-27T10:00:00.000Z",
    "count": 50,
    "end_time": null,
    "createdAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:30:00.000Z"
}
```

## 4. Get Machine History (Hourly Logs)
**URL**: `http://localhost:3000/api/production/MACH-001/history`
**Method**: `GET`

**Expected Response**:
```json
[
    {
        "machine_id": "MACH-001",
        "machine_name": "Molding Machine A",
        "machine_image": "<Base64 String>",
        "start_time": "2023-10-27T10:00:00.000Z",
        "count": 50,
        "end_time": "2023-10-27T11:00:00.000Z",
        "createdAt": "...",
        "updatedAt": "..."
    },
    ...
]
```

## 5. Stop Machine
**URL**: `http://localhost:3000/api/production/stop`
**Method**: `POST`
**Body**: `JSON` (raw)
```json
{
    "machine_id": "MACH-001"
}
```

## 6. Verify Hourly Rotation
- The system automatically creates a new row every hour via Cron (`0 * * * *`).
