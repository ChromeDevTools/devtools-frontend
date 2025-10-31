// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Root from '../../../core/root/root.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
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
  }

  it('shows render consent view correctly', async () => {
    renderViewForScreenshots(Host.AidaClient.AidaAccessPreconditions.AVAILABLE, {
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      }
    });
    await assertScreenshot('ai_assistance/components/consent-view.png');
  });

  it('shows render disable correctly', async () => {
    renderViewForScreenshots(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL, {
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      }
    });
    await assertScreenshot('ai_assistance/components/disable-view.png');
  });
});
