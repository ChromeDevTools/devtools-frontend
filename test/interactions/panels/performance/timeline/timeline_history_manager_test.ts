// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

// Flaky
describe.skip('[crbug.com/1501755] Timeline History Manager tracks', function() {
  preloadForCodeCoverage('performance_panel/timeline_history_manager.html');
  itScreenshot('renders all the tracks correctly expanded', async () => {
    await loadComponentDocExample('performance_panel/timeline_history_manager.html');
    const dropDown = await waitFor('.drop-down');
    await assertElementScreenshotUnchanged(dropDown, 'performance/history_dropdown.png', 1);
  });
});
