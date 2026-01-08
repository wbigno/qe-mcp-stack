/**
 * Page Object Model exports
 *
 * This file exports all page objects organized by application.
 * Import page objects in your tests like:
 *
 * @example
 * ```typescript
 * import { PaymentPage, PatientPortalPage } from '@qe-mcp-stack/test-framework/pages';
 * ```
 */

// Shared components
export * from './shared/components';

// Payments application pages
export * from './payments/payment-page';

// PreCare application pages
export * from './precare/patient-page';

// Core.Common application pages
export * from './core-common/admin-page';

// Re-export base classes from parent pages.ts
export { BasePage, BaseComponent, LoginPage, DashboardPage } from '../pages';
