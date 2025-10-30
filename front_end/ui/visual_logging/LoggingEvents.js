// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import { processEventForDebugging, processImpressionsForDebugging } from './Debugging.js';
import { getLoggingState } from './LoggingState.js';
export async function logImpressions(loggables) {
    const impressions = await Promise.all(loggables.map(async (loggable) => {
        const loggingState = getLoggingState(loggable);
        assertNotNullOrUndefined(loggingState);
        const impression = { id: loggingState.veid, type: loggingState.config.ve };
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
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({ impressions });
        processImpressionsForDebugging(loggables.map(l => getLoggingState(l)));
    }
}
export const logResize = (loggable, size) => {
    const loggingState = getLoggingState(loggable);
    if (!loggingState) {
        return;
    }
    loggingState.size = size;
    const resizeEvent = { veid: loggingState.veid, width: loggingState.size.width, height: loggingState.size.height };
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
    processEventForDebugging('Resize', loggingState, { width: Math.round(size.width), height: Math.round(size.height) });
};
export const logClick = (throttler) => (loggable, event, options) => {
    const loggingState = getLoggingState(loggable);
    if (!loggingState) {
        return;
    }
    const clickEvent = { veid: loggingState.veid, doubleClick: Boolean(options?.doubleClick) };
    if (event instanceof MouseEvent && 'sourceCapabilities' in event && event.sourceCapabilities) {
        clickEvent.mouseButton = event.button;
    }
    void throttler.schedule(async () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
        processEventForDebugging('Click', loggingState, { mouseButton: clickEvent.mouseButton, doubleClick: clickEvent.doubleClick });
    }, "Delayed" /* Common.Throttler.Scheduling.DELAYED */);
};
export const logHover = (throttler) => async (event) => {
    const loggingState = getLoggingState(event.currentTarget);
    assertNotNullOrUndefined(loggingState);
    const hoverEvent = { veid: loggingState.veid };
    void throttler.schedule(async () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordHover(hoverEvent);
        processEventForDebugging('Hover', loggingState);
    }, "Delayed" /* Common.Throttler.Scheduling.DELAYED */);
};
export const logDrag = (throttler) => async (event) => {
    const loggingState = getLoggingState(event.currentTarget);
    assertNotNullOrUndefined(loggingState);
    const dragEvent = { veid: loggingState.veid };
    void throttler.schedule(async () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordDrag(dragEvent);
        processEventForDebugging('Drag', loggingState);
    }, "Delayed" /* Common.Throttler.Scheduling.DELAYED */);
};
export async function logChange(loggable) {
    const loggingState = getLoggingState(loggable);
    assertNotNullOrUndefined(loggingState);
    const changeEvent = { veid: loggingState.veid };
    const context = loggingState.pendingChangeContext;
    if (context) {
        changeEvent.context = await contextAsNumber(context);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
    processEventForDebugging('Change', loggingState, { context });
}
let pendingKeyDownContext = null;
export const logKeyDown = (throttler) => async (loggable, event, context) => {
    if (!(event instanceof KeyboardEvent)) {
        return;
    }
    const loggingState = loggable ? getLoggingState(loggable) : null;
    const codes = (typeof loggingState?.config.track?.keydown === 'string') ? loggingState.config.track.keydown : '';
    if (codes.length && !codes.split('|').includes(event.code) && !codes.split('|').includes(event.key)) {
        return;
    }
    const keyDownEvent = { veid: loggingState?.veid };
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
        processEventForDebugging('KeyDown', loggingState, { context });
        pendingKeyDownContext = null;
    });
};
function contextFromKeyCodes(event) {
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
export async function contextAsNumber(context) {
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
export async function logSettingAccess(name, value) {
    let numericValue = undefined;
    let stringValue = undefined;
    if (typeof value === 'string') {
        stringValue = value;
    }
    else if (typeof value === 'number' || typeof value === 'boolean') {
        numericValue = Number(value);
    }
    const nameHash = await contextAsNumber(name);
    if (!nameHash) {
        return;
    }
    const settingAccessEvent = {
        name: nameHash,
        numeric_value: numericValue,
        string_value: await contextAsNumber(stringValue),
    };
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordSettingAccess(settingAccessEvent);
    processEventForDebugging('SettingAccess', null, { name, numericValue, stringValue });
}
export async function logFunctionCall(name, context) {
    const nameHash = await contextAsNumber(name);
    if (typeof nameHash === 'undefined') {
        return;
    }
    const functionCallEvent = { name: nameHash, context: await contextAsNumber(context) };
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordFunctionCall(functionCallEvent);
    processEventForDebugging('FunctionCall', null, { name, context });
}
//# sourceMappingURL=LoggingEvents.js.map