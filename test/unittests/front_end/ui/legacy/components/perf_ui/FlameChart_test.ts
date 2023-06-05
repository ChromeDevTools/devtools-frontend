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

  function renderChart(chart: PerfUI.FlameChart.FlameChart): void {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    chart.markAsRoot();
    chart.show(container);
    chart.update();
  }

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

  it('notifies the delegate when the window has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.windowChanged(0, 5, false);
    assert.isTrue(windowChangedSpy.calledWith(0, 5, false));
  });

  it('notifies the delegate when the range selection has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const updateRangeSpy = sinon.spy(delegate, 'updateRangeSelection');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.updateRangeSelection(0, 5);
    assert.isTrue(updateRangeSpy.calledWith(0, 5));
  });

  describe('setSelectedEntry', () => {
    class SetSelectedEntryTestProvider extends FakeFlameChartProvider {
      override entryColor(_entryIndex: number): string {
        return 'red';
      }

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [1, 1, 1, 1],
          entryStartTimes: [5, 60, 80, 300],
          entryTotalTimes: [50, 10, 10, 500],
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

    it('does not change the time window if the selected entry is already revealed', async () => {
      const provider = new SetSelectedEntryTestProvider();
      const delegate = new MockFlameChartDelegate();
      const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      // Make the window wide so lots is visible
      chartInstance.setSize(800, 400);
      chartInstance.setWindowTimes(0, 100);
      renderChart(chartInstance);
      // Pick the first event which is only 50ms long and therefore should be in view already.
      chartInstance.setSelectedEntry(0);
      assert.strictEqual(windowChangedSpy.callCount, 0);
    });

    it('will change the window time to reveal the selected entry when the entry is off the right of the screen',
       async () => {
         const provider = new SetSelectedEntryTestProvider();
         const delegate = new MockFlameChartDelegate();
         const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
         chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
         // Make the width narrow so that not everything fits
         chartInstance.setSize(100, 400);
         // Ensure the event we want to select is out of the viewport by selecting the first 100ms.
         chartInstance.setWindowTimes(0, 100);
         renderChart(chartInstance);
         chartInstance.setSelectedEntry(3);
         assert.isTrue(windowChangedSpy.calledOnceWithExactly(300, 400, true));
       });

    it('will change the window time to reveal the selected entry when the entry is off the left of the screen',
       async () => {
         const provider = new SetSelectedEntryTestProvider();
         const delegate = new MockFlameChartDelegate();
         const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
         chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
         // Make the width narrow so that not everything fits
         chartInstance.setSize(100, 400);
         // Ensure the event we want to select is out of the viewport by selecting the last 200ms
         chartInstance.setWindowTimes(250, 600);
         renderChart(chartInstance);
         chartInstance.setSelectedEntry(0);
         assert.isTrue(windowChangedSpy.calledOnceWithExactly(5, 355, true));
       });
  });

  describe('highlightEntry', () => {
    it('updates the chart to highlight the entry and dispatches an event', async () => {
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

    it('does nothing if the entry is already highlighted', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.highlightEntry(2);
      // Ensure that there is only one event listener called, despite the
      // highlightEntry method being called twice, because it was called with
      // the same ID.
      assert.strictEqual(highlightedEventListener.callCount, 1);
    });

    it('does nothing if the DataProvider entryColor() method returns a falsey value', async () => {
      class EmptyColorProvider extends FakeProvider {
        override entryColor(): string {
          return '';
        }
      }
      const provider = new EmptyColorProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      // No calls because entryColor returned a false value.
      assert.strictEqual(highlightedEventListener.callCount, 0);
    });

    it('dispatches the highlight event with an ID of -1 when the highlight is hidden', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.hideHighlight();
      // Ensure the argument to the last event listener call was -1
      const event = highlightedEventListener.args[1][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, -1);
    });
  });
});
