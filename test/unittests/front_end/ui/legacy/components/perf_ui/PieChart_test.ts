// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const testChartData = {
  chartName: 'Contents of a Pie',
  size: 110,
  formatter: (value: number) => String(value) + ' f',
  showLegend: true,
  total: 100,
  slices: [{value: 75, color: 'crimson', title: 'Filling'}, {value: 25, color: 'burlywood', title: 'Crust'}],
};

const testChartNoLegendData = {
  chartName: 'Contents of a Pie',
  size: 110,
  formatter: (value: number) => String(value) + ' f',
  showLegend: false,
  total: 100,
  slices: [{value: 75, color: 'crimson', title: 'Filling'}, {value: 25, color: 'burlywood', title: 'Crust'}],
};

describeWithLocale('PieChart', () => {
  describe('with legend', () => {
    it('is labelled by the chart name', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const root = chart.shadowRoot.querySelector('[aria-label="Contents of a Pie"]');
      assertNotNullOrUndefined(root);
      assert.isTrue(root.classList.contains('root'));
    });

    it('has path nodes for a 2-slice chart', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const slices = chart.shadowRoot.querySelectorAll('path');
      assert.strictEqual(slices.length, 2);
    });

    it('has a legend', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-legend-row');
      assert.strictEqual(legendRows.length, 3);
    });

    it('formats the slice in the legend', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-size');
      assert.strictEqual(legendRows[0].textContent?.trim(), '75 f');
      assert.strictEqual(legendRows[1].textContent?.trim(), '25 f');
    });

    it('has a total', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const total = chart.shadowRoot.querySelector('.pie-chart-total');
      assert.isNotNull(total);
    });

    it('formats the total', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const total = chart.shadowRoot.querySelector('.pie-chart-total');
      assertNotNullOrUndefined(total);
      assert.strictEqual(total.textContent?.trim(), '100 f');
    });

    it('selects total by default', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-legend-row');
      assert.strictEqual(legendRows.length, 3);

      // Legend has one selected item.
      const fillingLegendRow = legendRows[0];
      const crustLegendRow = legendRows[1];
      const totalLegendRow = legendRows[2];
      assert.isFalse(fillingLegendRow.classList.contains('selected'));
      assert.isFalse(crustLegendRow.classList.contains('selected'));
      assert.isTrue(totalLegendRow.classList.contains('selected'));

      // Chart total display in the center is selected.
      const total = chart.shadowRoot.querySelector('.pie-chart-total');
      assertNotNullOrUndefined(total);
      assert.isTrue(total.classList.contains('selected'));
    });

    it('sets tabIndex=-1 on the slice', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const slice = chart.shadowRoot.querySelector('path');
      assertNotNullOrUndefined(slice);
      assert.strictEqual(slice.tabIndex, -1);
    });

    it('changes selected when clicking the legend', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const legendName = chart.shadowRoot.querySelector<HTMLDivElement>('.pie-chart-name');
      assertNotNullOrUndefined(legendName);
      legendName.click();

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-legend-row');
      assert.strictEqual(legendRows.length, 3);

      const fillingLegendRow = legendRows[0];
      const crustLegendRow = legendRows[1];
      const totalLegendRow = legendRows[2];
      assert.isTrue(fillingLegendRow.classList.contains('selected'));
      assert.isFalse(crustLegendRow.classList.contains('selected'));
      assert.isFalse(totalLegendRow.classList.contains('selected'));

      // Chart total display in the center is not selected.
      const total = chart.shadowRoot.querySelector('.pie-chart-total');
      assertNotNullOrUndefined(total);
      assert.isFalse(total.classList.contains('selected'));
    });

    it('changes selected when clicking the chart', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const slice = chart.shadowRoot.querySelector<SVGPathElement>('[aria-label="Filling"');
      assertNotNullOrUndefined(slice);
      slice.dispatchEvent(new Event('click'));

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-legend-row');
      assert.strictEqual(legendRows.length, 3);

      const fillingLegendRow = legendRows[0];
      const crustLegendRow = legendRows[1];
      const totalLegendRow = legendRows[2];
      assert.isTrue(fillingLegendRow.classList.contains('selected'));
      assert.isFalse(crustLegendRow.classList.contains('selected'));
      assert.isFalse(totalLegendRow.classList.contains('selected'));

      // Chart total display in the center is not selected.
      const total = chart.shadowRoot.querySelector('.pie-chart-total');
      assertNotNullOrUndefined(total);
      assert.isFalse(total.classList.contains('selected'));
    });

    it('does not show a focus ring for click selection', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const legendName = chart.shadowRoot.querySelector<HTMLDivElement>('.pie-chart-name');
      assertNotNullOrUndefined(legendName);
      legendName.click();

      const legendRow = chart.shadowRoot.querySelector('.pie-chart-legend-row:focus-visible');
      assert.isNull(legendRow);
    });

    it('shows a focus ring for keyboard selection', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartData;
      assertShadowRoot(chart.shadowRoot);

      const root = chart.shadowRoot.querySelector<HTMLDivElement>('.root');
      assertNotNullOrUndefined(root);
      root.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp'}));

      const legendRow = chart.shadowRoot.querySelector('.pie-chart-legend-row:focus-visible');
      assert.isNotNull(legendRow);
    });
  });

  describe('without legend', () => {
    it('has no legend', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartNoLegendData;
      assertShadowRoot(chart.shadowRoot);

      const legendRows = chart.shadowRoot.querySelectorAll('.pie-chart-legend-row');
      assert.strictEqual(legendRows.length, 0);
    });

    it('sets tabIndex=1 on total', () => {
      const chart = new PerfUI.PieChart.PieChart();
      renderElementIntoDOM(chart);

      chart.data = testChartNoLegendData;
      assertShadowRoot(chart.shadowRoot);

      // This is different in no-legend mode!
      const total = chart.shadowRoot.querySelector<HTMLDivElement>('.pie-chart-total');
      assertNotNullOrUndefined(total);
      assert.strictEqual(total.tabIndex, 1);
    });
  });
});
