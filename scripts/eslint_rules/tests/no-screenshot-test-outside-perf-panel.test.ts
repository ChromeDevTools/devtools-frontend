// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-screenshot-test-outside-perf-panel.ts';

import {RuleTester} from './utils/RuleTester.ts';

const enabledTestCode = `describe('Performance panel', () => {
    itScreenshot('renders the timeline correctly', async () => {
      await loadComponentDocExample('performance_panel/basic.html?trace=animation');
      await waitFor('#timeline-overview-panel');
      const panel = await waitFor('body');
      await assertElementScreenshotUnchanged(panel, 'performance/timeline.png');
    });
  });`;

const disabledTestCode = `describe('Performance panel', () => {
      // Disabled until screenshot tests infrastructure is available in DevTools bots.
      itScreenshot.skip('[crbug.com/1407638] renders the timeline correctly', async () => {
      await waitFor('#timeline-overview-panel');
      const panel = await waitFor('body');
      await assertElementScreenshotUnchanged(panel, 'performance/timeline.png');
    });
  });`;

const notAScreenshotTestCode = `describe('Performance panel', () => {
    it('renders the timeline correctly', async () => {
    await waitFor('#timeline-overview-panel');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline.png');
  });
  });`;

const notAScreenshotTestDisabledCode = `describe('Performance panel', () => {
    // This is disabled.
    it.skip('[crbug.com/1407638] renders the timeline correctly', async () => {
    await waitFor('#timeline-overview-panel');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline.png');
  });
});`;

const perfPanelInteractionTestsPath = 'test/interactions/panels/performance';
const uiInteractionTestsPath = 'test/interactions/ui/components';
const notPerfPanelTestPath = 'test/interactions/data_grid/data_grid_test.ts';

new RuleTester().run('no-screenshot-test-outside-perf-panel', rule, {
  valid: [
    {
      code: enabledTestCode,
      filename: `${perfPanelInteractionTestsPath}/timeline/timeline_test.ts`,
    },
    {
      code: enabledTestCode,
      filename: `${uiInteractionTestsPath}/Dialog_test.ts`,
    },
    {
      code: disabledTestCode,
      filename: `${perfPanelInteractionTestsPath}/timeline/timeline_test.ts`,
    },
    {
      code: enabledTestCode,
      filename: `${perfPanelInteractionTestsPath}/user_timings/user_imings_test.ts`,
    },
    {
      code: disabledTestCode,
      filename: `${perfPanelInteractionTestsPath}/user_timings/user_imings_test.ts`,
    },
    {
      code: notAScreenshotTestCode,
      filename: notPerfPanelTestPath,
    },
    {
      code: notAScreenshotTestDisabledCode,
      filename: notPerfPanelTestPath,
    },
    {
      code: notAScreenshotTestDisabledCode,
      filename: `${perfPanelInteractionTestsPath}/timeline/timeline_test.ts`,
    },
  ],
  invalid: [
    {
      code: enabledTestCode,
      filename: notPerfPanelTestPath,
      errors: [{messageId: 'invalidScreenshotTest'}],
    },
    {
      code: disabledTestCode,
      filename: notPerfPanelTestPath,
      errors: [{messageId: 'invalidScreenshotTest'}],
    },
    {
      code: enabledTestCode,
      filename: 'test/unittests/front_end/panels/performance/timeline_test.ts',
      errors: [{messageId: 'invalidScreenshotTest'}],
    },
  ],
});
