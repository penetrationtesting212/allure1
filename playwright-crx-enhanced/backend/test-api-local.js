/**
 * Simple API test script for local testing
 * Run with: node test-api-local.js
 */

const http = require('http');

const testScript = `
await page.goto('https://example.com');
await page.waitForSelector('h1');
const title = await page.title();
console.log('Page title:', title);
await page.screenshot({ path: 'api-test-screenshot.png' });
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
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🧪 Testing Playwright API endpoint...\n');
console.log('Sending test script to API...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 Response Status:', res.statusCode);
    console.log('📝 Response Body:');

    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const testRunId = response.data.id;
        console.log(`\n✅ Test run created successfully!`);
        console.log(`📋 Test Run ID: ${testRunId}`);
        console.log(`🔗 Check status: GET http://localhost:3001/api/test-runs/${testRunId}`);
        console.log(`\n⏳ Waiting 5 seconds for test to complete...\n`);

        // Wait and check status
        setTimeout(() => {
          http.get(`http://localhost:3001/api/test-runs/${testRunId}`, (statusRes) => {
            let statusData = '';
            statusRes.on('data', chunk => statusData += chunk);
            statusRes.on('end', () => {
              const statusResponse = JSON.parse(statusData);
              console.log('📊 Final Test Status:');
              console.log(JSON.stringify(statusResponse, null, 2));

              if (statusResponse.success && statusResponse.data) {
                const { status, duration, errorMsg } = statusResponse.data;
                if (status === 'passed') {
                  console.log(`\n✅ Test PASSED in ${duration}ms`);
                  console.log('📸 Check api-test-screenshot.png for visual verification');
                } else if (status === 'failed') {
                  console.log(`\n❌ Test FAILED: ${errorMsg}`);
                } else {
                  console.log(`\n⏳ Test status: ${status}`);
                }
              }
              process.exit(0);
            });
          });
        }, 5000);
      }
    } catch (e) {
      console.log('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(testData);
req.end();
