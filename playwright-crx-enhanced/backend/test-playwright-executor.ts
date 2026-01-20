/**
 * Test script to verify Playwright executor can use system Chrome
 *
 * Usage:
 *   npx tsx test-playwright-executor.ts
 */

import { playwrightExecutorService } from './src/services/playwright/playwrightExecutor.service';

async function testPlaywrightExecutor() {
  console.log('🧪 Testing Playwright Executor Service...\n');

  // Test 1: Simple navigation
  console.log('Test 1: Navigating to example.com');
  const testRunId = 'test-' + Date.now();

  const result = await playwrightExecutorService.executeScript(
    `await page.goto('https://example.com');
     await page.waitForSelector('h1');
     await page.screenshot({ path: 'test-screenshot.png' });`,
    testRunId,
    {
      headless: true,
      browserType: 'chromium',
      screenshotOnFailure: true
    }
  );

  console.log('\n📊 Test Results:');
  console.log('  Status:', result.success ? '✅ PASSED' : '❌ FAILED');
  console.log('  Duration:', result.duration, 'ms');
  console.log('  Steps executed:', result.steps.length);

  console.log('\n📝 Steps:');
  for (const step of result.steps) {
    console.log(`  ${step.status === 'passed' ? '✅' : '❌'} ${step.action} (${step.duration}ms)`);
    if (step.error) {
      console.log(`     Error: ${step.error}`);
    }
  }

  if (!result.success) {
    console.log('\n❌ Test failed:', result.error);
    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
  console.log('\n💡 Tips:');
  console.log('  - Check test-screenshot.png for visual verification');
  console.log('  - On Red Hat: Ensure Chrome is installed at /usr/bin/google-chrome-stable');
  console.log('  - View logs above for browser path detection');
}

// Run the test
testPlaywrightExecutor()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
