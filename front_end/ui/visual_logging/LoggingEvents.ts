// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';

import {processEventForDebugging, processImpressionsForDebugging} from './Debugging.js';
import {type Loggable} from './Loggable.js';
import {getLoggingState, type LoggingState} from './LoggingState.js';

export async function logImpressions(loggables: Loggable[]): Promise<void> {
  const impressions = await Promise.all(loggables.map(async loggable => {
    const loggingState = getLoggingState(loggable);
    assertNotNullOrUndefined(loggingState);
    const impression:
        Host.InspectorFrontendHostAPI.VisualElementImpression = {id: loggingState.veid, type: loggingState.config.ve};
    if (typeof loggingState.config.context !== 'undefined') {
      impression.context = await contextAsNumber(loggingState.config.context);
    }
    if (loggingState.parent) {
      impression.parent = loggingState.parent.veid;
    }
    if (loggingState.size) {
      impression.width = Math.round(loggingState.size.width);
      impression.height = Math.round(loggingState.size.height);
    }
    return impression;
  }));
  if (impressions.length) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({impressions});
    processImpressionsForDebugging(loggables.map(l => getLoggingState(l) as LoggingState));
  }
}

export const logResize = (loggable: Loggable, size: DOMRect): void => {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  loggingState.size = size;
  const resizeEvent: Host.InspectorFrontendHostAPI
      .ResizeEvent = {veid: loggingState.veid, width: loggingState.size.width, height: loggingState.size.height};
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
  processEventForDebugging('Resize', loggingState, {width: Math.round(size.width), height: Math.round(size.height)});
};

export const logClick = (throttler: Common.Throttler.Throttler) => (
    loggable: Loggable, event: Event, options?: {doubleClick?: boolean}) => {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  const clickEvent:
      Host.InspectorFrontendHostAPI.ClickEvent = {veid: loggingState.veid, doubleClick: Boolean(options?.doubleClick)};
  if (event instanceof MouseEvent && 'sourceCapabilities' in event && event.sourceCapabilities) {
    clickEvent.mouseButton = event.button;
  }
  void throttler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
    processEventForDebugging(
        'Click', loggingState, {mouseButton: clickEvent.mouseButton, doubleClick: clickEvent.doubleClick});
  });
};

export const logHover = (throttler: Common.Throttler.Throttler) => async (event: Event) => {
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const hoverEvent: Host.InspectorFrontendHostAPI.HoverEvent = {veid: loggingState.veid};
  void throttler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordHover(hoverEvent);
    processEventForDebugging('Hover', loggingState);
  }, Common.Throttler.Scheduling.DELAYED);
};

export const logDrag = (throttler: Common.Throttler.Throttler) => async (event: Event) => {
  const loggingState = getLoggingState(event.currentTarget as Element);
  assertNotNullOrUndefined(loggingState);
  const dragEvent: Host.InspectorFrontendHostAPI.DragEvent = {veid: loggingState.veid};
  void throttler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordDrag(dragEvent);
    processEventForDebugging('Drag', loggingState);
  }, Common.Throttler.Scheduling.DELAYED);
};

export async function logChange(loggable: Loggable): Promise<void> {
  const loggingState = getLoggingState(loggable);
  assertNotNullOrUndefined(loggingState);
  const changeEvent: Host.InspectorFrontendHostAPI.ChangeEvent = {veid: loggingState.veid};
  const context = loggingState.lastInputEventType;
  if (context) {
    changeEvent.context = await contextAsNumber(context);
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
  processEventForDebugging('Change', loggingState, {context});
}

let pendingKeyDownContext: string|null = null;

export const logKeyDown = (throttler: Common.Throttler.Throttler) =>
    async (loggable: Loggable|null, event: Event|null, context?: string) => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  const loggingState = loggable ? getLoggingState(loggable) : null;
  const codes = (typeof loggingState?.config.track?.keydown === 'string') ? loggingState.config.track.keydown : '';
  if (codes.length && !codes.split('|').includes(event.code) && !codes.split('|').includes(event.key)) {
    return;
  }
  const keyDownEvent: Host.InspectorFrontendHostAPI.KeyDownEvent = {veid: loggingState?.veid};
  if (!context && codes?.length) {
    context = contextFromKeyCodes(event);
  }

  if (pendingKeyDownContext && context && pendingKeyDownContext !== context) {
    void throttler.process?.();
  }

  pendingKeyDownContext = context || null;
  void throttler.schedule(async () => {
    if (context) {
      keyDownEvent.context = await contextAsNumber(context);
    }

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordKeyDown(keyDownEvent);
    processEventForDebugging('KeyDown', loggingState, {context});
    pendingKeyDownContext = null;
  });
};

function contextFromKeyCodes(event: Event): string|undefined {
  if (!(event instanceof KeyboardEvent)) {
    return undefined;
  }
  const key = event.key;
  const lowerCaseKey = key.toLowerCase();
  const components = [];
  if (event.shiftKey && key !== lowerCaseKey) {
    components.push('shift');
  }
  if (event.ctrlKey) {
    components.push('ctrl');
  }
  if (event.altKey) {
    components.push('alt');
  }
  if (event.metaKey) {
    components.push('meta');
  }
  components.push(lowerCaseKey);
  return components.join('-');
}

async function contextAsNumber(context: string|undefined): Promise<number|undefined> {
  if (typeof context === 'undefined') {
    return undefined;
  }
  const number = parseInt(context, 10);
  if (!isNaN(number)) {
    return number;
  }
  if (!crypto.subtle) {
    // Layout tests run in an insecure context where crypto.subtle is not available.
    return 0xDEADBEEF;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(context);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return new DataView(digest).getInt32(0, true);
}
