/**
 * Test script: sends a multipart/form-data POST to create a machine.
 * Run:  node test_upload.js
 *
 * It first logs in to get a token, then POSTs form-data with a tiny
 * dummy image (1×1 red PNG) to POST /api/machines.
 */

const http = require('http');

// ── 1. Login to get a token ────────────────────────────────────────
function login() {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ email: 'rohit@business.com', password: 'admin123' });
        const req = http.request({
            hostname: 'localhost', port: 3000,
            path: '/api/business/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.data && json.data.accessToken) {
                        console.log('✅ Login OK — got token');
                        resolve(json.data.accessToken);
                    } else {
                        reject(new Error('Login failed: ' + data));
                    }
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.end(body);
    });
}

// ── 2. POST multipart/form-data ────────────────────────────────────
function createMachine(token) {
    return new Promise((resolve, reject) => {
        const boundary = '----TestBoundary' + Date.now();

        // Create a tiny 1x1 red PNG (68 bytes)
        const pngBuf = Buffer.from(
            '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
            '2e00000000c4944415408d76360f8cf00000000020001e221bc330000000049454e44ae426082',
            'hex'
        );

        // Build multipart body manually
        const parts = [];

        // text field: machine_name
        parts.push(`--${boundary}\r\n`);
        parts.push(`Content-Disposition: form-data; name="machine_name"\r\n\r\n`);
        parts.push(`Test Machine Upload\r\n`);

        // text field: ingest_path
        parts.push(`--${boundary}\r\n`);
        parts.push(`Content-Disposition: form-data; name="ingest_path"\r\n\r\n`);
        parts.push(`/test-upload\r\n`);

        // file field: machine_image
        parts.push(`--${boundary}\r\n`);
        parts.push(`Content-Disposition: form-data; name="machine_image"; filename="test.png"\r\n`);
        parts.push(`Content-Type: image/png\r\n\r\n`);

        const beforeFile = Buffer.from(parts.join(''));
        const afterFile = Buffer.from(`\r\n--${boundary}--\r\n`);
        const fullBody = Buffer.concat([beforeFile, pngBuf, afterFile]);

        console.log(`📤 Sending multipart request (${fullBody.length} bytes)...`);
        console.log(`   Boundary: ${boundary}`);

        const req = http.request({
            hostname: 'localhost', port: 3000,
            path: '/api/machines',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`\n📥 Response: ${res.statusCode}`);
                console.log(data);
                if (res.statusCode === 201) {
                    console.log('\n✅ SUCCESS — Machine created with image stored as byte array!');
                } else {
                    console.log('\n❌ FAILED — see response above');
                }
                resolve();
            });
        });
        req.on('error', reject);
        req.end(fullBody);
    });
}

// ── Run ────────────────────────────────────────────────────────────
(async () => {
    try {
        const token = await login();
        await createMachine(token);
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
