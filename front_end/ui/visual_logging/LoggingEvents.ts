// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';

import {getLoggingState} from './LoggingState.js';

export async function logImpressions(elements: Element[]): Promise<void> {
  const impressions = await Promise.all(elements.map(async element => {
    const loggingState = getLoggingState(element);
    const impression:
        Host.InspectorFrontendHostAPI.VisualElementImpression = {id: loggingState.veid, type: loggingState.config.ve};
    if (loggingState.parent) {
      impression.parent = loggingState.parent.veid;
    }
    const context = await loggingState.context(element);
    if (context) {
      impression.context = context;
    }
    return impression;
  }));
  if (impressions.length) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({impressions});
  }
}

export async function logClick(event: Event, options?: {doubleClick: boolean}): Promise<void> {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  const loggingState = getLoggingState(event.currentTarget as Element);
  const clickEvent: Host.InspectorFrontendHostAPI
      .ClickEvent = {veid: loggingState.veid, mouseButton: event.button, doubleClick: Boolean(options?.doubleClick)};
  const context = await loggingState.context(event);
  if (context) {
    clickEvent.context = context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
}

export const logHover = (hoverLogThrottler: Common.Throttler.Throttler) => async(event: Event): Promise<void> => {
  const loggingState = getLoggingState(event.currentTarget as Element);
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

export const logDrag = (dragLogThrottler: Common.Throttler.Throttler) => async(event: Event): Promise<void> => {
  const loggingState = getLoggingState(event.currentTarget as Element);
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
  const changeEvent: Host.InspectorFrontendHostAPI.ChangeEvent = {veid: loggingState.veid};
  const context = await loggingState.context(event);
  if (context) {
    changeEvent.context = context;
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
}

export const logKeyDown = (codes: string[], keyboardLogThrottler: Common.Throttler.Throttler) =>
    async(event: Event): Promise<void> => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  if (codes.length && !codes.includes(event.code)) {
    return;
  }
  const loggingState = getLoggingState(event.currentTarget as Element);
  const keyDownEvent: Host.InspectorFrontendHostAPI.KeyDownEvent = {veid: loggingState.veid};
  const context = await loggingState.context(event);
  if (context) {
    keyDownEvent.context = context;
  }
  await keyboardLogThrottler.schedule(async () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordKeyDown(keyDownEvent);
  });
};
