// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as PanelFeedback from '../../../../../../front_end/ui/components/panel_feedback/panel_feedback.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithLocale('Panel Feedback', () => {
  async function renderFeedbackComponent(): Promise<PanelFeedback.PanelFeedback.PanelFeedback> {
    const component = new PanelFeedback.PanelFeedback.PanelFeedback();
    component.data = {
      feedbackUrl: 'https://feedbackurl.com' as Platform.DevToolsPath.UrlString,
      quickStartUrl: 'https://quickstarturl.com' as Platform.DevToolsPath.UrlString,
      quickStartLinkText: 'quick start link text',
    };

    renderElementIntoDOM(component);
    await coordinator.done();
    return component;
  }

  it('uses the correct href for the feedback x-link', async () => {
    const component = await renderFeedbackComponent();
    assertShadowRoot(component.shadowRoot);
    // Note that whilst they aren't HTMLAnchorElements, it is good enough for
    // this test as all we need is a type that has an `href` attribute.
    const allXLinks = Array.from(component.shadowRoot.querySelectorAll<HTMLAnchorElement>('x-link'));
    const feedbackXLink = allXLinks.find(link => link.innerText === 'Send us your feedback.');
    assert.strictEqual(feedbackXLink?.href, 'https://feedbackurl.com/');
  });

  it('uses the correct href for the quick start x-link', async () => {
    const component = await renderFeedbackComponent();
    assertShadowRoot(component.shadowRoot);
    // Note that whilst they aren't HTMLAnchorElements, it is good enough for
    // this test as all we need is a type that has an `href` attribute.
    const allXLinks = Array.from(component.shadowRoot.querySelectorAll<HTMLAnchorElement>('x-link'));
    const quickstartXLink = allXLinks.find(link => link.innerText === 'quick start link text');
    assert.strictEqual(quickstartXLink?.href, 'https://quickstarturl.com/');
  });
});
