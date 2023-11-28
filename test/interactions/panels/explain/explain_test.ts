// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, hover, waitFor} from '../../../shared/helper.js';
import {describe, itScreenshot} from '../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../helpers/shared.js';

describe('ConsoleInsight', function() {
  preloadForCodeCoverage('console_insight/static.html');

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders initial state', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await waitFor('.refine-button');
    await assertElementScreenshotUnchanged(await waitFor('devtools-console-insight'), 'explain/console_insight.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders refined state', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await click('.refine-button');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_refined.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders tooltip', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await hover('.info');
    await assertElementScreenshotUnchanged(
        await waitFor('[data-devtools-glass-pane]'), 'explain/console_insight_info.png', 3);
  });
});
