// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as Workspace from '../../models/workspace/workspace.js';
import { Icon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import callStackSidebarPaneStyles from './callStackSidebarPane.css.js';
const UIStrings = {
    /**
     * @description Text in Call Stack Sidebar Pane of the Sources panel
     */
    callStack: 'Call Stack',
    /**
     * @description Not paused message element text content in Call Stack Sidebar Pane of the Sources panel
     */
    notPaused: 'Not paused',
    /**
     * @description Text exposed to screen reader when navigating through a ignore-listed call frame in the sources panel
     */
    onIgnoreList: 'on ignore list',
    /**
     * @description Show all link text content in Call Stack Sidebar Pane of the Sources panel
     */
    showIgnorelistedFrames: 'Show ignore-listed frames',
    /**
     * @description Text to show more content
     */
    showMore: 'Show more',
    /**
     * @description A context menu item in the Call Stack Sidebar Pane of the Sources panel
     */
    copyStackTrace: 'Copy stack trace',
    /**
     * @description Text in Call Stack Sidebar Pane of the Sources panel when some call frames have warnings
     */
    callFrameWarnings: 'Some call frames have warnings',
    /**
     * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
     * @example {src/myapp.debug.wasm.dwp} PH1
     */
    debugFileNotFound: 'Failed to load debug file "{PH1}".',
    /**
     * @description A context menu item in the Call Stack Sidebar Pane. "Restart" is a verb and
     * "frame" is a noun. "Frame" refers to an individual item in the call stack, i.e. a call frame.
     * The user opens this context menu by selecting a specific call frame in the call stack sidebar pane.
     */
    restartFrame: 'Restart frame',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CallStackSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { createRef, ref } = Directives;
let callstackSidebarPaneInstance;
export class CallStackSidebarPane extends UI.View.SimpleView {
    ignoreListMessageElement;
    ignoreListCheckboxElement;
    notPausedMessageElement;
    callFrameWarningsElement;
    items;
    list;
    showMoreMessageElement;
    showIgnoreListed = false;
    locationPool = new Bindings.LiveLocation.LiveLocationPool();
    maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    updateItemThrottler = new Common.Throttler.Throttler(100);
    scheduledForUpdateItems = new Set();
    muteActivateItem;
    lastDebuggerModel = null;
    constructor() {
        super({
            jslog: `${VisualLogging.section('sources.callstack')}`,
            title: i18nString(UIStrings.callStack),
            viewId: 'sources.callstack',
            useShadowDom: true,
        });
        const [ignoreListMessageRef, ignoreListCheckboxRef, notPausedRef, warningRef, showMoreRef] = [
            createRef(),
            createRef(),
            createRef(),
            createRef(),
            createRef(),
        ];
        const ignoreListCheckboxChanged = () => {
            this.showIgnoreListed = Boolean(ignoreListCheckboxRef.value?.checked);
            for (const item of this.items) {
                this.refreshItem(item);
            }
        };
        this.items = new UI.ListModel.ListModel();
        this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.NonViewport);
        this.list.element.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
        self.onInvokeElement(this.list.element, event => {
            const item = this.list.itemForNode(event.target);
            if (item) {
                this.activateItem(item);
                event.consume(true);
            }
        });
        const onShowMoreClicked = () => {
            this.maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
            this.requestUpdate();
        };
        // clang-format off
        render(html `
      <style>${callStackSidebarPaneStyles}</style>
      <div class='ignore-listed-message' ${ref(ignoreListMessageRef)}>
        <label class='ignore-listed-message-label'>
          <input type='checkbox' tabindex=0 class='ignore-listed-checkbox'
              @change=${ignoreListCheckboxChanged} ${ref(ignoreListCheckboxRef)}></input>
          ${i18nString(UIStrings.showIgnorelistedFrames)}
        </label>
      </div>
      <div class='gray-info-message' tabindex=-1 ${ref(notPausedRef)}>
        ${i18nString(UIStrings.notPaused)}
      </div>
      <div class='call-frame-warnings-message' tabindex=-1 ${ref(warningRef)}>
        <devtools-icon .name=${'warning-filled'} class='call-frame-warning-icon small'></devtools-icon>
        ${i18nString(UIStrings.callFrameWarnings)}
      </div>
      ${this.list.element}
      <div class='show-more-message hidden' ${ref(showMoreRef)}>
        <span class='link' @click=${onShowMoreClicked}>${i18nString(UIStrings.showMore)}</span>
      </div>
    `, this.contentElement);
        // clang-format on
        this.ignoreListMessageElement = ignoreListMessageRef.value;
        this.ignoreListCheckboxElement = ignoreListCheckboxRef.value;
        this.notPausedMessageElement = notPausedRef.value;
        this.callFrameWarningsElement = warningRef.value;
        this.showMoreMessageElement = showMoreRef.value;
        this.requestUpdate();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebugInfoAttached, this.debugInfoAttached, this);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!callstackSidebarPaneInstance || forceNew) {
            callstackSidebarPaneInstance = new CallStackSidebarPane();
        }
        return callstackSidebarPaneInstance;
    }
    flavorChanged(_object) {
        this.showIgnoreListed = false;
        this.ignoreListCheckboxElement.checked = false;
        this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
        this.requestUpdate();
    }
    debugInfoAttached() {
        this.requestUpdate();
    }
    setSourceMapSubscription(debuggerModel) {
        // Shortcut for the case when we are listening to the same model.
        if (this.lastDebuggerModel === debuggerModel) {
            return;
        }
        if (this.lastDebuggerModel) {
            this.lastDebuggerModel.sourceMapManager().removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.debugInfoAttached, this);
        }
        this.lastDebuggerModel = debuggerModel;
        if (this.lastDebuggerModel) {
            this.lastDebuggerModel.sourceMapManager().addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.debugInfoAttached, this);
        }
    }
    async performUpdate() {
        this.locationPool.disposeAll();
        this.callFrameWarningsElement.classList.add('hidden');
        const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
        this.setSourceMapSubscription(details?.debuggerModel ?? null);
        if (!details) {
            this.notPausedMessageElement.classList.remove('hidden');
            this.ignoreListMessageElement.classList.add('hidden');
            this.showMoreMessageElement.classList.add('hidden');
            this.items.replaceAll([]);
            UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, null);
            return;
        }
        this.notPausedMessageElement.classList.add('hidden');
        const itemPromises = [];
        const uniqueWarnings = new Set();
        for (const frame of details.callFrames) {
            const itemPromise = Item.createForDebuggerCallFrame(frame, this.locationPool, this.refreshItem.bind(this));
            itemPromises.push(itemPromise);
            if (frame.missingDebugInfoDetails) {
                uniqueWarnings.add(frame.missingDebugInfoDetails.details);
            }
        }
        const items = await Promise.all(itemPromises);
        if (uniqueWarnings.size) {
            this.callFrameWarningsElement.classList.remove('hidden');
            UI.Tooltip.Tooltip.install(this.callFrameWarningsElement, Array.from(uniqueWarnings).join('\n'));
        }
        let previousStackTrace = details.callFrames;
        let { maxAsyncStackChainDepth } = this;
        let asyncStackTrace = null;
        for await (const { stackTrace } of details.debuggerModel.iterateAsyncParents(details)) {
            asyncStackTrace = stackTrace;
            const title = UI.UIUtils.asyncStackTraceLabel(asyncStackTrace.description, previousStackTrace);
            items.push(...await Item.createItemsForAsyncStack(title, details.debuggerModel, asyncStackTrace.callFrames, this.locationPool, this.refreshItem.bind(this)));
            previousStackTrace = asyncStackTrace.callFrames;
            if (--maxAsyncStackChainDepth <= 0) {
                break;
            }
        }
        this.showMoreMessageElement.classList.toggle('hidden', !asyncStackTrace);
        this.items.replaceAll(items);
        for (const item of this.items) {
            this.refreshItem(item);
        }
        if (this.maxAsyncStackChainDepth === defaultMaxAsyncStackChainDepth) {
            this.list.selectNextItem(true /* canWrap */, false /* center */);
            const selectedItem = this.list.selectedItem();
            if (selectedItem) {
                this.activateItem(selectedItem);
            }
        }
        this.updatedForTest();
    }
    updatedForTest() {
    }
    refreshItem(item) {
        this.scheduledForUpdateItems.add(item);
        void this.updateItemThrottler.schedule(async () => {
            const items = Array.from(this.scheduledForUpdateItems);
            this.scheduledForUpdateItems.clear();
            this.muteActivateItem = true;
            if (!this.showIgnoreListed && this.items.every(item => item.isIgnoreListed)) {
                this.showIgnoreListed = true;
                for (let i = 0; i < this.items.length; ++i) {
                    this.list.refreshItemByIndex(i);
                }
                this.ignoreListMessageElement.classList.toggle('hidden', true);
            }
            else {
                this.showIgnoreListed = this.ignoreListCheckboxElement.checked;
                const itemsSet = new Set(items);
                let hasIgnoreListed = false;
                for (let i = 0; i < this.items.length; ++i) {
                    const item = this.items.at(i);
                    if (itemsSet.has(item)) {
                        this.list.refreshItemByIndex(i);
                    }
                    hasIgnoreListed = hasIgnoreListed || item.isIgnoreListed;
                }
                this.ignoreListMessageElement.classList.toggle('hidden', !hasIgnoreListed);
            }
            delete this.muteActivateItem;
        });
    }
    createElementForItem(item) {
        const element = document.createElement('div');
        element.classList.add('call-frame-item');
        const title = element.createChild('div', 'call-frame-item-title');
        const titleElement = title.createChild('div', 'call-frame-title-text');
        titleElement.textContent = item.title;
        if (item.isAsyncHeader) {
            element.classList.add('async-header');
        }
        else {
            UI.Tooltip.Tooltip.install(titleElement, item.title);
            const linkElement = element.createChild('div', 'call-frame-location');
            linkElement.textContent = Platform.StringUtilities.trimMiddle(item.linkText, 30);
            UI.Tooltip.Tooltip.install(linkElement, item.linkText);
            element.classList.toggle('ignore-listed-call-frame', item.isIgnoreListed);
            if (item.isIgnoreListed) {
                UI.ARIAUtils.setDescription(element, i18nString(UIStrings.onIgnoreList));
            }
            if (!item.frame) {
                UI.ARIAUtils.setDisabled(element, true);
            }
        }
        const callframe = item.frame;
        const isSelected = callframe === UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
        element.classList.toggle('selected', isSelected);
        UI.ARIAUtils.setSelected(element, isSelected);
        element.classList.toggle('hidden', !this.showIgnoreListed && item.isIgnoreListed);
        const icon = new Icon();
        icon.name = 'large-arrow-right-filled';
        icon.classList.add('selected-call-frame-icon', 'small');
        element.appendChild(icon);
        element.tabIndex = item === this.list.selectedItem() ? 0 : -1;
        if (callframe?.missingDebugInfoDetails) {
            const icon = new Icon();
            icon.name = 'warning-filled';
            icon.classList.add('call-frame-warning-icon', 'small');
            const messages = callframe.missingDebugInfoDetails.resources.map(r => i18nString(UIStrings.debugFileNotFound, { PH1: Common.ParsedURL.ParsedURL.extractName(r.resourceUrl) }));
            UI.Tooltip.Tooltip.install(icon, [callframe.missingDebugInfoDetails.details, ...messages].join('\n'));
            element.appendChild(icon);
        }
        return element;
    }
    heightForItem(_item) {
        console.assert(false); // Should not be called.
        return 0;
    }
    isItemSelectable(_item) {
        return true;
    }
    selectedItemChanged(_from, _to, fromElement, toElement) {
        if (fromElement) {
            fromElement.tabIndex = -1;
        }
        if (toElement) {
            this.setDefaultFocusedElement(toElement);
            toElement.tabIndex = 0;
            if (this.hasFocus()) {
                toElement.focus();
            }
        }
    }
    updateSelectedItemARIA(_fromElement, _toElement) {
        return true;
    }
    onContextMenu(event) {
        const item = this.list.itemForNode(event.target);
        if (!item) {
            return;
        }
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const debuggerCallFrame = item.frame;
        if (debuggerCallFrame) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.restartFrame), () => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.StackFrameRestarted);
                void debuggerCallFrame.restart();
            }, { disabled: !debuggerCallFrame.canBeRestarted, jslogContext: 'restart-frame' });
        }
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyStackTrace), this.copyStackTrace.bind(this), { jslogContext: 'copy-stack-trace' });
        if (item.uiLocation) {
            this.appendIgnoreListURLContextMenuItems(contextMenu, item.uiLocation.uiSourceCode);
        }
        void contextMenu.show();
    }
    activateItem(item) {
        const uiLocation = item.uiLocation;
        if (this.muteActivateItem || !uiLocation) {
            return;
        }
        this.list.selectItem(item);
        const debuggerCallFrame = item.frame;
        const oldItem = this.activeCallFrameItem();
        if (debuggerCallFrame && oldItem !== item) {
            debuggerCallFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame);
            UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, debuggerCallFrame);
            if (oldItem) {
                this.refreshItem(oldItem);
            }
            this.refreshItem(item);
        }
        else {
            void Common.Revealer.reveal(uiLocation);
        }
    }
    activeCallFrameItem() {
        const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
        if (callFrame) {
            return this.items.find(callFrameItem => callFrameItem.frame === callFrame) || null;
        }
        return null;
    }
    appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode) {
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        if (binding) {
            uiSourceCode = binding.network;
        }
        const menuSection = contextMenu.section('ignoreList');
        if (menuSection.items.length > 0) {
            // Already added menu items.
            return;
        }
        for (const { text, callback, jslogContext } of Workspace.IgnoreListManager.IgnoreListManager.instance()
            .getIgnoreListURLContextMenuItems(uiSourceCode)) {
            menuSection.appendItem(text, callback, { jslogContext });
        }
    }
    selectNextCallFrameOnStack() {
        const oldItem = this.activeCallFrameItem();
        const startIndex = oldItem ? this.items.indexOf(oldItem) + 1 : 0;
        for (let i = startIndex; i < this.items.length; i++) {
            const newItem = this.items.at(i);
            if (newItem.frame) {
                this.activateItem(newItem);
                break;
            }
        }
    }
    selectPreviousCallFrameOnStack() {
        const oldItem = this.activeCallFrameItem();
        const startIndex = oldItem ? this.items.indexOf(oldItem) - 1 : this.items.length - 1;
        for (let i = startIndex; i >= 0; i--) {
            const newItem = this.items.at(i);
            if (newItem.frame) {
                this.activateItem(newItem);
                break;
            }
        }
    }
    copyStackTrace() {
        const text = [];
        for (const item of this.items) {
            let itemText = item.title;
            if (item.uiLocation) {
                itemText += ' (' + item.uiLocation.linkText(true /* skipTrim */) + ')';
            }
            text.push(itemText);
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text.join('\n'));
    }
}
export const elementSymbol = Symbol('element');
export const defaultMaxAsyncStackChainDepth = 32;
export class ActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'debugger.next-call-frame':
                CallStackSidebarPane.instance().selectNextCallFrameOnStack();
                return true;
            case 'debugger.previous-call-frame':
                CallStackSidebarPane.instance().selectPreviousCallFrameOnStack();
                return true;
        }
        return false;
    }
}
export class Item {
    isIgnoreListed;
    title;
    linkText;
    uiLocation;
    isAsyncHeader;
    updateDelegate;
    /** Only set for synchronous frames */
    frame;
    static async createForDebuggerCallFrame(frame, locationPool, updateDelegate) {
        const name = frame.functionName;
        const item = new Item(UI.UIUtils.beautifyFunctionName(name), updateDelegate, frame);
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(frame.location(), item.update.bind(item), locationPool);
        void SourceMapScopes.NamesResolver.resolveDebuggerFrameFunctionName(frame).then(functionName => {
            if (functionName && functionName !== name) {
                // Just update the item's title and call the update delegate directly,
                // instead of going through the update method below, since location
                // didn't change.
                item.title = functionName;
                item.updateDelegate(item);
            }
        });
        return item;
    }
    static async createItemsForAsyncStack(title, debuggerModel, frames, locationPool, updateDelegate) {
        const headerItemToItemsSet = new WeakMap();
        const asyncHeaderItem = new Item(title, updateDelegate);
        headerItemToItemsSet.set(asyncHeaderItem, new Set());
        asyncHeaderItem.isAsyncHeader = true;
        const asyncFrameItems = [];
        const liveLocationPromises = [];
        for (const frame of frames) {
            const item = new Item(UI.UIUtils.beautifyFunctionName(frame.functionName), update);
            const rawLocation = debuggerModel.createRawLocationByScriptId(frame.scriptId, frame.lineNumber, frame.columnNumber);
            liveLocationPromises.push(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(rawLocation, item.update.bind(item), locationPool));
            void SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(frame, debuggerModel.target())
                .then(functionName => {
                if (functionName && functionName !== frame.functionName) {
                    item.title = functionName;
                    item.updateDelegate(item);
                }
            });
            asyncFrameItems.push(item);
        }
        await Promise.all(liveLocationPromises);
        updateDelegate(asyncHeaderItem);
        return [asyncHeaderItem, ...asyncFrameItems];
        function update(item) {
            updateDelegate(item);
            let shouldUpdate = false;
            const items = headerItemToItemsSet.get(asyncHeaderItem);
            if (items) {
                if (item.isIgnoreListed) {
                    items.delete(item);
                    shouldUpdate = items.size === 0;
                }
                else {
                    shouldUpdate = items.size === 0;
                    items.add(item);
                }
                asyncHeaderItem.isIgnoreListed = items.size === 0;
            }
            if (shouldUpdate) {
                updateDelegate(asyncHeaderItem);
            }
        }
    }
    constructor(title, updateDelegate, frame) {
        this.isIgnoreListed = false;
        this.title = title;
        this.linkText = '';
        this.uiLocation = null;
        this.isAsyncHeader = false;
        this.updateDelegate = updateDelegate;
        this.frame = frame;
    }
    async update(liveLocation) {
        const uiLocation = await liveLocation.uiLocation();
        this.isIgnoreListed = Boolean(uiLocation?.isIgnoreListed());
        this.linkText = uiLocation ? uiLocation.linkText() : '';
        this.uiLocation = uiLocation;
        this.updateDelegate(this);
    }
}
//# sourceMappingURL=CallStackSidebarPane.js.map