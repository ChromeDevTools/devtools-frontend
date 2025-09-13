// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as PanelFeedback from './panel_feedback.js';

const {urlString} = Platform.DevToolsPath;

describeWithLocale('Panel Feedback', () => {
  async function renderFeedbackComponent(): Promise<PanelFeedback.PanelFeedback.PanelFeedback> {
    const component = new PanelFeedback.PanelFeedback.PanelFeedback();
    component.data = {
      feedbackUrl: urlString`https://feedbackurl.com`,
      quickStartUrl: urlString`https://quickstarturl.com`,
      quickStartLinkText: 'quick start link text',
    };

    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    return component;
  }

  it('uses the correct href for the feedback x-link', async () => {
    const component = await renderFeedbackComponent();
    assert.isNotNull(component.shadowRoot);
    // Note that whilst they aren't HTMLAnchorElements, it is good enough for
    // this test as all we need is a type that has an `href` attribute.
    const allXLinks = Array.from(component.shadowRoot.querySelectorAll<HTMLAnchorElement>('x-link'));
    const feedbackXLink = allXLinks.find(link => link.innerText === 'Send us your feedback.');
    assert.strictEqual(feedbackXLink?.href, 'https://feedbackurl.com/');
  });

  it('uses the correct href for the quick start x-link', async () => {
    const component = await renderFeedbackComponent();
    assert.isNotNull(component.shadowRoot);
    // Note that whilst they aren't HTMLAnchorElements, it is good enough for
    // this test as all we need is a type that has an `href` attribute.
    const allXLinks = Array.from(component.shadowRoot.querySelectorAll<HTMLAnchorElement>('x-link'));
    const quickstartXLink = allXLinks.find(link => link.innerText === 'quick start link text');
    assert.strictEqual(quickstartXLink?.href, 'https://quickstarturl.com/');
  });
});
