// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
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

export function logClick(event: Event): void {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  const loggingState = getLoggingState(event.currentTarget as Element);
  const clickEvent: Host.InspectorFrontendHostAPI.ClickEvent = {veid: loggingState.veid, mouseButton: event.button};
  if (loggingState.config.context) {
    clickEvent.context = loggingState.config.context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
}

export function logChange(event: Event): void {
  const loggingState = getLoggingState(event.currentTarget as Element);
  const changeEvent: Host.InspectorFrontendHostAPI.ChangeEvent = {veid: loggingState.veid};
  if (loggingState.config.context) {
    changeEvent.context = loggingState.config.context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
}

export const logKeyDown = (codes: string[], keyboardLogThrottler: Common.Throttler.Throttler) =>
    (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      if (codes.length && !codes.includes(event.code)) {
        return;
      }
      const loggingState = getLoggingState(event.currentTarget as Element);
      const keyDownEvent: Host.InspectorFrontendHostAPI.KeyDownEvent = {veid: loggingState.veid};
      if (loggingState.config.context) {
        keyDownEvent.context = loggingState.config.context;
      }
      void keyboardLogThrottler.schedule(async () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordKeyDown(keyDownEvent);
      });
    };
