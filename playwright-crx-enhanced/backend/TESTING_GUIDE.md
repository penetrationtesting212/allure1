# Local Testing Guide

## ✅ Test Results Summary

### 1. Playwright Executor Test - PASSED ✅

```bash
cd playwright-crx-enhanced/backend
npx tsx test-playwright-executor.ts
```

**Result:**
- ✅ Successfully executed Playwright script
- ✅ Navigated to example.com (3.4s)
- ✅ Waited for selector (89ms)
- ✅ Took screenshot (96ms)
- ✅ Total execution time: 6.6s
- ✅ Generated test-screenshot.png

### 2. Backend Server Test - PASSED ✅

```bash
# Terminal 1: Start server
cd playwright-crx-enhanced/backend
npm run dev

# Terminal 2: Test health endpoint
curl http://localhost:3001/health
```

**Result:**
- ✅ Server started on port 3001
- ✅ Health check: `{"status":"ok","timestamp":"2026-01-20T08:48:34.973Z","environment":"development"}`
- ✅ API endpoints available

## 📋 Quick Test Commands

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

### Test 2: API Info
```bash
curl http://localhost:3001/api
```

### Test 3: Playwright Executor (Direct Test)
```bash
cd playwright-crx-enhanced/backend
npx tsx test-playwright-executor.ts
```

### Test 4: Database Health Check
```bash
curl http://localhost:3001/db/health
```

## 🔐 Authentication Required

Most endpoints require JWT authentication. To test authenticated endpoints:

### Option 1: Create Test User
```bash
cd playwright-crx-enhanced/backend
node create-demo-user.js
```

### Option 2: Use Existing Test Script
```bash
cd playwright-crx-enhanced/backend
node test-api-local.js
```
*(Note: Requires valid JWT token)*

## 📊 Available API Endpoints

```
/api/auth/*          - Authentication (login, register)
/api/projects/*      - Project management
/api/scripts/*       - Script management
/api/test-runs/*     - Test execution (THE MAIN FEATURE)
/api/testdata/*      - Test data management
/api/external-api/*  - External API integration
/api/api-requests/*  - API request management
/api/api-testing/*   - API testing features
/api/extensions/*    - Chrome extension integration
/api/allure          - Allure report generation
/api/ml/*            - ML enhancement features
/api-docs            - Swagger documentation
```

## 🎯 Main Feature: Execute Playwright Tests

### Endpoint
```
POST /api/test-runs/execute-current
```

### Request Body
```json
{
  "code": "await page.goto('https://example.com');",
  "language": "playwright-test",
  "browser": "chromium",
  "environment": "development"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "test-run-id",
    "status": "running",
    "startedAt": "2026-01-20T..."
  }
}
```

## 📁 Test Files Created

1. **test-playwright-executor.ts** - Direct Playwright executor test
2. **test-api-local.js** - API endpoint test (needs auth)
3. **test-screenshot.png** - Screenshot from test execution
4. **api-test-screenshot.png** - Screenshot from API test

## 🐛 Troubleshooting

### Issue: Port 3001 Already in Use
```bash
# Find process on Windows
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

### Issue: Playwright Browsers Not Installed
```bash
cd playwright-crx-enhanced/backend
npx playwright install chromium
```

### Issue: Database Connection Error
```bash
# Check PostgreSQL is running
# Check .env file has correct DB credentials
# Run database health check
curl http://localhost:3001/db/health
```

### Issue: TypeScript Build Errors
```bash
cd playwright-crx-enhanced/backend
npm run build
```

## ✅ Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Playwright Executor | ✅ Working | Successfully executes scripts |
| Backend Server | ✅ Running | Port 3001 |
| Health Check | ✅ Working | Returns OK |
| API Endpoints | ✅ Available | All routes registered |
| Database | ⚠️ Not Tested | Requires PostgreSQL setup |
| Authentication | ⚠️ Not Tested | Requires user creation |

## 🚀 Next Steps

1. ✅ **Done** - Playwright executor working
2. ✅ **Done** - Backend server running
3. ⏭️ **TODO** - Set up database (PostgreSQL)
4. ⏭️ **TODO** - Create test user
5. ⏭️ **TODO** - Test authenticated endpoints
6. ⏭️ **TODO** - Deploy to Red Hat server

## 📝 Notes

- **Local Testing**: Uses Playwright's bundled Chromium (downloaded 277MB)
- **Red Hat Production**: Will use system Chrome at `/usr/bin/google-chrome-stable` (no download needed)
- **Authentication**: Most endpoints require JWT token
- **Allure Reports**: Generated in `allure-reports/{testRunId}/index.html`

## 🔗 Quick Links

- **API Docs**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/health
- **API Info**: http://localhost:3001/api
