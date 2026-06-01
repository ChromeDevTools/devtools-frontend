// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

const {AiCodeGenerationTeaser, AiCodeGenerationTeaserDisplayState} = PanelCommon.AiCodeGenerationTeaser;

describeWithEnvironment('AiCodeGenerationTeaser', () => {
  beforeEach(() => {
    AiCodeGenerationTeaser.setDiscoveryTeaserShownInSessionForTest(false);
  });

  afterEach(() => {
    Common.Settings.Settings.instance().settingForTest('ai-code-generation-used').set(false);
  });

  async function createTeaser() {
    const setTimerText = sinon.spy();
    const view = createViewFunctionStub(AiCodeGenerationTeaser, {setTimerText});
    const widget = new AiCodeGenerationTeaser(view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget, setTimerText};
  }

  it('displayState state is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.DISCOVERY);

    widget.displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    await view.nextInput;

    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.TRIGGER);
  });

  it('updates spinner and timer when loading', async () => {
    const clock =
        sinon.useFakeTimers({toFake: ['performance', 'setInterval', 'clearInterval'], shouldAdvanceTime: true});
    clock.tick(1);  // initial time increment
    const {view, widget, setTimerText} = await createTeaser();

    widget.displayState = AiCodeGenerationTeaserDisplayState.LOADING;
    await view.nextInput;
    await widget.updateComplete;

    sinon.assert.calledOnce(setTimerText);
    assert.deepEqual(setTimerText.firstCall.args[0], '(0s)');

    clock.tick(1100);

    sinon.assert.calledTwice(setTimerText);
    assert.deepEqual(setTimerText.secondCall.args[0], '(1s)');

    widget.displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    await view.nextInput;

    const timerCallCount = setTimerText.callCount;

    // Wait to ensure no more updates happen after loading is false.
    clock.tick(1100);

    assert.strictEqual(timerCallCount, setTimerText.callCount);
    clock.restore();
  });

  it('panel is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.isUndefined(view.input.panel);

    widget.panel = AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE;
    await view.nextInput;

    assert.deepEqual(view.input.panel, AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE);
  });

  it('disclaimerTooltipId is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.isUndefined(view.input.disclaimerTooltipId);

    widget.disclaimerTooltipId = 'id';
    await view.nextInput;

    assert.deepEqual(view.input.disclaimerTooltipId, 'id');
  });

  it('should show disclaimer with no logging text when enterprise policy value is ALLOW_WITHOUT_LOGGING', async () => {
    updateHostConfig({
      aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING},
    });

    const {view} = await createTeaser();

    assert.isTrue(view.input.noLogging);
  });

  it('should show disclaimer without no logging text when enterprise policy value is ALLOW', async () => {
    updateHostConfig({aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}});

    const {view} = await createTeaser();

    assert.isFalse(view.input.noLogging);
  });

  it('should open settings on manage in settings tooltip click', async () => {
    const {view} = await createTeaser();
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');

    view.input.onManageInSettingsTooltipClick(new Event('click'));

    assert.isTrue(showViewStub.calledOnceWith('chrome-ai'));
  });

  it('dataUsageTeaserShown is true after leaving TRIGGER state', async () => {
    const {view, widget} = await createTeaser();
    assert.isTrue(view.input.showDataUsageTeaser);

    widget.displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    await view.nextInput;
    assert.isTrue(view.input.showDataUsageTeaser);

    widget.displayState = AiCodeGenerationTeaserDisplayState.DISCOVERY;
    await view.nextInput;
    assert.isFalse(view.input.showDataUsageTeaser);

    widget.displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    await view.nextInput;
    assert.isFalse(view.input.showDataUsageTeaser);
  });

  it('discovery teaser is hidden if feature is used', async () => {
    Common.Settings.Settings.instance().settingForTest('ai-code-generation-used').set(true);
    const {view} = await createTeaser();

    assert.isFalse(view.input.showDiscoveryTeaser);
  });

  it('discovery teaser is shown once per session', async () => {
    const {view, widget} = await createTeaser();

    assert.isTrue(view.input.showDiscoveryTeaser);

    widget.displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    await view.nextInput;

    widget.displayState = AiCodeGenerationTeaserDisplayState.DISCOVERY;
    await view.nextInput;

    assert.isFalse(view.input.showDiscoveryTeaser);
  });
});
