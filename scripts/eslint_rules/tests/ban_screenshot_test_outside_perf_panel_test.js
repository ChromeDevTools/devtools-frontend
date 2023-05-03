// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/ban_screenshot_test_outside_perf_panel.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

const EXPECTED_ERROR_MESSAGE =
    'It is banned to write screenshot tests outside the directory of the Performance Panel interaction tests.';

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

const perfPanelInteractionTestsPath = 'test/interactions/panels/performance/';
const uiInteractionTestsPath = 'test/interactions/ui/components/';
const notPerfPanelTestPath = 'test/interactions/data_grid/data_grid_test.ts';

ruleTester.run('ban_screenshot_test_outside_perf_panel', rule, {
  valid: [
    {
      code: enabledTestCode,
      filename: `${perfPanelInteractionTestsPath}timeline/timeline_test.ts`,
    },
    {
      code: enabledTestCode,
      filename: `${uiInteractionTestsPath}/Dialog_test.ts`,
    },
    {
      code: disabledTestCode,
      filename: `${perfPanelInteractionTestsPath}timeline/timeline_test.ts`,
    },
    {
      code: enabledTestCode,
      filename: `${perfPanelInteractionTestsPath}user_timings/user_imings_test.ts`,
    },
    {
      code: disabledTestCode,
      filename: `${perfPanelInteractionTestsPath}user_timings/user_imings_test.ts`,
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
      filename: `${perfPanelInteractionTestsPath}timeline/timeline_test.ts`,
    },
  ],
  invalid: [
    {
      code: enabledTestCode,
      filename: notPerfPanelTestPath,
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: disabledTestCode,
      filename: notPerfPanelTestPath,
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: enabledTestCode,
      filename: 'test/unittests/front_end/panels/performance/timeline_test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
  ]
});
