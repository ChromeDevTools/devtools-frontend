// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Captures a deterministic JSON snapshot of everything the Trace Engine and Performance panel derive from a
 * trace, for local before/after refactor diffs (scripts/trace/snapshots). Snapshots are never checked into git.
 */

import * as Platform from '../../core/platform/platform.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Trace from '../../models/trace/trace.js';
// eslint-disable-next-line @devtools/es-modules-import
import {cleanTextContent} from '../../testing/DOMHelpers.js';
import * as LegacyComponents from '../../ui/legacy/components/utils/utils.js';
import {render, type TemplateResult} from '../../ui/lit/lit.js';

// Imported via the module entrypoint because this file lives in the unittests target; a relative import would load a
// duplicate copy of ModificationsManager in bundled Release builds.
// eslint-disable-next-line @devtools/es-modules-import
import * as Timeline from './timeline.js';
import {
  buildTimelineTreeViews,
  checkTimelineInvariants,
  formatEventId,
  groupEventsByTrack,
  representativeProbes,
  type TimelineInvariants,
  treeNodeLabel,
  uniqueTrackNames,
} from './TimelineInvariants.js';

export type JsonValue = string|number|boolean|null|JsonValue[]|JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Deterministic summary of a single flame chart data provider (main or network). */
export interface FlameChartSnapshot {
  /** Entry count, max stack depth, total duration in microseconds, and selected group name. */
  summary: string;
  /** Distinct font strings referenced by `entryFont(i)`, indexed as `font0`, `font1`, etc. */
  fonts: string[];
  /** One summary line per `PerfUI.FlameChart.Group` (nesting, visibility, entry and tree-event counts). */
  groups: string[];
  /** Sorted `TimelineFlameChartMarker` start offsets and colors. */
  markers: string[];
  /** Per-track equivalence-class signatures collapsing entries that share level and visual styling. */
  levels: Record<string, string[]>;
  /** Recorded canvas operations (`decorateEntry` and `getDrawOverride`) keyed by archetype appearance. */
  drawings: Record<string, string>;
  /** Initiator-to-initiated flow arrows produced by `buildFlowForInitiator(i)`. */
  initiators: JsonValue;
  /** Per-track `groupTreeEvents(group)` event IDs (main flame chart only). */
  treeEvents?: Record<string, JsonValue>;
  /** Rendered popover text for one representative entry per `(track, eventName, decorations)` tuple. */
  popovers?: Record<string, string>;
  /** Active `EntriesFilter` hidden/expandable entry modifications (main flame chart only). */
  modifications?: Trace.Types.File.Modifications['entriesModifications']|null;
}

/** Complete snapshot of a single trace across invariants, trace engine, flame charts, and details/tree views. */
export interface TraceSnapshot {
  /** Structural invariant violations (empty arrays when all invariants hold). */
  invariants: TimelineInvariants;
  /** Formatted trace/network/extension summaries and insight models/overlays. */
  engine: {summary: string, insights: JsonObject};
  /** Main and network flame chart snapshots. */
  flamechart: {main: FlameChartSnapshot, network: FlameChartSnapshot};
  /** Details pane rows per event name and Bottom-up / Call Tree / Event Log / 1P-3P tree rows. */
  ui: {details: JsonObject, trees: JsonObject};
}

export interface SnapshotOptions {
  /** Collections larger than this keep their size and head items. Pass Infinity for a full dump. */
  collectionLimit?: number;
}

type AnyFlameChartProvider = Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider|
                             Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;

const DEFAULT_COLLECTION_LIMIT = 250;
const SUMMARY_HEAD_LENGTH = 20;
const PX_PER_MS = 10;
const BAR_HEIGHT = 17;
const GLYPH_WIDTH = 6;
const MAX_EXPANDED_NODES = 3;
const MAX_EXPANDED_CHILDREN = 5;

/**
 * Captures a deterministic `TraceSnapshot` from a parsed trace, exercising the trace engine insights,
 * main and network flame chart providers, canvas entry rendering, details pane, tree views, and structural invariants.
 */
export async function captureTraceSnapshot(
    parsedTrace: Trace.TraceModel.ParsedTrace,
    {collectionLimit = DEFAULT_COLLECTION_LIMIT}: SnapshotOptions = {}): Promise<TraceSnapshot> {
  const minTs = parsedTrace.data.Meta.traceBounds.min;
  const serializer = new Trace.EventsSerializer.EventsSerializer();
  const engine = captureEngine(parsedTrace, serializer, minTs);

  const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
  const mainProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  const networkProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
  mainProvider.setModel(parsedTrace, entityMapper);
  networkProvider.setModel(parsedTrace, entityMapper);

  await Timeline.Utils.ImageCache.preload(
      Trace.Extras.FilmStrip.fromHandlerData(parsedTrace.data).frames.map(f => f.screenshotEvent));

  const mainSnapshot = captureFlameChart(mainProvider, parsedTrace, serializer, minTs, collectionLimit);
  const networkSnapshot = captureFlameChart(networkProvider, parsedTrace, serializer, minTs, collectionLimit);

  const selectedGroup = mainProvider.timelineData().selectedGroup;
  const selectedEvents = selectedGroup ? mainProvider.groupTreeEvents(selectedGroup) ?? [] : [];
  const trees = captureTreeViews(parsedTrace, entityMapper, selectedEvents, collectionLimit);
  const details = await captureDetails(parsedTrace, entityMapper, mainProvider);

  // Runs last because rebuild and EntriesFilter checks mutate mainProvider in place.
  const invariants = checkTimelineInvariants({parsedTrace, entityMapper, mainProvider, networkProvider});

  return {
    invariants,
    engine,
    flamechart: {main: mainSnapshot, network: networkSnapshot},
    ui: {details, trees},
  };
}

/**
 * Returns an unsigned 32-bit hex digest of `text` via `Platform.StringUtilities.hashCode`, used to fingerprint
 * per-level entry timestamp lists and truncated strings without storing thousands of raw items.
 */
function shortHash(text: string): string {
  return (Platform.StringUtilities.hashCode(text) >>> 0).toString(16);
}

function capList<T>(items: T[], limit: number): T[]|{
  $size: number, $head: T[],
}
{
  return items.length <= limit ? items : {$size: items.length, $head: items.slice(0, SUMMARY_HEAD_LENGTH)};
}

function sortAndCapEntries<V>(entries: Iterable<[string, V]>, limit = Infinity): Record<string, V>|{
  $size: number, $head: Record<string, V>,
}
{
  const sorted = [...entries].sort((a, b) => Platform.StringUtilities.compare(a[0], b[0]));
  return sorted.length <= limit ?
      Object.fromEntries(sorted) :
      {$size: sorted.length, $head: Object.fromEntries(sorted.slice(0, SUMMARY_HEAD_LENGTH))};
}

function isTraceEvent(v: unknown): v is Trace.Types.Events.Event {
  return Boolean(v && typeof v === 'object' && 'name' in v && typeof v.name === 'string' && 'ph' in v &&
                 typeof v.ph === 'string' && 'ts' in v && typeof v.ts === 'number');
}

/**
 * Captures formatted trace summaries and insight models/overlays via `PerformanceTraceFormatter` and
 * `PerformanceInsightFormatter`.
 */
function captureEngine(parsedTrace: Trace.TraceModel.ParsedTrace, serializer: Trace.EventsSerializer.EventsSerializer,
                       minTs: Trace.Types.Timing.Micro): {summary: string, insights: JsonObject} {
  let summary = '';
  const insights: JsonObject = {};
  if (parsedTrace.insights?.size) {
    const focus = AiAssistance.AIContext.AgentFocus.fromParsedTrace(parsedTrace);
    const traceFormatter = new AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter(focus);
    const {traceBounds} = parsedTrace.data.Meta;
    summary = [
      traceFormatter.formatTraceSummary(),
      traceFormatter.formatNetworkTrackSummary(traceBounds),
      traceFormatter.formatExtensionTrackSummary(traceBounds),
    ].join('\n\n');

    for (const [id, insightSet] of parsedTrace.insights) {
      const models: JsonObject = {};
      for (const [name, model] of Object.entries(insightSet.model)) {
        if (!model) {
          continue;
        }
        const formatter = new AiAssistance.PerformanceInsightFormatter.PerformanceInsightFormatter(focus, model);
        models[name] = {
          state: model.state,
          formatted: formatter.insightIsSupported() ? formatter.formatInsight() : '',
          overlays: (model.createOverlays?.() ?? [])
                        .map(o => JSON.stringify(
                                 o, (_k, v: unknown) => isTraceEvent(v) ? formatEventId(v, serializer, minTs) : v)),
        };
      }
      insights[id] = {url: insightSet.url.href, frameId: insightSet.frameId, models};
    }
  }
  return {summary, insights};
}

interface LevelSignature {
  key: string;
  groupIdx: number;
  relLevel: number;
  totalUs: number;
  minStartUs: number;
  maxEndUs: number;
  parts: string[];
}

/**
 * Summarizes a flame chart provider into per-level equivalence classes, canvas drawing transcripts, initiator flows,
 * popovers, and `ModificationsManager` filter state.
 */
function captureFlameChart(provider: AnyFlameChartProvider, parsedTrace: Trace.TraceModel.ParsedTrace,
                           serializer: Trace.EventsSerializer.EventsSerializer, minTs: Trace.Types.Timing.Micro,
                           limit: number): FlameChartSnapshot {
  const data = provider.timelineData();
  if (!data) {
    throw new Error('Flame chart data provider returned no timeline data');
  }
  const isMainProvider = provider instanceof Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider;
  const minMs = Trace.Helpers.Timing.microToMilli(minTs);
  const toRoundedMicros = (ms: number): number =>
      Math.round(Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(ms)));
  const trackNames = uniqueTrackNames(data.groups);
  const fonts: string[] = [];
  const fontIndex = (f: string): number => {
    const idx = fonts.indexOf(f);
    return idx === -1 ? fonts.push(f) - 1 : idx;
  };
  const signatures = new Map<string, LevelSignature>();
  const drawings = new Map<string, string>();
  const recorder = new CanvasRecorder();

  for (let i = 0; i < data.entryLevels.length; i++) {
    const level = data.entryLevels[i];
    if (level < 0) {
      continue;
    }
    const event = provider.eventByIndex(i);
    const groupIdx = data.groups.findLastIndex(g => g.startLevel <= level);
    const relLevel = level - (groupIdx >= 0 ? data.groups[groupIdx].startLevel : 0);
    const title = provider.entryTitle(i) ?? '';
    const decorations = data.entryDecorations?.[i] ?? [];
    const decTypes = decorations.map(d => d.type).sort().join('+') || '-';
    const forced = provider.forceDecoration(i);
    const hasOverride = isMainProvider && Boolean(provider.getDrawOverride(i));
    const appearance = [
      JSON.stringify(title),
      `bg=${provider.entryColor(i) || '-'}`,
      `fg=${provider.textColor(i) || '-'}`,
      `font${fontIndex(provider.entryFont(i) ?? '-')}`,
      forced ? 'forced' : '-',
      decTypes,
      hasOverride ? 'drawOverride' : '-',
      event?.name ?? 'no-event',
    ].join(' | ');
    const key = `L${relLevel} | ${appearance}`;
    const mapKey = `${groupIdx}:${key}`;
    let sig = signatures.get(mapKey);
    const isArchetype = !sig;
    if (!sig) {
      sig = {
        key,
        groupIdx,
        relLevel,
        totalUs: 0,
        minStartUs: Infinity,
        maxEndUs: -Infinity,
        parts: [],
      };
      signatures.set(mapKey, sig);
    }

    const startMs = data.entryStartTimes[i];
    const durMs = data.entryTotalTimes[i];
    const isMarker = Number.isNaN(durMs);
    const startUs = toRoundedMicros(startMs - minMs);
    const durUs = isMarker ? 0 : toRoundedMicros(durMs);
    sig.totalUs += durUs;
    sig.minStartUs = Math.min(sig.minStartUs, startUs);
    sig.maxEndUs = Math.max(sig.maxEndUs, startUs + durUs);
    let part = `${startUs}/${isMarker ? 'marker' : durUs}${decorations.map(d => JSON.stringify(d)).join('')}`;
    if (!isMarker && (forced || hasOverride || isArchetype)) {
      const drawing = recorder.record(provider, i, title, startMs, durMs);
      if (drawing) {
        part += ` ${shortHash(drawing)}`;
        const trackName = groupIdx >= 0 ? trackNames[groupIdx] : '(no group)';
        const drawKey = `${trackName} › ${appearance}`;
        if (isArchetype && !drawings.has(drawKey)) {
          drawings.set(drawKey, drawing);
        }
      }
    }
    sig.parts.push(part);
  }

  const entriesByGroup = new Map<number, number>();
  for (const sig of signatures.values()) {
    entriesByGroup.set(sig.groupIdx, (entriesByGroup.get(sig.groupIdx) ?? 0) + sig.parts.length);
  }
  const groups = data.groups.map((g, idx) => {
    const treeCount = isMainProvider ? provider.groupTreeEvents(g)?.length : undefined;
    return `${trackNames[idx]} | startLevel=${g.startLevel} nesting=${g.style.nestingLevel} expanded=${
        Boolean(g.expanded)} hidden=${Boolean(g.hidden)} selectable=${Boolean(g.selectable)} height=${
        g.style.height} entries=${entriesByGroup.get(idx) ?? 0} treeEvents=${treeCount ?? '-'}`;
  });
  const markers = data.markers.map(m => `${m.title() ?? '-'}@${toRoundedMicros(m.startTime() - minMs)}us ${m.color()}`)
                      .sort(Platform.StringUtilities.compare);

  const levels = new Map<string, string[]>();
  const sortedSigs = [...signatures.values()].sort((a, b) => a.groupIdx - b.groupIdx || a.relLevel - b.relLevel ||
                                                       Platform.StringUtilities.compare(a.key, b.key));
  for (const sig of sortedSigs) {
    const trackName = sig.groupIdx >= 0 ? trackNames[sig.groupIdx] : '(no group)';
    const hash = shortHash([...sig.parts].sort().join('\n'));
    const line =
        `${sig.key} | n=${sig.parts.length} dur=${sig.totalUs}us span=${sig.minStartUs}..${sig.maxEndUs}us #${hash}`;
    Platform.MapUtilities.getWithDefault(levels, trackName, () => []).push(line);
  }

  const {eventToInitiator, initiatorToEvents} = parsedTrace.data.Initiators;
  const base: FlameChartSnapshot = {
    summary: `entries=${data.entryLevels.length} maxStackDepth=${provider.maxStackDepth()} totalTime=${
        toRoundedMicros(provider.totalTime())}us selectedGroup=${data.selectedGroup?.name ?? '-'}`,
    fonts,
    groups,
    markers,
    levels: Object.fromEntries(levels),
    drawings: sortAndCapEntries(drawings) as Record<string, string>,
    initiators: captureInitiators(
        provider, serializer, minTs, limit,
        isMainProvider ? e => eventToInitiator.has(e) || initiatorToEvents.has(e) : () => true, isMainProvider),
  };
  if (!isMainProvider) {
    return base;
  }
  const trackEvents = groupEventsByTrack(provider);
  return {
    ...base,
    treeEvents: Object.fromEntries([...trackEvents].map(
        ([track, events]) => [track, capList(events.map(e => formatEventId(e, serializer, minTs)), limit)])),
    popovers: Object.fromEntries(representativeProbes(provider).map(
        ({index, label}) => [label, popoverText(provider.preparePopoverElement(index))])),
    modifications:
        Timeline.ModificationsManager.ModificationsManager.activeManager()?.toJSON().entriesModifications ?? null,
  };
}

/**
 * Records canvas operations issued by both `getDrawOverride()` and `decorateEntry()` with deterministic font metrics.
 * Entries are drawn from `x=0, y=0` at `PX_PER_MS` so recorded coordinates are relative to the entry's start.
 */
class CanvasRecorder {
  readonly #target: CanvasRenderingContext2D;
  readonly #calls: string[] = [];
  readonly context: CanvasRenderingContext2D;

  constructor() {
    const target = document.createElement('canvas').getContext('2d');
    if (!target) {
      throw new Error('2D canvas contexts are unavailable');
    }
    this.#target = target;
    const calls = this.#calls;
    this.context = new Proxy(target, {
      get(obj, prop) {
        if (prop === 'measureText') {
          return (text: string) => ({width: text.length * GLYPH_WIDTH});
        }
        const val = Reflect.get(obj, prop);
        if (typeof val !== 'function') {
          return val;
        }
        return (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.map(formatCanvasValue).join(',')})`);
          return Reflect.apply(val, obj, args);
        };
      },
      set(obj, prop, val) {
        calls.push(`${String(prop)}=${formatCanvasValue(val)}`);
        return Reflect.set(obj, prop, val);
      },
    });
  }

  record(chart: AnyFlameChartProvider, index: number, title: string, startMs: number, durationMs: number): string|null {
    this.#target.reset();
    this.#calls.length = 0;
    const width = durationMs * PX_PER_MS;
    const override = chart instanceof Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider ?
        chart.getDrawOverride(index) :
        undefined;
    if (override) {
      const pos = override(this.context, 0, 0, width, BAR_HEIGHT, ms => (ms - startMs) * PX_PER_MS, color => color);
      const z = pos.z !== undefined ? `,z=${pos.z}` : '';
      return `override pos(${formatCanvasValue(pos.x)},${formatCanvasValue(pos.width)}${z}): ${this.#calls.join(' ')}`;
    }
    const drew = chart.decorateEntry(index, this.context, title, 0, 0, width, BAR_HEIGHT, 0, PX_PER_MS, color => color);
    if (!drew && this.#calls.length === 0) {
      return null;
    }
    return `${drew ? 'drawn' : 'declined'}: ${this.#calls.join(' ')}`;
  }
}

function formatCanvasValue(value: unknown): string {
  if (typeof value === 'number') {
    return String(Math.round(value * 100) / 100);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatCanvasValue).join(',')}]`;
  }
  if (value instanceof HTMLImageElement) {
    return `image(${value.naturalWidth}x${value.naturalHeight})`;
  }
  if (value instanceof CanvasPattern) {
    return 'pattern';
  }
  return typeof value;
}

/**
 * Probes `buildFlowForInitiator(i)` across matching entries and returns sorted `initiator -> event` flow arrows.
 */
function captureInitiators(provider: AnyFlameChartProvider, serializer: Trace.EventsSerializer.EventsSerializer,
                           minTs: number, limit: number, shouldProbe: (e: Trace.Types.Events.Event) => boolean,
                           includeEmpty: boolean): JsonValue {
  const data = provider.timelineData();
  if (!data) {
    return {};
  }
  const labelOf = (idx: number): string => {
    const ev = provider.eventByIndex(idx);
    return ev ? formatEventId(ev, serializer, minTs) : `entry(${idx})`;
  };
  const flows: Array<[string, JsonValue]> = [];
  for (let i = 0; i < data.entryLevels.length; i++) {
    const event = provider.eventByIndex(i);
    if (!event || !shouldProbe(event)) {
      continue;
    }
    provider.buildFlowForInitiator(i);
    const arrows =
        provider.timelineData()?.initiatorsData.map(
            a => `${labelOf(a.initiatorIndex)} -> ${labelOf(a.eventIndex)}${
                a.isInitiatorHidden ? ' (initiator hidden)' : ''}${a.isEntryHidden ? ' (entry hidden)' : ''}`) ??
        [];
    if (arrows.length || includeEmpty) {
      flows.push([labelOf(i), arrows]);
    }
  }
  provider.buildFlowForInitiator(-1);
  return sortAndCapEntries(flows, limit);
}

/** Renders a flame chart popover `TemplateResult` and joins its child row text. */
function popoverText(popover: TemplateResult|null): string {
  if (!popover) {
    return '-';
  }
  const host = document.createElement('div');
  // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
  render(popover, host);
  const container = host.querySelector('.timeline-flamechart-popover');
  return container ?
      Array.from(container.children, el => cleanTextContent(el.textContent ?? '')).filter(Boolean).join(' | ') :
      '-';
}

/**
 * Renders `TimelineUIUtils.buildTraceEventDetails` for the first flame chart entry of each distinct `event.name`
 * and extracts its title, category, color, and key/value detail rows.
 */
async function captureDetails(
    parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper,
    provider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider): Promise<JsonObject> {
  const byName = new Map<string, Trace.Types.Events.Event>();
  const count = provider.timelineData().entryLevels.length;
  for (let i = 0; i < count; i++) {
    const event = provider.eventByIndex(i);
    if (event && !byName.has(event.name)) {
      byName.set(event.name, event);
    }
  }
  const linkifier = new LegacyComponents.Linkifier.Linkifier();
  const {TimelineUIUtils} = Timeline.TimelineUIUtils;
  const out: Array<[string, JsonValue]> = [];
  try {
    for (const [name, event] of byName) {
      const header = `title=${JSON.stringify(TimelineUIUtils.eventTitle(event))} category=${
          TimelineUIUtils.eventStyle(event).category.name} color=${TimelineUIUtils.eventColor(event)}`;
      const fragment = await TimelineUIUtils.buildTraceEventDetails(parsedTrace, event, linkifier, false, entityMapper);
      const rows = Array.from(fragment.querySelectorAll('.timeline-details-view-row'), row => {
        const title = cleanTextContent(row.querySelector('.timeline-details-view-row-title')?.textContent ?? '');
        const value = cleanTextContent(
            (row.querySelector('.timeline-details-view-row-value')?.textContent ?? row.textContent) ?? '');
        return title ? `${title}: ${value}` : value;
      });
      out.push([name, [header, ...rows]]);
    }
  } finally {
    linkifier.dispose();
  }
  return sortAndCapEntries(out) as JsonObject;
}

/**
 * Builds the core Timeline tree views (Bottom-up, grouped Bottom-up, Call Tree, Event Log, 1P/3P, and zoomed
 * Bottom-up) and formats their top-level rows plus expanded children.
 */
function captureTreeViews(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper,
                          selectedEvents: Trace.Types.Events.Event[], limit: number): JsonObject {
  const minUs = parsedTrace.data.Meta.traceBounds.min;
  const roundMs = (ms: number): string => (Math.abs(ms) < 0.005 ? 0 : ms).toFixed(2);
  const trees: JsonObject = {};

  for (const {name, view} of buildTimelineTreeViews(parsedTrace, entityMapper, selectedEvents, true)) {
    const sortNodes = (nodes: Iterable<Trace.Extras.TraceTree.Node>): Trace.Extras.TraceTree.Node[] => [...nodes].sort(
        (a, b) => b.selfTime - a.selfTime || b.totalTime - a.totalTime ||
            Platform.StringUtilities.compare(treeNodeLabel(view, a, minUs), treeNodeLabel(view, b, minUs)));
    const formatNode = (node: Trace.Extras.TraceTree.Node): string => {
      const transfer = node.transferSize ? ` transfer=${node.transferSize}` : '';
      const selfMs = Trace.Helpers.Timing.microToMilli(node.selfTime);
      const totalMs = Trace.Helpers.Timing.microToMilli(node.totalTime);
      return `${treeNodeLabel(view, node, minUs)} | self=${roundMs(selfMs)}ms total=${roundMs(totalMs)}ms${transfer}${
          node.hasChildren() ? ' | has children' : ''}`;
    };
    const rows: string[] = [];
    sortNodes(view.buildTree().children().values()).forEach((node, idx) => {
      rows.push(formatNode(node));
      if (idx < MAX_EXPANDED_NODES && node.hasChildren()) {
        for (const child of sortNodes(node.children().values()).slice(0, MAX_EXPANDED_CHILDREN)) {
          rows.push(`  › ${formatNode(child)}`);
        }
      }
    });
    trees[name] = capList(rows, limit);
  }
  return trees;
}
