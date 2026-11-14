// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Structural invariants that must hold across parsed traces and the Performance panel: non-overlapping flame
 * chart levels, nested trace trees with exact selfTime accounting, monotonic track events, idempotent rebuilds,
 * round-tripping selections and serialized keys, bounded tree view aggregations, and reversible EntriesFilter actions.
 */

import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

// Imported via the module entrypoint because this file lives in the unittests target; a relative import would load a
// duplicate copy of ModificationsManager in bundled Release builds.
// eslint-disable-next-line @devtools/es-modules-import
import * as Timeline from './timeline.js';

export interface TimelineInvariants {
  /** Entries placed on the same flame chart row (`entryLevels[i]`) must not overlap in time. */
  levelPacking: string[];
  /**
   * Renderer and CPU sample `TraceEntryTree` nodes must nest within parent time bounds, must not overlap
   * siblings, and must satisfy `selfTime + sum(children.dur) === dur`.
   */
  treeIntegrity: string[];
  /** Events returned by `groupTreeEvents(group)` for each track must be ordered by non-decreasing `ts`. */
  trackEventOrder: string[];
  /** Force-rebuilding `timelineData(true)` in place must preserve entry counts and per-track `groupTreeEvents`. */
  rebuild: string[];
  /**
   * Creating a `TimelineSelection` from a flame chart entry index via `createSelection(i)` and resolving it
   * back via `entryIndexForSelection(selection)` must return `i`.
   */
  selectionRoundTrip: string[];
  /**
   * Serializing a flame chart event via `EventsSerializer.keyForEvent(event)` and resolving that key back via
   * `eventForKey(key, parsedTrace)` must return the identical `Event` reference.
   */
  eventsSerializerRoundTrip: string[];
  /**
   * Across Bottom-up, Call Tree, Event Log, and 1P/3P tree views (full and zoomed), each row must satisfy
   * `0 <= selfTime <= totalTime <= windowMicros`, and top-level `selfTime` values must sum to `<= windowMicros`.
   */
  treeViewAccounting: string[];
  /** Applying `EntriesFilter` merge/collapse actions and running `UNDO_ALL_ACTIONS` must restore all entries. */
  entriesFilterUndo: string[];
}

export interface InvariantCheckContext {
  parsedTrace: Trace.TraceModel.ParsedTrace;
  entityMapper?: Trace.EntityMapper.EntityMapper;
  mainProvider?: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider;
  networkProvider?: Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;
}

type AnyFlameChartProvider = Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider|
                             Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;

/** Instant events render 0.001ms wide (InstantEventVisibleDurationMs) despite zero duration. */
const LEVEL_OVERLAP_TOLERANCE_MS = 0.002;
const TREE_TOLERANCE_MICRO = 1;
const SUBWINDOW_START_FRACTION = 0.35;
const SUBWINDOW_END_FRACTION = 0.65;
const MAX_VIOLATIONS = 50;

export function checkTimelineInvariants(context: InvariantCheckContext): TimelineInvariants {
  const {parsedTrace} = context;
  const entityMapper = context.entityMapper ?? new Trace.EntityMapper.EntityMapper(parsedTrace);
  const mainProvider =
      context.mainProvider ?? new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  const networkProvider = context.networkProvider ??
      new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
  if (!context.mainProvider) {
    mainProvider.setModel(parsedTrace, entityMapper);
  }
  if (!context.networkProvider) {
    networkProvider.setModel(parsedTrace, entityMapper);
  }

  const serializer = new Trace.EventsSerializer.EventsSerializer();
  const minTs = parsedTrace.data.Meta.traceBounds.min;
  const firstBuildEvents = groupEventsByTrack(mainProvider);
  const mainRoundTrips = checkRoundTrips(mainProvider, parsedTrace, serializer, minTs);
  const netRoundTrips = checkRoundTrips(networkProvider, parsedTrace, serializer, minTs);

  const raw: TimelineInvariants = {
    levelPacking: [
      ...checkLevelPacking(mainProvider, serializer, minTs),
      ...checkLevelPacking(networkProvider, serializer, minTs),
    ],
    selectionRoundTrip: [...mainRoundTrips.selections, ...netRoundTrips.selections],
    eventsSerializerRoundTrip: [...mainRoundTrips.keys, ...netRoundTrips.keys],
    treeIntegrity: checkTreeIntegrity(parsedTrace, serializer, minTs),
    trackEventOrder: checkTrackEventOrder(firstBuildEvents, serializer, minTs),
    treeViewAccounting: checkTreeViewAccounting(parsedTrace, entityMapper, mainProvider),
    // Rebuild and EntriesFilter mutate mainProvider in place, so they run last.
    rebuild: checkRebuildIdempotence(mainProvider, firstBuildEvents),
    entriesFilterUndo: checkEntriesFilterUndo(mainProvider, serializer, minTs),
  };

  const cap = (items: string[]): string[] => items.length <= MAX_VIOLATIONS ?
      items :
      [...items.slice(0, MAX_VIOLATIONS), `…and ${items.length - MAX_VIOLATIONS} more`];
  return {
    levelPacking: cap(raw.levelPacking),
    treeIntegrity: cap(raw.treeIntegrity),
    trackEventOrder: cap(raw.trackEventOrder),
    rebuild: cap(raw.rebuild),
    selectionRoundTrip: cap(raw.selectionRoundTrip),
    eventsSerializerRoundTrip: cap(raw.eventsSerializerRoundTrip),
    treeViewAccounting: cap(raw.treeViewAccounting),
    entriesFilterUndo: cap(raw.entriesFilterUndo),
  };
}

export function formatEventId(event: Trace.Types.Events.Event, serializer: Trace.EventsSerializer.EventsSerializer,
                              minTs: number): string {
  const key = serializer.keyForEvent(event);
  const offsetUs = Math.round(event.ts - minTs);
  return key ? `${event.name}(${key})@${offsetUs}us` : `${event.name}@${offsetUs}us[${event.pid}:${event.tid}]`;
}

export function uniqueTrackNames(groups: readonly PerfUI.FlameChart.Group[]): string[] {
  const counts = new Map<string, number>();
  return groups.map(group => {
    const base = group.name || '(unnamed)';
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  });
}

export function groupEventsByTrack(provider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider):
    Map<string, Trace.Types.Events.Event[]> {
  const {groups} = provider.timelineData();
  const names = uniqueTrackNames(groups);
  const byTrack = new Map<string, Trace.Types.Events.Event[]>();
  groups.forEach((group, i) => {
    const events = provider.groupTreeEvents(group);
    if (events) {
      byTrack.set(names[i], events);
    }
  });
  return byTrack;
}

export function representativeProbes(provider: AnyFlameChartProvider): Array<{index: number, label: string}> {
  const data = provider.timelineData();
  if (!data) {
    return [];
  }
  const names = uniqueTrackNames(data.groups);
  const probes = new Map<string, {index: number, label: string}>();
  for (let index = 0; index < data.entryLevels.length; index++) {
    const level = data.entryLevels[index];
    if (level < 0) {
      continue;
    }
    const groupIdx = data.groups.findLastIndex(g => g.startLevel <= level);
    const eventName = provider.eventByIndex(index)?.name ?? 'no-event';
    const decs = (data.entryDecorations?.[index] ?? []).map(d => d.type).sort().join('+') || '-';
    const label = `${groupIdx >= 0 ? names[groupIdx] : '(no group)'} › ${eventName} | ${decs}`;
    if (!probes.has(label)) {
      probes.set(label, {index, label});
    }
  }
  return [...probes.values()];
}

function entryLabel(provider: AnyFlameChartProvider, index: number, serializer: Trace.EventsSerializer.EventsSerializer,
                    minTs: number): string {
  const event = provider.eventByIndex(index);
  return event ? formatEventId(event, serializer, minTs) : `entry(${JSON.stringify(provider.entryTitle(index) ?? '')})`;
}

/**
 * Verifies that entries assigned to the same flame chart row (`entryLevels[i]`) do not overlap in time,
 * excluding rows that opt into custom overlapping layout (`forceDrawableLevel` for WebSocket events or
 * `getDrawOverride` for LayoutShift cluster markers).
 */
function checkLevelPacking(provider: AnyFlameChartProvider, serializer: Trace.EventsSerializer.EventsSerializer,
                           minTs: number): string[] {
  const data = provider.timelineData();
  if (!data) {
    return [];
  }
  const names = uniqueTrackNames(data.groups);
  const byLevel = new Map<number, number[]>();
  const isNetworkProvider =
      provider instanceof Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;
  for (let i = 0; i < data.entryLevels.length; i++) {
    const level = data.entryLevels[i];
    const forceDrawable = isNetworkProvider && provider.forceDrawableLevel(level);
    const hasOverride = !isNetworkProvider && Boolean(provider.getDrawOverride(i));
    if (level >= 0 && !forceDrawable && !hasOverride) {
      Platform.MapUtilities.getWithDefault(byLevel, level, () => []).push(i);
    }
  }
  const violations: string[] = [];
  for (const [level, entries] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    entries.sort((a, b) => data.entryStartTimes[a] - data.entryStartTimes[b]);
    const g = data.groups.findLastIndex(group => group.startLevel <= level);
    const track = g >= 0 ? `${names[g]} L${level - data.groups[g].startLevel}` : `L${level}`;
    for (let i = 1; i < entries.length; i++) {
      const [prev, curr] = [entries[i - 1], entries[i]];
      if (data.entryStartTimes[prev] + data.entryTotalTimes[prev] >
          data.entryStartTimes[curr] + LEVEL_OVERLAP_TOLERANCE_MS) {
        violations.push(`${track}: ${entryLabel(provider, prev, serializer, minTs)} overlaps ${
            entryLabel(provider, curr, serializer, minTs)}`);
      }
    }
  }
  return violations;
}

/**
 * Verifies two identity round-trips across a representative sample of flame chart entries:
 * 1. Selection round-trip: `entryIndexForSelection(createSelection(index)) === index` (building all selections
 *    before resolving so provider last-selection caches cannot mask mismatches).
 * 2. Serializer key round-trip: `serializer.eventForKey(serializer.keyForEvent(event), parsedTrace) === event`.
 */
function checkRoundTrips(provider: AnyFlameChartProvider, parsedTrace: Trace.TraceModel.ParsedTrace,
                         serializer: Trace.EventsSerializer.EventsSerializer,
                         minTs: number): {selections: string[], keys: string[]} {
  const probes = representativeProbes(provider);
  // Build all selections before resolving so provider last-selection caches cannot mask mismatches.
  const created = probes.flatMap(({index}) => {
    const selection = provider.createSelection(index);
    return selection ? [{index, selection}] : [];
  });
  const selections: string[] = [];
  for (const {index, selection} of created) {
    const resolved = provider.entryIndexForSelection(selection);
    if (resolved !== index) {
      selections.push(`${entryLabel(provider, index, serializer, minTs)} resolved to ${
          resolved === -1 ? 'no entry' : entryLabel(provider, resolved, serializer, minTs)}`);
    }
  }
  const keys: string[] = [];
  for (const {index} of probes) {
    const event = provider.eventByIndex(index);
    if (!event) {
      continue;
    }
    const key = serializer.keyForEvent(event);
    if (!key) {
      keys.push(`${entryLabel(provider, index, serializer, minTs)}: keyForEvent() returned null`);
      continue;
    }
    try {
      const found = serializer.eventForKey(key, parsedTrace);
      if (found !== event) {
        keys.push(`${formatEventId(event, serializer, minTs)}: ${key} -> ${formatEventId(found, serializer, minTs)}`);
      }
    } catch (err) {
      keys.push(`${formatEventId(event, serializer, minTs)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return {selections, keys};
}

/**
 * Walks every Renderer thread tree and CPU sample profile tree in `parsedTrace` to verify that child nodes
 * reference their parent at `depth + 1`, stay within parent `[ts, ts + dur]` bounds, do not overlap preceding
 * siblings, and sum `selfTime + sum(children.dur) === dur`.
 */
function checkTreeIntegrity(parsedTrace: Trace.TraceModel.ParsedTrace,
                            serializer: Trace.EventsSerializer.EventsSerializer, minTs: number): string[] {
  const trees: Array<readonly[string, Trace.Helpers.TreeHelpers.TraceEntryTree]> = [
    ...[...parsedTrace.data.Renderer.processes].flatMap(
        ([pid, p]) => [...p.threads].flatMap(([tid, t]) =>
                                                 t.tree ? [[`Renderer ${pid}:${tid}`, t.tree] as const] : [])),
    ...[...parsedTrace.data.Samples.profilesInProcess].flatMap(
        ([pid, ps]) => [...ps].flatMap(([tid, p]) =>
                                           p.profileTree ? [[`Samples ${pid}:${tid}`, p.profileTree] as const] : [])),
  ];
  const violations: string[] = [];
  const endOf = (e: Trace.Types.Events.Event): number => e.ts + (e.dur ?? 0);
  for (const [label, tree] of trees) {
    const stack = [...tree.roots];
    for (let node = stack.pop(); node; node = stack.pop()) {
      const where = `${label} ${formatEventId(node.entry, serializer, minTs)}`;
      let prevEnd = -Infinity;
      let childrenDur = 0;
      for (const child of node.children) {
        const childId = formatEventId(child.entry, serializer, minTs);
        if (child.parent !== node || child.depth !== node.depth + 1) {
          violations.push(`${where}: child ${childId} has inconsistent parent or depth`);
        }
        if (child.entry.ts < node.entry.ts - TREE_TOLERANCE_MICRO ||
            endOf(child.entry) > endOf(node.entry) + TREE_TOLERANCE_MICRO) {
          violations.push(`${where}: child ${childId} exceeds parent bounds`);
        }
        if (child.entry.ts < prevEnd - TREE_TOLERANCE_MICRO) {
          violations.push(`${where}: child ${childId} overlaps previous sibling`);
        }
        prevEnd = endOf(child.entry);
        childrenDur += child.entry.dur ?? 0;
        stack.push(child);
      }
      const dur = node.entry.dur ?? 0;
      if (node.selfTime !== undefined && Math.abs(dur - node.selfTime - childrenDur) > TREE_TOLERANCE_MICRO) {
        violations.push(`${where}: selfTime ${node.selfTime} + children ${childrenDur} != dur ${dur}`);
      }
    }
  }
  return violations;
}

/**
 * Verifies that the `groupTreeEvents(group)` array supplied to Timeline tree views for each flame chart track
 * is sorted in non-decreasing `ts` order (required by `Trace.Helpers.Trace.forEachEvent`).
 */
function checkTrackEventOrder(byTrack: Map<string, Trace.Types.Events.Event[]>,
                              serializer: Trace.EventsSerializer.EventsSerializer, minTs: number): string[] {
  const violations: string[] = [];
  for (const [track, events] of byTrack) {
    const idx = events.findIndex((e, i) => i > 0 && e.ts < events[i - 1].ts);
    if (idx > 0) {
      violations.push(`${track}: ${formatEventId(events[idx - 1], serializer, minTs)} precedes ${
          formatEventId(events[idx], serializer, minTs)}`);
    }
  }
  return violations;
}

export interface ConfiguredTreeView {
  name: string;
  view: Timeline.TimelineTreeView.TimelineTreeView;
  windowMicros: Trace.Types.Timing.Micro;
}

export function*
    buildTimelineTreeViews(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper,
                           selectedEvents: Trace.Types.Events.Event[],
                           includeGrouped = false): IterableIterator<ConfiguredTreeView> {
  const {AggregatedTimelineTreeView, BottomUpTimelineTreeView, CallTreeTimelineTreeView} = Timeline.TimelineTreeView;
  const {GroupBy} = AggregatedTimelineTreeView;
  const {min: startUs, max: endUs, range: spanUs} = parsedTrace.data.Meta.traceBounds;
  const delegate: Timeline.TimelinePanel.TimelineModeViewDelegate = {
    select() {},
    zoomEvent() {},
    element: document.createElement('div'),
    set3PCheckboxDisabled() {},
    selectEntryAtTime() {},
    highlightEvent() {},
  };
  const grouped = (view: Timeline.TimelineTreeView.AggregatedTimelineTreeView,
                   groupBy: Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy):
                      Timeline.TimelineTreeView.AggregatedTimelineTreeView => {
    view.setGroupBySetting(groupBy);
    return view;
  };
  const specs: Array<[
    string,
    () => Timeline.TimelineTreeView.TimelineTreeView,
    Trace.Types.Timing.Micro,
    Trace.Types.Timing.Micro,
  ]> =
      [
        ['bottomUp', () => grouped(new BottomUpTimelineTreeView(), GroupBy.None), startUs, endUs],
        ...(includeGrouped ?
                [
                  [
                    'bottomUpByCategory',
                    () => grouped(new BottomUpTimelineTreeView(), GroupBy.Category),
                    startUs,
                    endUs,
                  ],
                  ['bottomUpByDomain', () => grouped(new BottomUpTimelineTreeView(), GroupBy.Domain), startUs, endUs],
                ] as
                    Array<[
                      string,
                      () => Timeline.TimelineTreeView.TimelineTreeView,
                      Trace.Types.Timing.Micro,
                      Trace.Types.Timing.Micro,
                    ]>:
                []),
        ['callTree', () => grouped(new CallTreeTimelineTreeView(), GroupBy.None), startUs, endUs],
        ['eventLog', () => new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(delegate), startUs, endUs],
        ['thirdParty', () => new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget(), startUs, endUs],
      ];
  if (spanUs > 0) {
    const zStart = Trace.Types.Timing.Micro(Math.round(startUs + spanUs * SUBWINDOW_START_FRACTION));
    const zEnd = Trace.Types.Timing.Micro(Math.round(startUs + spanUs * SUBWINDOW_END_FRACTION));
    specs.push(['bottomUpZoomed', () => grouped(new BottomUpTimelineTreeView(), GroupBy.None), zStart, zEnd]);
    if (!includeGrouped) {
      specs.push(
          ['callTreeZoomed', () => grouped(new CallTreeTimelineTreeView(), GroupBy.None), zStart, zEnd],
          ['eventLogZoomed', () => new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(delegate), zStart, zEnd],
          ['thirdPartyZoomed', () => new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget(), zStart, zEnd],
      );
    }
  }
  for (const [name, create, rStart, rEnd] of specs) {
    const view = create();
    view.model = {selectedEvents, parsedTrace, entityMapper};
    view.startTime = rStart;
    view.endTime = rEnd;
    yield {name, view, windowMicros: Trace.Types.Timing.Micro(rEnd - rStart)};
  }
}

export function treeNodeLabel(view: Timeline.TimelineTreeView.TimelineTreeView, node: Trace.Extras.TraceTree.Node,
                              minUs: number): string {
  const {AggregatedTimelineTreeView} = Timeline.TimelineTreeView;
  if ((view instanceof AggregatedTimelineTreeView ||
       view instanceof Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget) &&
      node.isGroupNode()) {
    return view.displayInfoForGroupNode(node).name;
  }
  if (typeof node.id === 'symbol') {
    return node.event ?
        `${Timeline.TimelineUIUtils.TimelineUIUtils.eventTitle(node.event)}@${Math.round(node.event.ts - minUs)}us` :
        String(node.id);
  }
  return node.id;
}

/**
 * Builds Bottom-up, Call Tree, Event Log, and 1P/3P tree views over both the full trace window and a zoomed
 * sub-window, verifying that every row has `0 <= selfTime <= totalTime <= windowMicros` and that top-level
 * `selfTime` values sum to at most `windowMicros`.
 */
function checkTreeViewAccounting(
    parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper,
    mainProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider): string[] {
  const selectedGroup = mainProvider.timelineData().selectedGroup;
  const selectedEvents = selectedGroup ? mainProvider.groupTreeEvents(selectedGroup) ?? [] : [];
  if (!selectedEvents.length) {
    return [];
  }
  const minUs = parsedTrace.data.Meta.traceBounds.min;
  const violations: string[] = [];
  for (const {name, view, windowMicros} of buildTimelineTreeViews(parsedTrace, entityMapper, selectedEvents)) {
    let selfSum = 0;
    for (const node of view.buildTree().children().values()) {
      const label = treeNodeLabel(view, node, minUs);
      selfSum += node.selfTime;
      if (node.selfTime < -TREE_TOLERANCE_MICRO || node.selfTime > node.totalTime + TREE_TOLERANCE_MICRO) {
        violations.push(`${name}: ${label} self=${node.selfTime}us total=${node.totalTime}us`);
      } else if (node.totalTime > windowMicros + TREE_TOLERANCE_MICRO) {
        violations.push(`${name}: ${label} total=${node.totalTime}us > ${windowMicros}us`);
      }
    }
    if (selfSum > windowMicros + TREE_TOLERANCE_MICRO) {
      violations.push(`${name}: selfTime sum ${selfSum}us > ${windowMicros}us`);
    }
  }
  return violations;
}

/**
 * Verifies that force-rebuilding `provider.timelineData(true)` in place (as happens after source map resolution
 * or track reconfiguration) produces the same entry count and identical per-track `groupTreeEvents` arrays.
 */
function checkRebuildIdempotence(provider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
                                 firstBuild: Map<string, Trace.Types.Events.Event[]>): string[] {
  const beforeCount = provider.timelineData().entryLevels.length;
  const afterCount = provider.timelineData(true).entryLevels.length;
  const violations =
      afterCount !== beforeCount ? [`rebuilding changed entry count from ${beforeCount} to ${afterCount}`] : [];
  const rebuilt = groupEventsByTrack(provider);
  for (const track of new Set([...firstBuild.keys(), ...rebuilt.keys()])) {
    const [before, after] = [firstBuild.get(track) ?? [], rebuilt.get(track) ?? []];
    if (before.length !== after.length || before.some((e, i) => e !== after[i])) {
      violations.push(`${track}: rebuilding changed tree events (${before.length} -> ${after.length})`);
    }
  }
  return violations;
}

/**
 * Exercises `COLLAPSE_FUNCTION`, `MERGE_FUNCTION`, and `COLLAPSE_REPEATING_DESCENDANTS` on the first eligible
 * flame chart entry and verifies that `UNDO_ALL_ACTIONS` restores the baseline entry count with zero invisible
 * entries left behind.
 */
function checkEntriesFilterUndo(provider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
                                serializer: Trace.EventsSerializer.EventsSerializer, minTs: number): string[] {
  const filter = Timeline.ModificationsManager.ModificationsManager.activeManager()?.getEntriesFilter();
  if (!filter) {
    return [];
  }
  if (filter.invisibleEntries().length) {
    provider.modifyTree(PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS, 0);
  }
  const baseline = provider.timelineData().entryLevels.length;
  let target: Trace.Types.Events.Event|null = null;
  for (let i = 0; i < baseline && !target; i++) {
    const event = provider.eventByIndex(i);
    const actions = event ? filter.findPossibleActions(event) : null;
    if (event && actions?.[PerfUI.FlameChart.FilterAction.MERGE_FUNCTION] &&
        actions[PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION]) {
      target = event;
    }
  }
  if (!target) {
    return [];
  }
  const violations: string[] = [];
  for (const action of [PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION,
                        PerfUI.FlameChart.FilterAction.MERGE_FUNCTION,
                        PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS,
  ]) {
    const idx = provider.indexForEvent(target);
    if (idx === null) {
      continue;
    }
    provider.modifyTree(action, idx);
    provider.modifyTree(PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS, 0);
    const current = provider.timelineData().entryLevels.length;
    if (current !== baseline || filter.invisibleEntries().length) {
      violations.push(`${action} on ${formatEventId(target, serializer, minTs)}: undo left entries=${
          current} invisible=${filter.invisibleEntries().length} (expected ${baseline})`);
    }
  }
  return violations;
}
