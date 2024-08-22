// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function getLocalMetricValue(view: Element): HTMLElement {
  return view!.shadowRoot!.querySelector('#local-value .metric-value') as HTMLElement;
}

function getFieldMetricValue(view: Element): HTMLElement|null {
  return view!.shadowRoot!.querySelector('#field-value .metric-value');
}

function getFieldHistogramPercents(view: Element): string[] {
  const histogram = view!.shadowRoot!.querySelector('.bucket-summaries') as HTMLElement;
  const percents = Array.from(histogram.querySelectorAll('.histogram-percent')) as HTMLElement[];
  return percents.map(p => p.textContent || '');
}

function getFieldHistogramLabels(view: Element): string[] {
  const histogram = view!.shadowRoot!.querySelector('.bucket-summaries') as HTMLElement;
  const percents = Array.from(histogram.querySelectorAll('.bucket-label')) as HTMLElement[];
  return percents.map(p => p.textContent || '');
}

function getCompareText(view: Element): HTMLElement|null {
  return view!.shadowRoot!.querySelector('.compare-text');
}

function getDetailedCompareText(view: Element): HTMLElement|null {
  return view!.shadowRoot!.querySelector('.detailed-compare-text');
}

function createMockHistogram() {
  // start/end values aren't actually used but they are filled out just in case
  // the histogram is therefore usable by all metrics
  return [
    {start: 0, end: 2500, density: 0.5},
    {start: 2500, end: 4000, density: 0.3},
    {start: 4000, density: 0.2},
  ];
}

describeWithMockConnection('MetricCard', () => {
  beforeEach(async () => {
    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });

    CrUXManager.CrUXManager.instance({forceNew: true});
    CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: true, override: ''});
  });

  it('should show LCP value', async () => {
    const view = new Components.MetricCard.MetricCard();
    view.data = {
      metric: 'LCP',
      localValue: 100,
      fieldValue: 5000,
      histogram: createMockHistogram(),
    };

    renderElementIntoDOM(view);
    await coordinator.done();

    const localValueEl = getLocalMetricValue(view);
    assert.strictEqual(localValueEl.className, 'metric-value good');
    assert.strictEqual(localValueEl.innerText, '100 ms');

    const fieldValueEl = getFieldMetricValue(view);
    assert.strictEqual(fieldValueEl!.className, 'metric-value poor');
    assert.strictEqual(fieldValueEl!.innerText, '5.00 s');

    const histogramLabels = getFieldHistogramLabels(view);
    assert.match(histogramLabels[0], /Good\s+\(≤2.50 s\)/);
    assert.match(histogramLabels[1], /Needs improvement\s+\(2.50 s-4.00 s\)/);
    assert.match(histogramLabels[2], /Poor\s+\(>4.00 s\)/);
  });

  it('should show CLS value', async () => {
    const view = new Components.MetricCard.MetricCard();
    view.data = {
      metric: 'CLS',
      localValue: 0.14294789234,
      fieldValue: 0,
      histogram: createMockHistogram(),
    };

    renderElementIntoDOM(view);
    await coordinator.done();

    const localValueEl = getLocalMetricValue(view);
    assert.strictEqual(localValueEl.className, 'metric-value needs-improvement');
    assert.strictEqual(localValueEl.innerText, '0.14');

    const fieldValueEl = getFieldMetricValue(view);
    assert.strictEqual(fieldValueEl!.className, 'metric-value good');
    assert.strictEqual(fieldValueEl!.innerText, '0');

    const histogramLabels = getFieldHistogramLabels(view);
    assert.match(histogramLabels[0], /Good\s+\(≤0.10\)/);
    assert.match(histogramLabels[1], /Needs improvement\s+\(0.10-0.25\)/);
    assert.match(histogramLabels[2], /Poor\s+\(>0.25\)/);
  });

  it('should show INP value', async () => {
    const view = new Components.MetricCard.MetricCard();
    view.data = {
      metric: 'INP',
      localValue: 2000,
      fieldValue: 1,
      histogram: createMockHistogram(),
    };

    renderElementIntoDOM(view);
    await coordinator.done();

    const localValueEl = getLocalMetricValue(view);
    assert.strictEqual(localValueEl.className, 'metric-value poor');
    assert.strictEqual(localValueEl.innerText, '2.00 s');

    const fieldValueEl = getFieldMetricValue(view);
    assert.strictEqual(fieldValueEl!.className, 'metric-value good');
    assert.strictEqual(fieldValueEl!.innerText, '1 ms');

    const histogramLabels = getFieldHistogramLabels(view);
    assert.match(histogramLabels[0], /Good\s+\(≤200 ms\)/);
    assert.match(histogramLabels[1], /Needs improvement\s+\(200 ms-500 ms\)/);
    assert.match(histogramLabels[2], /Poor\s+\(>500 ms\)/);
  });

  it('should show empty metric', async () => {
    const view = new Components.MetricCard.MetricCard();

    renderElementIntoDOM(view);
    await coordinator.done();

    const metricValueEl = getLocalMetricValue(view);
    assert.strictEqual(metricValueEl.className.trim(), 'metric-value waiting');
    assert.strictEqual(metricValueEl.innerText, '-');

    const fieldValueEl = getFieldMetricValue(view);
    assert.strictEqual(fieldValueEl!.className, 'metric-value waiting');
    assert.strictEqual(fieldValueEl!.innerText, '-');

    const histogramLabels = getFieldHistogramLabels(view);
    assert.match(histogramLabels[0], /Good\s+\(≤2.50 s\)/);
    assert.match(histogramLabels[1], /Needs improvement\s+\(2.50 s-4.00 s\)/);
    assert.match(histogramLabels[2], /Poor\s+\(>4.00 s\)/);
  });

  describe('field data', () => {
    it('should not show when crux is disabled', async () => {
      CrUXManager.CrUXManager.instance().getConfigSetting().set({enabled: false, override: ''});

      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 200,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const histogramLabels = getFieldHistogramLabels(view);
      assert.match(histogramLabels[0], /Good\s+\(≤2.50 s\)/);
      assert.match(histogramLabels[1], /Needs improvement\s+\(2.50 s-4.00 s\)/);
      assert.match(histogramLabels[2], /Poor\s+\(>4.00 s\)/);

      const histogramPercents = getFieldHistogramPercents(view);
      assert.lengthOf(histogramPercents, 0);

      const fieldValueEl = getFieldMetricValue(view);
      assert.isNull(fieldValueEl);
    });

    it('should show when crux is enabled', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 200,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const histogramLabels = getFieldHistogramLabels(view);
      assert.match(histogramLabels[0], /Good\s+\(≤2.50 s\)/);
      assert.match(histogramLabels[1], /Needs improvement\s+\(2.50 s-4.00 s\)/);
      assert.match(histogramLabels[2], /Poor\s+\(>4.00 s\)/);

      const histogramPercents = getFieldHistogramPercents(view);
      assert.deepStrictEqual(histogramPercents, ['50%', '30%', '20%']);

      const fieldValueEl = getFieldMetricValue(view);
      assert.strictEqual(fieldValueEl!.textContent, '200 ms');
    });

    it('should show empty values when crux is enabled but there is no field data', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const histogramLabels = getFieldHistogramLabels(view);
      assert.match(histogramLabels[0], /Good\s+\(≤2.50 s\)/);
      assert.match(histogramLabels[1], /Needs improvement\s+\(2.50 s-4.00 s\)/);
      assert.match(histogramLabels[2], /Poor\s+\(>4.00 s\)/);

      const histogramPercents = getFieldHistogramPercents(view);
      assert.deepStrictEqual(histogramPercents, ['-', '-', '-']);

      const fieldValueEl = getFieldMetricValue(view);
      assert.strictEqual(fieldValueEl!.textContent, '-');
    });
  });

  describe('local/field comparison', () => {
    it('should show message when values are similar', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 200,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(
          compareText!.innerText, 'Your local LCP 100 ms is good, and is similar to your users’ experience.');
    });

    it('should show message when local is better', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 5000,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(
          compareText!.innerText,
          'Your local LCP 100 ms is good, and is significantly better than your users’ experience.');
    });

    it('should show message when local is worse', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 5000,
        fieldValue: 100,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(
          compareText!.innerText,
          'Your local LCP 5.00 s is poor, and is significantly worse than your users’ experience.');
    });

    it('should always be similar if local and field are rated "good"', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 10,
        fieldValue: 2490,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(
          compareText!.innerText, 'Your local LCP 10 ms is good, and is similar to your users’ experience.');
    });

    it('should show generic summary if field is missing', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 3000,
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(compareText!.innerText, 'Your local LCP 3.00 s needs improvement.');
    });

    it('should suggest interaction if local INP is missing', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'INP',
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getCompareText(view);
      assert.strictEqual(compareText!.innerText, 'Interact with the page to measure INP.');
    });
  });

  describe('detailed local/field comparison', () => {
    it('should show message when values are rated the same', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 1000,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getDetailedCompareText(view);
      assert.strictEqual(
          compareText!.innerText,
          'Your local LCP 100 ms is good and is rated the same as 50% of real-user LCP experiences. Additionally, the field data 75th percentile LCP 1.00 s is good.',
      );
    });

    it('should show message when values are rated differently', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 100,
        fieldValue: 5000,
        histogram: createMockHistogram(),
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getDetailedCompareText(view);
      assert.strictEqual(
          compareText!.innerText,
          'Your local LCP 100 ms is good and is rated the same as 50% of real-user LCP experiences. However, the field data 75th percentile LCP 5.00 s is poor.',
      );
    });

    it('should show generic summary if field is missing', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'LCP',
        localValue: 3000,
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getDetailedCompareText(view);
      assert.strictEqual(compareText!.innerText, 'Your local LCP 3.00 s needs improvement.');
    });

    it('should suggest interaction if local INP is missing', async () => {
      const view = new Components.MetricCard.MetricCard();
      view.data = {
        metric: 'INP',
      };
      renderElementIntoDOM(view);

      await coordinator.done();

      const compareText = getDetailedCompareText(view);
      assert.strictEqual(compareText!.innerText, 'Interact with the page to measure INP.');
    });
  });
});
