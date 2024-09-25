// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../helpers/shared.js';

describe('ConsoleInsight', function() {
  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders the opt-in teaser', async () => {
    await loadComponentDocExample('console_insight/optin.html');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_optin.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders the consent reminder', async () => {
    await loadComponentDocExample('console_insight/reminder.html');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_reminder.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders the insight', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await assertElementScreenshotUnchanged(await waitFor('devtools-console-insight'), 'explain/console_insight.png', 3);
  });
});
