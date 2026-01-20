# Playwright Setup for Red Hat Enterprise Linux (RHEL)

This guide explains how to configure the Playwright headless service to use the existing Google Chrome installation on Red Hat Linux instead of downloading Chromium.

## Overview

The Playwright Executor Service is configured to:
- ✅ Automatically detect and use the system Chrome installation on Linux
- ✅ Run in headless mode on Red Hat/CentOS/RHEL
- ✅ Avoid downloading ~300MB of Chromium browsers
- ✅ Generate Allure test reports

## Prerequisites

### 1. Install Google Chrome on Red Hat

```bash
# For RHEL/CentOS/Fedora
sudo wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum install -y google-chrome-stable_current_x86_64.rpm

# Or using dnf on newer systems
sudo dnf install -y google-chrome-stable_current_x86_64.rpm
```

### 2. Verify Chrome Installation

```bash
# Check if Chrome is installed
which google-chrome-stable

# Check Chrome version
google-chrome-stable --version

# Expected output: Google Chrome 120.x.x.x (or similar)
```

## Installation

### 1. Install Node.js Dependencies

```bash
cd playwright-crx-enhanced/backend

# Install dependencies (browsers will NOT be downloaded)
npm install
```

### 2. Verify Configuration

The service will automatically detect Chrome at these locations (in order):
- `/usr/bin/google-chrome-stable`
- `/usr/bin/google-chrome`
- `/opt/google/chrome/google-chrome`
- `/opt/google/chrome/chrome`
- `/usr/bin/chromium-browser`
- `/usr/bin/chromium`

## Usage

### Starting the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### API Endpoint

Execute Playwright tests via:
```
POST http://localhost:3001/api/test-runs/execute-current
```

Request body:
```json
{
  "code": "await page.goto('https://example.com');\nawait page.screenshot({ path: 'screenshot.png' });",
  "language": "playwright-test",
  "browser": "chromium",
  "environment": "production"
}
```

## Configuration

### Environment Variables (.env)

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Database (if needed)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playwright_crx1
DB_USER=postgres
DB_PASSWORD=your_password
```

### Chrome Launch Options

The service launches Chrome with these flags (optimized for headless Linux):

```javascript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',  // Useful for Docker/containers
    '--disable-gpu'              // Useful for headless on Linux
  ]
}
```

## Red Hat Specific Considerations

### SELinux

If you encounter SELinux issues:

```bash
# Check SELinux status
sestatus

# Temporary: Set SELinux to permissive mode
sudo setenforce 0

# Permanent: Configure SELinux policy for Chrome
# (Contact your security team for policy configuration)
```

### Firewall

Ensure the service port is accessible:

```bash
# Open port 3001
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### Running as Service (systemd)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/playwright-api.service
```

Contents:
```ini
[Unit]
Description=Playwright Headless API Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/playwright-crx-enhanced/backend
ExecStart=/usr/bin/node /path/to/playwright-crx-enhanced/backend/dist/index.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable playwright-api
sudo systemctl start playwright-api
sudo systemctl status playwright-api
```

## Supported Playwright Commands

The service can execute these Playwright commands:

### Navigation
- `page.goto(url)` - Navigate to URL
- `page.waitForNavigation()` - Wait for navigation

### Interactions
- `page.click(selector)` - Click element
- `page.fill(selector, value)` - Fill input field
- `page.type(selector, text)` - Type text
- `page.press(selector, key)` - Press key

### Waiting
- `page.waitForSelector(selector)` - Wait for element

### Screenshots
- `page.screenshot({ path: 'file.png' })` - Take screenshot

### Example Script

```javascript
// Navigate to a page
await page.goto('https://example.com');

// Wait for element to appear
await page.waitForSelector('h1');

// Fill a form
await page.fill('#username', 'testuser');
await page.fill('#password', 'password123');

// Click submit
await page.click('#submit-button');

// Take screenshot
await page.screenshot({ path: 'login.png' });

// Verify success
await page.waitForSelector('.success-message');
```

## Troubleshooting

### Chrome Not Found

**Error:** "No system Chrome found"

**Solution:**
```bash
# Install Chrome
sudo yum install -y google-chrome-stable

# Verify installation
which google-chrome-stable
```

### Permission Denied

**Error:** "Permission denied: /opt/google/chrome/chrome"

**Solution:**
```bash
# Fix permissions
sudo chmod +x /opt/google/chrome/chrome
sudo chmod +x /opt/google/chrome/google-chrome
```

### Sandbox Issues

**Error:** "Failed to move to new namespace"

**Solution:** The service already includes `--no-sandbox` flag. If issues persist:
```bash
# Check for chrome-sandbox
sudo chmod 4755 /opt/google/chrome/chrome-sandbox
```

### Headless Mode Issues

**Error:** Display issues or GPU errors

**Solution:** The service includes these flags:
- `--disable-gpu` - Disable GPU hardware acceleration
- `--disable-dev-shm-usage` - Use /tmp instead of /dev/shm

### Log Files

Check service logs:
```bash
# If running with npm
npm run dev

# If running as systemd service
sudo journalctl -u playwright-api -f

# Log files location
tail -f /var/log/playwright-api.log
```

## Testing the Installation

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-20T10:30:00.000Z",
  "environment": "production"
}
```

### 2. Execute Simple Test

```bash
curl -X POST http://localhost:3001/api/test-runs/execute-current \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "await page.goto(\"https://example.com\");",
    "language": "playwright-test",
    "browser": "chromium"
  }'
```

## Resources

- [Playwright Official Documentation](https://playwright.dev/)
- [Playwright on Linux Guide](https://playwright.dev/docs/browsers)
- [Chrome for Linux Installation](https://www.google.com/chrome/)
- [Red Hat Documentation](https://access.redhat.com/documentation/)

## Sources

- [How to use installed version of chrome in Playwright?](https://stackoverflow.com/questions/62281859/how-to-use-installed-version-of-chrome-in-playwright)
- [Playwright on RHEL - Reddit Discussion](https://www.reddit.com/r/Playwright/comments/1j4i4el/playwright_on_rhel/)
- [Connecting Playwright to an Existing Browser](https://www.browserstack.com/guide/playwright-connect-to-existing-browser)
- [How to use Playwright with external/existing Chrome](https://dev.to/sonyarianto/how-to-use-playwright-with-externalexisting-chrome-4nf1)
- [Simplest way to make Playwright Red Hat work](https://hoop.dev/blog/the-simplest-way-to-make-playwright-red-hat-work-like-it-should/)
- [Playwright BrowserType API](https://playwright.dev/docs/api/class-browsertype)
- [What is the location of chrome in a Linux machine?](https://stackoverflow.com/questions/66471989/what-is-the-location-of-chrome-in-a-linux-machine)
- [How to Install Google Chrome in Linux RHEL-based Distros](https://www.geeksforgeeks.org/linux-unix/how-to-install-google-chrome-in-linux-rhel-based-distros/)
- [How to install Google Chrome on RHEL 8](https://access.redhat.com/solutions/3758461)
- [Installing Google Chrome On CentOS, Amazon Linux, or RHEL](https://intoli.com/blog/installing-google-chrome-on-centos/)
- [How To Install Google Chrome on RHEL/CentOS & Fedora](https://www.cyberciti.biz/faq/howto-install-google-chrome-on-redhat-rhel-fedora-centos-linux/)
