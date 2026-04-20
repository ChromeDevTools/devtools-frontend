// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('LighthouseStartView', () => {
  let lighthouse: typeof LighthouseModule;

  beforeEach(async () => {
    lighthouse = await import('./lighthouse.js');
  });

  function createStartView(): LighthouseModule.LighthouseStartView.StartView {
    const controller = {
      getFlags: () => ({mode: 'navigation'}),
      recomputePageAuditability: () => {},
    } as unknown as LighthouseModule.LighthouseController.LighthouseController;

    const panel = {
      handleTimespanStart: () => {},
      handleCompleteRun: () => {},
    } as unknown as LighthouseModule.LighthousePanel.LighthousePanel;

    return new lighthouse.LighthouseStartView.StartView(controller, panel);
  }

  it('renders correctly', async () => {
    const view = createStartView();
    renderElementIntoDOM(view);

    await assertScreenshot('lighthouse/LighthouseStartView.png');
  });

  it('renders the title as a level-1 heading for accessibility', () => {
    const view = createStartView();
    renderElementIntoDOM(view);

    const heading = view.contentElement.querySelector('h1.lighthouse-title');
    assert.isOk(heading);
    assert.strictEqual(heading.textContent?.trim(), 'Generate a Lighthouse report');
  });
});
