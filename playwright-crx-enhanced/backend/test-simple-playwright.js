/**
 * Simple test to check if Playwright execution works via API
 */

const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMmI5OGYzZC03ZjIxLTRjMzEtYjcxNS1iNmVmM2U0ODM2MmYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzY4OTAwMDkzLCJleHAiOjE3Njg5MzYwOTN9.t4NEgi7Zti4RzZXJY91IHSsC_jNjBb6dNdDV8aJ9_0U';

const testScript = `await page.goto('https://example.com');`;

const testData = JSON.stringify({
  code: testScript,
  language: 'playwright-test',
  browser: 'chromium',
  environment: 'development'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/test-runs/execute-current',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🧪 Starting simple Playwright test...\n');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('✅ Test run created:', response.data.id);
    console.log('⏳ Waiting 10 seconds...\n');

    setTimeout(() => {
      http.get({
        hostname: 'localhost',
        port: 3001,
        path: `/api/test-runs/${response.data.id}`,
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }, (statusRes) => {
        let statusData = '';
        statusRes.on('data', chunk => statusData += chunk);
        statusRes.on('end', () => {
          const result = JSON.parse(statusData);
          console.log('📊 Final Status:');
          console.log('Status:', result.data.status);
          console.log('Duration:', result.data.duration);
          console.log('Error:', result.data.errorMsg);

          if (result.data.status === 'running') {
            console.log('\n⚠️  Test is still running - Playwright execution might be failing silently');
            console.log('Check server logs for errors');
          }

          process.exit(result.data.status === 'passed' ? 0 : 1);
        });
      });
    }, 10000);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

req.write(testData);
req.end();
