// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';

import {type Loggable} from './Loggable.js';
import {getLoggingState} from './LoggingState.js';

export async function logImpressions(loggables: Loggable[]): Promise<void> {
  const impressions = await Promise.all(loggables.map(async loggable => {
    const loggingState = getLoggingState(loggable);
    assertNotNullOrUndefined(loggingState);
    const impression:
        Host.InspectorFrontendHostAPI.VisualElementImpression = {id: loggingState.veid, type: loggingState.config.ve};
    if (loggingState.parent) {
      impression.parent = loggingState.parent.veid;
    }
    const context = await loggingState.context(loggable);
    if (context) {
      impression.context = context;
    }
    if (loggingState.size) {
      impression.width = loggingState.size.width;
      impression.height = loggingState.size.height;
    }
    return impression;
  }));
  if (impressions.length) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({impressions});
  }
}

export const logResize = (resizeLogThrottler: Common.Throttler.Throttler) => async (loggable: Loggable) => {
  const loggingState = getLoggingState(loggable);
  if (!loggingState || !loggingState.size) {
    return;
  }
  const resizeEvent: Host.InspectorFrontendHostAPI
      .ResizeEvent = {veid: loggingState.veid, width: loggingState.size.width, height: loggingState.size.height};
  await resizeLogThrottler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
  });
};

export async function logClick(loggable: Loggable, event: Event, options?: {doubleClick?: boolean}): Promise<void> {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  const clickEvent: Host.InspectorFrontendHostAPI
      .ClickEvent = {veid: loggingState.veid, mouseButton: event.button, doubleClick: Boolean(options?.doubleClick)};
  const context = await loggingState.context(event);
  if (context) {
    clickEvent.context = context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
}

export const logHover = (hoverLogThrottler: Common.Throttler.Throttler) => async (event: Event) => {
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const hoverEvent: Host.InspectorFrontendHostAPI.HoverEvent = {veid: loggingState.veid};
  const contextPromise = loggingState.context(event);
  await hoverLogThrottler.schedule(async () => {
    const context = await contextPromise;
    if (context) {
      hoverEvent.context = context;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordHover(hoverEvent);
  });
};

export const logDrag = (dragLogThrottler: Common.Throttler.Throttler) => async (event: Event) => {
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const dragEvent: Host.InspectorFrontendHostAPI.DragEvent = {veid: loggingState.veid};
  const contextPromise = loggingState.context(event);
  await dragLogThrottler.schedule(async () => {
    const context = await contextPromise;
    if (context) {
      dragEvent.context = context;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordDrag(dragEvent);
  });
};

export async function logChange(event: Event): Promise<void> {
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const changeEvent: Host.InspectorFrontendHostAPI.ChangeEvent = {veid: loggingState.veid};
  const context = await loggingState.context(event);
  if (context) {
    changeEvent.context = context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
}

export const logKeyDown = (codes: string[], keyboardLogThrottler: Common.Throttler.Throttler) =>
    async (event: Event) => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  if (codes.length && !codes.includes(event.code)) {
    return;
  }
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const keyDownEvent: Host.InspectorFrontendHostAPI.KeyDownEvent = {veid: loggingState.veid};
  const context = await loggingState.context(event);
  if (context) {
    keyDownEvent.context = context;
  }
  await keyboardLogThrottler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordKeyDown(keyDownEvent);
  });
};
