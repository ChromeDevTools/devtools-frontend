// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';
import { processForDebugging, processStartLoggingForDebugging } from './Debugging.js';
import { getDomState, visibleOverlap } from './DomState.js';
import { getLoggingConfig } from './LoggingConfig.js';
import { logChange, logClick, logDrag, logHover, logImpressions, logKeyDown, logResize } from './LoggingEvents.js';
import { getLoggingState, getOrCreateLoggingState } from './LoggingState.js';
import { getNonDomLoggables, hasNonDomLoggables, unregisterAllLoggables, unregisterLoggables } from './NonDomState.js';
const PROCESS_DOM_INTERVAL = 500;
const KEYBOARD_LOG_INTERVAL = 3000;
const HOVER_LOG_INTERVAL = 1000;
const DRAG_LOG_INTERVAL = 1250;
const DRAG_REPORT_THRESHOLD = 50;
const CLICK_LOG_INTERVAL = 500;
const RESIZE_LOG_INTERVAL = 200;
const RESIZE_REPORT_THRESHOLD = 50;
const noOpThrottler = {
    schedule: async () => { },
};
let processingThrottler = noOpThrottler;
export let keyboardLogThrottler = noOpThrottler;
let hoverLogThrottler = noOpThrottler;
let dragLogThrottler = noOpThrottler;
export let clickLogThrottler = noOpThrottler;
export let resizeLogThrottler = noOpThrottler;
const mutationObserver = new MutationObserver(scheduleProcessing);
const resizeObserver = new ResizeObserver(onResizeOrIntersection);
const intersectionObserver = new IntersectionObserver(onResizeOrIntersection);
const documents = [];
const pendingResize = new Map();
const pendingChange = new Set();
function observeMutations(roots) {
    for (const root of roots) {
        mutationObserver.observe(root, { attributes: true, childList: true, subtree: true });
        root.querySelectorAll('[popover]')?.forEach(e => e.addEventListener('toggle', scheduleProcessing));
    }
}
let logging = false;
export function isLogging() {
    return logging;
}
export async function startLogging(options) {
    logging = true;
    processingThrottler = options?.processingThrottler || new Common.Throttler.Throttler(PROCESS_DOM_INTERVAL);
    keyboardLogThrottler = options?.keyboardLogThrottler || new Common.Throttler.Throttler(KEYBOARD_LOG_INTERVAL);
    hoverLogThrottler = options?.hoverLogThrottler || new Common.Throttler.Throttler(HOVER_LOG_INTERVAL);
    dragLogThrottler = options?.dragLogThrottler || new Common.Throttler.Throttler(DRAG_LOG_INTERVAL);
    clickLogThrottler = options?.clickLogThrottler || new Common.Throttler.Throttler(CLICK_LOG_INTERVAL);
    resizeLogThrottler = options?.resizeLogThrottler || new Common.Throttler.Throttler(RESIZE_LOG_INTERVAL);
    processStartLoggingForDebugging();
    await addDocument(document);
}
export async function addDocument(document) {
    documents.push(document);
    if (['interactive', 'complete'].includes(document.readyState)) {
        await process();
    }
    document.addEventListener('visibilitychange', scheduleProcessing);
    document.addEventListener('scroll', scheduleProcessing);
    observeMutations([document.body]);
}
export async function stopLogging() {
    await keyboardLogThrottler.schedule(async () => { }, "AsSoonAsPossible" /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */);
    logging = false;
    unregisterAllLoggables();
    for (const document of documents) {
        document.removeEventListener('visibilitychange', scheduleProcessing);
        document.removeEventListener('scroll', scheduleProcessing);
    }
    mutationObserver.disconnect();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    documents.length = 0;
    viewportRects.clear();
    processingThrottler = noOpThrottler;
    pendingResize.clear();
    pendingChange.clear();
}
async function yieldToResize() {
    while (resizeLogThrottler.process) {
        await resizeLogThrottler.processCompleted;
    }
}
async function yieldToInteractions() {
    while (clickLogThrottler.process) {
        await clickLogThrottler.processCompleted;
    }
    while (keyboardLogThrottler.process) {
        await keyboardLogThrottler.processCompleted;
    }
}
function flushPendingChangeEvents() {
    for (const element of pendingChange) {
        logPendingChange(element);
    }
}
export function scheduleProcessing() {
    if (!processingThrottler) {
        return;
    }
    void processingThrottler.schedule(() => RenderCoordinator.read('processForLogging', process));
}
const viewportRects = new Map();
const viewportRectFor = (element) => {
    const ownerDocument = element.ownerDocument;
    const viewportRect = viewportRects.get(ownerDocument) ||
        new DOMRect(0, 0, ownerDocument.defaultView?.innerWidth || 0, ownerDocument.defaultView?.innerHeight || 0);
    viewportRects.set(ownerDocument, viewportRect);
    return viewportRect;
};
export async function process() {
    if (document.hidden) {
        return;
    }
    const startTime = performance.now();
    const { loggables, shadowRoots } = getDomState(documents);
    const visibleLoggables = [];
    observeMutations(shadowRoots);
    const nonDomRoots = [undefined];
    for (const { element, parent } of loggables) {
        const loggingState = getOrCreateLoggingState(element, getLoggingConfig(element), parent);
        if (!loggingState.impressionLogged) {
            const overlap = visibleOverlap(element, viewportRectFor(element));
            const visibleSelectOption = element.tagName === 'OPTION' && loggingState.parent?.selectOpen;
            const visible = overlap && element.checkVisibility({ checkVisibilityCSS: true }) &&
                (!parent || loggingState.parent?.impressionLogged);
            if (visible || visibleSelectOption) {
                if (overlap) {
                    loggingState.size = overlap;
                }
                visibleLoggables.push(element);
                loggingState.impressionLogged = true;
            }
        }
        if (loggingState.impressionLogged && hasNonDomLoggables(element)) {
            nonDomRoots.push(element);
        }
        if (!loggingState.processed) {
            const clickLikeHandler = (doubleClick) => (e) => {
                const loggable = e.currentTarget;
                maybeCancelDrag(e);
                logClick(clickLogThrottler)(loggable, e, { doubleClick });
            };
            if (loggingState.config.track?.click) {
                element.addEventListener('click', clickLikeHandler(false), { capture: true });
                element.addEventListener('auxclick', clickLikeHandler(false), { capture: true });
                element.addEventListener('contextmenu', clickLikeHandler(false), { capture: true });
            }
            if (loggingState.config.track?.dblclick) {
                element.addEventListener('dblclick', clickLikeHandler(true), { capture: true });
            }
            const trackHover = loggingState.config.track?.hover;
            if (trackHover) {
                element.addEventListener('mouseover', logHover(hoverLogThrottler), { capture: true });
                element.addEventListener('mouseout', () => hoverLogThrottler.schedule(cancelLogging, "AsSoonAsPossible" /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */), { capture: true });
            }
            const trackDrag = loggingState.config.track?.drag;
            if (trackDrag) {
                element.addEventListener('pointerdown', onDragStart, { capture: true });
                document.addEventListener('pointerup', maybeCancelDrag, { capture: true });
                document.addEventListener('dragend', maybeCancelDrag, { capture: true });
            }
            if (loggingState.config.track?.change) {
                element.addEventListener('input', (event) => {
                    if (!(event instanceof InputEvent)) {
                        return;
                    }
                    if (loggingState.pendingChangeContext && loggingState.pendingChangeContext !== event.inputType) {
                        void logPendingChange(element);
                    }
                    loggingState.pendingChangeContext = event.inputType;
                    pendingChange.add(element);
                }, { capture: true });
                element.addEventListener('change', (event) => {
                    const target = event?.target ?? element;
                    if (['checkbox', 'radio'].includes(target.type)) {
                        loggingState.pendingChangeContext = target.checked ? 'on' : 'off';
                    }
                    logPendingChange(element);
                }, { capture: true });
                element.addEventListener('focusout', () => {
                    if (loggingState.pendingChangeContext) {
                        void logPendingChange(element);
                    }
                }, { capture: true });
            }
            const trackKeyDown = loggingState.config.track?.keydown;
            if (trackKeyDown) {
                element.addEventListener('keydown', e => logKeyDown(keyboardLogThrottler)(e.currentTarget, e), { capture: true });
            }
            if (loggingState.config.track?.resize) {
                resizeObserver.observe(element);
                intersectionObserver.observe(element);
            }
            if (element.tagName === 'SELECT') {
                const onSelectOpen = (e) => {
                    void logClick(clickLogThrottler)(element, e);
                    if (loggingState.selectOpen) {
                        return;
                    }
                    loggingState.selectOpen = true;
                    void scheduleProcessing();
                };
                element.addEventListener('click', onSelectOpen, { capture: true });
                // Based on MenuListSelectType::ShouldOpenPopupForKey{Down,Press}Event
                element.addEventListener('keydown', event => {
                    const e = event;
                    if ((Host.Platform.isMac() || e.altKey) && (e.code === 'ArrowDown' || e.code === 'ArrowUp') ||
                        (!e.altKey && !e.ctrlKey && e.code === 'F4')) {
                        onSelectOpen(event);
                    }
                }, { capture: true });
                element.addEventListener('keypress', event => {
                    const e = event;
                    if (e.key === ' ' || !Host.Platform.isMac() && e.key === '\r') {
                        onSelectOpen(event);
                    }
                }, { capture: true });
                element.addEventListener('change', e => {
                    for (const option of element.selectedOptions) {
                        if (getLoggingState(option)?.config.track?.click) {
                            void logClick(clickLogThrottler)(option, e);
                        }
                    }
                }, { capture: true });
            }
            loggingState.processed = true;
        }
        processForDebugging(element);
    }
    for (let i = 0; i < nonDomRoots.length; ++i) {
        const root = nonDomRoots[i];
        for (const { loggable, config, parent, size } of getNonDomLoggables(root)) {
            const loggingState = getOrCreateLoggingState(loggable, config, parent);
            if (size) {
                loggingState.size = size;
            }
            processForDebugging(loggable);
            visibleLoggables.push(loggable);
            loggingState.impressionLogged = true;
            if (hasNonDomLoggables(loggable)) {
                nonDomRoots.push(loggable);
            }
        }
        // No need to track loggable as soon as we've logged the impression
        // We can still log interaction events with a handle to a loggable
        unregisterLoggables(root);
    }
    if (visibleLoggables.length) {
        await yieldToInteractions();
        await yieldToResize();
        flushPendingChangeEvents();
        await logImpressions(visibleLoggables);
    }
    Host.userMetrics.visualLoggingProcessingDone(performance.now() - startTime);
}
function logPendingChange(element) {
    const loggingState = getLoggingState(element);
    if (!loggingState) {
        return;
    }
    void logChange(element);
    delete loggingState.pendingChangeContext;
    pendingChange.delete(element);
}
async function cancelLogging() {
}
let dragStartX = 0, dragStartY = 0;
function onDragStart(event) {
    if (!(event instanceof MouseEvent)) {
        return;
    }
    dragStartX = event.screenX;
    dragStartY = event.screenY;
    void logDrag(dragLogThrottler)(event);
}
function maybeCancelDrag(event) {
    if (!(event instanceof MouseEvent)) {
        return;
    }
    if (Math.abs(event.screenX - dragStartX) >= DRAG_REPORT_THRESHOLD ||
        Math.abs(event.screenY - dragStartY) >= DRAG_REPORT_THRESHOLD) {
        return;
    }
    void dragLogThrottler.schedule(cancelLogging, "AsSoonAsPossible" /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */);
}
function isAncestorOf(state1, state2) {
    while (state2) {
        if (state2 === state1) {
            return true;
        }
        state2 = state2.parent;
    }
    return false;
}
async function onResizeOrIntersection(entries) {
    for (const entry of entries) {
        const element = entry.target;
        const loggingState = getLoggingState(element);
        const overlap = visibleOverlap(element, viewportRectFor(element)) || new DOMRect(0, 0, 0, 0);
        if (!loggingState?.size) {
            continue;
        }
        let hasPendingParent = false;
        for (const pendingElement of pendingResize.keys()) {
            if (pendingElement === element) {
                continue;
            }
            const pendingState = getLoggingState(pendingElement);
            if (isAncestorOf(pendingState, loggingState)) {
                hasPendingParent = true;
                break;
            }
            if (isAncestorOf(loggingState, pendingState)) {
                pendingResize.delete(pendingElement);
            }
        }
        if (hasPendingParent) {
            continue;
        }
        pendingResize.set(element, overlap);
        void resizeLogThrottler.schedule(async () => {
            if (pendingResize.size) {
                await yieldToInteractions();
                flushPendingChangeEvents();
            }
            for (const [element, overlap] of pendingResize.entries()) {
                const loggingState = getLoggingState(element);
                if (!loggingState) {
                    continue;
                }
                if (Math.abs(overlap.width - loggingState.size.width) >= RESIZE_REPORT_THRESHOLD ||
                    Math.abs(overlap.height - loggingState.size.height) >= RESIZE_REPORT_THRESHOLD) {
                    logResize(element, overlap);
                }
            }
            pendingResize.clear();
        }, "Delayed" /* Common.Throttler.Scheduling.DELAYED */);
    }
}
//# sourceMappingURL=LoggingDriver.js.map