// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function getLocalMetricValue(view: Element, metric: string): HTMLElement {
  const card = view.shadowRoot!.querySelector(`#${metric} devtools-metric-card`);
  return card!.querySelector('[slot="local-value"] .metric-value') as HTMLElement;
}

function getFieldMetricValue(view: Element, metric: string): HTMLElement {
  const card = view.shadowRoot!.querySelector(`#${metric} devtools-metric-card`);
  return card!.querySelector('[slot="field-value"] .metric-value') as HTMLElement;
}

function getFieldHistogramPercents(view: Element, metric: string): string[] {
  const card = view.shadowRoot!.querySelector(`#${metric} devtools-metric-card`);
  const histogram = card!.querySelector('.field-data-histogram') as HTMLElement;
  const percents = Array.from(histogram.querySelectorAll('.histogram-percent')) as HTMLElement[];
  return percents.map(p => p.textContent || '');
}

function getThrottlingRecommendation(view: Element): HTMLElement|null {
  return view.shadowRoot!.querySelector('.throttling-recommendation');
}

function getInteractions(view: Element): HTMLElement[] {
  const interactionsListEl = view.shadowRoot?.querySelector('.interactions-list') as HTMLElement;
  return Array.from(interactionsListEl.querySelectorAll('.interaction')) as HTMLElement[];
}

function selectDeviceOption(view: Element, deviceOption: string): void {
  const deviceScopeSelector =
      view.shadowRoot!.querySelector('#device-scope-select devtools-select-menu') as HTMLElement;
  const deviceScopeOptions =
      Array.from(deviceScopeSelector.querySelectorAll('#device-scope-select devtools-menu-item')) as
      HTMLElementTagNameMap['devtools-menu-item'][];

  deviceScopeSelector.click();
  deviceScopeOptions.find(o => o.value === deviceOption)!.click();
}

function selectPageScope(view: Element, pageScope: string): void {
  const pageScopeSelector = view.shadowRoot!.querySelector('#page-scope-select devtools-select-menu') as HTMLElement;
  pageScopeSelector.click();

  const pageScopeOptions = Array.from(pageScopeSelector.querySelectorAll('#page-scope-select devtools-menu-item')) as
      HTMLElementTagNameMap['devtools-menu-item'][];
  const originOption = pageScopeOptions.find(o => o.value === pageScope);
  originOption!.click();
}

function createMockFieldData() {
  return {
    record: {
      key: {
        // Only one of these keys will be set for a given result in reality
        // Setting both here to make testing easier.
        url: 'https://example.com/',
        origin: 'https://example.com',
      },
      metrics: {
        'largest_contentful_paint': {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
        },
        'cumulative_layout_shift': {
          histogram: [
            {start: 0, end: 0.1},
            {start: 0.1, end: 0.25, density: 0.2},
            {start: 0.25, density: 0.8},
          ],
          percentiles: {p75: 0.25},
        },
        'round_trip_time': {
          percentiles: {p75: 150},
        },
      },
      collectionPeriod: {
        firstDate: {year: 2024, month: 1, day: 1},
        lastDate: {year: 2024, month: 1, day: 29},
      },
    },
  };
}

describeWithMockConnection('LiveMetricsView', () => {
  const mockHandleAction = sinon.stub();

  beforeEach(async () => {
    mockHandleAction.reset();

    UI.ActionRegistration.registerActionExtension({
      actionId: 'timeline.toggle-recording',
      category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
      loadActionDelegate: async () => ({handleAction: mockHandleAction}),
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'timeline.record-reload',
      category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
      loadActionDelegate: async () => ({handleAction: mockHandleAction}),
    });

    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.registerSettingExtension({
      category: Common.Settings.SettingCategory.MOBILE,
      settingName: 'emulation.show-device-outline',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    LiveMetrics.LiveMetrics.instance({forceNew: true});
    CrUXManager.CrUXManager.instance({forceNew: true});
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
  });

  afterEach(async () => {
    UI.ActionRegistry.ActionRegistry.reset();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();

    UI.ActionRegistration.maybeRemoveActionExtension('timeline.toggle-recording');
    UI.ActionRegistration.maybeRemoveActionExtension('timeline.record-reload');
  });

  it('should show LCP value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      lcp: {value: 100},
      interactions: [],
    });
    await coordinator.done();
    const metricValueEl = getLocalMetricValue(view, 'lcp');
    assert.strictEqual(metricValueEl.className, 'metric-value good');
    assert.strictEqual(metricValueEl.innerText, '100 ms');
  });

  it('should show CLS value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      cls: {value: 0.14294789234},
      interactions: [],
    });
    await coordinator.done();
    const metricValueEl = getLocalMetricValue(view, 'cls');
    assert.strictEqual(metricValueEl.className, 'metric-value needs-improvement');
    assert.strictEqual(metricValueEl.innerText, '0.14');
  });

  it('should show INP value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(
        LiveMetrics.Events.Status, {inp: {value: 2000}, interactions: []});
    await coordinator.done();
    const metricValueEl = getLocalMetricValue(view, 'inp');
    assert.strictEqual(metricValueEl.className, 'metric-value poor');
    assert.strictEqual(metricValueEl.innerText, '2.00 s');
  });

  it('should show empty metric', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();
    const metricValueEl = getLocalMetricValue(view, 'inp');
    assert.strictEqual(metricValueEl.className.trim(), 'metric-value waiting');
    assert.strictEqual(metricValueEl.innerText, '-');
  });

  it('should show interactions', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      interactions: [
        {duration: 500, interactionType: 'pointer'},
        {duration: 30, interactionType: 'keyboard'},
      ],
    });
    await coordinator.done();

    const interactionsEls = getInteractions(view);
    assert.lengthOf(interactionsEls, 2);

    const typeEl1 = interactionsEls[0].querySelector('.interaction-type') as HTMLDivElement;
    assert.strictEqual(typeEl1.textContent, 'pointer');

    const durationEl1 = interactionsEls[0].querySelector('.interaction-duration .metric-value') as HTMLDivElement;
    assert.strictEqual(durationEl1.textContent, '500 ms');
    assert.strictEqual(durationEl1.className, 'metric-value needs-improvement');

    const typeEl2 = interactionsEls[1].querySelector('.interaction-type') as HTMLDivElement;
    assert.strictEqual(typeEl2.textContent, 'keyboard');

    const durationEl2 = interactionsEls[1].querySelector('.interaction-duration .metric-value') as HTMLDivElement;
    assert.strictEqual(durationEl2.textContent, '30 ms');
    assert.strictEqual(durationEl2.className, 'metric-value good');
  });

  it('record action button should work', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();

    const recordButton =
        view.shadowRoot?.querySelector('#record devtools-button') as HTMLElementTagNameMap['devtools-button'];
    recordButton.click();

    await coordinator.done();

    assert.strictEqual(mockHandleAction.firstCall.args[1], 'timeline.toggle-recording');
  });

  it('record page load button should work', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();

    const recordButton =
        view.shadowRoot?.querySelector('#record-page-load devtools-button') as HTMLElementTagNameMap['devtools-button'];
    recordButton.click();

    await coordinator.done();

    assert.strictEqual(mockHandleAction.firstCall.args[1], 'timeline.record-reload');
  });

  describe('field data', () => {
    let target: SDK.Target.Target;
    let mockFieldData: CrUXManager.PageResult;

    beforeEach(async () => {
      const tabTarget = createTarget({type: SDK.Target.Type.Tab});
      target = createTarget({parentTarget: tabTarget});

      mockFieldData = {
        'origin-ALL': null,
        'origin-DESKTOP': null,
        'origin-PHONE': null,
        'origin-TABLET': null,
        'url-ALL': null,
        'url-DESKTOP': null,
        'url-PHONE': null,
        'url-TABLET': null,
      };

      sinon.stub(CrUXManager.CrUXManager.instance(), 'getFieldDataForCurrentPage').callsFake(async () => mockFieldData);
      CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: true, override: ''});
    });

    it('should not show when crux is disabled', async () => {
      CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: false, override: ''});

      mockFieldData['url-ALL'] = createMockFieldData();

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpPercents = getFieldHistogramPercents(view, 'lcp');
      assert.deepStrictEqual(lcpPercents, ['-', '-', '-']);

      const clsPercents = getFieldHistogramPercents(view, 'cls');
      assert.deepStrictEqual(clsPercents, ['-', '-', '-']);

      const inpPercents = getFieldHistogramPercents(view, 'inp');
      assert.deepStrictEqual(inpPercents, ['-', '-', '-']);

      const lcpFieldEl = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl.textContent, '-');

      const clsFieldEl = getFieldMetricValue(view, 'cls');
      assert.strictEqual(clsFieldEl.textContent, '-');

      const inpFieldEl = getFieldMetricValue(view, 'inp');
      assert.strictEqual(inpFieldEl.textContent, '-');

      const throttlingRec = getThrottlingRecommendation(view);
      assert.isNull(throttlingRec);
    });

    it('should show when crux is enabled', async () => {
      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      mockFieldData['url-ALL'] = createMockFieldData();

      target.model(SDK.ResourceTreeModel.ResourceTreeModel)
          ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
            url: 'https://example.com',
            isPrimaryFrame: () => true,
          } as SDK.ResourceTreeModel.ResourceTreeFrame);

      await coordinator.done();

      const lcpPercents = getFieldHistogramPercents(view, 'lcp');
      assert.deepStrictEqual(lcpPercents, ['50%', '30%', '20%']);

      const clsPercents = getFieldHistogramPercents(view, 'cls');
      assert.deepStrictEqual(clsPercents, ['0%', '20%', '80%']);

      const inpPercents = getFieldHistogramPercents(view, 'inp');
      assert.deepStrictEqual(inpPercents, ['-', '-', '-']);

      const lcpFieldEl = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl.textContent, '1.00 s');

      const clsFieldEl = getFieldMetricValue(view, 'cls');
      assert.strictEqual(clsFieldEl.textContent, '0.25');

      const inpFieldEl = getFieldMetricValue(view, 'inp');
      assert.strictEqual(inpFieldEl.textContent, '-');

      const throttlingRec = getThrottlingRecommendation(view);
      assert.match(throttlingRec!.innerText, /Slow 4G/);
    });

    it('should make initial request on render when crux is enabled', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl.textContent, '1.00 s');
    });

    it('should be removed once crux is disabled', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: false, override: ''});

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2.textContent, '-');
    });

    it('should take from selected page scope', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      mockFieldData['origin-ALL'] = createMockFieldData();
      mockFieldData['origin-ALL'].record.metrics.largest_contentful_paint!.percentiles!.p75 = 2000;

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      selectPageScope(view, 'origin');

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2.textContent, '2.00 s');
    });

    it('should take from selected device scope', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      mockFieldData['url-PHONE'] = createMockFieldData();
      mockFieldData['url-PHONE'].record.metrics.largest_contentful_paint!.percentiles!.p75 = 2000;

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      selectDeviceOption(view, 'ALL');

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      selectDeviceOption(view, 'PHONE');

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2.textContent, '2.00 s');
    });

    it('auto device option should chose based on emulation', async () => {
      mockFieldData['url-DESKTOP'] = createMockFieldData();

      mockFieldData['url-PHONE'] = createMockFieldData();
      mockFieldData['url-PHONE'].record.metrics.largest_contentful_paint!.percentiles!.p75 = 2000;

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      selectDeviceOption(view, 'AUTO');

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          EmulationModel.DeviceModeModel.DeviceModeModel.instance().emulate(
              EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2.textContent, '2.00 s');
    });

    it('auto device option should fall back to all devices', async () => {
      mockFieldData['url-DESKTOP'] = createMockFieldData();

      mockFieldData['url-ALL'] = createMockFieldData();
      mockFieldData['url-ALL'].record.metrics.largest_contentful_paint!.percentiles!.p75 = 2000;

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      selectDeviceOption(view, 'AUTO');

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          EmulationModel.DeviceModeModel.DeviceModeModel.instance().emulate(
              EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2.textContent, '2.00 s');
    });

    describe('throttling recommendation', () => {
      it('should show for closest target RTT', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // 165ms is the adjusted latency of "Fast 4G" but 165ms is actually closer to the target RTT
        // of "Slow 4G" than the target RTT of "Fast 4G".
        // So we should expect the recommended preset to be "Slow 4G".
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 165;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const throttlingRec = getThrottlingRecommendation(view);
        assert.match(throttlingRec!.innerText, /Slow 4G/);
      });

      it('should hide if no RTT data', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();
        mockFieldData['url-ALL'].record.metrics.round_trip_time = undefined;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const throttlingRec = getThrottlingRecommendation(view);
        assert.isNull(throttlingRec);
      });

      it('should suggest no throttling for very low latency', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // In theory this is closest to the "offline" preset latency of 0,
        // but that preset should be ignored.
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 1;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const throttlingRec = getThrottlingRecommendation(view);
        assert.match(throttlingRec!.innerText, /Try disabling/);
      });

      it('should ignore presets that are generally too far off', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // This is closest to the "3G" preset compared to other presets, but it's
        // still too far away in general.
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 10_000;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const throttlingRec = getThrottlingRecommendation(view);
        assert.isNull(throttlingRec);
      });
    });
  });
});
