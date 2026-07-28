// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSourcesPanel, PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function setCheckboxState(devToolsPage: DevToolsPage, selector: string, checked: boolean) {
  const isChecked = await devToolsPage.evaluate(sel => {
    const el = document.querySelector(sel) as HTMLInputElement & {checked?: boolean};
    return Boolean(el?.checked || el?.hasAttribute('checked'));
  }, selector);
  if (isChecked !== checked) {
    await devToolsPage.click(selector);
  }
}

async function enableTrustedTypeViolations(devToolsPage: DevToolsPage) {
  await devToolsPage.waitForAria('CSP violation breakpoints');
  await devToolsPage.click('[aria-label="CSP violation breakpoints"]');
  await setCheckboxState(devToolsPage, '[title="Trusted Type violations"]', true);
}

async function waitForPausedMessage(devToolsPage: DevToolsPage, expectedStatusMain: string,
                                    expectedStatusSub?: string) {
  return await devToolsPage.waitForFunction(async () => {
    const messageElement = await devToolsPage.$('.paused-message');
    if (!messageElement) {
      return undefined;
    }
    const statusMainElement = await devToolsPage.$('.status-main', messageElement);
    if (!statusMainElement) {
      return undefined;
    }
    const statusMain = await statusMainElement.evaluate(x => x.textContent);
    if (statusMain !== expectedStatusMain) {
      return undefined;
    }
    let statusSub: string|null = null;
    if (expectedStatusSub !== undefined) {
      const statusSubElement = await devToolsPage.$('.status-sub', messageElement);
      if (!statusSubElement) {
        return undefined;
      }
      const statusSubText = await statusSubElement.evaluate(x => x.textContent);
      if (statusSubText !== expectedStatusSub) {
        return undefined;
      }
      statusSub = statusSubText;
    }
    return {statusMain, statusSub};
  });
}

describe('Breakpoints on CSP Violation', () => {
  it('CSP Violations should come up before break on exceptions', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);
    await enableTrustedTypeViolations(devToolsPage);
    await setCheckboxState(devToolsPage, PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR, true);

    const resource = inspectedPage.goToResource('network/trusted-type-violations-enforced.rawresponse');

    const status1 =
        await waitForPausedMessage(devToolsPage, 'Paused on CSP violation', 'Trusted Type policy violation');
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type policy violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    const status2 = await waitForPausedMessage(
        devToolsPage, 'Paused on exception',
        'TypeError: Failed to execute \'createPolicy\' on \'TrustedTypePolicyFactory\': Policy "policy2" disallowed.');
    assert.strictEqual(status2.statusMain, 'Paused on exception');
    assert.strictEqual(
        status2.statusSub,
        'TypeError: Failed to execute \'createPolicy\' on \'TrustedTypePolicyFactory\': Policy "policy2" disallowed.');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    await resource;
  });

  it('CSP Violations should show in report-only mode', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);
    await enableTrustedTypeViolations(devToolsPage);

    const resource = inspectedPage.goToResource('network/trusted-type-violations-report-only.rawresponse');

    const status1 =
        await waitForPausedMessage(devToolsPage, 'Paused on CSP violation', 'Trusted Type policy violation');
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type policy violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    const status2 = await waitForPausedMessage(devToolsPage, 'Paused on CSP violation', 'Trusted Type sink violation');
    assert.strictEqual(status2.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status2.statusSub, 'Trusted Type sink violation');

    await devToolsPage.click('[aria-label="Resume script execution"]');
    await resource;
  });
});
