/**
 * Test Playwright execution with authentication
 */

const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMmI5OGYzZC03ZjIxLTRjMzEtYjcxNS1iNmVmM2U0ODM2MmYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzY4OTAwMDkzLCJleHAiOjE3Njg5MzYwOTN9.t4NEgi7Zti4RzZXJY91IHSsC_jNjBb6dNdDV8aJ9_0U';

const testScript = `
await page.goto('https://example.com');
await page.waitForSelector('h1');
const title = await page.title();
await page.screenshot({ path: 'auth-test-screenshot.png' });
`;

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

console.log('🧪 Testing Playwright Execution with Auth...\n');
console.log('📤 Sending test script to API...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Response Status: ${res.statusCode}`);
    console.log('📝 Response Body:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));

    if (res.statusCode === 201) {
      const response = JSON.parse(data);
      if (response.success && response.data) {
        const testRunId = response.data.id;
        console.log(`\n✅ Test run created!`);
        console.log(`📋 Test Run ID: ${testRunId}`);
        console.log(`🔄 Status: ${response.data.status}`);
        console.log(`\n⏳ Waiting 8 seconds for execution...\n`);

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 16;

        const checkStatus = () => {
          http.get({
            hostname: 'localhost',
            port: 3001,
            path: `/api/test-runs/${testRunId}`,
            headers: { 'Authorization': `Bearer ${TOKEN}` }
          }, (statusRes) => {
            let statusData = '';
            statusRes.on('data', chunk => statusData += chunk);
            statusRes.on('end', () => {
              attempts++;
              const statusResponse = JSON.parse(statusData);
              const { status, duration, errorMsg } = statusResponse.data || {};

              console.log(`[${attempts}/${maxAttempts}] Status: ${status}`);

              if (status === 'passed' || status === 'failed' || status === 'error' || attempts >= maxAttempts) {
                console.log('\n📊 Final Test Results:');
                console.log(JSON.stringify(statusResponse, null, 2));

                if (status === 'passed') {
                  console.log(`\n✅ Test PASSED in ${duration}ms`);
                  console.log('📸 Check auth-test-screenshot.png');
                } else if (status === 'failed') {
                  console.log(`\n❌ Test FAILED: ${errorMsg}`);
                }

                process.exit(status === 'passed' ? 0 : 1);
              } else {
                setTimeout(checkStatus, 500);
              }
            });
          }).on('error', (err) => {
            console.error('❌ Error checking status:', err.message);
            process.exit(1);
          });
        };

        checkStatus();
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(testData);
req.end();
