// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../../front_end/models/trace/trace.js';
import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import type * as Common from '../../../../../../../front_end/core/common/common.js';
import {FakeFlameChartProvider} from '../../../../helpers/TimelineHelpers.js';
import {MockFlameChartDelegate} from '../../../../helpers/TraceHelpers.js';
import {renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
const {assert} = chai;

describeWithEnvironment('FlameChart', () => {
  it('sorts decorations, putting candy striping before warning triangles', async () => {
    const decorations: PerfUI.FlameChart.FlameChartDecoration[] = [
      {type: 'WARNING_TRIANGLE'},
      {type: 'CANDY', startAtTime: TraceEngine.Types.Timing.MicroSeconds(10)},
    ];
    PerfUI.FlameChart.sortDecorationsForRenderingOrder(decorations);
    assert.deepEqual(decorations, [
      {type: 'CANDY', startAtTime: TraceEngine.Types.Timing.MicroSeconds(10)},
      {type: 'WARNING_TRIANGLE'},
    ]);
  });

  let chartInstance: PerfUI.FlameChart.FlameChart|null = null;

  afterEach(() => {
    if (chartInstance) {
      chartInstance.detach();
    }
  });

  describe('highlightEntry', () => {
    function renderChart(chart: PerfUI.FlameChart.FlameChart): void {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      chart.markAsRoot();
      chart.setWindowTimes(0, 100);
      chart.show(container);
      chart.update();
    }

    it('updates the chart to highlight the entry and dispatches an event', async () => {
      class FakeProvider extends FakeFlameChartProvider {
        override entryColor(_entryIndex: number): string {
          return 'red';
        }

        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return PerfUI.FlameChart.FlameChartTimelineData.create({
            entryLevels: [1, 1, 1],
            entryStartTimes: [5, 60, 80],
            entryTotalTimes: [50, 10, 10],
            groups: [{
              name: 'Test Group' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: {
                height: 17,
                padding: 4,
                collapsible: false,
                color: 'black',
                backgroundColor: 'grey',
                nestingLevel: 0,
                itemsHeight: 17,
              },
            }],
          });
        }
      }

      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);

      // Nothing highlighted, so the highlightElement should be hidden.
      assert.isTrue(chartInstance.highlightElement.classList.contains('hidden'));

      const entryIndexToHighlight = 2;
      chartInstance.highlightEntry(entryIndexToHighlight);

      // Ensure that the highlighted div is positioned. We cannot assert exact
      // pixels due to differences in screen sizes and resolution across
      // machines, but we can ensure that they have all been set.
      assert.isDefined(chartInstance.highlightElement.style.height);
      assert.isDefined(chartInstance.highlightElement.style.top);
      assert.isDefined(chartInstance.highlightElement.style.left);
      assert.isDefined(chartInstance.highlightElement.style.width);
      // And that it is not hidden.
      assert.isFalse(chartInstance.highlightElement.classList.contains('hidden'));

      // Ensure that the event listener was called with the right index
      assert.strictEqual(highlightedEventListener.callCount, 1);
      const event = highlightedEventListener.args[0][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, entryIndexToHighlight);
    });
  });
});
