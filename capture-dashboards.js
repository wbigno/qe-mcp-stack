const { chromium } = require('playwright');
const path = require('path');

const dashboards = [
  { name: 'orchestrator', url: 'http://localhost:3000', description: 'Orchestrator (main landing page)' },
  { name: 'ado-dashboard', url: 'http://localhost:5173', description: 'ADO Dashboard' },
  { name: 'code-dashboard', url: 'http://localhost:8081', description: 'Code Dashboard' },
  { name: 'swagger-hub', url: 'http://localhost:8000', description: 'Swagger Hub' },
  { name: 'infrastructure-dashboard', url: 'http://localhost:8082', description: 'Infrastructure Dashboard' }
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  console.log('Starting screenshot capture...\n');

  for (const dashboard of dashboards) {
    const page = await context.newPage();

    try {
      console.log(`Capturing: ${dashboard.description}`);
      console.log(`URL: ${dashboard.url}`);

      // Navigate to the dashboard
      await page.goto(dashboard.url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait a bit for any animations or dynamic content
      await page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = path.join('/tmp', `final-${dashboard.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`✓ Saved to: ${screenshotPath}`);

      // Get some theme information from the page
      const themeInfo = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        const backgroundColor = computedStyle.backgroundColor;

        // Find any cards on the page
        const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
        let cardBg = null;
        let cardText = null;

        if (cards.length > 0) {
          const cardStyle = window.getComputedStyle(cards[0]);
          cardBg = cardStyle.backgroundColor;
          cardText = cardStyle.color;
        }

        // Find any buttons
        const buttons = document.querySelectorAll('button, [class*="button"], [class*="Button"]');
        let buttonColors = [];

        for (let i = 0; i < Math.min(3, buttons.length); i++) {
          const btnStyle = window.getComputedStyle(buttons[i]);
          buttonColors.push({
            bg: btnStyle.backgroundColor,
            color: btnStyle.color
          });
        }

        return {
          bodyBg: backgroundColor,
          cardBg,
          cardText,
          buttonColors,
          title: document.title
        };
      });

      console.log('Theme info:', JSON.stringify(themeInfo, null, 2));
      console.log('---\n');

    } catch (error) {
      console.error(`✗ Error capturing ${dashboard.name}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Screenshot capture complete!');
}

captureScreenshots().catch(console.error);
