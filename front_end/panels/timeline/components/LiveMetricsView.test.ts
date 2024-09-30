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

function getFieldMetricValue(view: Element, metric: string): HTMLElement|null {
  const card = view.shadowRoot!.querySelector(`#${metric} devtools-metric-card`);
  return card!.shadowRoot!.querySelector('#field-value .metric-value');
}

function getEnvironmentRecs(view: Element): HTMLElement[] {
  return Array.from(view.shadowRoot!.querySelectorAll<HTMLElement>('.environment-recs li'));
}

function getInteractions(view: Element): HTMLElement[] {
  const interactionsListEl = view.shadowRoot!.querySelector('.interactions-list');
  return Array.from(interactionsListEl?.querySelectorAll('.interaction') || []) as HTMLElement[];
}

function getClearInteractionsButton(view: Element): HTMLElementTagNameMap['devtools-button']|null {
  return view.shadowRoot!.querySelector('.interactions-clear') as HTMLElementTagNameMap['devtools-button'] | null;
}

function selectDeviceOption(view: Element, deviceOption: string): void {
  const deviceScopeSelector = view.shadowRoot!.querySelector('devtools-select-menu#device-scope-select') as HTMLElement;
  const deviceScopeOptions = Array.from(deviceScopeSelector.querySelectorAll('devtools-menu-item')) as
      HTMLElementTagNameMap['devtools-menu-item'][];

  deviceScopeSelector.click();
  deviceScopeOptions.find(o => o.value === deviceOption)!.click();
}

function selectPageScope(view: Element, pageScope: string): void {
  const pageScopeSelector = view.shadowRoot!.querySelector('devtools-select-menu#page-scope-select') as HTMLElement;
  pageScopeSelector.click();

  const pageScopeOptions = Array.from(pageScopeSelector.querySelectorAll('devtools-menu-item')) as
      HTMLElementTagNameMap['devtools-menu-item'][];
  const originOption = pageScopeOptions.find(o => o.value === pageScope);
  originOption!.click();
}

function getFieldMessage(view: Element): HTMLElement|null {
  return view.shadowRoot!.querySelector('#field-setup .field-data-message');
}

function getDataDescriptions(view: Element): HTMLElement {
  return view.shadowRoot!.querySelector('.data-descriptions') as HTMLElement;
}

function getLiveMetricsTitle(view: Element): HTMLElement {
  // There may be multiple, but this should always be the first one.
  return view.shadowRoot!.querySelector('.live-metrics > .section-title') as HTMLElement;
}

function getInpInteractionLink(view: Element): HTMLElement|null {
  return view.shadowRoot!.querySelector<HTMLElement>('#inp .related-info button');
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
        largest_contentful_paint: {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
        },
        cumulative_layout_shift: {
          histogram: [
            {start: 0, end: 0.1},
            {start: 0.1, end: 0.25, density: 0.2},
            {start: 0.25, density: 0.8},
          ],
          percentiles: {p75: 0.25},
        },
        round_trip_time: {
          percentiles: {p75: 150},
        },
        form_factors: {
          fractions: {
            desktop: 0.6,
            phone: 0.3,
            tablet: 0.1,
          },
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
  let mockReveal = sinon.stub();

  beforeEach(async () => {
    mockHandleAction.reset();

    mockReveal = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');

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

  it('should show interactions', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.STATUS, {
      inp: {
        value: 500,
        phases: {
          inputDelay: 100,
          processingDuration: 300,
          presentationDelay: 100,
        },
        uniqueInteractionId: 'interaction-1-1',
      },
      interactions: [
        {duration: 500, interactionType: 'pointer', uniqueInteractionId: 'interaction-1-1'},
        {duration: 30, interactionType: 'keyboard', uniqueInteractionId: 'interaction-1-2'},
      ],
      layoutShifts: [],
    });
    await coordinator.done();

    const interactionsEls = getInteractions(view);
    assert.lengthOf(interactionsEls, 2);

    const typeEl1 = interactionsEls[0].querySelector('.interaction-type') as HTMLDivElement;
    assert.match(typeEl1.textContent!, /pointer/);

    const inpChip1 = typeEl1.querySelector('.interaction-inp-chip');
    assert.isNotNull(inpChip1);

    const durationEl1 = interactionsEls[0].querySelector('.interaction-duration .metric-value') as HTMLDivElement;
    assert.strictEqual(durationEl1.textContent, '500 ms');
    assert.strictEqual(durationEl1.className, 'metric-value needs-improvement dim');

    const typeEl2 = interactionsEls[1].querySelector('.interaction-type') as HTMLDivElement;
    assert.match(typeEl2.textContent!, /keyboard/);

    const inpChip2 = typeEl2.querySelector('.interaction-inp-chip');
    assert.isNull(inpChip2);

    const durationEl2 = interactionsEls[1].querySelector('.interaction-duration .metric-value') as HTMLDivElement;
    assert.strictEqual(durationEl2.textContent, '30 ms');
    assert.strictEqual(durationEl2.className, 'metric-value good dim');
  });

  it('should show help icon for interaction that is longer than INP', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.STATUS, {
      inp: {
        value: 50,
        phases: {
          inputDelay: 10,
          processingDuration: 30,
          presentationDelay: 10,
        },
        uniqueInteractionId: 'interaction-1-2',
      },
      interactions: [
        {duration: 50, interactionType: 'keyboard', uniqueInteractionId: 'interaction-1-1'},
        {duration: 500, interactionType: 'pointer', uniqueInteractionId: 'interaction-1-2'},
      ],
      layoutShifts: [],
    });
    await coordinator.done();

    const interactionsEls = getInteractions(view);
    assert.lengthOf(interactionsEls, 2);

    const typeEl1 = interactionsEls[0].querySelector<HTMLElement>('.interaction-type');
    assert.match(typeEl1!.textContent!, /keyboard/);

    const durationEl1 = interactionsEls[0].querySelector<HTMLElement>('.interaction-duration .metric-value');
    assert.strictEqual(durationEl1!.textContent, '50 ms');
    assert.strictEqual(durationEl1!.className, 'metric-value good dim');

    const helpEl1 = interactionsEls[0].querySelector('.interaction-info');
    assert.isNull(helpEl1);

    const typeEl2 = interactionsEls[1].querySelector<HTMLElement>('.interaction-type');
    assert.match(typeEl2!.textContent!, /pointer/);

    const helpEl2 = interactionsEls[1].querySelector<HTMLElement>('.interaction-info');
    assert.match(helpEl2!.title, /98th percentile/);

    const durationEl2 = interactionsEls[1].querySelector<HTMLElement>('.interaction-duration .metric-value');
    assert.strictEqual(durationEl2!.textContent, '500 ms');
    assert.strictEqual(durationEl2!.className, 'metric-value needs-improvement dim');
  });

  it('should reveal INP interaction when link clicked', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.STATUS, {
      inp: {
        value: 500,
        phases: {
          inputDelay: 100,
          processingDuration: 300,
          presentationDelay: 100,
        },
        uniqueInteractionId: 'interaction-1-1',
      },
      interactions: [
        {duration: 500, interactionType: 'pointer', uniqueInteractionId: 'interaction-1-1'},
        {duration: 30, interactionType: 'keyboard', uniqueInteractionId: 'interaction-1-2'},
      ],
      layoutShifts: [],
    });
    await coordinator.done();

    const inpInteractionLink = getInpInteractionLink(view);
    inpInteractionLink!.click();

    await coordinator.done();

    assert(mockReveal.calledWithExactly(
        {
          duration: 500,
          interactionType: 'pointer',
          uniqueInteractionId: 'interaction-1-1',
        },
        false));
  });

  it('should hide INP link if no matching interaction', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.STATUS, {
      inp: {
        value: 500,
        phases: {
          inputDelay: 100,
          processingDuration: 300,
          presentationDelay: 100,
        },
        uniqueInteractionId: 'interaction-1-1',
      },
      interactions: [
        {duration: 30, interactionType: 'keyboard', uniqueInteractionId: 'interaction-1-2'},
      ],
      layoutShifts: [],
    });
    await coordinator.done();

    const inpInteractionLink = getInpInteractionLink(view);
    assert.isNull(inpInteractionLink);
  });

  it('clear interactions log button should work', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();

    assert.isNull(getClearInteractionsButton(view));
    assert.lengthOf(getInteractions(view), 0);

    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.STATUS, {
      inp: {
        value: 50,
        phases: {
          inputDelay: 10,
          processingDuration: 30,
          presentationDelay: 10,
        },
        uniqueInteractionId: 'interaction-1-2',
      },
      interactions: [
        {duration: 50, interactionType: 'keyboard', uniqueInteractionId: 'interaction-1-1'},
        {duration: 500, interactionType: 'pointer', uniqueInteractionId: 'interaction-1-2'},
      ],
      layoutShifts: [],
    });
    await coordinator.done();

    assert.lengthOf(getInteractions(view), 2);

    const interactionsButton = getClearInteractionsButton(view);
    interactionsButton!.click();

    await coordinator.done();

    assert.isNull(getClearInteractionsButton(view));
    assert.lengthOf(getInteractions(view), 0);
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
      const tabTarget = createTarget({type: SDK.Target.Type.TAB});
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

      const envRecs = getEnvironmentRecs(view);
      assert.lengthOf(envRecs, 0);

      const fieldMessage = getFieldMessage(view);
      assert.match(fieldMessage!.innerText, /See how your local metrics compare/);

      const dataDescriptions = getDataDescriptions(view);
      assert.match(dataDescriptions.innerText, /local metrics/);
      assert.notMatch(dataDescriptions.innerText, /field data/);

      const title = getLiveMetricsTitle(view);
      assert.strictEqual(title.innerText, 'Local metrics');
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

      const envRecs = getEnvironmentRecs(view);
      assert.lengthOf(envRecs, 2);
      assert.match(envRecs[0].textContent!, /60%.*desktop/);
      assert.match(envRecs[1].textContent!, /Slow 4G/);

      const fieldMessage = getFieldMessage(view);
      // We can't match the exact string because we format the dates based on
      // locale, so the exact format depends based on where the SWE or bots who
      // run these tests are!
      // We expect it to say something like Jan 1 - Jan 29 2024.
      assert.match(fieldMessage!.innerText, /Jan.+2024/);

      const dataDescriptions = getDataDescriptions(view);
      assert.match(dataDescriptions.innerText, /local metrics/);
      assert.match(dataDescriptions.innerText, /field data/);

      const title = getLiveMetricsTitle(view);
      assert.strictEqual(title.innerText, 'Local and field metrics');
    });

    it('should show empty values when crux is enabled but there is no field data', async () => {
      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      target.model(SDK.ResourceTreeModel.ResourceTreeModel)
          ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
            url: 'https://example.com',
            isPrimaryFrame: () => true,
          } as SDK.ResourceTreeModel.ResourceTreeFrame);

      await coordinator.done();

      const envRecs = getEnvironmentRecs(view);
      assert.lengthOf(envRecs, 0);

      const fieldMessage = getFieldMessage(view);
      assert.isNull(fieldMessage);

      const dataDescriptions = getDataDescriptions(view);
      assert.match(dataDescriptions.innerText, /local metrics/);
      assert.match(dataDescriptions.innerText, /field data/);

      const title = getLiveMetricsTitle(view);
      assert.strictEqual(title.innerText, 'Local and field metrics');
    });

    it('should make initial request on render when crux is enabled', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl!.textContent, '1.00 s');
    });

    it('should be removed once crux is disabled', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1!.textContent, '1.00 s');

      CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: false, override: ''});

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.isNull(lcpFieldEl2);
    });

    it('should take from selected page scope', async () => {
      mockFieldData['url-ALL'] = createMockFieldData();

      mockFieldData['origin-ALL'] = createMockFieldData();
      mockFieldData['origin-ALL'].record.metrics.largest_contentful_paint!.percentiles!.p75 = 2000;

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl1!.textContent, '1.00 s');

      selectPageScope(view, 'origin');

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2!.textContent, '2.00 s');
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
      assert.strictEqual(lcpFieldEl1!.textContent, '1.00 s');

      selectDeviceOption(view, 'PHONE');

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2!.textContent, '2.00 s');
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
      assert.strictEqual(lcpFieldEl1!.textContent, '1.00 s');

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          EmulationModel.DeviceModeModel.DeviceModeModel.instance().emulate(
              EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2!.textContent, '2.00 s');
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
      assert.strictEqual(lcpFieldEl1!.textContent, '1.00 s');

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          EmulationModel.DeviceModeModel.DeviceModeModel.instance().emulate(
              EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }

      await coordinator.done();

      const lcpFieldEl2 = getFieldMetricValue(view, 'lcp');
      assert.strictEqual(lcpFieldEl2!.textContent, '2.00 s');
    });

    describe('network throttling recommendation', () => {
      it('should show for closest target RTT', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // 165ms is the adjusted latency of "Fast 4G" but 165ms is actually closer to the target RTT
        // of "Slow 4G" than the target RTT of "Fast 4G".
        // So we should expect the recommended preset to be "Slow 4G".
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 165;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 2);
        assert.match(envRecs[0].textContent!, /60%.*desktop/);
        assert.match(envRecs[1].textContent!, /Slow 4G/);
      });

      it('should hide if no RTT data', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();
        mockFieldData['url-ALL'].record.metrics.round_trip_time = undefined;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 1);
        assert.match(envRecs[0].textContent!, /60%.*desktop/);
      });

      it('should suggest no throttling for very low latency', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // In theory this is closest to the "offline" preset latency of 0,
        // but that preset should be ignored.
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 1;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 2);
        assert.match(envRecs[0].textContent!, /60%.*desktop/);
        assert.match(envRecs[1].textContent!, /no throttling/);
      });

      it('should ignore presets that are generally too far off', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        // This is closest to the "3G" preset compared to other presets, but it's
        // still too far away in general.
        mockFieldData['url-ALL'].record.metrics.round_trip_time!.percentiles!.p75 = 10_000;

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 1);
        assert.match(envRecs[0].textContent!, /60%.*desktop/);
      });
    });

    describe('form factor recommendation', () => {
      it('should recommend desktop if it is the majority', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 2);
        assert.match(envRecs[0].textContent!, /60%.*desktop/);
        assert.match(envRecs[1].textContent!, /Slow 4G/);
      });

      it('should recommend mobile if it is the majority', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        mockFieldData['url-ALL'].record.metrics.form_factors!.fractions = {
          desktop: 0.1,
          phone: 0.8,
          tablet: 0.1,
        };

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 2);
        assert.match(envRecs[0].textContent!, /80%.*mobile/);
        assert.match(envRecs[1].textContent!, /Slow 4G/);
      });

      it('should recommend nothing if there is no majority', async () => {
        mockFieldData['url-ALL'] = createMockFieldData();

        mockFieldData['url-ALL'].record.metrics.form_factors!.fractions = {
          desktop: 0.49,
          phone: 0.49,
          tablet: 0.02,
        };

        const view = new Components.LiveMetricsView.LiveMetricsView();
        renderElementIntoDOM(view);

        await coordinator.done();

        const envRecs = getEnvironmentRecs(view);
        assert.lengthOf(envRecs, 1);
        assert.match(envRecs[0].textContent!, /Slow 4G/);
      });
    });
  });
});
