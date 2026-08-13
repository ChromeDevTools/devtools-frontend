// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {cleanTestDOM} from '../../testing/DOMHooks.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as Emulation from './emulation.js';

describeWithEnvironment('DeviceModeView', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    UI.ActionRegistration.registerActionExtension({
      actionId: 'emulation.toggle-device-mode',
      category: UI.ActionRegistration.ActionCategory.NONE,
    });
    UI.ZoomManager.ZoomManager.instance({
      forceNew: true,
      win: window,
      frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
    });
  });

  afterEach(async () => {
    cleanTestDOM();
    await raf();
    UI.ActionRegistration.maybeRemoveActionExtension('emulation.toggle-device-mode');
    Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance({forceNew: true});
  });

  describe('Wrapper', () => {
    it('toggles device mode setting and updates action state', async () => {
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction('emulation.toggle-device-mode');
      const wrapper = new Emulation.DeviceModeView.DeviceModeView();

      const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
      await wrapper.updateComplete;
      assert.isFalse(model.isDeviceModeOn());
      assert.isFalse(action.toggled());

      model.enabledSetting().set(true);
      await wrapper.updateComplete;
      assert.isTrue(model.isDeviceModeOn());
      assert.isTrue(action.toggled());

      model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      assert.strictEqual(model.type(), EmulationModel.DeviceModeModel.Type.Responsive);

      model.enabledSetting().set(false);
      await wrapper.updateComplete;
      assert.isFalse(model.isDeviceModeOn());
      assert.isFalse(action.toggled());
      assert.strictEqual(model.type(), EmulationModel.DeviceModeModel.Type.None);
    });

    it('renders the view', async () => {
      // Stub EmulationModel properties called during mount
      sinon.stub(universe.createTarget().pageAgent(), 'invoke_getLayoutMetrics').resolves({
        cssVisualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        layoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        visualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        contentSize: {x: 0, y: 0, width: 800, height: 600},
        cssLayoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        cssContentSize: {x: 0, y: 0, width: 800, height: 600},
        getError: () => undefined,
      });

      const wrapper = new Emulation.DeviceModeView.DeviceModeView();

      const placeholder = Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance();
      placeholder.contentElement.textContent = 'Inspected Page Placeholder';

      renderElementIntoDOM(wrapper, {includeCommonStyles: true, width: 800, height: 600});

      await wrapper.updateComplete;
      await assertScreenshot('emulation/device_mode_wrapper_base.png');
    });

    it('renders the view in toggled state', async () => {
      sinon.stub(universe.createTarget().pageAgent(), 'invoke_getLayoutMetrics').resolves({
        cssVisualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        layoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        visualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        contentSize: {x: 0, y: 0, width: 800, height: 600},
        cssLayoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        cssContentSize: {x: 0, y: 0, width: 800, height: 600},
        getError: () => undefined,
      });

      const wrapper = new Emulation.DeviceModeView.DeviceModeView();

      const placeholder = Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance();
      placeholder.contentElement.textContent = 'Inspected Page Placeholder';

      // Enable Device Mode
      const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
      model.enabledSetting().set(true);

      renderElementIntoDOM(wrapper, {includeCommonStyles: true, width: 800, height: 600});

      await wrapper.updateComplete;
      await assertScreenshot('emulation/device_mode_wrapper_toggled.png');
    });
    it('calculates screenshot clip bounding box from border quad for scaled elements', async () => {
      const target = universe.createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const node = new SDK.DOMModel.DOMNode(domModel);
      sinon.stub(node, 'resolveToObject').resolves(sinon.createStubInstance(SDK.RemoteObject.RemoteObject));

      // Box model has unscaled layout width/height of 150x100, but border quad points scaled by 200% (300x200).
      const boxModel: Protocol.DOM.BoxModel = {
        content: [10, 20, 310, 20, 310, 220, 10, 220],
        padding: [10, 20, 310, 20, 310, 220, 10, 220],
        border: [10, 20, 310, 20, 310, 220, 10, 220],
        margin: [10, 20, 310, 20, 310, 220, 10, 220],
        width: 150,
        height: 100,
      };
      sinon.stub(node, 'boxModel').resolves(boxModel);

      sinon.stub(target.pageAgent(), 'invoke_getLayoutMetrics').resolves({
        cssVisualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        layoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        visualViewport:
            {offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600, scale: 1, zoom: 1},
        cssLayoutViewport: {pageX: 0, pageY: 0, clientWidth: 800, clientHeight: 600},
        contentSize: {x: 0, y: 0, width: 800, height: 600},
        cssContentSize: {x: 0, y: 0, width: 800, height: 600},
        getError: () => undefined,
      });

      const context = UI.Context.Context.instance();
      context.setFlavor(SDK.DOMModel.DOMNode, node);

      const captureScreenshotStub = sinon.stub(Emulation.DeviceModeView.DeviceModeView, 'captureScreenshot');

      const actionDelegate = new Emulation.DeviceModeView.ActionDelegate();
      actionDelegate.handleAction(context, 'emulation.capture-node-screenshot');

      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnce(captureScreenshotStub);
      const clip = captureScreenshotStub.firstCall.args[1];
      assert.deepEqual(clip, {
        x: 10,
        y: 20,
        width: 300,
        height: 200,
        scale: 1,
      });
    });
  });

  describe('DeviceModeView Tests', () => {
    let deviceModeModel: EmulationModel.DeviceModeModel.DeviceModeModel;
    let view: Emulation.DeviceModeView.DeviceModeView;
    let showRulersSetting: Common.Settings.Setting<boolean>;

    beforeEach(async () => {
      showRulersSetting = Common.Settings.Settings.instance().moduleSetting('emulation.show-rulers');

      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});

      MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});

      createTarget();
      deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
      deviceModeModel.enabledSetting().set(true);
      view = new Emulation.DeviceModeView.DeviceModeView();
    });

    it('renders the view', async () => {
      renderElementIntoDOM(view, {includeCommonStyles: true, width: 800, height: 600});
      await UI.Widget.Widget.allUpdatesComplete;
      await assertScreenshot('device_mode_view/base.png');
    });

    it('renders the view with rulers', async () => {
      showRulersSetting.set(true);
      renderElementIntoDOM(view, {includeCommonStyles: true, width: 800, height: 600});
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      await UI.Widget.Widget.allUpdatesComplete;
      await assertScreenshot('device_mode_view/rulers.png');
    });

    describe('Logic Tests', () => {
      it('creates preset bars during initialization', () => {
        const presetsContainer = view.contentElement.querySelector('.device-mode-presets-container');
        assert.exists(presetsContainer);
        const presetBars = presetsContainer?.querySelectorAll('.device-mode-preset-bar');
        assert.strictEqual(presetBars?.length, 7);
      });

      it('toggles rulers when setting changes', async () => {
        renderElementIntoDOM(view);
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);

        const contentClip = view.contentElement.querySelector('.device-mode-content-clip');
        assert.isFalse(contentClip?.classList.contains('device-mode-rulers-visible'));

        showRulersSetting.set(true);
        await view.updateComplete;

        assert.isTrue(contentClip?.classList.contains('device-mode-rulers-visible'));
      });

      it('sets correct dimensions on screenArea upon model updates', async () => {
        renderElementIntoDOM(view);
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);

        sinon.stub(deviceModeModel, 'screenRect').returns(new EmulationModel.DeviceModeModel.Rect(0, 0, 800, 600));
        deviceModeModel.dispatchEventToListeners(EmulationModel.DeviceModeModel.Events.UPDATED);
        await view.updateComplete;

        const screenArea = view.contentElement.querySelector<HTMLElement>('.device-mode-screen-area');
        assert.instanceOf(screenArea, HTMLElement);
        assert.strictEqual(screenArea.style.width, '800px');
        assert.strictEqual(screenArea.style.height, '600px');
      });

      it('clicks a preset button and updates model', () => {
        renderElementIntoDOM(view);

        const setWidthAndScaleToFitSpy = sinon.spy(deviceModeModel, 'setWidthAndScaleToFit');

        const presetsContainer = view.contentElement.querySelector('.device-mode-presets-container');
        const preset = presetsContainer?.querySelector<HTMLElement>('.device-mode-preset-bar');

        assert.instanceOf(preset, HTMLElement);
        preset.click();

        sinon.assert.calledWith(setWidthAndScaleToFitSpy, 2560);
      });
    });
  });
});
