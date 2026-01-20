# Quick Start: Playwright Headless Service on Red Hat

## TL;DR

```bash
# 1. Install Chrome (if not already installed)
sudo yum install -y google-chrome-stable

# 2. Install dependencies
cd playwright-crx-enhanced/backend
npm install

# 3. Start the service
npm run dev
```

## What Changed?

✅ **Playwright now uses system Chrome** - No need to download 300MB+ of browsers
✅ **Automatic detection** - Service finds Chrome at standard Linux paths
✅ **Headless mode** - Optimized for Red Hat Linux server environments
✅ **Actual execution** - Real Playwright scripts (not mock data)

## Key Files

| File | Purpose |
|------|---------|
| [src/services/playwright/playwrightExecutor.service.ts](src/services/playwright/playwrightExecutor.service.ts) | Core Playwright execution engine |
| [src/controllers/testRun.controller.ts](src/controllers/testRun.controller.ts) | API endpoints for test execution |
| [PLAYWRIGHT_REDHAT_SETUP.md](PLAYWRIGHT_REDHAT_SETUP.md) | Detailed setup guide |
| [test-playwright-executor.ts](test-playwright-executor.ts) | Test script |

## Chrome Paths Checked

The service automatically looks for Chrome here:

```bash
/usr/bin/google-chrome-stable  # ⭐ Most common on RHEL
/usr/bin/google-chrome
/opt/google/chrome/google-chrome
/opt/google/chrome/chrome
/usr/bin/chromium-browser
/usr/bin/chromium
```

## Test the Service

```bash
# Run the test script
npx tsx test-playwright-executor.ts
```

Expected output:
```
🧪 Testing Playwright Executor Service...

Test 1: Navigating to example.com
✅ Found system Chrome at: /usr/bin/google-chrome-stable
🌐 Using system Chrome: /usr/bin/google-chrome-stable

📊 Test Results:
  Status: ✅ PASSED
  Duration: 1234 ms
  Steps executed: 3

📝 Steps:
  ✅ goto (523ms)
  ✅ waitForSelector (45ms)
  ✅ screenshot (312ms)

✅ All tests passed!
```

## API Usage

### Execute Test Script

```bash
POST http://localhost:3001/api/test-runs/execute-current
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "code": "await page.goto('https://example.com');\nawait page.screenshot({ path: 'screenshot.png' });",
  "language": "playwright-test",
  "browser": "chromium",
  "environment": "production"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "test-run-id",
    "status": "running",
    "startedAt": "2026-01-20T10:30:00.000Z"
  }
}
```

### Check Test Run Status

```bash
GET http://localhost:3001/api/test-runs/{testRunId}
```

## Supported Commands

```javascript
// Navigation
await page.goto('https://example.com');
await page.waitForNavigation();

// Interactions
await page.click('#button');
await page.fill('#input', 'text');
await page.type('#input', 'text');
await page.press('#input', 'Enter');

// Waiting
await page.waitForSelector('.element');

// Screenshots
await page.screenshot({ path: 'screenshot.png' });
```

## Troubleshooting

### Chrome not found

```bash
# Check if Chrome is installed
which google-chrome-stable

# Install Chrome
sudo yum install -y google-chrome-stable
```

### Permission errors

```bash
# Fix Chrome permissions
sudo chmod +x /opt/google/chrome/chrome
sudo chmod +x /usr/bin/google-chrome-stable
```

### Verify it works

```bash
# Run health check
curl http://localhost:3001/health

# Run test script
npx tsx test-playwright-executor.ts
```

## Environment Variables

```bash
# .env file
PORT=3001
NODE_ENV=production

# Database (if using features that require it)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=playwright_crx1
DB_USER=postgres
DB_PASSWORD=your_password
```

## What About Allure Reports?

✅ Allure reports are still generated!

- Reports are saved to: `allure-reports/{testRunId}/index.html`
- Access reports at: `http://localhost:3001/allure-reports/{testRunId}/index.html`
- Includes test steps, screenshots, and execution details

## Next Steps

1. ✅ Install Chrome on your Red Hat server
2. ✅ Install dependencies: `npm install`
3. ✅ Test locally: `npx tsx test-playwright-executor.ts`
4. ✅ Start service: `npm run dev`
5. ✅ Execute tests via API

For detailed setup, see [PLAYWRIGHT_REDHAT_SETUP.md](PLAYWRIGHT_REDHAT_SETUP.md)

---

**Questions?**
- Check the logs for detailed error messages
- Review [PLAYWRIGHT_REDHAT_SETUP.md](PLAYWRIGHT_REDHAT_SETUP.md) for comprehensive guide
