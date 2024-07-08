// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const LOCAL_METRIC_SELECTOR = '.local-value .metric-value';
const FIELD_METRIC_SELECTOR = '.field-value .metric-value';
const INTERACTION_SELECTOR = '.interaction';

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

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    LiveMetrics.LiveMetrics.instance({forceNew: true});
    CrUXManager.CrUXManager.instance({forceNew: true});
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
    const metricEl = view.shadowRoot?.querySelector('#lcp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector(LOCAL_METRIC_SELECTOR) as HTMLDivElement;
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
    const metricEl = view.shadowRoot?.querySelector('#cls') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector(LOCAL_METRIC_SELECTOR) as HTMLDivElement;
    assert.strictEqual(metricValueEl.className, 'metric-value needs-improvement');
    assert.strictEqual(metricValueEl.innerText, '0.14');
  });

  it('should show INP value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(
        LiveMetrics.Events.Status, {inp: {value: 2000}, interactions: []});
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#inp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector(LOCAL_METRIC_SELECTOR) as HTMLDivElement;
    assert.strictEqual(metricValueEl.className, 'metric-value poor');
    assert.strictEqual(metricValueEl.innerText, '2.00 s');
  });

  it('should show empty metric', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#inp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector(LOCAL_METRIC_SELECTOR) as HTMLDivElement;
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
    const interactionsListEl = view.shadowRoot?.querySelector('.interactions-list') as HTMLDivElement;
    const interactionsEls = interactionsListEl.querySelectorAll(INTERACTION_SELECTOR);
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
      CrUXManager.CrUXManager.instance().getEnabledSetting().set(false);

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
    });

    it('should not show when crux is disabled', async () => {
      mockFieldData['url-ALL'] = {
        record: {
          key: {
            url: 'https://example.com',
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
                {start: 0, end: 0.1, density: 0.1},
                {start: 0.1, end: 0.25, density: 0.1},
                {start: 0.25, density: 0.8},
              ],
              percentiles: {p75: 0.25},
            },
          },
          collectionPeriod: {
            firstDate: {year: 2024, month: 1, day: 1},
            lastDate: {year: 2024, month: 1, day: 29},
          },
        },
      };

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpHistogramEl = view.shadowRoot?.querySelector('#lcp .field-data-histogram');
      assert.isNull(lcpHistogramEl);

      const clsHistogramEl = view.shadowRoot?.querySelector('#cls .field-data-histogram');
      assert.isNull(clsHistogramEl);

      const inpHistogramEl = view.shadowRoot?.querySelector('#inp .field-data-histogram');
      assert.isNull(inpHistogramEl);

      const lcpFieldEl = view.shadowRoot?.querySelector(`#lcp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(lcpFieldEl.textContent, '-');

      const clsFieldEl = view.shadowRoot?.querySelector(`#cls ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(clsFieldEl.textContent, '-');

      const inpFieldEl = view.shadowRoot?.querySelector(`#inp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(inpFieldEl.textContent, '-');
    });

    it('should show when crux is enabled', async () => {
      CrUXManager.CrUXManager.instance().getEnabledSetting().set(true);

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      mockFieldData['url-ALL'] = {
        record: {
          key: {
            url: 'https://example.com',
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
                {start: 0, end: 0.1, density: 0.1},
                {start: 0.1, end: 0.25, density: 0.1},
                {start: 0.25, density: 0.8},
              ],
              percentiles: {p75: 0.25},
            },
          },
          collectionPeriod: {
            firstDate: {year: 2024, month: 1, day: 1},
            lastDate: {year: 2024, month: 1, day: 29},
          },
        },
      };

      target.model(SDK.ResourceTreeModel.ResourceTreeModel)
          ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
            url: 'https://example.com',
            isPrimaryFrame: () => true,
          } as SDK.ResourceTreeModel.ResourceTreeFrame);

      await coordinator.done();

      const lcpHistogramEl = view.shadowRoot?.querySelector('#lcp .field-data-histogram') as HTMLDivElement;
      assert.strictEqual(
          lcpHistogramEl.innerText, 'Good (≤2.50 s)\n50%\nNeeds improvement (2.50 s-4.00 s)\n30%\nPoor (>4.00 s)\n20%');

      const clsHistogramEl = view.shadowRoot?.querySelector('#cls .field-data-histogram') as HTMLDivElement;
      assert.strictEqual(
          clsHistogramEl.innerText, 'Good (≤0.10)\n10%\nNeeds improvement (0.10-0.25)\n10%\nPoor (>0.25)\n80%');

      const inpHistogramEl = view.shadowRoot?.querySelector('#inp .field-data-histogram');
      assert.isNull(inpHistogramEl);

      const lcpFieldEl = view.shadowRoot?.querySelector(`#lcp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(lcpFieldEl.textContent, '1.00 s');

      const clsFieldEl = view.shadowRoot?.querySelector(`#cls ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(clsFieldEl.textContent, '0.25');

      const inpFieldEl = view.shadowRoot?.querySelector(`#inp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(inpFieldEl.textContent, '-');
    });

    it('should make initial request on render when crux is enabled', async () => {
      CrUXManager.CrUXManager.instance().getEnabledSetting().set(true);

      mockFieldData['url-ALL'] = {
        record: {
          key: {
            url: 'https://example.com',
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
                {start: 0, end: 0.1, density: 0.1},
                {start: 0.1, end: 0.25, density: 0.1},
                {start: 0.25, density: 0.8},
              ],
              percentiles: {p75: 0.25},
            },
          },
          collectionPeriod: {
            firstDate: {year: 2024, month: 1, day: 1},
            lastDate: {year: 2024, month: 1, day: 29},
          },
        },
      };

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = view.shadowRoot?.querySelector(`#lcp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');
    });

    it('should be removed once crux is disabled', async () => {
      CrUXManager.CrUXManager.instance().getEnabledSetting().set(true);

      mockFieldData['url-ALL'] = {
        record: {
          key: {
            url: 'https://example.com',
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
                {start: 0, end: 0.1, density: 0.1},
                {start: 0.1, end: 0.25, density: 0.1},
                {start: 0.25, density: 0.8},
              ],
              percentiles: {p75: 0.25},
            },
          },
          collectionPeriod: {
            firstDate: {year: 2024, month: 1, day: 1},
            lastDate: {year: 2024, month: 1, day: 29},
          },
        },
      };

      const view = new Components.LiveMetricsView.LiveMetricsView();
      renderElementIntoDOM(view);

      await coordinator.done();

      const lcpFieldEl1 = view.shadowRoot?.querySelector(`#lcp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(lcpFieldEl1.textContent, '1.00 s');

      CrUXManager.CrUXManager.instance().getEnabledSetting().set(false);

      await coordinator.done();

      const lcpFieldEl2 = view.shadowRoot?.querySelector(`#lcp ${FIELD_METRIC_SELECTOR}`) as HTMLElement;
      assert.strictEqual(lcpFieldEl2.textContent, '-');
    });
  });
});
