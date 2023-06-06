// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, goToResource, waitForAria} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getPausedMessages, openSourcesPanel, PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR} from '../helpers/sources-helpers.js';

describe('Breakpoints on CSP Violation', async () => {
  it('CSP Violations should come up before break on exceptions', async () => {
    await openSourcesPanel();
    await waitForAria('CSP Violation Breakpoints');
    await click('[aria-label="CSP Violation Breakpoints"]');
    await click('[title="Trusted Type Violations"]');
    await click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);

    const resource = goToResource('network/trusted-type-violations-enforced.rawresponse');

    const status1 = await getPausedMessages();
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type Policy Violation');

    await click('[aria-label="Resume script execution"]');
    const status2 = await getPausedMessages();
    assert.strictEqual(status2.statusMain, 'Paused on exception');
    assert.strictEqual(
        status2.statusSub,
        'TypeError: Failed to execute \'createPolicy\' on \'TrustedTypePolicyFactory\': Policy "policy2" disallowed.');

    await click('[aria-label="Resume script execution"]');
    await resource;
  });

  it('CSP Violations should show in report-only mode', async () => {
    await openSourcesPanel();
    await waitForAria('CSP Violation Breakpoints');
    await click('[aria-label="CSP Violation Breakpoints"]');
    await click('[title="Trusted Type Violations"]');

    const resource = goToResource('network/trusted-type-violations-report-only.rawresponse');

    const status1 = await getPausedMessages();
    assert.strictEqual(status1.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status1.statusSub, 'Trusted Type Policy Violation');

    await click('[aria-label="Resume script execution"]');
    const status2 = await getPausedMessages();
    assert.strictEqual(status2.statusMain, 'Paused on CSP violation');
    assert.strictEqual(status2.statusSub, 'Trusted Type Sink Violation');

    await click('[aria-label="Resume script execution"]');
    await resource;
  });
});
