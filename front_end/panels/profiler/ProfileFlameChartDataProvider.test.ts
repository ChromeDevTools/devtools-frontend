// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Profiler from './profiler.js';

class TestProfileFlameChartDataProvider extends Profiler.ProfileFlameChart.ProfileFlameChartDataProvider {
  override minimumBoundary(): number {
    return 0;
  }
  override totalTime(): number {
    return 100;
  }
  override maxStackDepth(): number {
    return 2;
  }
  override calculateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    return PerfUI.FlameChart.FlameChartTimelineData.create({
      entryLevels: new Uint16Array([0, 1]),
      entryTotalTimes: new Float32Array([5, 10]),
      entryStartTimes: new Float64Array([0, 10]),
      groups: null,
    });
  }
}

function createSearchableView(): UI.SearchableView.SearchableView {
  const searchable = {
    performSearch: () => {},
    onSearchCanceled: () => {},
    jumpToNextSearchResult: () => {},
    jumpToPreviousSearchResult: () => {},
    supportsCaseSensitiveSearch: () => true,
    supportsWholeWordSearch: () => false,
    supportsRegexSearch: () => false,
  };
  return new UI.SearchableView.SearchableView(searchable, null);
}

describeWithEnvironment('ProfileFlameChart', () => {
  it('renders with view stub and passes child widgets on view input', async () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const searchableView = createSearchableView();
    const view = createViewFunctionStub(Profiler.ProfileFlameChart.ProfileFlameChart);
    const chart = new Profiler.ProfileFlameChart.ProfileFlameChart(searchableView, dataProvider, undefined, view);

    chart.markAsRoot();
    renderElementIntoDOM(chart);

    await view.nextInput;
    assert.strictEqual(view.input.overviewPane, chart.overviewPane);
    assert.strictEqual(view.input.mainPane, chart.mainPane);
    chart.detach();
  });

  it('updates range on overviewPane when range property is set', () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const searchableView = createSearchableView();
    const chart = new Profiler.ProfileFlameChart.ProfileFlameChart(searchableView, dataProvider);

    const selectRangeSpy = sinon.spy(chart.overviewPane, 'selectRange');
    chart.range = {left: 10, right: 30};
    sinon.assert.calledWith(selectRangeSpy, 10, 30);
  });

  it('performs search and updates matches count', () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    dataProvider.entryNodes = [
      {functionName: 'apple', scriptId: '1', url: 'a.js'} as CPUProfile.ProfileTreeModel.ProfileNode,
      {functionName: 'banana', scriptId: '2', url: 'b.js'} as CPUProfile.ProfileTreeModel.ProfileNode,
    ];
    const searchableView = createSearchableView();
    const updateSearchMatchesCountSpy = sinon.spy(searchableView, 'updateSearchMatchesCount');
    const chart = new Profiler.ProfileFlameChart.ProfileFlameChart(searchableView, dataProvider);

    chart.performSearch(new UI.SearchableView.SearchConfig('apple', false, false, false), true);
    sinon.assert.calledWith(updateSearchMatchesCountSpy, 1);
  });
});

describeWithEnvironment('OverviewPane', () => {
  it('renders with view stub and passes overviewGridElement on view input', async () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const view = createViewFunctionStub(Profiler.ProfileFlameChart.OverviewPane);
    const overviewPane = new Profiler.ProfileFlameChart.OverviewPane(dataProvider, undefined, view);

    overviewPane.markAsRoot();
    renderElementIntoDOM(overviewPane);

    await view.nextInput;
    assert.strictEqual(view.input.overviewGridElement, overviewPane.overviewGrid.element);
    overviewPane.detach();
  });

  it('dispatches WindowChanged event when onWindowChanged is called', () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const overviewPane = new Profiler.ProfileFlameChart.OverviewPane(dataProvider);

    const windowChangedSpy = sinon.spy();
    overviewPane.addEventListener(Profiler.ProfileFlameChart.OverviewPaneEvents.WINDOW_CHANGED, windowChangedSpy);

    overviewPane.onWindowChanged({
      data: {rawStartValue: 20, rawEndValue: 80},
    } as Common.EventTarget.EventTargetEvent<PerfUI.OverviewGrid.WindowChangedWithPositionEvent>);

    sinon.assert.calledOnce(windowChangedSpy);
    assert.strictEqual(overviewPane.windowTimeLeft, 20);
    assert.strictEqual(overviewPane.windowTimeRight, 80);
  });

  it('selects range and updates window ratio on overviewGrid', () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const overviewPane = new Profiler.ProfileFlameChart.OverviewPane(dataProvider);

    const setWindowRatioSpy = sinon.spy(overviewPane.overviewGrid, 'setWindowRatio');
    overviewPane.selectRange(25, 75);

    sinon.assert.calledWith(setWindowRatioSpy, 0.25, 0.75);
  });

  it('updates canvas and dividers on update', () => {
    const dataProvider = new TestProfileFlameChartDataProvider();
    const overviewPane = new Profiler.ProfileFlameChart.OverviewPane(dataProvider);

    overviewPane.markAsRoot();
    renderElementIntoDOM(overviewPane);

    sinon.stub(overviewPane.overviewContainer, 'clientWidth').get(() => 200);
    sinon.stub(overviewPane.overviewContainer, 'clientHeight').get(() => 50);

    overviewPane.update();

    assert.isDefined(overviewPane.overviewCanvas);
    assert.isAbove(overviewPane.overviewCanvas.width, 0);
    overviewPane.detach();
  });
});
