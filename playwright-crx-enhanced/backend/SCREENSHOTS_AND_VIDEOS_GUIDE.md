# Screenshots and Videos - Location Guide

## 📁 Where Are Screenshots and Videos Saved?

### Base Directory:
```
playwright-crx-enhanced/backend/allure-results/
```

---

## 📸 Screenshots

### Location:
```
allure-results/screenshots/
```

### Screenshot Types:

#### 1. **Failure Screenshots** (Automatic)
- **Path:** `allure-results/screenshots/{testRunId}-failure.png`
- **Triggered when:** Any test step fails
- **Example:** `cf8fd26a-c45b-4cb5-9aa0-f393187b9a95-failure.png`
- **Config:** Controlled by `screenshotOnFailure: true` option

#### 2. **Manual Screenshots** (From Script)
If your Playwright script includes:
```javascript
await page.screenshot({ path: 'my-screenshot.png' });
```

The screenshot will be saved relative to the **current working directory** (backend folder).

### Example Screenshot Paths:
```bash
# Failure screenshot
allure-results/screenshots/c5463ed5-e514-4acc-bdaa-21116896e0ec-failure.png

# Manual screenshot (if specified in script)
playwright-crx-enhanced/backend/my-screenshot.png
```

---

## 🎥 Videos

### Location:
```
allure-results/videos/{testRunId}/
```

### Video Configuration:
- **Enabled by default:** Yes
- **Format:** WebM (video/webm)
- **Content:** Full test execution recording
- **Resolution:** Same as viewport (default 1280x720)

### Example Video Paths:
```bash
allure-results/videos/c5463ed5-e514-4acc-bdaa-21116896e0ec/
```

### Why Videos Might Be Empty:
1. **Test passed too quickly** - Video needs at least some action to record
2. **Browser closed before video saved** - Tests must complete properly
3. **Video recording not triggered** - Needs page interaction

---

## 🔍 How to Find Your Screenshots/Videos

### Option 1: Command Line
```bash
cd playwright-crx-enhanced/backend

# List all screenshots
ls -la allure-results/screenshots/

# List all video directories
ls -la allure-results/videos/

# Find specific test run
find allure-results/ -name "*test-run-id*"
```

### Option 2: Windows Explorer
```
Navigate to:
C:\Users\Chandra.Nannapaneni\Downloads\chandra-1212-main (1)\chandra-1212-main\playwright-crx-enhanced\backend\allure-results\
```

Folders:
- `screenshots/` - Contains failure screenshots
- `videos/` - Contains video recordings (organized by test run ID)

### Option 3: VS Code
```bash
# Open in VS Code Terminal
cd playwright-crx-enhanced/backend
code allure-results/screenshots/
```

---

## 📊 Current Status

### ✅ Found:
- **allure-results/** directory exists
- **videos/** subdirectory exists
- **Example screenshot:** `auth-test-screenshot.png` in backend root

### ⚠️ Issue:
Videos folder exists but is **empty** because:
1. Tests may be passing too quickly
2. Video recording requires page interactions
3. Browser context closes before video is saved

---

## 🔧 How to Ensure Videos Are Recorded

### Solution 1: Add Explicit Wait
```javascript
await page.goto('https://example.com');
await page.waitForTimeout(1000); // Keep page open for video
await page.screenshot({ path: 'screenshot.png' });
```

### Solution 2: Ensure Proper Cleanup
The playwright executor already has this, but verify:
```typescript
// In playwrightExecutor.service.ts
await context.close(); // This saves the video
await browser.close();
```

### Solution 3: Check Video Path Configuration
```typescript
recordVideo: {
  dir: path.join(process.cwd(), 'allure-results', 'videos', testRunId),
  size: { width: 1280, height: 720 }
}
```

---

## 📸 How to View Screenshots

### Option 1: Direct File Open
```bash
# Windows
start allure-results/screenshots/{filename}.png

# Mac
open allure-results/screenshots/{filename}.png

# Linux
xdg-open allure-results/screenshots/{filename}.png
```

### Option 2: In Allure Report
Screenshots are embedded in Allure reports:
```
http://localhost:3001/allure-reports/{testRunId}/index.html
```

Navigate to test steps to see attached screenshots.

### Option 3: VS Code
```bash
code allure-results/screenshots/*.png
```

---

## 🎥 How to View Videos

### Option 1: Direct File Open
```bash
# Find video file
find allure-results/videos/ -name "*.webm"

# Play with VLC or browser
start allure-results/videos/{testRunId}/video.webm
```

### Option 2: Allure Report
Videos are embedded in Allure reports if they exist.

---

## 💡 Tips for Better Screenshots/Videos

### 1. **Add Screenshot Steps to Your Scripts**
```javascript
await page.goto('https://example.com');
await page.screenshot({ path: 'homepage.png', fullPage: true });
```

### 2. **Use Descriptive Names**
```javascript
await page.screenshot({ path: 'login-page.png' });
await page.screenshot({ path: 'after-submit.png' });
```

### 3. **Capture Full Page**
```javascript
await page.screenshot({ path: 'full-page.png', fullPage: true });
```

### 4. **Capture Specific Element**
```javascript
const element = await page.$('#header');
await element.screenshot({ path: 'header.png' });
```

---

## 🐛 Troubleshooting

### Issue: No Screenshots Found
**Solution:**
- Check if test failed (screenshots only on failure)
- Add manual `page.screenshot()` calls
- Verify `allure-results/screenshots/` directory exists

### Issue: No Videos Found
**Solution:**
- Videos need at least 1-2 seconds of interaction
- Check `allure-results/videos/{testRunId}/` directory
- Ensure test completes properly (no crashes)

### Issue: Screenshot Path Not Working
**Solution:**
- Use absolute paths or relative to backend directory
- Create directory if it doesn't exist:
  ```typescript
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  ```

---

## 📝 Example Test with Screenshots

### Input Script:
```javascript
await page.goto('https://example.com');
await page.screenshot({ path: 'example-home.png' });
await page.click('h1');
await page.screenshot({ path: 'after-click.png' });
```

### Output Files:
```
playwright-crx-enhanced/backend/
├── example-home.png              # Manual screenshot
├── after-click.png               # Manual screenshot
└── allure-results/
    └── screenshots/
        └── {testRunId}-failure.png  # Failure screenshot (if failed)
```

---

## 🎯 Quick Reference

| Type | Location | Trigger |
|------|----------|---------|
| **Failure Screenshot** | `allure-results/screenshots/{testRunId}-failure.png` | Automatic on step failure |
| **Manual Screenshot** | Backend root or specified path | `page.screenshot()` in script |
| **Video Recording** | `allure-results/videos/{testRunId}/` | Automatic (full test) |
| **Allure Report** | `allure-reports/{testRunId}/index.html` | Auto-generated with test data |

---

## ✅ Summary

**Screenshots:** ✅ Working
- Check `allure-results/screenshots/` for failure screenshots
- Check backend root for manual screenshots
- Example found: `auth-test-screenshot.png`

**Videos:** ⚠️ Configured but may be empty
- Path: `allure-results/videos/{testRunId}/`
- Need page interactions to record
- Tests must complete properly for video to save

**To verify:** Run a test with explicit waits and multiple actions, then check the folders!
