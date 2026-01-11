import { chromium } from 'playwright';

async function captureOrchestrator() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  console.log('Capturing Orchestrator...');
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for content to load

    const screenshotPath = `/tmp/updated-orchestrator.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ Saved to ${screenshotPath}`);

    // Get background color to verify dark theme
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color
      };
    });
    console.log(`  Background: ${bgColor.backgroundColor}`);
    console.log(`  Text color: ${bgColor.color}`);

  } catch (error) {
    console.error(`✗ Error capturing Orchestrator: ${error.message}`);
  } finally {
    await page.close();
  }

  await browser.close();
  console.log('\nDone!');
}

captureOrchestrator().catch(console.error);
