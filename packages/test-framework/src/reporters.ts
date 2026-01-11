/**
 * Custom test reporters
 */

import {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  FullConfig,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export class CustomJSONReporter implements Reporter {
  private results: any[] = [];
  private outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile || 'test-results/custom-report.json';
  }

  onBegin(_config: FullConfig) {
    console.log(`Starting test run with ${_config.projects.length} projects`);
  }

  onTestEnd(_test: TestCase, result: TestResult) {
    const testResult = {
      title: _test.title,
      file: _test.location.file,
      line: _test.location.line,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      retries: result.retry,
      startTime: result.startTime,
    };

    this.results.push(testResult);
  }

  async onEnd(result: FullResult) {
    const summary = {
      status: result.status,
      startTime: result.startTime,
      duration: result.duration,
      stats: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length,
      },
      tests: this.results,
    };

    const dir = path.dirname(this.outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.outputFile, JSON.stringify(summary, null, 2));
    console.log(`Custom JSON report saved to ${this.outputFile}`);
  }
}

export class SlackReporter implements Reporter {
  private webhookURL: string;
  private results: TestResult[] = [];

  constructor(options: { webhookURL?: string } = {}) {
    this.webhookURL = options.webhookURL || process.env.SLACK_WEBHOOK_URL || '';
  }

  onTestEnd(_test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      this.results.push(result);
    }
  }

  async onEnd(result: FullResult) {
    if (!this.webhookURL || this.results.length === 0) return;

    const message = {
      text: `Test Run ${result.status === 'passed' ? 'Passed ✅' : 'Failed ❌'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test Run Summary*\n` +
                  `Status: ${result.status}\n` +
                  `Duration: ${Math.round(result.duration / 1000)}s\n` +
                  `Failed Tests: ${this.results.length}`,
          },
        },
      ],
    };

    try {
      const response = await fetch(this.webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Failed to send Slack notification');
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }
}

export class ScreenshotOnFailureReporter implements Reporter {
  constructor(_options: { outputDir?: string } = {}) {
    // Options would be used for custom screenshot handling
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' && result.attachments) {
      const screenshots = result.attachments.filter(a => a.name === 'screenshot');
      
      if (screenshots.length > 0) {
        console.log(`📸 Screenshot saved for failed test: ${test.title}`);
      }
    }
  }
}

export default CustomJSONReporter;
