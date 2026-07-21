// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Trace from '../models/trace/trace.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as PerfUI from '../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../ui/legacy/legacy.js';
import { raf, renderElementIntoDOM } from './DOMHelpers.js';
import { initializeGlobalVars } from './EnvironmentHelpers.js';
import { TraceLoader } from './TraceLoader.js';
export * from './TraceHelpersCore.js';
export class MockFlameChartDelegate {
    windowChanged(_startTime, _endTime, _animate) {
    }
    updateRangeSelection(_startTime, _endTime) {
    }
    updateSelectedGroup(_flameChart, _group) {
    }
}
/**
 * Renders a flame chart into the unit test DOM that renders a real provided
 * trace file.
 * It will take care of all the setup and configuration for you.
 */
export async function renderFlameChartIntoDOM(context, options) {
    const targetManager = SDK.TargetManager.TargetManager.instance({ forceNew: true });
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({ forceNew: true });
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({ forceNew: true });
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        workspace,
        ignoreListManager,
    });
    let parsedTrace = null;
    if (typeof options.fileNameOrParsedTrace === 'string') {
        parsedTrace = await TraceLoader.traceEngine(context, options.fileNameOrParsedTrace);
    }
    else {
        parsedTrace = options.fileNameOrParsedTrace;
    }
    if (options.preloadScreenshots) {
        await Timeline.Utils.ImageCache.preload(parsedTrace?.data.Screenshots.screenshots ?? []);
    }
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const dataProvider = options.dataProvider === 'MAIN' ?
        new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider() :
        new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    dataProvider.setModel(parsedTrace, entityMapper);
    if (dataProvider instanceof Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider) {
        dataProvider.buildWithCustomTracksForTest({
            filterTracks: options.filterTracks,
            expandTracks: options.expandTracks,
        });
    }
    else {
        // Calling this method triggers the data being generated & the Network appender being created + drawn.
        dataProvider.timelineData();
    }
    const delegate = new MockFlameChartDelegate();
    const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
    const minTime = options.customStartTime ?? Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
    const maxTime = options.customEndTime ?? Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.max);
    flameChart.setWindowTimes(minTime, maxTime);
    flameChart.markAsRoot();
    const target = document.createElement('div');
    target.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;
    const timingsTrackOffset = flameChart.levelToOffset(dataProvider.maxStackDepth());
    // Allow an extra 10px so no scrollbar is shown if using the default height
    // that fits everything inside.
    const heightPixels = options.customHeight ?? timingsTrackOffset + 10;
    target.style.height = `${heightPixels}px`;
    target.style.display = 'flex';
    target.style.width = '800px';
    renderElementIntoDOM(target);
    flameChart.show(target);
    flameChart.update();
    await raf();
    return { flameChart, dataProvider, target, parsedTrace };
}
/**
 * Draws the network track in the flame chart using the legacy system.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getNetworkFlameChart(traceFileName, expanded) {
    await initializeGlobalVars();
    const parsedTrace = await TraceLoader.traceEngine(/* context= */ null, traceFileName);
    const data = parsedTrace.data;
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const minTime = Trace.Helpers.Timing.microToMilli(data.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(data.Meta.traceBounds.max);
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);
    dataProvider.timelineData().groups.forEach(group => {
        group.expanded = expanded;
    });
    const delegate = new MockFlameChartDelegate();
    const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
    flameChart.setWindowTimes(minTime, maxTime);
    flameChart.markAsRoot();
    flameChart.update();
    return { flameChart, dataProvider };
}
export class FakeFlameChartProvider {
    minimumBoundary() {
        return 0;
    }
    hasTrackConfigurationMode() {
        return false;
    }
    totalTime() {
        return 100;
    }
    formatValue(value) {
        return value.toString();
    }
    maxStackDepth() {
        return 3;
    }
    preparePopoverElement(_entryIndex) {
        return null;
    }
    canJumpToEntry(_entryIndex) {
        return false;
    }
    entryTitle(entryIndex) {
        return `Entry ${entryIndex}`;
    }
    entryFont(_entryIndex) {
        return null;
    }
    entryColor(entryIndex) {
        return [
            'lightblue',
            'lightpink',
            'yellow',
            'lightgray',
            'lightgreen',
            'lightsalmon',
            'orange',
            'pink',
        ][entryIndex % 8];
    }
    decorateEntry() {
        return false;
    }
    forceDecoration(_entryIndex) {
        return false;
    }
    textColor(_entryIndex) {
        return 'black';
    }
    timelineData() {
        return PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    }
}
/**
 * Renders a flame chart using a fake provider and mock delegate.
 * @param provider The fake flame chart provider.
 * @param options Optional parameters.  Includes windowTimes, an array specifying the minimum and maximum window times. Defaults to [0, 100].
 * @returns A promise that resolves when the flame chart is rendered.
 */
export async function renderFlameChartWithFakeProvider(provider, options) {
    const delegate = new MockFlameChartDelegate();
    const flameChart = new PerfUI.FlameChart.FlameChart(provider, delegate);
    const [minWindowTime, maxWindowTime] = options?.windowTimes ?? [0, 100];
    flameChart.setWindowTimes(minWindowTime, maxWindowTime);
    const lastTrackOffset = flameChart.levelToOffset(provider.maxStackDepth());
    const target = document.createElement('div');
    target.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;
    // Allow an extra 10px so no scrollbar is shown.
    target.style.height = `${lastTrackOffset + 10}px`;
    target.style.display = 'flex';
    target.style.width = '800px';
    renderElementIntoDOM(target);
    flameChart.markAsRoot();
    flameChart.show(target);
    flameChart.update();
    await raf();
}
/**
 * Renders a widget into an element that has the right styling to be a VBox.
 * Useful as many of the Performance Panel elements are rendered like this and
 * need a parent that is flex + has a height & width in order to render
 * correctly for screenshot tests.
 */
export function renderWidgetInVbox(widget, opts = {}) {
    const target = document.createElement('div');
    target.classList.add('vbox');
    target.classList.toggle('flex-auto', Boolean(opts.flexAuto));
    target.style.width = (opts.width ?? 800) + 'px';
    target.style.height = (opts.height ?? 600) + 'px';
    widget.markAsRoot();
    widget.show(target);
    renderElementIntoDOM(target, { includeCommonStyles: true });
}
export function setupIgnoreListManagerEnvironment() {
    const targetManager = SDK.TargetManager.TargetManager.instance({ forceNew: true });
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({ forceNew: true });
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({ forceNew: true });
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        workspace,
        ignoreListManager,
    });
    return { ignoreListManager };
}
//# sourceMappingURL=TraceHelpers.js.map