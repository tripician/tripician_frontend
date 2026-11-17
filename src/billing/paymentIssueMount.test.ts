import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards where the failed-payment popup is mounted.
 *
 * It has to sit outside <Routes>: inside one route it would only ever show on
 * that page, and a renewal that failed has to be said wherever the person is.
 * It has to be signed-in only, or a guest would ask the server for payment
 * problems on every page. Source-scanned rather than rendered, like
 * appProviders.test.ts, because App pulls in the whole route tree.
 */

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const app = fs.readFileSync(path.join(here, '..', 'App.tsx'), 'utf-8');

const routesEnd = app.lastIndexOf('</Routes>');
const mount = app.indexOf('<PaymentIssueDialog');

describe('the failed-payment popup in App.tsx', () => {
  it('is loaded lazily, in a chunk of its own', () => {
    expect(app).toContain("const PaymentIssueDialog = lazy(() => import('./billing/PaymentIssueDialog'))");
  });

  it('is mounted once, after the routes close, so every page has it', () => {
    expect(routesEnd).toBeGreaterThan(-1);
    expect(mount).toBeGreaterThan(routesEnd);
    expect(app.split('<PaymentIssueDialog').length - 1).toBe(1);
  });

  it('is mounted for a valid session only', () => {
    const gateOpen = app.lastIndexOf('<SignedInOnly>', mount);
    const gateClose = app.indexOf('</SignedInOnly>', mount);
    expect(gateOpen).toBeGreaterThan(routesEnd);
    expect(gateClose).toBeGreaterThan(mount);

    const gate = app.slice(app.indexOf('function SignedInOnly'), app.indexOf('function RootRedirect'));
    expect(gate).toContain("status === 'valid'");
  });

  it('sits beside the other app-wide overlays', () => {
    const overlay = app.indexOf('<SuccessOverlay />');
    const heartbeat = app.indexOf('<ActivityHeartbeat />');
    expect(overlay).toBeGreaterThan(routesEnd);
    expect(mount).toBeGreaterThan(overlay);
    expect(heartbeat).toBeGreaterThan(mount);
  });
});
