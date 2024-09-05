// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Timeline History Manager tracks', function() {
  // TODO(crbug.com/1472155): Improve perf panel trace load speed to
  // prevent timeout bump.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }
  itScreenshot('renders minimap for parsed profiles in the HistoryManager', async () => {
    await loadComponentDocExample('performance_panel/timeline_history_manager.html');
    const dropDown = await waitFor('.drop-down');
    await assertElementScreenshotUnchanged(dropDown, 'performance/history_dropdown.png', 1);
  });
});
