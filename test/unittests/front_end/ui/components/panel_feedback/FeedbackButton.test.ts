// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as PanelFeedback from '../../../../../../front_end/ui/components/panel_feedback/panel_feedback.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithLocale('Feedback button', () => {
  it('calls out to the Host API to open the link in a new tab', async () => {
    const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');
    const component = new PanelFeedback.FeedbackButton.FeedbackButton();
    component.data = {
      feedbackUrl: 'https://feedbackurl.com' as Platform.DevToolsPath.UrlString,
    };

    renderElementIntoDOM(component);
    await coordinator.done();
    assertShadowRoot(component.shadowRoot);
    const button = component.shadowRoot.querySelector('devtools-button');
    assertElement(button, HTMLElement);
    dispatchClickEvent(button);
    assert.strictEqual(openInNewTabStub.callCount, 1);
    assert.isTrue(
        openInNewTabStub.firstCall.calledWith('https://feedbackurl.com' as Platform.DevToolsPath.UrlString),
        'openInNewTab was not called with the expected URL.');
  });
});
