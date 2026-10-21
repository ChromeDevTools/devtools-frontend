// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Screencast from './screencast.js';

describeWithEnvironment('ScreencastApp', () => {
  let screencastApp: Screencast.ScreencastApp.ScreencastApp|undefined;

  afterEach(() => {
    screencastApp?.rootView?.detach();
    UI.InspectorView.InspectorView.removeInstance();
  });

  it('can start casting', async () => {
    screencastApp = new Screencast.ScreencastApp.ScreencastApp(new TestUniverse());
    screencastApp.presentUI(document);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const target = createTarget({parentTarget: tabTarget});
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(screenCaptureModel);
    await expectCall(sinon.stub(screenCaptureModel, 'startScreencast'));
  });

  it('updates view input and toggle button state when main target model is added and removed', () => {
    const view = sinon.spy();
    screencastApp = new Screencast.ScreencastApp.ScreencastApp(new TestUniverse(), view);
    screencastApp.presentUI(document);

    assert.isFalse(screencastApp.toggleButton.enabled);
    assert.isFalse(screencastApp.toggleButton.isToggled());
    sinon.assert.calledOnceWithExactly(view, {screencastEnabled: false, screenCaptureModel: undefined}, {},
                                       screencastApp.rootView?.contentElement);

    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    assert.isFalse(screencastApp.toggleButton.enabled);
    sinon.assert.calledOnce(view);
    prerenderTarget.dispose('test');

    const mainTarget = createTarget({parentTarget: tabTarget});
    const screenCaptureModel = mainTarget.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(screenCaptureModel);
    assert.isTrue(screencastApp.toggleButton.enabled);
    assert.isTrue(screencastApp.toggleButton.isToggled());
    sinon.assert.calledTwice(view);
    sinon.assert.calledWithExactly(view.secondCall, {screencastEnabled: true, screenCaptureModel}, {},
                                   screencastApp.rootView?.contentElement);

    screencastApp.modelRemoved(screenCaptureModel);
    assert.isFalse(screencastApp.toggleButton.enabled);
    assert.isFalse(screencastApp.toggleButton.isToggled());
    sinon.assert.calledThrice(view);
    sinon.assert.calledWithExactly(view.thirdCall, {screencastEnabled: false, screenCaptureModel: undefined}, {},
                                   screencastApp.rootView?.contentElement);
  });

  it('toggles screencast visibility and setting when toggle button is clicked', () => {
    const view = sinon.spy();
    screencastApp = new Screencast.ScreencastApp.ScreencastApp(new TestUniverse(), view);
    screencastApp.presentUI(document);

    const target = createTarget();
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(screenCaptureModel);
    assert.isTrue(screencastApp.toggleButton.isToggled());

    screencastApp.toggleButton.setToggled(false);
    screencastApp.toggleButton.dispatchEventToListeners(UI.Toolbar.ToolbarButton.Events.CLICK, new MouseEvent('click'));

    assert.isFalse(Common.Settings.Settings.instance().settingForTest('screencast-enabled').get());
    sinon.assert.calledWithExactly(view.lastCall, {screencastEnabled: false, screenCaptureModel}, {},
                                   screencastApp.rootView?.contentElement);

    screencastApp.toggleButton.setToggled(true);
    screencastApp.toggleButton.dispatchEventToListeners(UI.Toolbar.ToolbarButton.Events.CLICK, new MouseEvent('click'));

    assert.isTrue(Common.Settings.Settings.instance().settingForTest('screencast-enabled').get());
    sinon.assert.calledWithExactly(view.lastCall, {screencastEnabled: true, screenCaptureModel}, {},
                                   screencastApp.rootView?.contentElement);
  });

  it('attaches navigation listeners when shown, cleans up when hidden, and re-attaches when re-shown', async () => {
    const target = createTarget();
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(screenCaptureModel);
    assert.exists(resourceTreeModel);
    const navigationHistoryStub = sinon.stub(resourceTreeModel, 'navigationHistory').resolves(null);

    const view = createViewFunctionStub(Screencast.ScreencastView.ScreencastView);
    const screencastView = new Screencast.ScreencastView.ScreencastView(undefined, view);
    screencastView.screenCaptureModel = screenCaptureModel;

    sinon.assert.notCalled(navigationHistoryStub);

    renderElementIntoDOM(screencastView);
    sinon.assert.calledOnce(navigationHistoryStub);
    await view.nextInput;

    navigationHistoryStub.resetHistory();
    screencastView.setHideOnDetach();
    screencastView.detach();
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame),
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
    });
    sinon.assert.notCalled(navigationHistoryStub);

    assert.exists(screencastView.element.parentElement);
    screencastView.show(screencastView.element.parentElement);
    sinon.assert.calledOnce(navigationHistoryStub);
    await view.nextInput;

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame),
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
    });
    const input = await view.nextInput;
    assert.strictEqual(input.progressPercent, 0.1);
    sinon.assert.calledTwice(navigationHistoryStub);
  });
});
