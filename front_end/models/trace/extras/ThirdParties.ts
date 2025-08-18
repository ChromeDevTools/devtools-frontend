// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import * as TraceFilter from './TraceFilter.js';
import * as TraceTree from './TraceTree.js';

export type Entity = typeof ThirdPartyWeb.ThirdPartyWeb.entities[number];

interface BaseSummary {
  entity: Entity;
  transferSize: number;
  mainThreadTime: Types.Timing.Milli;
}

export interface EntitySummary extends BaseSummary {
  relatedEvents: Types.Events.Event[];
}

export interface URLSummary extends BaseSummary {
  url: string;
  request?: Types.Events.SyntheticNetworkRequest;
}

/**
 *
 * Returns Main frame main thread events.
 * These events are inline with the ones used by selectedEvents() of TimelineTreeViews
 */
function collectMainThreadActivity(parsedTrace: Handlers.Types.ParsedTrace): Types.Events.Event[] {
  // TODO: Note b/402658800 could be an issue here.
  const mainFrameMainThread = parsedTrace.Renderer.processes.values()
                                  .find(p => {
                                    const url = p.url ?? '';
                                    // Frame url checked a la CompatibilityTracksAppenders's addThreadAppenders
                                    return p.isOnMainFrame && !url.startsWith('about:') && !url.startsWith('chrome:');
                                  })
                                  ?.threads.values()
                                  .find(t => t.name === 'CrRendererMain');

  if (!mainFrameMainThread) {
    return [];
  }

  return mainFrameMainThread.entries;
}

export function summarizeByThirdParty(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicro): EntitySummary[] {
  const mainThreadEvents = collectMainThreadActivity(parsedTrace).sort(Helpers.Trace.eventTimeComparator);
  const groupingFunction = (event: Types.Events.Event): string => {
    const entity = parsedTrace.Renderer.entityMappings.entityByEvent.get(event);
    return entity?.name ?? '';
  };
  const node = getBottomUpTree(mainThreadEvents, traceBounds, groupingFunction);
  const summaries = summarizeBottomUpByEntity(node, parsedTrace);

  return summaries;
}

/**
 * Used only by Lighthouse.
 */
export function summarizeByURL(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicro): URLSummary[] {
  const mainThreadEvents = collectMainThreadActivity(parsedTrace).sort(Helpers.Trace.eventTimeComparator);
  const groupingFunction = (event: Types.Events.Event): string => {
    return Handlers.Helpers.getNonResolvedURL(event, parsedTrace) ?? '';
  };
  const node = getBottomUpTree(mainThreadEvents, traceBounds, groupingFunction);
  const summaries = summarizeBottomUpByURL(node, parsedTrace);

  return summaries;
}

function summarizeBottomUpByEntity(
    root: TraceTree.BottomUpRootNode, parsedTrace: Handlers.Types.ParsedTrace): EntitySummary[] {
  const summaries: EntitySummary[] = [];

  // Top nodes are the 3P entities.
  const topNodes = [...root.children().values()].flat();
  for (const node of topNodes) {
    if (node.id === '') {
      continue;
    }

    const entity = parsedTrace.Renderer.entityMappings.entityByEvent.get(node.event);
    if (!entity) {
      continue;
    }

    // Lets use the mapper events as our source of events, since we use the main thread to construct
    // the bottom up tree. The mapper will give us all related events.
    const summary: EntitySummary = {
      transferSize: node.transferSize,
      mainThreadTime: Types.Timing.Milli(node.selfTime),
      entity,
      relatedEvents: parsedTrace.Renderer.entityMappings.eventsByEntity.get(entity) ?? [],
    };
    summaries.push(summary);
  }

  return summaries;
}

function summarizeBottomUpByURL(
    root: TraceTree.BottomUpRootNode, parsedTrace: Handlers.Types.ParsedTrace): URLSummary[] {
  const summaries: URLSummary[] = [];
  const allRequests = parsedTrace.NetworkRequests.byTime;

  // Top nodes are URLs.
  const topNodes = [...root.children().values()].flat();
  for (const node of topNodes) {
    if (node.id === '' || typeof node.id !== 'string') {
      continue;
    }

    const entity = parsedTrace.Renderer.entityMappings.entityByEvent.get(node.event);
    if (!entity) {
      continue;
    }

    const url = node.id;
    const request = allRequests.find(r => r.args.data.url === url);

    const summary: URLSummary = {
      request,
      url,
      entity,
      transferSize: node.transferSize,
      mainThreadTime: Types.Timing.Milli(node.selfTime),
    };
    summaries.push(summary);
  }

  return summaries;
}

function getBottomUpTree(
    mainThreadEvents: Types.Events.Event[], tracebounds: Types.Timing.TraceWindowMicro,
    groupingFunction: ((arg0: Types.Events.Event) => string)|null): TraceTree.BottomUpRootNode {
  // Use the same filtering as front_end/panels/timeline/TimelineTreeView.ts.
  const visibleEvents = Helpers.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
  const filter =
      new TraceFilter.VisibleEventsFilter(visibleEvents.concat([Types.Events.Name.SYNTHETIC_NETWORK_REQUEST]));

  // The bottom up root node handles all the "in Tracebounds" checks we need for the insight.
  const startTime = Helpers.Timing.microToMilli(tracebounds.min);
  const endTime = Helpers.Timing.microToMilli(tracebounds.max);
  return new TraceTree.BottomUpRootNode(mainThreadEvents, {
    textFilter: new TraceFilter.ExclusiveNameFilter([]),
    filters: [filter],
    startTime,
    endTime,
    eventGroupIdCallback: groupingFunction,
    calculateTransferSize: true,
    // Ensure we group by 3P alongside eventID for correct 3P grouping.
    forceGroupIdCallback: true,
  });
}
