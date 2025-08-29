// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Extensions from '../../../../panels/timeline/extensions/extensions.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  allThreadEntriesInTrace,
  FakeFlameChartProvider,
  MockFlameChartDelegate,
  renderFlameChartIntoDOM,
  renderFlameChartWithFakeProvider,
} from '../../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';

import * as PerfUI from './perf_ui.js';

describeWithEnvironment('FlameChart', () => {
  it('sorts decorations, putting candy striping before warning triangles', async () => {
    const decorations: PerfUI.FlameChart.FlameChartDecoration[] = [
      {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
      {type: PerfUI.FlameChart.FlameChartDecorationType.CANDY, startAtTime: Trace.Types.Timing.Micro(10)},
    ];
    PerfUI.FlameChart.sortDecorationsForRenderingOrder(decorations);
    assert.deepEqual(decorations, [
      {type: PerfUI.FlameChart.FlameChartDecorationType.CANDY, startAtTime: Trace.Types.Timing.Micro(10)},
      {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
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

  const defaultGroupStyle = {
    height: 17,
    padding: 4,
    collapsible: false,
    color: 'black',
    backgroundColor: 'grey',
    nestingLevel: 0,
    itemsHeight: 17,
  };

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
          style: defaultGroupStyle,
        }],
      });
    }
  }
  it('adds JSLog context to the canvas element', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate, {canvasVELogContext: 'testing-flamechart'});
    renderChart(chartInstance);
    const expected = VisualLogging.canvas('testing-flamechart').track({hover: true}).toString();
    const canvas = chartInstance.contentElement.querySelector('canvas');
    assert.strictEqual(canvas?.getAttribute('jslog'), expected);
  });

  it('notifies the delegate when the window has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.windowChanged(0, 5, false);
    sinon.assert.calledWith(windowChangedSpy, 0, 5, false);
  });

  it('notifies the delegate when the range selection has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const updateRangeSpy = sinon.spy(delegate, 'updateRangeSelection');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.updateRangeSelection(0, 5);
    sinon.assert.calledWith(updateRangeSpy, 0, 5);
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
            style: defaultGroupStyle,
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
      sinon.assert.callCount(windowChangedSpy, 0);
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
         sinon.assert.calledOnceWithExactly(windowChangedSpy, 300, 400, true);
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
         sinon.assert.calledOnceWithExactly(windowChangedSpy, 5, 355, true);
       });
  });

  describe('highlightEntry', () => {
    it('updates the chart to highlight the entry and dispatches an event', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);

      // Nothing highlighted, so the highlightElement should be hidden.
      assert.isTrue(chartInstance.highlightElement.classList.contains('hidden'));

      const entryIndexToHighlight = 2;
      chartInstance.highlightEntry(entryIndexToHighlight);

      // Ensure that the highlighted div is positioned. We cannot assert exact
      // pixels due to differences in screen sizes and resolution across
      // machines, but we can ensure that they have all been set.
      assert.exists(chartInstance.highlightElement.style.height);
      assert.exists(chartInstance.highlightElement.style.top);
      assert.exists(chartInstance.highlightElement.style.left);
      assert.exists(chartInstance.highlightElement.style.width);
      // And that it is not hidden.
      assert.isFalse(chartInstance.highlightElement.classList.contains('hidden'));

      // Ensure that the event listener was called with the right index
      sinon.assert.callCount(highlightedEventListener, 1);
      const event = highlightedEventListener.args[0][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, entryIndexToHighlight);
    });

    it('does nothing if the entry is already highlighted', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.highlightEntry(2);
      // Ensure that there is only one event listener called, despite the
      // highlightEntry method being called twice, because it was called with
      // the same ID.
      sinon.assert.callCount(highlightedEventListener, 1);
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
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
      chartInstance.highlightEntry(2);
      // No calls because entryColor returned a false value.
      sinon.assert.callCount(highlightedEventListener, 0);
    });

    it('dispatches the highlight event with an ID of -1 when the highlight is hidden', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.hideHighlight();
      // Ensure the argument to the last event listener call was -1
      const event = highlightedEventListener.args[1][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, -1);
    });
  });

  describe('applying track configuration', () => {
    it('applies existing track configuration', async () => {
      class TrackConfigurationProvider extends FakeFlameChartProvider {
        static data = PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2],
          entryStartTimes: [5, 60, 80],
          entryTotalTimes: [50, 10, 10],
          groups:
              [
                {
                  name: 'Group0' as Platform.UIString.LocalizedString,
                  startLevel: 0,
                  style: defaultGroupStyle,
                  hidden: false,
                },
                {
                  name: 'Group1' as Platform.UIString.LocalizedString,
                  startLevel: 1,
                  style: defaultGroupStyle,
                  hidden: true,
                },
                {
                  name: 'Group2' as Platform.UIString.LocalizedString,
                  startLevel: 2,
                  style: defaultGroupStyle,
                  hidden: true,
                },
              ],
        });

        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return TrackConfigurationProvider.data;
        }
      }

      const persistedConfig: PerfUI.FlameChart.PersistedGroupConfig[] = [
        {expanded: true, hidden: true, originalIndex: 0, visualIndex: 0, trackName: 'Group0'},
        {expanded: true, hidden: true, originalIndex: 1, visualIndex: 1, trackName: 'Group1'},
        {expanded: true, hidden: true, originalIndex: 2, visualIndex: 2, trackName: 'Group2'},
      ];
      const provider = new TrackConfigurationProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      chartInstance.setPersistedConfig(persistedConfig);
      renderChart(chartInstance);
      const data = chartInstance.timelineData();
      assert.isOk(data);
      // It should have applied the persisted config from above and each group
      // is now hidden and expanded.
      assert.isTrue(data.groups.every(g => g.expanded && g.hidden));
    });

    it('does not apply configuration if the group name does not match', async () => {
      class TrackConfigurationProvider extends FakeFlameChartProvider {
        static data = PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2],
          entryStartTimes: [5, 60, 80],
          entryTotalTimes: [50, 10, 10],
          groups:
              [
                {
                  name: 'Group0' as Platform.UIString.LocalizedString,
                  startLevel: 0,
                  style: defaultGroupStyle,
                  hidden: false,
                },
                {
                  name: 'Group1' as Platform.UIString.LocalizedString,
                  startLevel: 1,
                  style: defaultGroupStyle,
                  hidden: true,
                },
                {
                  name: 'Group2' as Platform.UIString.LocalizedString,
                  startLevel: 2,
                  style: defaultGroupStyle,
                  hidden: true,
                },
              ],
        });

        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return TrackConfigurationProvider.data;
        }
      }

      const persistedConfig: PerfUI.FlameChart.PersistedGroupConfig[] = [
        {expanded: true, hidden: true, originalIndex: 0, visualIndex: 0, trackName: 'WRONG NON-MATCHING GROUP NAME'},
        {expanded: true, hidden: true, originalIndex: 1, visualIndex: 1, trackName: 'Group1'},
        {expanded: true, hidden: true, originalIndex: 2, visualIndex: 2, trackName: 'Group2'},
      ];
      const provider = new TrackConfigurationProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      chartInstance.setPersistedConfig(persistedConfig);
      renderChart(chartInstance);
      const data = chartInstance.timelineData();
      assert.isOk(data);
      assert.isFalse(data.groups[0].hidden);  // Because the name does not match.
      assert.isTrue(data.groups[1].hidden);
      assert.isTrue(data.groups[2].hidden);
    });
  });

  describe('showAllGroups', () => {
    it('updates each group to be expanded', async () => {
      class ShowAllGroupsTestProvider extends FakeFlameChartProvider {
        static data = PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2],
          entryStartTimes: [5, 60, 80],
          entryTotalTimes: [50, 10, 10],
          groups:
              [
                {
                  name: 'Test Group 0' as Platform.UIString.LocalizedString,
                  startLevel: 0,
                  style: defaultGroupStyle,
                  hidden: true,
                },
                {
                  name: 'Test Group 1' as Platform.UIString.LocalizedString,
                  startLevel: 1,
                  style: defaultGroupStyle,
                  hidden: true,
                },
                {
                  name: 'Test Group 2' as Platform.UIString.LocalizedString,
                  startLevel: 2,
                  style: defaultGroupStyle,
                  hidden: true,
                },
              ],
        });

        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return ShowAllGroupsTestProvider.data;
        }
      }
      const provider = new ShowAllGroupsTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);
      const data = chartInstance.timelineData();
      assert.isOk(data);
      assert.isTrue(data.groups.every(g => g.hidden === true));
      chartInstance.showAllGroups();
      assert.isTrue(data.groups.every(g => g.hidden === false));
    });
  });

  describe('updateLevelPositions', () => {
    class UpdateLevelPositionsTestProvider extends FakeFlameChartProvider {
      static data = PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 1, 2],
        entryStartTimes: [5, 60, 80],
        entryTotalTimes: [50, 10, 10],
        groups:
            [
              {
                name: 'Test Group 0' as Platform.UIString.LocalizedString,
                startLevel: 0,
                style: defaultGroupStyle,
              },
              {
                name: 'Test Group 1' as Platform.UIString.LocalizedString,
                startLevel: 1,
                style: defaultGroupStyle,
              },
              {
                name: 'Test Group 2' as Platform.UIString.LocalizedString,
                startLevel: 2,
                style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
              },
            ],
      });

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return UpdateLevelPositionsTestProvider.data;
      }
    }

    it('Calculate the level position correctly', () => {
      const provider = new UpdateLevelPositionsTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      // For Group 0, it is expanded (not collapsible),
      // so its offset is 17(RulerHeight + 2)
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
      // so its offset is 17(Group offset) + 17(group header height) = 34
      assert.isTrue(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      // For Group 1, its offset is
      // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 55(Group offset) + 17(group header height) = 72
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      // For Group 2, it is nested in Group 1, so its offset is
      // 72(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 89
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 89(Group offset) + 17(group header) = 106
      assert.isFalse(chartInstance.levelIsVisible(2));
      assert.strictEqual(chartInstance.levelToOffset(2), 106);
      // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
      // Since Level 2 is invisible (collapsed), so this one has same offset as Level 2.
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 106);
      assert.strictEqual(chartInstance.levelToOffset(3), 106);
    });

    it('Calculate the level position correctly after hide and unhide a group without nested group', () => {
      const provider = new UpdateLevelPositionsTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      chartInstance.hideGroup(/* groupIndex= */ 0);
      // For Group 0, it is hidden, so its offset is 17(RulerHeight + 2)
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      // For Level 0, it is in Test Group 1, and the group is hidden,
      // so its offset is same as group offset
      assert.isFalse(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 17);
      // For Group 1, its offset is
      // 17(level 0 offset) + 0(level 0 is hidden) + 4(style.padding) = 21
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 21);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 21(Group offset) + 17(group header height) = 38
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 38);
      // For Group 2, it is nested in Group 1, so its offset is
      // 38(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 55);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 55(Group offset) + 17(group header) = 72
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(2), 72);
      // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
      // Since Level 2 is invisible (collapsed), so this one has same offset as Level 2.
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 72);
      assert.strictEqual(chartInstance.levelToOffset(3), 72);

      // Unhide Group 0, so the offset should be same as default (see test "Calculate the level position correctly").
      chartInstance.showGroup(/* groupIndex= */ 0);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      assert.isTrue(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      assert.isFalse(chartInstance.levelIsVisible(2));
      assert.strictEqual(chartInstance.levelToOffset(2), 106);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 106);
      assert.strictEqual(chartInstance.levelToOffset(3), 106);
    });

    describe('hide/unhide nested group', () => {
      class UpdateLevelPositionsWithNestedGroupTestProvider extends FakeFlameChartProvider {
        // Define this data statically; otherwise on each call to
        // timelineData() it is recreated and we lose any state such as the
        // group hidden / expanded state. This reproduces what we do in
        // production too; calculating timelineData() is expensive so we want
        // to do it as infrequently as possible.
        static data = PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2],
          entryStartTimes: [5, 60, 80],
          entryTotalTimes: [50, 10, 10],
          groups:
              [
                {
                  name: 'Test Group 0' as Platform.UIString.LocalizedString,
                  startLevel: 0,
                  style: defaultGroupStyle,
                },
                {
                  name: 'Test Group 1' as Platform.UIString.LocalizedString,
                  startLevel: 1,
                  style: defaultGroupStyle,
                },
                // Make the nested group always expanded for better testing the nested case
                {
                  name: 'Test Group 2' as Platform.UIString.LocalizedString,
                  startLevel: 2,
                  style: {...defaultGroupStyle, nestingLevel: 1},
                },
              ],
        });
        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return UpdateLevelPositionsWithNestedGroupTestProvider.data;
        }
      }

      it('Calculate the level position correctly after hide and unhide a group with nested group', () => {
        const provider = new UpdateLevelPositionsWithNestedGroupTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        renderChart(chartInstance);

        chartInstance.hideGroup(/* groupIndex= */ 1);
        // For Group 0, it is expanded (not collapsible),
        // so its offset is 17(RulerHeight + 2)
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
        // so its offset is 17(Group offset) + 17(group header height) = 34
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 51);
        // For Level 1, it is in Group 1, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 51);
        // For Group 2, it is nested in Group 1, so it is also hidden, so its offset is
        // 51(level 1 offset) + 0(level 1 is invisible) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 51);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 51);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 51);
        assert.strictEqual(chartInstance.levelToOffset(3), 51);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 1);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 106);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is visible, so its offset is 106(Group offset) + 17(Level 2 height) = 123
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 123);
        assert.strictEqual(chartInstance.levelToOffset(3), 123);
      });

      it('Calculate the level position correctly after hide and unhide a nested group', () => {
        const provider = new UpdateLevelPositionsWithNestedGroupTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        renderChart(chartInstance);

        chartInstance.hideGroup(/* groupIndex= */ 2);
        // For Group 0, it is expanded (not collapsible),
        // so its offset is 17(RulerHeight + 2)
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
        // so its offset is 17(Group offset) + 17(group header height) = 34
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        // For Level 1, it is in Group 1, and the group is expanded by default,
        // so its offset is 55(Group offset) + 17(group header height) = 72
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        // For Group 2, it is nested in Group 1, and it is set to hidden, so its offset is
        // 72(level 1 offset) + 17(level 1 is visible) = 89
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 89);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 89);
        assert.strictEqual(chartInstance.levelToOffset(3), 89);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 2);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 106);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is visible, so its offset is 106(Group offset) + 17(Level 2 height) = 123
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 123);
        assert.strictEqual(chartInstance.levelToOffset(3), 123);
      });
    });
  });

  describe('Index to/from coordinates coversion', () => {
    class IndexAndCoordinatesConversionTestProvider extends FakeFlameChartProvider {
      override entryColor(_entryIndex: number): string {
        return 'red';
      }

      override maxStackDepth(): number {
        return 2;
      }

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 0, 1, 1],
          entryStartTimes: [5, 60, 80, 300],
          entryTotalTimes: [50, 10, 10, 500],
          groups: [
            {
              name: 'Test Group' as Platform.UIString.LocalizedString,
              startLevel: 0,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 1' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: defaultGroupStyle,
            },
          ],
        });
      }
    }

    describe('entryIndexToCoordinates', () => {
      it('returns the correct coordinates for a given entry', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }
        const entryIndex = 0;
        const {x: canvasOffsetX, y: canvasOffsetY} = chartInstance.getCanvasOffset();
        // TODO(crbug.com/1440169): We can get all the expected values from
        // the chart's data and avoid magic numbers
        const initialXPosition = chartInstance.computePosition(timelineData.entryStartTimes[entryIndex]);
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
            // header of Group 0 (17) and beyond it.
            {x: initialXPosition + canvasOffsetX, y: 34 + canvasOffsetY + chartInstance.getScrollOffset()});
      });

      it('returns the correct coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }
        const entryIndex = 0;
        const {x: canvasOffsetX, y: canvasOffsetY} = chartInstance.getCanvasOffset();
        // TODO(crbug.com/1440169): We can get all the expected values from
        // the chart's data and avoid magic numbers
        const initialXPosition = chartInstance.computePosition(timelineData.entryStartTimes[entryIndex]);
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
            // header of Group 0 (17) and beyond it.
            {x: initialXPosition + canvasOffsetX, y: 34 + canvasOffsetY + chartInstance.getScrollOffset()});

        chartInstance.moveGroupDown(0);
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            // Move Group 0 down. So for index 0, it is in level 1, so vertically there are the ruler(17), the header of
            // Group 1 (17), level 1(inside Group 1, 17), padding of Group 0(4), and header of Group 0 (17)beyond it.
            {x: initialXPosition + canvasOffsetX, y: 72 + canvasOffsetY + chartInstance.getScrollOffset()});
      });
    });

    describe('coordinatesToEntryIndex', () => {
      it('returns the correct entry index for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);

        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }
        const startXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0]);
        const beforeStartXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0] - 1);
        const endXPosition =
            chartInstance.computePosition(timelineData.entryStartTimes[0] + timelineData.entryTotalTimes[0]);
        const afterEndXPosition =
            chartInstance.computePosition(timelineData.entryStartTimes[0] + timelineData.entryTotalTimes[0] + 1);

        // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
        // header of Group 0 (17) and beyond it.
        // And the height of level 0 is 17.
        // So the index 0 can be mapped from
        //   x: around startXPosition to endXPosition, the reason is x is related to zoom ratio and has some rounds
        //      during calculation.
        //   y: 34(inclusive) to 51(exclusive)
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(beforeStartXPosition + 1, 34), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(endXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(afterEndXPosition + 3, 34), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 33), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 50), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 51), -1);
      });

      it('returns the correct entry index for given coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);

        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }
        const startXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0]);

        chartInstance.moveGroupDown(0);
        // Ro-order group will only affect the vertical offsets, so we just need to test |y|.
        // Move Group 0 down. So for index 0, it is in level 1, so vertically there are the ruler(17), the header of
        // Group 1 (17), level 1(inside Group 1, 17), padding of Group 0(4), and header of Group 0 (17)beyond it.
        // And the height of level 0 is 17.
        // So the entry 0 can be mapped from
        //   y: 72(inclusive) to 89(exclusive)
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 71), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 72), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 88), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 89), -1);
      });
    });

    describe('coordinatesToGroupIndexAndHoverType', () => {
      it('returns the correct group index for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);

        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }

        // For group 0, vertically there are only the ruler(17) beyond it. So it starts from 17.
        // For group 1, vertically there are only the ruler(17), header of Group 0 (17), level 0(17), padding of
        // Group 1(4) and header beyond it. So it starts from 55.
        // So the group 0 can be mapped from
        //   x: any inside the view
        //   y: 17(inclusive) to 55(exclusive)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 16),
            {groupIndex: -1, hoverType: PerfUI.FlameChart.HoverType.OUTSIDE_TRACKS});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 50),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 55),
            {groupIndex: 1, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
      });

      it('returns the correct group index for given coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);

        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }

        chartInstance.moveGroupDown(0);
        // Ro-order group will only affect the vertical offsets, so we just need to test |y|.
        // Move Group 0 down. So for group 0, vertically there are only the ruler(17), header of Group 1 (17),
        // level 1(17), padding of Group 0(4) and header beyond it. So it starts from 55.
        // And now the Group 0 is the last group, so the end of the Group 0 is 55 + header of Group 0(17) + level 0(17)
        // = 89
        // So the entry 0 can be mapped from
        //   y: 55(inclusive) to 89(exclusive)
        // Now Group 1 will be before Group 0. so (y)54 will be mapped to Group 1
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 54),
            {groupIndex: 1, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 55),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 88),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 89),
            {groupIndex: -1, hoverType: PerfUI.FlameChart.HoverType.OUTSIDE_TRACKS});
      });

      it('returns the correct group index and the icon type for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);

        // Make the width narrow so that not everything fits
        chartInstance.setSize(100, 400);
        chartInstance.setWindowTimes(0, 100);
        renderChart(chartInstance);
        const timelineData = chartInstance.timelineData();
        if (!timelineData) {
          throw new Error('Could not find timeline data');
        }
        const context = (chartInstance.getCanvas().getContext('2d') as CanvasRenderingContext2D);
        const labelWidth = chartInstance.labelWidthForGroup(context, provider.timelineData()?.groups[0]!);

        // Start of the view
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(0, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        // End of the title label, For title label checking, the end is included.
        const endOfTitle = /* HEADER_LEFT_PADDING */ 6 + labelWidth;
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(endOfTitle, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(endOfTitle + 1, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});

        chartInstance.setEditModeForTest(true);
        // Start of the view (before the first icon). Will return the track header.
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(0, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        // First icon (Up)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(/* HEADER_LEFT_PADDING */ 6, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_UP_BUTTON});
        // Second icon (Down)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 25, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_DOWN_BUTTON});
        // Third icon (Hide)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE * 2 + GAP_BETWEEN_EDIT_ICONS */ 44, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_HIDE_BUTTON});
        // This is after the third icon, which is the start of the title label, so should return INSIDE_TRACK_HEADER
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_MODE_TOTAL_ICON_WIDTH */ 60, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
      });
    });
  });

  describe('buildGroupTree', () => {
    class BuildGroupTreeTestProvider extends FakeFlameChartProvider {
      override maxStackDepth(): number {
        return 6;
      }
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [],
          entryStartTimes: [],
          entryTotalTimes: [],
          groups: [
            {
              name: 'Test Group 0' as Platform.UIString.LocalizedString,
              startLevel: 0,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 1' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 2' as Platform.UIString.LocalizedString,
              startLevel: 2,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
            },
            {
              name: 'Test Group 3' as Platform.UIString.LocalizedString,
              startLevel: 3,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 2},
            },
            {
              name: 'Test Group 4' as Platform.UIString.LocalizedString,
              startLevel: 4,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
            },
            {
              name: 'Test Group 5' as Platform.UIString.LocalizedString,
              startLevel: 5,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 0},
            },
          ],
        });
      }
    }

    it('builds the group tree correctly', async () => {
      const provider = new BuildGroupTreeTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      const root = chartInstance.buildGroupTree(provider.timelineData().groups);

      // The built tree should be
      //               Root
      //        /       |         \
      // Group0       Group1         Group5
      //             /      \
      //           Group2   Group4
      //             |
      //           Group3
      const groupNode5 = {
        index: 5,
        nestingLevel: 0,
        startLevel: 5,
        // This is the last group, so it will use the end level of the data provider, which is
        // returned by |dataProvider.maxStackDepth()|, and it is 3.
        endLevel: 6,
        children: [],
      };
      const groupNode4 = {
        index: 4,
        nestingLevel: 1,
        startLevel: 4,
        // The next group is 'Test Group 5', its start level is 5.
        endLevel: 5,
        children: [],
      };
      const groupNode3 = {
        index: 3,
        nestingLevel: 2,
        startLevel: 3,
        // The next group is 'Test Group 4', its start level is 4.
        endLevel: 4,
        children: [],
      };
      const groupNode2 = {
        index: 2,
        nestingLevel: 1,
        startLevel: 2,
        // The next group is 'Test Group 3', its start level is 3.
        endLevel: 3,
        children: [groupNode3],
      };
      const groupNode1 = {
        index: 1,
        nestingLevel: 0,
        startLevel: 1,
        // The next group is 'Test Group 2', its start level is 2.
        endLevel: 2,
        children: [groupNode2, groupNode4],
      };
      const groupNode0 = {
        index: 0,
        nestingLevel: 0,
        startLevel: 0,
        // The next group is 'Test Group 1', its start level is 1.
        endLevel: 1,
        children: [],
      };
      const expectedGroupNodeRoot = {
        index: -1,
        nestingLevel: -1,
        startLevel: 0,
        // The next group is 'Test Group 0', its start level is 0.
        endLevel: 0,
        children: [groupNode0, groupNode1, groupNode5],
      };

      assert.deepEqual(root, expectedGroupNodeRoot);
    });
  });

  describe('updateGroupTree', () => {
    class UpdateGroupTreeTestProvider extends FakeFlameChartProvider {
      override maxStackDepth(): number {
        return 6;
      }
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [],
          entryStartTimes: [],
          entryTotalTimes: [],
          groups: [
            {
              name: 'Test Group 0' as Platform.UIString.LocalizedString,
              startLevel: 0,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 1' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 2' as Platform.UIString.LocalizedString,
              startLevel: 2,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
            },
          ],
        });
      }
    }

    it('builds the group tree correctly', async () => {
      const provider = new UpdateGroupTreeTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      const root = chartInstance.buildGroupTree(provider.timelineData().groups);

      // The built tree should be
      //        Root
      //      /      \
      // Group0      Group1
      //                |
      //             Group2
      const groupNode2 = {
        index: 2,
        nestingLevel: 1,
        startLevel: 2,
        // The next group is 'Test Group 3', its start level is 3.
        endLevel: 6,
        children: [],
      };
      const groupNode1 = {
        index: 1,
        nestingLevel: 0,
        startLevel: 1,
        // The next group is 'Test Group 2', its start level is 2.
        endLevel: 2,
        children: [groupNode2],
      };
      const groupNode0 = {
        index: 0,
        nestingLevel: 0,
        startLevel: 0,
        // The next group is 'Test Group 1', its start level is 1.
        endLevel: 1,
        children: [],
      };
      const expectedGroupNodeRoot = {
        index: -1,
        nestingLevel: -1,
        startLevel: 0,
        // The next group is 'Test Group 0', its start level is 0.
        endLevel: 0,
        children: [groupNode0, groupNode1],
      };

      assert.deepEqual(root, expectedGroupNodeRoot);

      const newGroups = [
        {
          name: 'Test Group 0' as Platform.UIString.LocalizedString,
          startLevel: 0,
          style: defaultGroupStyle,
        },
        {
          name: 'Test Group 1' as Platform.UIString.LocalizedString,
          startLevel: 2,
          style: defaultGroupStyle,
        },
        {
          name: 'Test Group 2' as Platform.UIString.LocalizedString,
          startLevel: 3,
          style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
        },
      ];

      chartInstance.updateGroupTree(newGroups, root);
      groupNode0.endLevel = 2;
      groupNode1.startLevel = 2;
      groupNode1.endLevel = 3;
      groupNode2.startLevel = 3;
      assert.deepEqual(root, expectedGroupNodeRoot);
    });
  });

  describe('rendering tracks', () => {
    it('can render a Node CPU Profile', async function() {
      // We have to do some work to render this trace, as we take the raw CPU
      // Profile and wrap it in our code that maps it to a "real" trace. This is what happens for real if a user imports a CPU Profile.
      const rawCPUProfile = await TraceLoader.rawCPUProfile(this, 'node-fibonacci-website.cpuprofile.gz');
      const rawTrace = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
          rawCPUProfile, Trace.Types.Events.ThreadID(1));
      const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(rawTrace);

      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: parsedTrace,
        filterTracks(trackName) {
          return trackName.startsWith('Main');
        },
        expandTracks() {
          return true;
        },
      });
      await assertScreenshot('timeline/main_thread_node_cpu_profile.png');
    });

    it('renders the main thread correctly', async function() {
      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: 'one-second-interaction.json.gz',
        filterTracks(trackName) {
          return trackName.startsWith('Main');
        },
        expandTracks() {
          return true;
        },
      });
      await assertScreenshot('timeline/render_main_thread.png');
    });

    it('renders iframe main threads correctly', async function() {
      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: 'multiple-navigations-with-iframes.json.gz',
        filterTracks(trackName) {
          return trackName.startsWith('Frame');
        },
        expandTracks() {
          return true;
        },
      });
      await assertScreenshot('timeline/render_iframe_main_thread.png');
    });

    it('renders the rasterizer tracks, nested correctly', async function() {
      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: 'web-dev.json.gz',
        filterTracks(trackName) {
          return trackName.startsWith('Raster');
        },
        expandTracks() {
          return true;
        },
      });
      await assertScreenshot('timeline/render_rasterizer_track.png');
    });

    it('renders tracks for workers', async function() {
      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: 'two-workers.json.gz',
        filterTracks(trackName) {
          return trackName.startsWith('Worker');
        },
        expandTracks(_trackName, trackIndex) {
          // We render two worker tracks: leave the first closed and expand the second.
          return trackIndex === 1;
        },
        // Zoom in on the part of the trace with activity to make the screenshot better.
        customStartTime: 107351290.697 as Trace.Types.Timing.Milli,
        customEndTime: 107351401.004 as Trace.Types.Timing.Milli,
      });
      await assertScreenshot('timeline/worker_tracks.png');
    });

    it('renders threadpool groups correctly', async function() {
      await renderFlameChartIntoDOM(this, {
        dataProvider: 'MAIN',
        traceFile: 'web-dev.json.gz',
        filterTracks(trackName) {
          return trackName.startsWith('Thread');
        },
        expandTracks() {
          return true;
        },
        // Zoom in on the part of the trace with activity to make the screenshot better.
        customStartTime: 1020034891.352 as Trace.Types.Timing.Milli,
        customEndTime: 1020035181.509 as Trace.Types.Timing.Milli,
      });
      await assertScreenshot('timeline/threadpool_tracks.png');
    });
  });

  it('renders the interactions track correctly', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'slow-interaction-button-click.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('Interactions');
      },
      expandTracks() {
        return true;
      },
      customStartTime: 337944700 as Trace.Types.Timing.Milli,
      customEndTime: 337945100 as Trace.Types.Timing.Milli,
    });
    await assertScreenshot('timeline/interactions_track.png');
  });

  it('candy stripes long interactions', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'one-second-interaction.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('Interactions');
      },
      expandTracks() {
        return true;
      },
      customStartTime: 141251500 as Trace.Types.Timing.Milli,
      customEndTime: 141253000 as Trace.Types.Timing.Milli,
    });
    await assertScreenshot('timeline/interactions_track_candystripe.png');
  });

  it('renders the frames track with screenshots', async function() {
    const {flameChart} = await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'web-dev-screenshot-source-ids.json.gz',
      // This is a bit confusing: we filter out all tracks here because the
      // Frames track was never migrated to an appender, and therefore it
      // cannot be filtered using this helper.
      // So instead, we filter all the appenders out, which leaves just the
      // frames track. This also means we cannot expand it via this helper,
      // hence the call to toggleGroupExpand below.
      filterTracks() {
        return false;
      },
      // A height manually picked that fits the screenshots in but no
      // additional whitespace.
      customHeight: 200,
      // So that when we expand the track, the screenshots are already in
      // memory and we do not have to async wait for them to be fetched &
      // drawn.
      preloadScreenshots: true,
    });
    flameChart.toggleGroupExpand(0);
    await raf();
    await assertScreenshot('timeline/frames_track_screenshots.png');
  });

  it('renders correctly with a vertical offset', async function() {
    const {flameChart, parsedTrace, dataProvider} = await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'web-dev.json.gz',
      filterTracks() {
        return true;
      },
      expandTracks() {
        return true;
      },
      customHeight: 200,
    });

    // This event is one that is deep into the main thread, so it forces the
    // flamechart to be vertically scrolled. That's why we pick this one.
    const event = allThreadEntriesInTrace(parsedTrace).find(entry => {
      return entry.dur === 462 && entry.ts === 1020035043753 &&
          entry.name === Trace.Types.Events.Name.UPDATE_LAYOUT_TREE;
    });
    assert.isOk(event);
    const index = dataProvider.indexForEvent(event);
    assert.isOk(index);
    flameChart.revealEntryVertically(index);
    await raf();
    await assertScreenshot('timeline/flamechart_with_vertical_offset.png');
  });

  it('renders the animations track', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'animation.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('Animation');
      },
      expandTracks() {
        return true;
      },
    });
    await assertScreenshot('timeline/animations_track.png');
  });

  it('renders the GPU track', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'threejs-gpu.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('GPU');
      },
      expandTracks() {
        return true;
      },
    });
    await assertScreenshot('timeline/gpu_track.png');
  });

  it('renders the network track', async function() {
    const {flameChart} = await renderFlameChartIntoDOM(this, {
      dataProvider: 'NETWORK',
      traceFile: 'web-dev.json.gz',
      customHeight: 350,
      customEndTime: 1020035221.509 as Trace.Types.Timing.Milli,
    });
    flameChart.toggleGroupExpand(0);
    await raf();
    await assertScreenshot('timeline/network_track.png');
  });

  it('renders the user timing track', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'timings-track.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('Timings');
      },
      expandTracks() {
        return true;
      },
    });
    await assertScreenshot('timeline/timings_track.png');
  });

  it('renders the auction worklets track', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'fenced-frame-fledge.json.gz',
      filterTracks(trackName) {
        return trackName.includes('Worklet');
      },
      expandTracks() {
        return true;
      },
      customStartTime: Trace.Types.Timing.Milli(220391498.289),
      customEndTime: Trace.Types.Timing.Milli(220391697.601),
    });
    await assertScreenshot('timeline/auction_worklets_track.png');
  });

  it('renders the layout shifts track', async function() {
    await renderFlameChartIntoDOM(this, {
      dataProvider: 'MAIN',
      traceFile: 'cls-single-frame.json.gz',
      filterTracks(trackName) {
        return trackName.startsWith('LayoutShifts');
      },
      expandTracks() {
        return true;
      },
    });
    await assertScreenshot('timeline/layout_shifts_track.png');
  });

  it('renders all the decoration types onto events', async () => {
    class FakeProviderWithDecorations extends FakeFlameChartProvider {
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2],
          entryStartTimes: [5, 55, 70, 5, 30, 55, 75, 5, 10, 15, 20, 25],
          entryTotalTimes: [45, 10, 20, 20, 20, 5, 15, 4, 4, 4, 4, 1],
          entryDecorations: [
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(25_000),
              },
              {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
            ],
            [{type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE}],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
              {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(15_000),
              },
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(10_000),
              },
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(10_000),
              },
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
              {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
            ],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
              {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(1_000),
              },
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
                startAtTime: Trace.Types.Timing.Micro(1_000),
              },
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
              {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
            ],
            [
              {
                type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE,
                // This triangle should start 1/4 of the event, and end at 3/4 of the event.
                customStartTime: Trace.Types.Timing.Micro(25_250),
                customEndTime: Trace.Types.Timing.Micro(25_750),
              },
            ],
          ],
          groups: [{
            name: 'Testing decorations' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: defaultGroupStyle,
          }],
        });
      }
    }

    await renderFlameChartWithFakeProvider(
        new FakeProviderWithDecorations(),
    );
    await assertScreenshot('timeline/flamechart_all_decoration_types.png');
  });

  it('renders initiators correctly', async () => {
    class FakeProviderWithInitiators extends FakeFlameChartProvider {
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3],
          entryStartTimes: [5, 5, 5, 15, 15, 15, 40, 40, 40, 55.4, 55.4, 55.4, 80, 80, 80, 17],
          entryTotalTimes: [6, 6, 6, 5, 5, 20, 15, 15, 15, 2, 2, 2, 10, 10, 10, 10],
          entryDecorations: [
            [],
            [],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [],
            [],
            [],
            [],
            [],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [],
            [],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
            [
              {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            ],
          ],
          initiatorsData: [
            {initiatorIndex: 2, eventIndex: 3, isInitiatorHidden: true},
            {initiatorIndex: 1, eventIndex: 13},
            {initiatorIndex: 3, eventIndex: 6},
            {initiatorIndex: 3, eventIndex: 8, isEntryHidden: true},
            {initiatorIndex: 6, eventIndex: 11},
            {initiatorIndex: 11, eventIndex: 12, isInitiatorHidden: true, isEntryHidden: true},
            {initiatorIndex: 5, eventIndex: 15},
          ],
          groups: [{
            name: 'Testing initiators' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: defaultGroupStyle,
          }],
        });
      }

      override maxStackDepth(): number {
        return 4;
      }
    }

    await renderFlameChartWithFakeProvider(
        new FakeProviderWithInitiators(),
    );
    await assertScreenshot('timeline/flamechart_initiators.png');
  });

  it('renders extension tracks with the right colours', async () => {
    const colorPalette = Trace.Types.Extensions.extensionPalette;
    const paletteLength = colorPalette.length;

    class FakeProviderWithExtensionColors extends FakeFlameChartProvider {
      override entryColor(entryIndex: number): string {
        const color = colorPalette[entryIndex % paletteLength];
        return Extensions.ExtensionUI.extensionEntryColor(
            {args: {color}} as Trace.Types.Extensions.SyntheticExtensionEntry);
      }
      override maxStackDepth(): number {
        return paletteLength + 1;
      }
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: colorPalette.map((_, i) => i),
          entryStartTimes: colorPalette.map(() => 0),
          entryTotalTimes: colorPalette.map(() => 100),
          groups: [{
            name: 'Testing extension palette' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: defaultGroupStyle,
          }],
        });
      }
    }

    await renderFlameChartWithFakeProvider(
        new FakeProviderWithExtensionColors(),
    );
    await assertScreenshot('timeline/flamechart_extension_track_colors.png');
  });
});
