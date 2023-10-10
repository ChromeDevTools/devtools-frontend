// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';

import {getLoggingState} from './LoggingState.js';

export function logImpressions(elements: Element[]): void {
  const impressions: Host.InspectorFrontendHostAPI.VisualElementImpression[] = [];
  for (const element of elements) {
    const loggingState = getLoggingState(element);
    const impression:
        Host.InspectorFrontendHostAPI.VisualElementImpression = {id: loggingState.veid, type: loggingState.config.ve};
    if (loggingState.parent) {
      impression.parent = loggingState.parent.veid;
    }
    if (loggingState.config.context) {
      impression.context = loggingState.config.context;
    }
    impressions.push(impression);
  }
  if (impressions.length) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({impressions});
  }
}
