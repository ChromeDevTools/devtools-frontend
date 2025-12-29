// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

const {AiCodeGenerationTeaser, AiCodeGenerationTeaserDisplayState} = PanelCommon.AiCodeGenerationTeaser;

describeWithEnvironment('AiCodeGenerationTeaser', () => {
  async function createTeaser() {
    const view = createViewFunctionStub(AiCodeGenerationTeaser);
    const widget = new AiCodeGenerationTeaser(view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('displayState state is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.TRIGGER);

    widget.displayState = AiCodeGenerationTeaserDisplayState.DISCOVERY;
    await view.nextInput;

    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.DISCOVERY);

    widget.displayState = AiCodeGenerationTeaserDisplayState.LOADING;
    await view.nextInput;

    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.LOADING);
    widget.detach();
  });

  it('panel is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.isUndefined(view.input.panel);

    widget.panel = AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE;
    await view.nextInput;

    assert.deepEqual(view.input.panel, AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE);
    widget.detach();
  });

  it('disclaimerTooltipId is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.isUndefined(view.input.disclaimerTooltipId);

    widget.disclaimerTooltipId = 'id';
    await view.nextInput;

    assert.deepEqual(view.input.disclaimerTooltipId, 'id');
    widget.detach();
  });

  it('should show disclaimer with no logging text when enterprise policy value is ALLOW_WITHOUT_LOGGING', async () => {
    updateHostConfig({
      aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING},
    });

    const {view, widget} = await createTeaser();

    assert.isTrue(view.input.noLogging);
    widget.detach();
  });

  it('should show disclaimer without no logging text when enterprise policy value is ALLOW', async () => {
    updateHostConfig({aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}});

    const {view, widget} = await createTeaser();

    assert.isFalse(view.input.noLogging);
    widget.detach();
  });

  it('should open settings on manage in settings tooltip click', async () => {
    const {view, widget} = await createTeaser();
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');

    view.input.onManageInSettingsTooltipClick(new Event('click'));

    assert.isTrue(showViewStub.calledOnceWith('chrome-ai'));
    widget.detach();
  });
});
