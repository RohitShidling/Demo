# 📸 How to Upload Machine Image in Postman

## ✅ Step-by-Step Image Upload Guide

### **Endpoint:** Upload Machine Image

**URL:** `http://localhost:3000/api/machines/{machine_id}/image`  
**Method:** `PUT`

---

## 🎯 **Steps in Postman:**

### **1. Create Machine First (if not already created)**

```
POST http://localhost:3000/api/machines
Content-Type: application/json

{
  "machine_id": "PM-001",
  "start_time": "09:30 AM",
  "count": 0,
  "end_time": null
}
```

---

### **2. Upload Image**

**Step 1:** Change method to `PUT`

**Step 2:** Set URL:
```
http://localhost:3000/api/machines/PM-001/image
```

**Step 3:** Go to **Body** tab

**Step 4:** Select **form-data** (NOT raw or JSON!)

**Step 5:** Add the image:
- Click in the **Key** field
- Type: `image`
- Change the dropdown from "Text" to **"File"**
- Click **"Select Files"** button that appears
- Choose an image file from your computer (JPG, PNG, etc.)

**Step 6:** Click **Send**

---

## ✅ **Expected Response:**

```json
{
  "success": true,
  "message": "Machine image uploaded successfully",
  "statusCode": 200,
  "data": {
    "machine_id": "PM-001",
    "machine_image": "PM-001-1738659600000.jpg",
    "imageUrl": "/uploads/machine-images/PM-001-1738659600000.jpg",
    "start_time": "09:30 AM",
    "count": 0,
    "end_time": null,
    "createdAt": "2026-02-04T09:45:44.000Z",
    "updatedAt": "2026-02-04T09:46:00.000Z"
  }
}
```

---

## 📸 **Visual Guide:**

### **In Postman Body Tab:**

```
┌─────────────────────────────────────────┐
│ Body Tab                                │
├─────────────────────────────────────────┤
│ ○ none                                  │
│ ○ form-data  ← SELECT THIS              │
│ ○ x-www-form-urlencoded                 │
│ ○ raw                                   │
│ ○ binary                                │
│ ○ GraphQL                               │
└─────────────────────────────────────────┘

┌──────────────┬──────────┬──────────────┐
│ KEY          │ VALUE    │ DESCRIPTION  │
├──────────────┼──────────┼──────────────┤
│ image  [File]│ [Select  │              │
│              │  Files]  │              │
└──────────────┴──────────┴──────────────┘
```

---

## 🎯 **Complete Example:**

### **1. Create Machine with Time Format**

```
POST http://localhost:3000/api/machines
Content-Type: application/json

{
  "machine_id": "PM-001",
  "start_time": "09:30 AM",
  "count": 0
}
```

### **2. Upload Image**

```
PUT http://localhost:3000/api/machines/PM-001/image
Body: form-data
Key: image (File type)
Value: [Select your image file]
```

### **3. Update End Time**

```
PUT http://localhost:3000/api/machines/PM-001
Content-Type: application/json

{
  "count": 250,
  "end_time": "05:30 PM"
}
```

### **4. Get Machine Data**

```
GET http://localhost:3000/api/machines/PM-001
```

**Response:**
```json
{
  "success": true,
  "message": "Machine retrieved successfully",
  "statusCode": 200,
  "data": {
    "machine_id": "PM-001",
    "machine_image": "PM-001-1738659600000.jpg",
    "imageUrl": "/uploads/machine-images/PM-001-1738659600000.jpg",
    "start_time": "09:30 AM",
    "count": 250,
    "end_time": "05:30 PM",
    "createdAt": "2026-02-04T09:45:44.000Z",
    "updatedAt": "2026-02-04T09:50:00.000Z"
  }
}
```

---

## 📝 **Time Format Examples:**

Now you can use simple time format:

✅ **Correct Formats:**
- `"09:30 AM"`
- `"02:45 PM"`
- `"12:00 PM"`
- `"11:59 PM"`

❌ **Old Format (No longer needed):**
- `"2026-02-04T09:30:00.000Z"`

---

## 🖼️ **View Uploaded Image:**

After uploading, you can view the image in browser:

```
http://localhost:3000/uploads/machine-images/PM-001-1738659600000.jpg
```

(Use the filename from the response)

---

## 📁 **Image Storage Location:**

Images are saved in:
```
d:\MES\uploads\machine-images\
```

You can check this folder to see uploaded images!

---

## ⚠️ **Important Notes:**

1. **File Type:** Only images allowed (JPG, PNG, JPEG)
2. **File Size:** Maximum 5MB
3. **Body Type:** Must use `form-data`, NOT `raw` or `JSON`
4. **Key Name:** Must be exactly `image`

---

## 🎊 **Complete Workflow:**

```
1. Create machine with start_time: "09:00 AM"
2. Upload machine image (form-data)
3. Update count as production increases
4. Update end_time: "05:00 PM" when done
5. Get machine data to see everything
```

---

## 🚀 **Try It Now!**

The server has been updated to accept time in `"HH:MM AM/PM"` format. Try creating a machine with the new time format! 🎉
