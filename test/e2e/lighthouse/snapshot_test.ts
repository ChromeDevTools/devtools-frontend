// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  navigateToLighthouseTab,
  selectMode,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('Snapshot', async function() {
  // The tests in this suite are particularly slow
  this.timeout(60_000);

  beforeEach(() => {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
  });

  it('successfully returns a Lighthouse report for the page state', async () => {
    await navigateToLighthouseTab('lighthouse/hello.html');

    const {target} = await getBrowserAndPages();
    await target.evaluate(() => {
      const makeTextFieldBtn = document.querySelector('button');
      if (!makeTextFieldBtn) {
        throw new Error('Button not found');
      }
      makeTextFieldBtn.click();
      makeTextFieldBtn.click();
      makeTextFieldBtn.click();
    });

    await selectMode('snapshot');
    await clickStartButton();

    const {lhr, artifacts, reportEl} = await waitForResult();

    assert.strictEqual(lhr.gatherMode, 'snapshot');

    assert.deepStrictEqual(artifacts.ViewportDimensions, {
      innerHeight: 640,
      innerWidth: 360,
      outerHeight: 640,
      outerWidth: 360,
      devicePixelRatio: 3,
    });

    const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
    assert.strictEqual(auditResults.length, 73);
    assert.strictEqual(erroredAudits.length, 0);
    assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
      'document-title',
      'html-has-lang',
      'label',
      'meta-description',
      'tap-targets',
    ]);

    // These a11y violations are not present on initial page load.
    assert.strictEqual(lhr.audits['label'].details.items.length, 3);

    // No trace was collected in snapshot mode.
    const viewTrace = await reportEl.$('.lh-button--trace');
    assert.strictEqual(viewTrace, null);
  });
});
