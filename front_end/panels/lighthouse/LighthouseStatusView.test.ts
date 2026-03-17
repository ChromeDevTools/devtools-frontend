// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getCleanTextContentFromSingleElement, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('LighthouseStatusView', () => {
  let statusView: LighthouseModule.LighthouseStatusView.StatusView;
  let container: HTMLElement;

  beforeEach(() => {
    const protocolService = new LighthouseModule.LighthouseProtocolService.ProtocolService();
    const controller = new LighthouseModule.LighthouseController.LighthouseController(protocolService);
    const panel =
        LighthouseModule.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    statusView = new LighthouseModule.LighthouseStatusView.StatusView(panel);
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  function getHeaderText(statusView: LighthouseModule.LighthouseStatusView.StatusView): string {
    assert.isOk(statusView.dialog.contentElement.shadowRoot);
    const headerText = getCleanTextContentFromSingleElement(statusView.dialog.contentElement.shadowRoot, '.header');
    return headerText;
  }

  it('shows the correct header for non-AI controlled runs', () => {
    statusView.setAIControlled(false);
    statusView.setInspectedURL('http://example.com');
    statusView.show(container);

    assert.strictEqual(getHeaderText(statusView), 'Auditing example.com…');
  });

  it('shows the correct header for AI controlled runs', () => {
    statusView.setAIControlled(true);
    statusView.setInspectedURL('http://example.com');
    statusView.show(container);

    assert.strictEqual(getHeaderText(statusView), 'AI assistance is auditing example.com…');
  });

  it('shows the correct header when no URL is set', () => {
    statusView.setAIControlled(false);
    statusView.setInspectedURL('');
    statusView.show(container);

    assert.strictEqual(getHeaderText(statusView), 'Auditing your web page…');
  });

  it('shows the correct header for AI controlled runs when no URL is set', () => {
    statusView.setAIControlled(true);
    statusView.setInspectedURL('');
    statusView.show(container);

    assert.strictEqual(getHeaderText(statusView), 'AI assistance is auditing your web page…');
  });
});
