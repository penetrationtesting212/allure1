# Chrome Extension Errors - Quick Fix Guide

## Errors You're Seeing:

### 1. Async Response Error
```
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
```

### 2. CSP Violation
```
Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=G-FVWC4GKEYS'
```

### 3. Content Script Messages
```
contentScript.js:193 This page is not reloaded
contentScript.js:194 Content Script re-injected or page loaded
```

---

## 🔧 Quick Fixes

### Solution 1: Disable Unnecessary Extensions

These errors are likely from a Chrome extension (not your code). To verify:

1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Check if errors are from extension (will show extension name)
4. Disable extensions you don't need:
   - Click Chrome menu → Extensions → Manage Extensions
   - Turn off extensions one by one to find the culprit

### Solution 2: Fix Content Security Policy (CSP)

If this is your application's CSP blocking scripts:

**Option A: Allow Google Analytics in CSP**
```html
<!-- In your HTML head -->
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
  ">
```

**Option B: Remove CSP (for development only)**
```html
<!-- Remove or comment out CSP meta tags -->
<!-- <meta http-equiv="Content-Security-Policy" content="..."> -->
```

### Solution 3: Fix Async Message Listener (If This Is Your Extension)

If you're developing the extension, fix the async listener:

**Before (Problematic):**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Async operation
  setTimeout(() => {
    sendResponse({ result: 'done' });
  }, 1000);

  return true; // Indicates async response
});
```

**After (Fixed):**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Async operation
  setTimeout(() => {
    sendResponse({ result: 'done' });
  }, 1000);

  return true; // CRITICAL: Must return true BEFORE async completes
});

// Keep message channel alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const result = await someAsyncFunction();
    sendResponse({ result });
  })();
  return true; // Return true immediately
});
```

### Solution 4: Ignore These Errors (If Not Your Code)

If these errors are from:
- A third-party extension
- Browser's own scripts
- Not affecting your application

You can safely **ignore them** by:
1. Filtering extension errors in DevTools
2. Using console.group to separate your logs

```javascript
// In your code, add clear markers
console.group('🔵 My Application Logs');
console.log('Your important logs here');
console.groupEnd();
```

---

## 🎯 Most Likely Cause

Based on the error messages, you're seeing:

1. **Playwright/Recorder Extension** errors from `contentScript.js` and `record-api.js`
2. **Google Analytics** being blocked by CSP

### Recommended Actions:

1. **Disable Playwright Recorder Extension** temporarily to see if errors stop
2. **Check if errors affect your app** - if app works fine, ignore these
3. **Fix CSP** if you need Google Analytics:
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'self';
     script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
     connect-src 'self' https://www.google-analytics.com;
   ">
   ```

---

## 📊 Impact Assessment

| Error | Severity | Action Required |
|-------|----------|-----------------|
| Async response error | Low | Extension bug, usually harmless |
| CSP Google Analytics block | Low | Expected if CSP is strict |
| Content script reload | Info | Normal extension behavior |

---

## ✅ Quick Test

To verify if these errors affect your Playwright tests:

```bash
# Run a simple test
cd playwright-crx-enhanced/backend
node test-simple-playwright.js
```

If tests pass, these console errors are **cosmetic** and can be ignored.

---

## 🔍 Debug Further

If you want to identify the exact extension:

1. Open `chrome://extensions/`
2. Look for extensions with "content script" or "recorder" in the name
3. Common culprits:
   - Playwright Test Recorder
   - Chrome DevTools Recorder
   - SEO/Analytics extensions
   - Ad blockers

---

**Bottom Line:** These errors are likely from a Chrome extension and don't affect your Playwright backend execution. Your tests are working fine (we verified earlier with the successful test run).
