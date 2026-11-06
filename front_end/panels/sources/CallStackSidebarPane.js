// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import callStackSidebarPaneStyles from './callStackSidebarPane.css.js';
import { QuickSourceView, SourcesPanel } from './SourcesPanel.js';
const { classMap, ifDefined } = Directives;
const UIStrings = {
    /**
     * @description Text in the call stack sidebar of the Sources panel
     */
    callStack: 'Call Stack',
    /**
     * @description Not paused message element text content in the call stack sidebar of the Sources panel
     */
    notPaused: 'Not paused',
    /**
     * @description Text exposed to screen reader when navigating through a ignore-listed call frame in the sources panel
     */
    onIgnoreList: 'on ignore list',
    /**
     * @description Show all link text content in the call stack sidebar of the Sources panel
     */
    showIgnorelistedFrames: 'Show ignore-listed frames',
    /**
     * @description Text to show more content
     */
    showMore: 'Show more',
    /**
     * @description A context menu item in the call stack sidebar of the Sources panel
     */
    copyStackTrace: 'Copy stack trace',
    /**
     * @description Text in the call stack sidebar of the Sources panel when some call frames have warnings
     */
    callFrameWarnings: 'Some call frames have warnings',
    /**
     * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
     * @example {src/myapp.debug.wasm.dwp} PH1
     */
    debugFileNotFound: 'Failed to load debug file "{PH1}"',
    /**
     * @description A context menu item in the call stack sidebar pane. "Restart" is a verb and
     * "frame" is a noun. "Frame" refers to an individual item in the call stack, i.e. a call frame.
     * The user opens this context menu by selecting a specific call frame in the call stack sidebar pane.
     */
    restartFrame: 'Restart frame',
    /**
     * @description Error message that is displayed in UI debugging information cannot be found for a call frame
     * @example {main} PH1
     */
    failedToLoadDebugSymbolsForFunction: 'No debug information for function "{PH1}"',
    /**
     * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
     * @example {mainp.debug.wasm.dwp} PH1
     */
    debugSymbolsIncomplete: 'The debug information for function {PH1} is incomplete',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CallStackSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function getMissingDebugInfoTooltip(missingDebugInfo, functionName) {
    const { resources, details } = convertMissingDebugInfo(missingDebugInfo, functionName);
    const messages = resources.map(r => i18nString(UIStrings.debugFileNotFound, { PH1: Common.ParsedURL.ParsedURL.extractName(r.resourceUrl) }));
    return [details, ...messages].join('\n');
}
// clang-format off
export const DEFAULT_VIEW = (input, _output, target) => {
    const renderItem = (item, index) => {
        const isHidden = !input.showIgnoreListed && item.isIgnoreListed;
        const isAsyncHeader = item.isAsyncHeader;
        const isIgnoreListed = !isAsyncHeader && item.isIgnoreListed;
        const hasFrame = Boolean(item.frame);
        const isSelected = item === input.selectedItem;
        const isFocused = item === input.focusedItem;
        const missingDebugInfoTooltip = item.frame?.missingDebugInfo ?
            getMissingDebugInfoTooltip(item.frame.missingDebugInfo, item.frame.sdkFrame.functionName) :
            undefined;
        const onKeyDown = (event) => {
            if ((event.key === 'Enter' && !event.isComposing) || event.key === ' ') {
                input.onItemActivate(item);
                event.consume(true);
            }
            else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
                input.onItemKeyDown(item, event.key);
                event.consume(true);
            }
        };
        const onContextMenu = (event) => {
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            input.onItemContextMenu(item, contextMenu);
            void contextMenu.show();
        };
        return html `
      <div class=${classMap({
            'call-frame-item': true,
            'async-header': isAsyncHeader,
            'ignore-listed-call-frame': isIgnoreListed,
            selected: isSelected,
        })}
          role="option"
          aria-setsize=${input.items.length}
          aria-posinset=${index + 1}
          aria-selected=${isSelected ? 'true' : 'false'}
          aria-description=${ifDefined(isIgnoreListed ? i18nString(UIStrings.onIgnoreList) : undefined)}
          aria-disabled=${ifDefined(!isAsyncHeader && !hasFrame ? 'true' : undefined)}
          ?hidden=${isHidden}
          tabindex=${isFocused ? 0 : -1}
          ?autofocus=${isFocused && !isHidden}
          jslog=${VisualLogging.item().track({
            click: true,
            resize: true,
            keydown: 'ArrowUp|ArrowDown|PageUp|PageDown|Home|End|Enter|Space',
        })}
          @click=${() => input.onItemClick(item)}
          @contextmenu=${onContextMenu}
          @keydown=${onKeyDown}>
        <div class="call-frame-item-title">
          <div class="call-frame-title-text"
              title=${ifDefined(!isAsyncHeader ? item.title : undefined)}>${item.title}</div>
        </div>
        ${!isAsyncHeader ? html `
          <div class="call-frame-location"
              title=${item.linkText}>${Platform.StringUtilities.trimMiddle(item.linkText, 30)}</div>
        ` : nothing}
        <devtools-icon .name=${'large-arrow-right-filled'} class="selected-call-frame-icon small"></devtools-icon>
        ${missingDebugInfoTooltip ? html `
          <devtools-icon .name=${'warning-filled'} class="call-frame-warning-icon small"
              title=${missingDebugInfoTooltip}></devtools-icon>
        ` : nothing}
      </div>
    `;
    };
    render(html `
    <style>${Input.checkboxStyles}</style>
    <style>${callStackSidebarPaneStyles}</style>
    <div
      class="ignore-listed-message"
      ?hidden=${!input.showIgnoreListMessage}>
      <label class="ignore-listed-message-label">
        <input type="checkbox" tabindex="0" class="ignore-listed-checkbox"
            .checked=${input.showIgnoreListedChecked}
            jslog=${VisualLogging.toggle('show-ignore-listed-frames').track({ change: true })}
            @change=${(e) => {
        if (e.target instanceof HTMLInputElement) {
            input.onIgnoreListCheckboxChange(e.target.checked);
        }
    }} />
        ${i18nString(UIStrings.showIgnorelistedFrames)}
      </label>
    </div>
    <div
      class="gray-info-message"
      ?hidden=${!input.notPaused}
      tabindex="-1">
      ${i18nString(UIStrings.notPaused)}
    </div>
    <div
      class="call-frame-warnings-message"
      ?hidden=${!input.warnings}
      tabindex="-1"
      title=${ifDefined(input.warnings)}>
      <devtools-icon .name=${'warning-filled'} class="call-frame-warning-icon small"></devtools-icon>
      ${i18nString(UIStrings.callFrameWarnings)}
    </div>
    <div class="call-frame-list"
        role="listbox"
        aria-label=${i18nString(UIStrings.callStack)}
        tabindex="-1"
        ?hidden=${input.items.length === 0}>
      ${input.items.map((item, index) => renderItem(item, index))}
    </div>
    <div
      class="show-more-message"
      ?hidden=${!input.showMore}>
      <button class="link"
          jslog=${VisualLogging.action('show-more').track({ click: true })}
          @click=${input.onShowMore}>${i18nString(UIStrings.showMore)}</button>
    </div>
  `, target, { container: { attributes: { jslog: `${VisualLogging.section('sources.callstack')}` } } });
};
// clang-format on
let callstackSidebarPaneInstance;
export class CallStackSidebarPane extends UI.View.SimpleView {
    #view;
    #items = [];
    #focusedItem = null;
    #showIgnoreListed = false;
    #showIgnoreListMessage = false;
    #ignoreListCheckboxChecked = false;
    #warnings;
    #hasMore = false;
    maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    #stackTrace = null;
    #flavorChangeId = 0;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, {
            title: i18nString(UIStrings.callStack),
            viewId: 'sources.callstack',
            useShadowDom: 'pure',
        });
        this.#view = view;
        this.requestUpdate();
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!callstackSidebarPaneInstance || forceNew) {
            callstackSidebarPaneInstance = new CallStackSidebarPane();
        }
        return callstackSidebarPaneInstance;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    #onIgnoreListCheckboxChanged(checked) {
        this.#ignoreListCheckboxChecked = checked;
        this.#updateIgnoreListState();
        if (!this.#isItemVisible(this.#focusedItem)) {
            const activeItem = this.activeCallFrameItem();
            this.#focusedItem = this.#isItemVisible(activeItem) ? activeItem : this.#firstVisibleItem();
        }
        this.requestUpdate();
    }
    #onShowMoreClicked() {
        this.maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
        this.#rebuildItems();
        this.requestUpdate();
    }
    #onStackTraceUpdated() {
        this.#rebuildItems();
        this.requestUpdate();
    }
    async flavorChanged(details) {
        const flavorChangeId = ++this.#flavorChangeId;
        this.#showIgnoreListed = false;
        this.#ignoreListCheckboxChecked = false;
        this.#showIgnoreListMessage = false;
        this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
        if (this.#stackTrace) {
            this.#stackTrace.removeEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.#onStackTraceUpdated, this);
            this.#stackTrace = null;
            this.#rebuildItems();
            this.requestUpdate(); // In case creating the stack trace takes a while, we render an empty view first.
        }
        if (details) {
            const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                .createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
            if (flavorChangeId !== this.#flavorChangeId) {
                return;
            }
            this.#stackTrace = stackTrace;
            this.#stackTrace.addEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.#onStackTraceUpdated, this);
            this.#rebuildItems();
        }
        this.requestUpdate();
    }
    #rebuildItems() {
        if (!this.#stackTrace) {
            this.#warnings = undefined;
            this.#hasMore = false;
            this.#showIgnoreListMessage = false;
            this.#items = [];
            this.#focusedItem = null;
            UI.Context.Context.instance().setFlavor(StackTrace.StackTrace.DebuggableFrameFlavor, null);
            return;
        }
        const items = [];
        const uniqueWarnings = new Set();
        for (const frame of this.#stackTrace.syncFragment.frames) {
            items.push(Item.createForDebuggableFrame(frame));
            if (frame.missingDebugInfo) {
                uniqueWarnings.add(convertMissingDebugInfo(frame.missingDebugInfo, frame.sdkFrame.functionName).details);
            }
        }
        this.#warnings = uniqueWarnings.size ? Array.from(uniqueWarnings).join('\n') : undefined;
        let { maxAsyncStackChainDepth } = this;
        let hasMore = false;
        for (const asyncFragment of this.#stackTrace.asyncFragments) {
            items.push(Item.createForAsyncHeader(this.#stackTrace, asyncFragment));
            for (const frame of asyncFragment.frames) {
                items.push(Item.createForFrame(frame));
            }
            if (--maxAsyncStackChainDepth <= 0) {
                hasMore = asyncFragment !== this.#stackTrace.asyncFragments.at(-1);
                break;
            }
        }
        this.#hasMore = hasMore;
        this.#items = items;
        this.#updateIgnoreListState();
        if (this.maxAsyncStackChainDepth === defaultMaxAsyncStackChainDepth) {
            this.#focusedItem = this.#firstVisibleItem() ?? (this.#items[0] ?? null);
            if (this.#focusedItem &&
                (UI.Context.Context.instance().flavor(QuickSourceView) ||
                    UI.Context.Context.instance().flavor(SourcesPanel))) {
                this.activateItem(this.#focusedItem);
            }
        }
        else {
            const activeItem = this.activeCallFrameItem();
            this.#focusedItem =
                this.#isItemVisible(activeItem) ? activeItem : (this.#firstVisibleItem() ?? (this.#items[0] ?? null));
        }
    }
    #isItemVisible(item) {
        if (!item || !this.#items.includes(item)) {
            return false;
        }
        return this.#showIgnoreListed || !item.isIgnoreListed;
    }
    #firstVisibleItem() {
        return this.#items.find(item => this.#showIgnoreListed || !item.isIgnoreListed) ?? null;
    }
    #updateIgnoreListState() {
        const hasIgnoreListed = this.#items.some(item => item.isIgnoreListed);
        const allIgnoreListed = this.#items.length > 0 && this.#items.every(item => item.isIgnoreListed);
        if (allIgnoreListed) {
            this.#showIgnoreListed = true;
            this.#showIgnoreListMessage = false;
        }
        else {
            this.#showIgnoreListed = this.#ignoreListCheckboxChecked;
            this.#showIgnoreListMessage = hasIgnoreListed;
        }
    }
    performUpdate() {
        const viewInput = {
            showIgnoreListMessage: this.#showIgnoreListMessage,
            showIgnoreListedChecked: this.#ignoreListCheckboxChecked,
            onIgnoreListCheckboxChange: this.#onIgnoreListCheckboxChanged.bind(this),
            notPaused: !this.#stackTrace,
            warnings: this.#warnings,
            items: this.#items,
            selectedItem: this.activeCallFrameItem(),
            focusedItem: this.#focusedItem,
            showIgnoreListed: this.#showIgnoreListed,
            onItemClick: this.#onItemClick.bind(this),
            onItemActivate: this.#onItemActivate.bind(this),
            onItemContextMenu: this.#onItemContextMenu.bind(this),
            onItemKeyDown: this.#onItemKeyDown.bind(this),
            showMore: this.#hasMore,
            onShowMore: this.#onShowMoreClicked.bind(this),
        };
        this.#view(viewInput, undefined, this.contentElement);
        if (this.#stackTrace) {
            this.updatedForTest();
        }
    }
    updatedForTest() {
    }
    #onItemClick(item) {
        if (this.#items.includes(item)) {
            this.#focusedItem = item;
        }
        if (item.uiLocation) {
            this.activateItem(item);
        }
        this.requestUpdate();
    }
    #onItemActivate(item) {
        if (this.#items.includes(item)) {
            this.#focusedItem = item;
        }
        if (item.uiLocation) {
            this.activateItem(item);
        }
        this.requestUpdate();
    }
    #onItemContextMenu(item, contextMenu) {
        if (this.#items.includes(item)) {
            this.#focusedItem = item;
            this.requestUpdate();
        }
        const debuggerCallFrame = item.frame?.sdkFrame;
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
    }
    #onItemKeyDown(item, direction) {
        const visibleItems = this.#items.filter(candidate => this.#showIgnoreListed || !candidate.isIgnoreListed);
        if (visibleItems.length === 0) {
            return;
        }
        let newItem;
        switch (direction) {
            case 'Home':
                newItem = visibleItems[0];
                break;
            case 'End':
                newItem = visibleItems[visibleItems.length - 1];
                break;
            case 'ArrowDown': {
                const currPos = visibleItems.indexOf(item);
                const nextPos = currPos === -1 ? 0 : (currPos + 1) % visibleItems.length;
                newItem = visibleItems[nextPos];
                break;
            }
            case 'ArrowUp': {
                const currPos = visibleItems.indexOf(item);
                const prevPos = currPos === -1 ? visibleItems.length - 1 : (currPos - 1 + visibleItems.length) % visibleItems.length;
                newItem = visibleItems[prevPos];
                break;
            }
        }
        const targetItem = newItem;
        this.#focusedItem = targetItem;
        this.requestUpdate();
        void this.updateComplete.then(() => {
            const newIndex = this.#items.indexOf(targetItem);
            if (newIndex === -1) {
                return;
            }
            const elements = this.contentElement.querySelectorAll('.call-frame-item');
            const targetEl = elements[newIndex];
            if (targetEl) {
                targetEl.focus();
                targetEl.scrollIntoView({ block: 'nearest' });
            }
        });
    }
    activateItem(item) {
        const uiLocation = item.uiLocation;
        if (!uiLocation) {
            return;
        }
        if (this.#items.includes(item)) {
            this.#focusedItem = item;
        }
        const debuggerCallFrame = item.frame;
        if (debuggerCallFrame) {
            debuggerCallFrame.sdkFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame.sdkFrame);
            UI.Context.Context.instance().setFlavor(StackTrace.StackTrace.DebuggableFrameFlavor, StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggerCallFrame));
        }
        else {
            void Common.Revealer.reveal(uiLocation);
        }
        this.requestUpdate();
    }
    activeCallFrameItem() {
        const frameFlavor = UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor);
        if (frameFlavor) {
            return this.#items.find(callFrameItem => callFrameItem.frame === frameFlavor.frame) || null;
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
        const startIndex = oldItem ? this.#items.indexOf(oldItem) + 1 : 0;
        for (let i = startIndex; i < this.#items.length; i++) {
            const newItem = this.#items[i];
            if (newItem.frame) {
                this.activateItem(newItem);
                break;
            }
        }
    }
    selectPreviousCallFrameOnStack() {
        const oldItem = this.activeCallFrameItem();
        const startIndex = oldItem ? this.#items.indexOf(oldItem) - 1 : this.#items.length - 1;
        for (let i = startIndex; i >= 0; i--) {
            const newItem = this.#items[i];
            if (newItem.frame) {
                this.activateItem(newItem);
                break;
            }
        }
    }
    copyStackTrace() {
        const text = [];
        for (const item of this.#items) {
            let itemText = item.title;
            if (item.uiLocation) {
                itemText += ' (' + item.uiLocation.linkText(true /* skipTrim */) + ')';
            }
            text.push(itemText);
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text.join('\n'));
    }
}
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
    isIgnoreListed = false;
    title = '';
    linkText = '';
    uiLocation = null;
    isAsyncHeader = false;
    /** Only set for synchronous frames */
    frame;
    static createForDebuggableFrame(frame) {
        const item = Item.createForFrame(frame);
        item.frame = frame;
        return item;
    }
    static createForFrame(frame) {
        const item = new Item(UI.UIUtils.beautifyFunctionName(frame.name ?? ''));
        const uiSourceCode = frame.uiSourceCode;
        if (uiSourceCode) {
            item.isIgnoreListed = uiSourceCode.isIgnoreListed() ?? false;
            item.uiLocation = uiSourceCode.uiLocation(frame.line, frame.column);
            item.linkText = item.uiLocation.linkText();
        }
        return item;
    }
    static createForAsyncHeader(stackTrace, fragment) {
        const description = UI.UIUtils.asyncFragmentLabel(stackTrace, fragment);
        const item = new Item(description);
        item.isAsyncHeader = true;
        return item;
    }
    constructor(title) {
        this.title = title;
    }
}
export function convertMissingDebugInfo(missingDebugInfo, functionName) {
    switch (missingDebugInfo.type) {
        case "PARTIAL_INFO" /* StackTrace.StackTrace.MissingDebugInfoType.PARTIAL_INFO */:
            return {
                details: i18nString(UIStrings.debugSymbolsIncomplete, { PH1: functionName ?? '' }),
                resources: missingDebugInfo.missingDebugFiles,
            };
        case "NO_INFO" /* StackTrace.StackTrace.MissingDebugInfoType.NO_INFO */:
            return {
                details: i18nString(UIStrings.failedToLoadDebugSymbolsForFunction, { PH1: functionName ?? '' }),
                resources: [],
            };
    }
}
//# sourceMappingURL=CallStackSidebarPane.js.map