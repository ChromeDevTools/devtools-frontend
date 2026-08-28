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

import {raf, renderElementIntoDOM} from './DOMHelpers.js';
import {initializeGlobalVars} from './EnvironmentHelpers.js';
import {TraceLoader} from './TraceLoader.js';

export * from './TraceHelpersCore.js';

export class MockFlameChartDelegate implements PerfUI.FlameChart.FlameChartDelegate {
  windowChanged(_startTime: number, _endTime: number, _animate: boolean): void {
  }
  updateRangeSelection(_startTime: number, _endTime: number): void {
  }
  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }
}

export interface RenderFlameChartOptions {
  dataProvider: 'MAIN'|'NETWORK';
  /**
   * The trace file to import. You must include `.json.gz` at the end of the file name.
   * Alternatively, you can provide the actual file. This is useful only if you
   * are providing a mocked file; generally you should prefer to pass the file
   * name so that the TraceLoader can take care of loading and caching the
   * trace.
   */
  fileNameOrParsedTrace: string|Trace.TraceModel.ParsedTrace;
  /**
   * Filter the tracks that will be rendered by their name. The name here is
   * the user visible name that is drawn onto the flame chart.
   */
  filterTracks?: (trackName: string, trackIndex: number) => boolean;
  /**
   * Choose which track(s) that have been drawn should be expanded. The name
   * here is the user visible name that is drawn onto the flame chart.
   */
  expandTracks?: (trackName: string, trackIndex: number) => boolean;
  customStartTime?: Trace.Types.Timing.Milli;
  customEndTime?: Trace.Types.Timing.Milli;
  /**
   * A custom height in pixels. By default a height is chosen that will
   * vertically fit the entire FlameChart.
   * (calculated based on the pixel offset of the last visible track.)
   */
  customHeight?: number;
  /**
   * When the frames track renders screenshots, we do so async, as we have to
   * fetch screenshots first to draw them. If this flag is `true`, we block and
   * preload all the screenshots before rendering, thus making it faster in a
   * test to expand the frames track as it can be done with no async calls to
   * fetch images.
   */
  preloadScreenshots?: boolean;
}

/**
 * Renders a flame chart into the unit test DOM that renders a real provided
 * trace file.
 * It will take care of all the setup and configuration for you.
 */
export async function renderFlameChartIntoDOM(context: Mocha.Context|null, options: RenderFlameChartOptions): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider |
      Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider,
  target: HTMLElement,
  parsedTrace: Trace.TraceModel.ParsedTrace,
}> {
  const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    workspace,
    ignoreListManager,
  });

  let parsedTrace: Trace.TraceModel.ParsedTrace|null = null;

  if (typeof options.fileNameOrParsedTrace === 'string') {
    parsedTrace = await TraceLoader.traceEngine(context, options.fileNameOrParsedTrace);
  } else {
    parsedTrace = options.fileNameOrParsedTrace;
  }

  if (options.preloadScreenshots) {
    const screenshots =
        parsedTrace?.data.Screenshots.screenshots ?? parsedTrace?.data.Screenshots.legacySyntheticScreenshots ?? [];
    await Timeline.Utils.ImageCache.preload(screenshots);
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
  } else {
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

  return {flameChart, dataProvider, target, parsedTrace};
}

/**
 * Draws the network track in the flame chart using the legacy system.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getNetworkFlameChart(traceFileName: string, expanded: boolean): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider,
}> {
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
  return {flameChart, dataProvider};
}

export class FakeFlameChartProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  minimumBoundary(): number {
    return 0;
  }

  hasTrackConfigurationMode(): boolean {
    return false;
  }

  totalTime(): number {
    return 100;
  }

  formatValue(value: number): string {
    return value.toString();
  }

  maxStackDepth(): number {
    return 3;
  }

  preparePopoverElement(_entryIndex: number): Element|null {
    return null;
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryTitle(entryIndex: number): string|null {
    return `Entry ${entryIndex}`;
  }

  entryFont(_entryIndex: number): string|null {
    return null;
  }

  entryColor(entryIndex: number): string {
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

  decorateEntry(): boolean {
    return false;
  }

  forceDecoration(_entryIndex: number): boolean {
    return false;
  }

  textColor(_entryIndex: number): string {
    return 'black';
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  }
}

export interface FlameChartWithFakeProviderOptions {
  windowTimes?: [number, number];
}

/**
 * Renders a flame chart using a fake provider and mock delegate.
 * @param provider The fake flame chart provider.
 * @param options Optional parameters.  Includes windowTimes, an array specifying the minimum and maximum window times. Defaults to [0, 100].
 * @returns A promise that resolves when the flame chart is rendered.
 */
export async function renderFlameChartWithFakeProvider(
    provider: FakeFlameChartProvider,
    options?: FlameChartWithFakeProviderOptions,
    ): Promise<void> {
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
export function renderWidgetInVbox(widget: UI.Widget.Widget, opts: {
  width?: number,
  height?: number,
  flexAuto?: boolean,
} = {}): void {
  const target = document.createElement('div');
  target.classList.add('vbox');
  target.classList.toggle('flex-auto', Boolean(opts.flexAuto));
  target.style.width = (opts.width ?? 800) + 'px';
  target.style.height = (opts.height ?? 600) + 'px';
  widget.markAsRoot();
  widget.show(target);
  renderElementIntoDOM(target, {includeCommonStyles: true});
}

export function setupIgnoreListManagerEnvironment(): {
  ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager,
} {
  const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    workspace,
    ignoreListManager,
  });

  return {ignoreListManager};
}
