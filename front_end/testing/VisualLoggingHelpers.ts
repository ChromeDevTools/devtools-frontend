// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Host from '../core/host/host.js';

function mappedId(id: number, mapping: Map<number, number>): number {
  if (mapping.has(id)) {
    return mapping.get(id) as number;
  }
  const lastId = [...mapping.values()].pop() ?? -1;
  mapping.set(id, lastId + 1);
  return lastId + 1;
}

export function stabilizeImpressions(impressions: Host.InspectorFrontendHostAPI.VisualElementImpression[]):
    Host.InspectorFrontendHostAPI.VisualElementImpression[] {
  const mapping = new Map<number, number>();
  for (const impression of impressions) {
    impression.id = mappedId(impression.id, mapping);
    if (impression.parent) {
      impression.parent = mappedId(impression.parent, mapping);
    }
  }
  return impressions;
}

export function stabilizeEvent<Event extends {veid: number}>(event: Event): Event {
  event.veid = 0;
  return event;
}

export function stabilizeState<State extends {veid: number, parent: State | null}>(
    state: State, mapping: Map<number, number> = new Map()): State {
  const result = {...state, veid: mappedId(state.veid, mapping)};
  if (result.parent) {
    result.parent = stabilizeState(result.parent, mapping);
  }
  return result;
}
