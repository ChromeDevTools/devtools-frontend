// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';

import {showDebugPopoverForEvent} from './Debugging.js';
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

export async function logResize(
    loggable: Loggable, size: DOMRect, resizeLogThrottler?: Common.Throttler.Throttler): Promise<void> {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  loggingState.size = size;
  const resizeEvent: Host.InspectorFrontendHostAPI
      .ResizeEvent = {veid: loggingState.veid, width: loggingState.size.width, height: loggingState.size.height};
  if (resizeLogThrottler) {
    await resizeLogThrottler.schedule(async () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
      showDebugPopoverForEvent('Resize', loggingState?.config);
    });
  } else {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
    showDebugPopoverForEvent('Resize', loggingState?.config);
  }
}

export async function logClick(loggable: Loggable, event: Event, options?: {doubleClick?: boolean}): Promise<void> {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  const button = event instanceof MouseEvent ? event.button : 0;
  const clickEvent: Host.InspectorFrontendHostAPI
      .ClickEvent = {veid: loggingState.veid, mouseButton: button, doubleClick: Boolean(options?.doubleClick)};
  const context = await loggingState.context(event);
  if (context) {
    clickEvent.context = context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
  showDebugPopoverForEvent('Click', loggingState?.config);
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
    showDebugPopoverForEvent('Hover', loggingState?.config);
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
    showDebugPopoverForEvent('Drag', loggingState?.config);
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
  showDebugPopoverForEvent('Change', loggingState?.config);
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
    showDebugPopoverForEvent('KeyDown', loggingState?.config);
  });
};
