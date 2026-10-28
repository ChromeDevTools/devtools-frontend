// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../../core/host/host.js';
import type * as Root from '../../../core/root/root.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatView', () => {
  function renderViewForScreenshots(
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
      hostConfig: Root.Runtime.HostConfig,
  ) {
    const target = document.createElement('div');
    target.style.maxWidth = '420px';
    target.style.maxHeight = '600px';
    target.style.padding = '12px';
    renderElementIntoDOM(target);
    AiAssistance.DisabledWidget.DEFAULT_VIEW(
        {
          aidaAvailability,
          hostConfig,
        },
        {}, target);
    return target;
  }

  it('shows render consent view correctly', async () => {
    renderViewForScreenshots(Host.AidaClient.AidaAccessPreconditions.AVAILABLE, {
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      },
    });
    await assertScreenshot('ai_assistance/components/consent-view.png');
  });

  it('opens AI settings when clicking the settings link in the consent view', () => {
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const target = renderViewForScreenshots(Host.AidaClient.AidaAccessPreconditions.AVAILABLE, {});
    const link = target.querySelector('devtools-link');
    assert.isNotNull(link);
    link.click();
    sinon.assert.calledOnceWithExactly(showViewStub, 'chrome-ai');
  });

  it('shows render disable correctly', async () => {
    renderViewForScreenshots(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL, {
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      },
    });
    await assertScreenshot('ai_assistance/components/disable-view.png');
  });
});
