// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Common from './common.js';

describeWithEnvironment('AiCodeCompletionDisclaimer', () => {
  async function createDisclaimer() {
    const view = createViewFunctionStub(Common.AiCodeCompletionDisclaimer);
    const widget = new Common.AiCodeCompletionDisclaimer(undefined, view);
    widget.disclaimerTooltipId = 'disclaimer-tooltip';
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  afterEach(() => {
    sinon.restore();
  });

  it('should show disclaimer with no logging text when enterprise policy value is ALLOW_WITHOUT_LOGGING', async () => {
    updateHostConfig({
      aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING},
    });

    const {view, widget} = await createDisclaimer();

    assert.isTrue(view.input.noLogging);
    widget.detach();
  });

  it('should show disclaimer without no logging text when enterprise policy value is ALLOW', async () => {
    updateHostConfig({aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}});

    const {view, widget} = await createDisclaimer();

    assert.isFalse(view.input.noLogging);
    widget.detach();
  });

  it('should open settings on manage in settings tooltip click', async () => {
    const {view, widget} = await createDisclaimer();
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');

    view.input.onManageInSettingsTooltipClick();

    assert.isTrue(showViewStub.calledOnceWith('chrome-ai'));
    widget.detach();
  });
});
