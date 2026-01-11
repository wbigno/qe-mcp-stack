import { chromium } from 'playwright';

async function captureDashboards() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const dashboards = [
    { url: 'http://localhost:3000', name: 'updated-orchestrator', title: 'Orchestrator' },
    { url: 'http://localhost:5173', name: 'updated-ado-dashboard', title: 'ADO Dashboard' },
    { url: 'http://localhost:8081', name: 'updated-code-dashboard', title: 'Code Dashboard' },
    { url: 'http://localhost:8000', name: 'updated-swagger-hub', title: 'Swagger Hub' },
    { url: 'http://localhost:8082', name: 'updated-infrastructure-dashboard', title: 'Infrastructure Dashboard' }
  ];

  for (const dashboard of dashboards) {
    console.log(`\nCapturing ${dashboard.title}...`);
    const page = await context.newPage();

    try {
      await page.goto(dashboard.url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for any animations/dynamic content

      const screenshotPath = `/tmp/${dashboard.name}.png`;
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
      console.error(`✗ Error capturing ${dashboard.title}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nAll screenshots captured!');
}

captureDashboards().catch(console.error);
