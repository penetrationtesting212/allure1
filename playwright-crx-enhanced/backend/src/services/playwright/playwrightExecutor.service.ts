import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface PlaywrightExecutionResult {
  success: boolean;
  error?: string;
  steps: Array<{
    action: string;
    status: 'passed' | 'failed';
    duration: number;
    error?: string;
  }>;
  screenshot?: string;
  duration: number;
}

/**
 * Playwright Executor Service
 * Supports:
 * 1. Playwright's bundled Chromium (default)
 * 2. System Chrome installation on Linux (Red Hat/RHEL/CentOS)
 */
export class PlaywrightExecutorService {
  private activeBrowsers: Map<string, Browser> = new Map();

  /**
   * Detect Chrome executable path on Linux systems
   */
  private getChromeExecutablePath(): string | undefined {
    if (process.platform !== 'linux') {
      return undefined;
    }

    const possiblePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/opt/google/chrome/google-chrome',
      '/opt/google/chrome/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        logger.info(`✅ Found system Chrome at: ${chromePath}`);
        return chromePath;
      }
    }

    logger.warn('⚠️ No system Chrome found, will use Playwright bundled Chromium');
    return undefined;
  }

  async executeScript(
    code: string,
    testRunId: string,
    options: {
      headless?: boolean;
      browserType?: 'chromium' | 'firefox' | 'webkit';
      viewport?: { width: number; height: number };
      screenshotOnFailure?: boolean;
    } = {}
  ): Promise<PlaywrightExecutionResult> {
    const startTime = Date.now();
    const steps: PlaywrightExecutionResult['steps'] = [];
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      logger.info(`Starting Playwright execution for test run: ${testRunId}`);

      // Detect and launch browser
      const chromeExecutable = this.getChromeExecutablePath();

      // Launch configuration
      const launchOptions: any = {
        headless: options.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Useful for Docker/containers
          '--disable-gpu' // Useful for headless on Linux
        ]
      };

      // Use system Chrome if found (for Red Hat Linux)
      if (chromeExecutable) {
        launchOptions.executablePath = chromeExecutable;
        logger.info(`🌐 Using system Chrome: ${chromeExecutable}`);
      }

      browser = await chromium.launch(launchOptions);

      this.activeBrowsers.set(testRunId, browser);

      context = await browser.newContext({
        viewport: options.viewport || { width: 1280, height: 720 },
        recordVideo: { dir: path.join(process.cwd(), 'allure-results', 'videos', testRunId) }
      });

      page = await context.newPage();

      // Parse and execute the script code
      const scriptSteps = this.parseScriptCode(code);

      for (const step of scriptSteps) {
        const stepStartTime = Date.now();
        try {
          await this.executeStep(page, step);
          const duration = Date.now() - stepStartTime;
          steps.push({
            action: step.action,
            status: 'passed',
            duration
          });
          logger.info(`Step passed: ${step.action} (${duration}ms)`);
        } catch (stepError: any) {
          const duration = Date.now() - stepStartTime;
          const error_msg = stepError?.message || String(stepError);

          steps.push({
            action: step.action,
            status: 'failed',
            duration,
            error: error_msg
          });

          logger.error(`Step failed: ${step.action} - ${error_msg}`);

          // Take screenshot on failure
          if (options.screenshotOnFailure && page) {
            const screenshotPath = path.join(
              process.cwd(),
              'allure-results',
              'screenshots',
              `${testRunId}-failure.png`
            );
            await page.screenshot({ path: screenshotPath });
          }

          throw stepError;
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Playwright execution completed successfully in ${duration}ms`);

      return {
        success: true,
        steps,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const error_msg = error?.message || String(error);

      logger.error(`Playwright execution failed: ${error_msg}`);

      return {
        success: false,
        error: error_msg,
        steps,
        duration
      };
    } finally {
      // Cleanup
      try {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) {
          await browser.close();
          this.activeBrowsers.delete(testRunId);
        }
      } catch (cleanupError) {
        logger.error('Error during cleanup:', cleanupError);
      }
    }
  }

  async stopExecution(testRunId: string): Promise<void> {
    const browser = this.activeBrowsers.get(testRunId);
    if (browser) {
      try {
        await browser.close();
        this.activeBrowsers.delete(testRunId);
        logger.info(`Stopped browser for test run: ${testRunId}`);
      } catch (error) {
        logger.error(`Error stopping browser for test run ${testRunId}:`, error);
      }
    }
  }

  private parseScriptCode(code: string): Array<{ action: string; params: any }> {
    const steps: Array<{ action: string; params: any }> = [];
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse goto
      const gotoMatch = trimmed.match(/await\s+page\.goto\(['"`]([^'"`]+)['"`](?:,\s*{[^}]*})?\)/);
      if (gotoMatch) {
        steps.push({ action: 'goto', params: { url: gotoMatch[1] } });
        continue;
      }

      // Parse click
      const clickMatch = trimmed.match(/await\s+page\.click\(['"`]([^'"`]+)['"`]\)/);
      if (clickMatch) {
        steps.push({ action: 'click', params: { selector: clickMatch[1] } });
        continue;
      }

      // Parse fill
      const fillMatch = trimmed.match(/await\s+page\.fill\(['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*)['"`]\)/);
      if (fillMatch) {
        steps.push({ action: 'fill', params: { selector: fillMatch[1], value: fillMatch[2] } });
        continue;
      }

      // Parse type
      const typeMatch = trimmed.match(/await\s+page\.type\(['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*)['"`]\)/);
      if (typeMatch) {
        steps.push({ action: 'type', params: { selector: typeMatch[1], value: typeMatch[2] } });
        continue;
      }

      // Parse press
      const pressMatch = trimmed.match(/await\s+page\.press\(['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*)['"`]\)/);
      if (pressMatch) {
        steps.push({ action: 'press', params: { selector: pressMatch[1], key: pressMatch[2] } });
        continue;
      }

      // Parse waitForSelector
      const waitMatch = trimmed.match(/await\s+page\.waitForSelector\(['"`]([^'"`]+)['"`]\)/);
      if (waitMatch) {
        steps.push({ action: 'waitForSelector', params: { selector: waitMatch[1] } });
        continue;
      }

      // Parse waitForNavigation
      if (trimmed.includes('page.waitForNavigation(')) {
        steps.push({ action: 'waitForNavigation', params: {} });
        continue;
      }

      // Parse screenshot
      const screenshotMatch = trimmed.match(/await\s+page\.screenshot\(\{?\s*path:\s*['"`]([^'"`]+)['"`]/);
      if (screenshotMatch) {
        steps.push({ action: 'screenshot', params: { path: screenshotMatch[1] } });
        continue;
      }
    }

    return steps;
  }

  private async executeStep(page: Page, step: { action: string; params: any }): Promise<void> {
    switch (step.action) {
      case 'goto':
        await page.goto(step.params.url, { waitUntil: 'networkidle', timeout: 30000 });
        break;

      case 'click':
        await page.click(step.params.selector, { timeout: 10000 });
        break;

      case 'fill':
        await page.fill(step.params.selector, step.params.value, { timeout: 10000 });
        break;

      case 'type':
        await page.type(step.params.selector, step.params.value, { timeout: 10000 });
        break;

      case 'press':
        await page.press(step.params.selector, step.params.key, { timeout: 10000 });
        break;

      case 'waitForSelector':
        await page.waitForSelector(step.params.selector, { timeout: 30000 });
        break;

      case 'waitForNavigation':
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
        break;

      case 'screenshot':
        const screenshotDir = path.dirname(step.params.path);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({ path: step.params.path, fullPage: true });
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeBrowsers.keys());
  }
}

export const playwrightExecutorService = new PlaywrightExecutorService();
