// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, TEST_CONTAINER_ID} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('LighthouseTimespanView', () => {
  let lighthouse: typeof LighthouseModule;

  beforeEach(async () => {
    lighthouse = await import('./lighthouse.js');
  });

  it('renders correctly', async () => {
    const panel = {
      handleTimespanEnd: () => {},
      handleRunCancel: () => {},
    } as unknown as LighthouseModule.LighthousePanel.LighthousePanel;

    const view = new lighthouse.LighthouseTimespanView.TimespanView(panel);

    const container = document.getElementById(TEST_CONTAINER_ID);
    assert(container);
    container.append(view.contentElement);

    // Ensure contentElement has size
    view.contentElement.style.width = '800px';
    view.contentElement.style.height = '600px';
    view.contentElement.style.display = 'block';

    await assertScreenshot('lighthouse/LighthouseTimespanView.png');
  });
});
