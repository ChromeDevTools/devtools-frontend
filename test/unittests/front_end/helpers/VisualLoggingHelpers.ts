// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Host from '../../../../front_end/core/host/host.js';

export function stabilizeImpressions(impressions: Host.InspectorFrontendHostAPI.VisualElementImpression[]):
    Host.InspectorFrontendHostAPI.VisualElementImpression[] {
  const baseId = impressions[0].id;
  for (const impression of impressions) {
    impression.id -= baseId;
    if (impression.parent) {
      impression.parent -= baseId;
    }
  }
  return impressions;
}

export function stabilizeEvent<Event extends {veid: number}>(event: Event): Event {
  event.veid = 0;
  return event;
}

export function stabilizeState<State extends {veid: number, parent: State | null}>(
    state: State, baseId?: number): State {
  if (!baseId) {
    baseId = state.veid;
  }
  const result = {...state, veid: state.veid - baseId};
  if (result.parent) {
    result.parent = stabilizeState(result.parent, baseId);
  }
  return result;
}
