// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Performance panel', () => {
  // Disabled until screenshot tests infrastructure is available in DevTools bots.
  itScreenshot.skip('[crbug.com/1407638] renders the timeline correctly', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=animation');
    await waitFor('#timeline-overview-panel');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline.png');
  });
});
