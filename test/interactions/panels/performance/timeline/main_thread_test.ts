// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Perf Panel Main Thread', () => {
  preloadForCodeCoverage('performance_panel/flamechart.html');

  itScreenshot('renders some events onto the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/main-thread-long-task-candy-stripe.png', 3);
  });
});
