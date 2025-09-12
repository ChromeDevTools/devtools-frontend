// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getPausedMessages,
  openSourcesPanel,
  PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR
} from '../../e2e/helpers/sources-helpers.js';

describe('Breakpoints on CSP Violation', () => {
  it('CSP Violations should come up before break on exceptions', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);
    await devToolsPage.waitForAria('CSP Violation Breakpoints');
    await devToolsPage.click('[aria-label="CSP Violation Breakpoints"]');
    await devToolsPage.click('[title="Trusted Type Violations"]');
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);

    const resource = inspectedPage.goToResource('network/trusted-type-violations-enforced.rawresponse');

    const status1 = await getPausedMessages(devToolsPage);
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type Policy Violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    const status2 = await getPausedMessages(devToolsPage);
    assert.strictEqual(status2.statusMain, 'Paused on exception');
    assert.strictEqual(
        status2.statusSub,
        'TypeError: Failed to execute \'createPolicy\' on \'TrustedTypePolicyFactory\': Policy "policy2" disallowed.');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    await resource;
  });

  it('CSP Violations should show in report-only mode', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);
    await devToolsPage.waitForAria('CSP Violation Breakpoints');
    await devToolsPage.click('[aria-label="CSP Violation Breakpoints"]');
    await devToolsPage.click('[title="Trusted Type Violations"]');

    const resource = inspectedPage.goToResource('network/trusted-type-violations-report-only.rawresponse');

    const status1 = await getPausedMessages(devToolsPage);
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type Policy Violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    const status2 = await getPausedMessages(devToolsPage);
    assert.strictEqual(status2.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status2.statusSub, 'Trusted Type Sink Violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    await resource;
  });
});
