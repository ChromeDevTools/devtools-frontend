// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, waitFor} from '../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../helpers/shared.js';

describe('ConsoleInsight', function() {
  // eslint-disable-next-line rulesdir/no-screenshot-test-outside-perf-panel
  itScreenshot('renders the opt-in teaser', async () => {
    await loadComponentDocExample('console_insight/optin.html');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_optin.png');
  });

  // eslint-disable-next-line rulesdir/no-screenshot-test-outside-perf-panel
  itScreenshot('renders the consent reminder', async () => {
    await loadComponentDocExample('console_insight/reminder.html');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_reminder.png');
  });

  // eslint-disable-next-line rulesdir/no-screenshot-test-outside-perf-panel
  itScreenshot('renders the insight', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await assertElementScreenshotUnchanged(await waitFor('devtools-console-insight'), 'explain/console_insight.png');
  });

  // eslint-disable-next-line rulesdir/no-screenshot-test-outside-perf-panel
  itScreenshot('renders insights with references', async () => {
    const {frontend} = getBrowserAndPages();
    await loadComponentDocExample('console_insight/references.html');

    // Click on summary and Wait for details expansion animation to finish
    await frontend.evaluate(() => {
      const detailsElement =
          document.querySelector('devtools-console-insight')?.shadowRoot?.querySelector('details.references');
      detailsElement?.querySelector('summary')?.click();
      return new Promise<void>(resolve => {
        detailsElement?.addEventListener('transitionend', () => {
          resolve();
        });
      });
    });

    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_references.png');
  });
});
