// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';

import * as MobileThrottling from './mobile_throttling.js';

const {
  CPUPerformanceTier,
  DEFAULT_HARDWARE_CONCURRENCY_VIEW,
  HardwareConcurrencySelector,
  SaveDataOverrideSelect,
  ThrottlingManager,
} = MobileThrottling.ThrottlingManager;
type HardwareConcurrencyViewInput = MobileThrottling.ThrottlingManager.HardwareConcurrencyViewInput;

function createSaveDataOverrideSelector(): HTMLSelectElement {
  const select = document.createElement('select');
  UI.Widget.registerWidgetConfig(select, UI.Widget.widgetConfig(SaveDataOverrideSelect));
  return select;
}

describeWithEnvironment('ThrottlingManager', () => {
  describe('OfflineToolbarCheckbox', () => {
    it('has initial checked state which depends on throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      let checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow4GConditions);
      checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isFalse(checkbox.checked());
    });

    it('listens to changes in throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      const checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isFalse(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      assert.isTrue(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.NoThrottlingConditions);
      assert.isFalse(checkbox.checked());
    });

    it('updates setting when checkbox is clicked on', () => {
      const multiTargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      const checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      checkbox.element.click();
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.NoThrottlingConditions, multiTargetNetworkManager.networkConditions());

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      assert.isFalse(checkbox.checked());

      checkbox.element.click();
      assert.isTrue(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.OfflineConditions, multiTargetNetworkManager.networkConditions());

      checkbox.element.click();
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.Slow3GConditions, multiTargetNetworkManager.networkConditions());
    });
  });
  describe('CPU throttling', () => {
    it('updates current cpu throttling option', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      assert.strictEqual(throttlingManager.cpuThrottlingOption(), PanelsCommon.CPUThrottlingOption.NoThrottlingOption);

      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);
      assert.strictEqual(throttlingManager.cpuThrottlingOption(),
                         PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);
      assert.strictEqual(SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate(),
                         PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption.rate());

      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      assert.strictEqual(throttlingManager.cpuThrottlingOption(), PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      assert.strictEqual(SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate(),
                         PanelsCommon.CPUThrottlingOption.NoThrottlingOption.rate());
    });

    it('updates current cpu throttling option when the rate changes in the SDK', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();

      cpuThrottlingManager.setCPUThrottlingRate(PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption.rate());
      assert.strictEqual(throttlingManager.cpuThrottlingOption(),
                         PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);

      cpuThrottlingManager.setCPUThrottlingRate(PanelsCommon.CPUThrottlingOption.NoThrottlingOption.rate());
      assert.strictEqual(throttlingManager.cpuThrottlingOption(), PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
    });
  });
  describe('DataSaverEmulation', () => {
    it('creates a select element which updates the data saver setting and triggers emulation', async () => {
      const connection = new MockCDPConnection();
      connection.setSuccessHandler('Emulation.setDataSaverOverride', () => ({}));
      const target = createTarget({connection});
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(emulationModel);
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);

      const select = createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;
      assert.strictEqual(select.title, 'Override the value reported by navigator.connection.saveData on the page');
      assert.strictEqual(select.getAttribute('aria-label'),
                         'Override the value reported by navigator.connection.saveData on the page');
      const options = Array.from(select.options);
      assert.deepEqual(
          options.map(option => option.textContent),
          ['\'Save-Data\': default', '\'Save-Data\': on', '\'Save-Data\': off']);

      let emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.ENABLED;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.ENABLED);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.ENABLED);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.DISABLED;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.DISABLED);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.DISABLED);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.UNSET;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.UNSET);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.UNSET);

      await UI.Widget.Widget.allUpdatesComplete;
      target.dispose('test');
    });

    it('restores the selected option from setting when re-created', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      setting.set(SDK.EmulationModel.DataSaverOverride.ENABLED);

      const select = createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.ENABLED);
      assert.strictEqual(select.selectedIndex, 1);
    });

    it('updates selection when setting changes', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      const select = createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.UNSET);

      setting.set(SDK.EmulationModel.DataSaverOverride.DISABLED);
      await UI.Widget.Widget.allUpdatesComplete;
      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.DISABLED);
      assert.strictEqual(select.selectedIndex, 2);
    });

    it('stops listening to setting changes when removed from DOM', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      const select = createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      const widget = UI.Widget.Widget.get(select);
      assert.isNotNull(widget);
      const requestUpdateSpy = sinon.spy(widget as UI.Widget.Widget, 'requestUpdate');

      select.remove();
      await new Promise(resolve => setTimeout(resolve, 0));

      setting.set(SDK.EmulationModel.DataSaverOverride.ENABLED);
      sinon.assert.notCalled(requestUpdateSpy);
    });
  });

  describe('HardwareConcurrencySelector view', () => {
    function renderView(overrides: Partial<HardwareConcurrencyViewInput> = {}): HTMLElement {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const noop = (): void => {};
      const input: HardwareConcurrencyViewInput = {
        initialized: true,
        overrideEnabled: true,
        value: 8,
        defaultValue: 8,
        onToggle: noop,
        onInput: noop,
        onReset: noop,
        ...overrides,
      };
      DEFAULT_HARDWARE_CONCURRENCY_VIEW(input, undefined, container);
      return container;
    }

    it('renders disabled controls before initialization', () => {
      const container = renderView({initialized: false, overrideEnabled: false, value: 0, defaultValue: 0});
      assert.isTrue(container.classList.contains('concurrency-section'));
      assert.isTrue(container.querySelector<UI.UIUtils.CheckboxLabel>('devtools-checkbox')?.disabled);
      const numInput = container.querySelector<HTMLInputElement>('input[type="number"]');
      assert.isTrue(numInput?.disabled);
      assert.strictEqual(numInput?.value, '');
      assert.isTrue(container.querySelector('devtools-button')?.classList.contains('concurrency-hidden'));
      assert.isTrue(container.querySelector('devtools-icon')?.classList.contains('concurrency-hidden'));
    });

    it('toggles reset and warning visibility based on value', () => {
      const cases: Array<{input: Partial<HardwareConcurrencyViewInput>, reset: boolean, warning: boolean}> = [
        {input: {value: 8, defaultValue: 8}, reset: false, warning: false},
        {input: {value: 16, defaultValue: 8}, reset: true, warning: true},
        {input: {value: 4, defaultValue: 8}, reset: true, warning: false},
        {input: {overrideEnabled: false, value: 16, defaultValue: 8}, reset: false, warning: false},
      ];
      for (const {input, reset, warning} of cases) {
        const container = renderView(input);
        const message = JSON.stringify(input);
        assert.strictEqual(container.querySelector('devtools-button')?.classList.contains('concurrency-hidden'), !reset,
                           message);
        assert.strictEqual(container.querySelector('devtools-icon')?.classList.contains('concurrency-hidden'), !warning,
                           message);
        container.remove();
      }
    });

    it('invokes onToggle when checkbox changes', () => {
      const onToggle = sinon.spy();
      const checkbox = renderView({onToggle}).querySelector<UI.UIUtils.CheckboxLabel>('devtools-checkbox')!;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      sinon.assert.calledOnceWithExactly(onToggle, false);
    });

    it('invokes onInput when number input changes', () => {
      const onInput = sinon.spy();
      const input = renderView({onInput}).querySelector<HTMLInputElement>('input[type="number"]')!;
      input.value = '16';
      input.dispatchEvent(new Event('input'));
      sinon.assert.calledOnceWithExactly(onInput, 16);
    });

    it('does not invoke onInput when number input is cleared', () => {
      const onInput = sinon.spy();
      const input = renderView({onInput}).querySelector<HTMLInputElement>('input[type="number"]')!;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      sinon.assert.notCalled(onInput);
    });

    it('invokes onReset when reset button is clicked', () => {
      const onReset = sinon.spy();
      renderView({value: 12, defaultValue: 8, onReset}).querySelector<HTMLElement>('devtools-button')?.click();
      sinon.assert.calledOnce(onReset);
    });
  });

  describe('HardwareConcurrencySelector', () => {
    async function mountSelector(getDefaultValue: () => Promise<number> = () => Promise.resolve(8)) {
      const cpu = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
      const getStub = sinon.stub(cpu, 'getHardwareConcurrency').callsFake(getDefaultValue);
      const setSpy = sinon.stub(cpu, 'setHardwareConcurrency');
      const view = createViewFunctionStub(HardwareConcurrencySelector);
      const widget = new HardwareConcurrencySelector(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);
      await view.nextInput;
      return {getStub, setSpy, view, widget};
    }

    function reshow(widget: UI.Widget.Widget): void {
      widget.detach();
      renderElementIntoDOM(widget);
    }

    it('loads default hardware concurrency on mount', async () => {
      const {view, widget} = await mountSelector();
      assert.deepInclude(view.input, {initialized: true, overrideEnabled: false, value: 8, defaultValue: 8});
      widget.detach();
    });

    it('applies the value when enabled and the default value when disabled', async () => {
      const {setSpy, view, widget} = await mountSelector();
      view.input.onInput(16);
      assert.deepInclude(await view.nextInput, {overrideEnabled: false, value: 16});
      sinon.assert.notCalled(setSpy);

      view.input.onToggle(true);
      assert.isTrue((await view.nextInput).overrideEnabled);
      sinon.assert.calledOnceWithExactly(setSpy, 16);

      view.input.onToggle(false);
      assert.deepInclude(await view.nextInput, {overrideEnabled: false, value: 16});
      sinon.assert.calledTwice(setSpy);
      sinon.assert.calledWithExactly(setSpy.lastCall, 8);
      widget.detach();
    });

    it('applies input values and the default value on reset while enabled', async () => {
      const {setSpy, view, widget} = await mountSelector();
      view.input.onToggle(true);
      await view.nextInput;

      view.input.onInput(16);
      assert.strictEqual((await view.nextInput).value, 16);
      sinon.assert.calledWithExactly(setSpy.lastCall, 16);

      view.input.onReset();
      assert.deepInclude(await view.nextInput, {overrideEnabled: true, value: 8});
      sinon.assert.calledWithExactly(setSpy.lastCall, 8);
      widget.detach();
    });

    it('does not apply values below 1', async () => {
      const {setSpy, view, widget} = await mountSelector();
      view.input.onToggle(true);
      await view.nextInput;
      setSpy.resetHistory();

      view.input.onInput(0);
      assert.strictEqual((await view.nextInput).value, 0);
      sinon.assert.notCalled(setSpy);
      widget.detach();
    });

    it('retries loading the default value when shown again after a failure', async () => {
      const {getStub, view, widget} = await mountSelector(() => Promise.reject(new Error('Target navigated')));
      assert.isFalse(view.input.initialized);

      getStub.callsFake(() => Promise.resolve(8));
      reshow(widget);
      assert.deepInclude(await view.nextInput, {initialized: true, value: 8});
      sinon.assert.calledTwice(getStub);
      widget.detach();
    });

    it('ignores changes and loads the default value once while loading', async () => {
      const {promise, resolve} = Promise.withResolvers<number>();
      const {getStub, setSpy, view, widget} = await mountSelector(() => promise);
      view.input.onToggle(true);
      view.input.onInput(4);
      sinon.assert.notCalled(setSpy);

      reshow(widget);
      assert.deepInclude(await view.nextInput, {initialized: false, overrideEnabled: false});
      sinon.assert.calledOnce(getStub);

      resolve(8);
      assert.isTrue((await view.nextInput).initialized);
      widget.detach();
    });

    it('keeps the override state when shown again', async () => {
      const {getStub, view, widget} = await mountSelector();
      view.input.onToggle(true);
      await view.nextInput;
      view.input.onInput(16);
      await view.nextInput;

      reshow(widget);
      assert.deepInclude(await view.nextInput, {initialized: true, overrideEnabled: true, value: 16});
      sinon.assert.calledOnce(getStub);
      widget.detach();
    });
  });

  describe('CPU Performance', () => {
    it('updates the effective CPU performance tier when selecting constant slowdown factors', async () => {
      // Set the host default tier to "Ultra".
      const connection = new MockCDPConnection();
      const tierValue = SDK.CPUThrottlingManager.tierToNumber(CPUPerformanceTier.Ultra);
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.cpuPerformance');
        return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
      });
      createTarget({connection});
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      await SDK.CPUThrottlingManager.CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);

      // Select MidTierThrottlingOption (4x slowdown)
      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      // Select LowTierThrottlingOption (6x slowdown)
      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select ExtraSlowThrottlingOption (20x slowdown)
      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select NoThrottlingOption (1x no throttling)
      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });

    it('synchronizes effective CPU performance tier with backend when calibration finishes with a constant slowdown factor',
       async () => {
         // Set the host default tier to "Ultra".
         const connection = new MockCDPConnection();
         const tierValue = SDK.CPUThrottlingManager.tierToNumber(CPUPerformanceTier.Ultra);
         connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
           assert.strictEqual(expression, 'navigator.cpuPerformance');
           return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
         });
         const emulationModelSpy = sinon.spy((_params?: Protocol.Emulation.SetCPUPerformanceOverrideRequest) => ({}));
         connection.setSuccessHandler('Emulation.setCPUPerformanceOverride', emulationModelSpy);
         createTarget({connection});
         SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
         const throttlingManager = ThrottlingManager.instance({forceNew: true});
         await SDK.CPUThrottlingManager.CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
         assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);

         // Select MidTierThrottlingOption (4x slowdown).
         throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption);
         assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

         emulationModelSpy.resetHistory();

         // Simulate calibration that yields a lower host score (actualScore: 1200).
         // With 4x slowdown active, the effective tier changes from Mid to Low
         // without the user changing the CPU throttling option in the UI.
         const calibratedSetting = Common.Settings.Settings.instance().createSetting(
             'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
         calibratedSetting.set({
           low: 4.5,
           mid: 1.2,
           actualScore: 1200,
         });

         assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
         sinon.assert.calledOnceWithMatch(emulationModelSpy, {performanceTier: CPUPerformanceTier.Low});
       });

    it('updates the effective CPU performance tier when selecting mobile presets', async () => {
      // Set the host default tier to "Ultra".
      const connection = new MockCDPConnection();
      const tierValue = SDK.CPUThrottlingManager.tierToNumber(CPUPerformanceTier.Ultra);
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.cpuPerformance');
        return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
      });
      createTarget({connection});
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      await SDK.CPUThrottlingManager.CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);

      // Simulate calibration on an Ultra host (actualScore: 3000).
      // Calibration produces r_mid = 3000 / 1000 = 3.0 and r_low = 3000 / 264 ≈ 11.4.
      // `CPUThrottlingManager.calculatedCPUPerformanceTier` is designed to map these values to
      // `CPUPerformanceTier.Mid` and `CPUPerformanceTier.Low`, respectively.
      const calibratedSetting = Common.Settings.Settings.instance().createSetting(
          'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
      calibratedSetting.set({
        low: 11.4,
        mid: 3.0,
        actualScore: 3000,
      });

      // Select CalibratedMidTierMobileThrottlingOption
      throttlingManager.setCPUThrottlingOption(
          PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      // Select CalibratedLowTierMobileThrottlingOption
      throttlingManager.setCPUThrottlingOption(
          PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select NoThrottlingOption (1x no throttling)
      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });
  });
});
