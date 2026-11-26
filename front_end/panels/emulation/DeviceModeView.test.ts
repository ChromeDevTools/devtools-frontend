// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
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
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';
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
      placeholder.element.textContent = 'Inspected Page Placeholder';

      renderElementIntoDOM(wrapper, {includeCommonStyles: true, width: 800, height: 600});

      await UI.Widget.Widget.allUpdatesComplete;
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
      placeholder.element.textContent = 'Inspected Page Placeholder';

      // Enable Device Mode
      const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
      model.enabledSetting().set(true);

      renderElementIntoDOM(wrapper, {includeCommonStyles: true, width: 800, height: 600});

      await UI.Widget.Widget.allUpdatesComplete;
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
      showRulersSetting =
          Common.Settings.Settings.instance().resolve(SettingsUI.EmulationSettings.showRulersSettingDescriptor);

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

      it('projects model and ruler setting state into view input', async () => {
        const viewStub = createViewFunctionStub(Emulation.DeviceModeView.DeviceModeView);
        const widget = new Emulation.DeviceModeView.DeviceModeView(undefined, viewStub);
        renderElementIntoDOM(widget);

        showRulersSetting.set(true);
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
        await widget.updateComplete;

        assert.isTrue(viewStub.input.showDeviceMode);
        assert.isTrue(viewStub.input.resizable);
        assert.isTrue(viewStub.input.showRulers);
      });

      it('forwards sizing callbacks from view input to the model', async () => {
        const viewStub = createViewFunctionStub(Emulation.DeviceModeView.DeviceModeView);
        const widget = new Emulation.DeviceModeView.DeviceModeView(undefined, viewStub);
        renderElementIntoDOM(widget);
        await widget.updateComplete;

        const setWidthSpy = sinon.spy(deviceModeModel, 'setWidth');
        const setHeightSpy = sinon.spy(deviceModeModel, 'setHeight');
        const setWidthAndScaleToFitSpy = sinon.spy(deviceModeModel, 'setWidthAndScaleToFit');
        const setHeightAndScaleToFitSpy = sinon.spy(deviceModeModel, 'setHeightAndScaleToFit');

        viewStub.input.onSetWidth(400);
        sinon.assert.calledOnceWithExactly(setWidthSpy, 400);

        viewStub.input.onDoubleclickBottomResizer();
        sinon.assert.calledOnceWithExactly(setHeightSpy, 0);

        viewStub.input.onApplyPresetSize(768);
        sinon.assert.calledOnceWithExactly(setWidthAndScaleToFitSpy, 768);

        setWidthAndScaleToFitSpy.resetHistory();
        viewStub.input.onWidthMarkerSelected(320);
        sinon.assert.calledOnceWithExactly(setWidthAndScaleToFitSpy, 320);

        viewStub.input.onHeightMarkerSelected(480);
        sinon.assert.calledOnceWithExactly(setHeightAndScaleToFitSpy, 480);
      });

      it('updates model available size from measureContentArea on resize', async () => {
        const measureContentArea = sinon.stub().returns({
          rect: new DOMRect(0, 0, 500, 400),
          handleWidth: 20,
          handleHeight: 20,
        });
        const viewStub = createViewFunctionStub(Emulation.DeviceModeView.DeviceModeView, {
          measureContentArea,
        });
        const widget = new Emulation.DeviceModeView.DeviceModeView(undefined, viewStub);
        renderElementIntoDOM(widget);
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
        await widget.updateComplete;

        const setAvailableSizeSpy = sinon.spy(deviceModeModel, 'setAvailableSize');
        measureContentArea.resetHistory();
        widget.onResize();

        sinon.assert.calledOnce(measureContentArea);
        sinon.assert.calledOnceWithExactly(
            setAvailableSizeSpy,
            sinon.match({width: 500, height: 400}),
            sinon.match({width: 460, height: 380}),
        );
      });

      it('populates measureContentArea in DEFAULT_VIEW', () => {
        const target = document.createElement('div');
        renderElementIntoDOM(target);
        const output: Emulation.DeviceModeView.ViewOutput = {};
        const noop = (): void => {};
        const input: Emulation.DeviceModeView.ViewInput = {
          model: deviceModeModel,
          showDeviceMode: true,
          resizable: true,
          showRulers: false,
          showMediaInspector: false,
          scale: 1,
          getAppliedDeviceWidth: () => 400,
          onSetWidth: noop,
          onApplyPresetSize: noop,
          onWidthMarkerSelected: noop,
          onHeightMarkerSelected: noop,
          bottomRightResizerRef: noop,
          bottomLeftResizerRef: noop,
          rightResizerRef: noop,
          leftResizerRef: noop,
          bottomResizerRef: noop,
          onDoubleclickBottomResizer: noop,
        };

        Emulation.DeviceModeView.DEFAULT_VIEW(input, output, target);

        assert.isTrue(target.classList.contains('device-mode-view'));
        assert.isDefined(output.measureContentArea);
        const measurements = output.measureContentArea();
        assert.isNotNull(measurements);
      });
    });
  });

  describe('Ruler', () => {
    it('does not render markers or hang when scale is 0', async () => {
      const ruler = new Emulation.DeviceModeView.Ruler();
      ruler.scale = 0;
      renderElementIntoDOM(ruler, {includeCommonStyles: true, width: 800, height: 600});
      await ruler.updateComplete;

      const markers = ruler.contentElement.querySelectorAll('.device-mode-ruler-marker');
      assert.lengthOf(markers, 0);
    });

    it('passes state to RulerView', async () => {
      const viewStub = createViewFunctionStub(Emulation.DeviceModeView.Ruler);
      const ruler = new Emulation.DeviceModeView.Ruler(undefined, viewStub);
      ruler.horizontal = false;
      ruler.scale = 0.5;
      renderElementIntoDOM(ruler);
      await ruler.updateComplete;

      assert.isFalse(viewStub.input.horizontal);
      assert.strictEqual(viewStub.input.scale, 0.5);
      assert.strictEqual(viewStub.input.zoomFactor, 1);
    });

    it('dispatches marker selected event when marker is clicked', async () => {
      const viewStub = createViewFunctionStub(Emulation.DeviceModeView.Ruler);
      const ruler = new Emulation.DeviceModeView.Ruler(undefined, viewStub);
      renderElementIntoDOM(ruler);
      await ruler.updateComplete;

      const onMarkerSelected = sinon.spy();
      ruler.addEventListener(Emulation.DeviceModeView.RulerEvents.MARKER_SELECTED, onMarkerSelected);
      viewStub.input.onMarkerClick(200);

      sinon.assert.calledOnce(onMarkerSelected);
      assert.strictEqual(onMarkerSelected.firstCall.args[0].data, 200);
    });

    it('invokes onMarkerClick when a ruler text marker is clicked in DEFAULT_RULER_VIEW', () => {
      const target = document.createElement('div');
      Object.defineProperty(target, 'offsetWidth', {value: 300});
      renderElementIntoDOM(target);
      const onMarkerClick = sinon.spy();

      Emulation.DeviceModeView.DEFAULT_RULER_VIEW(
          {
            horizontal: true,
            scale: 1,
            zoomFactor: 1,
            onMarkerClick,
          },
          undefined,
          target,
      );

      const markerText = target.querySelector<HTMLElement>('.device-mode-ruler-text');
      assert.instanceOf(markerText, HTMLElement);
      markerText.click();

      sinon.assert.calledOnceWithExactly(onMarkerClick, 100);
    });
  });

  describe('InspectedPagePlaceholder', () => {
    it('does not report bounds while detached when device mode is turned off', async () => {
      // Like the root SplitWidget in AdvancedApp, the parent lays out the DeviceModeView synchronously whenever the
      // placeholder's constraints change, which happens while the DeviceModeView re-renders.
      const parent = new UI.Widget.VBox();
      renderElementIntoDOM(parent, {includeCommonStyles: true, width: 800, height: 600});
      const view = new Emulation.DeviceModeView.DeviceModeView();
      view.show(parent.contentElement);

      const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
      model.enabledSetting().set(true);
      await UI.Widget.Widget.allUpdatesComplete;

      const placeholder = Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance();
      const updates: Array<{connected: boolean, bounds: Emulation.InspectedPagePlaceholder.Bounds}> = [];
      placeholder.addEventListener(Emulation.InspectedPagePlaceholder.Events.UPDATE, ({data}) => {
        updates.push({connected: placeholder.element.isConnected, bounds: data});
      });

      model.enabledSetting().set(false);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.isNotEmpty(updates);
      for (const {connected, bounds} of updates) {
        assert.isTrue(connected);
        assert.isAbove(bounds.width, 1);
        assert.isAbove(bounds.height, 1);
      }
    });
  });
});
