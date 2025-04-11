// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as PanelFeedback from './panel_feedback.js';

const {urlString} = Platform.DevToolsPath;

describeWithLocale('Feedback button', () => {
  it('calls out to the Host API to open the link in a new tab', async () => {
    const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');
    const component = new PanelFeedback.FeedbackButton.FeedbackButton();
    component.data = {
      feedbackUrl: urlString`https://feedbackurl.com`,
    };

    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    const button = component.shadowRoot!.querySelector('devtools-button');
    assert.instanceOf(button, HTMLElement);
    dispatchClickEvent(button);
    sinon.assert.callCount(openInNewTabStub, 1);
    assert.isTrue(
        openInNewTabStub.firstCall.calledWith(urlString`https://feedbackurl.com`),
        'openInNewTab was not called with the expected URL.');
  });
});
