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
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {Icon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import callStackSidebarPaneStyles from './callStackSidebarPane.css.js';
import {QuickSourceView, SourcesPanel} from './SourcesPanel.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/CallStackSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {createRef, ref} = Directives;

let callstackSidebarPaneInstance: CallStackSidebarPane;

export class CallStackSidebarPane extends UI.View.SimpleView implements UI.ContextFlavorListener.ContextFlavorListener,
                                                                        UI.ListControl.ListDelegate<Item> {
  private readonly ignoreListMessageElement: Element;
  private readonly ignoreListCheckboxElement: HTMLInputElement;
  private readonly notPausedMessageElement: HTMLElement;
  private readonly callFrameWarningsElement: HTMLElement;
  private readonly items: UI.ListModel.ListModel<Item>;
  private list: UI.ListControl.ListControl<Item>;
  private readonly showMoreMessageElement: Element;
  private showIgnoreListed = false;
  private maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
  private readonly updateItemThrottler = new Common.Throttler.Throttler(100);
  private readonly scheduledForUpdateItems = new Set<Item>();
  private muteActivateItem?: boolean;

  #stackTrace: StackTrace.StackTrace.DebuggableStackTrace|null = null;

  private constructor() {
    super({
      jslog: `${VisualLogging.section('sources.callstack')}`,
      title: i18nString(UIStrings.callStack),
      viewId: 'sources.callstack',
      useShadowDom: true,
    });

    const [ignoreListMessageRef, ignoreListCheckboxRef, notPausedRef, warningRef, showMoreRef] = [
      createRef<HTMLElement>(),
      createRef<HTMLInputElement>(),
      createRef<HTMLElement>(),
      createRef<HTMLElement>(),
      createRef<HTMLElement>(),
    ];
    const ignoreListCheckboxChanged = (): void => {
      this.showIgnoreListed = Boolean(ignoreListCheckboxRef.value?.checked);
      for (const item of this.items) {
        this.refreshItem(item);
      }
    };

    this.items = new UI.ListModel.ListModel();
    this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.NonViewport);
    this.list.element.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
    self.onInvokeElement(this.list.element, event => {
      const item = this.list.itemForNode((event.target as Node | null));
      if (item) {
        this.activateItem(item);
        event.consume(true);
      }
    });

    const onShowMoreClicked = (): void => {
      this.maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
      this.requestUpdate();
    };

    // clang-format off
    render(html`
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
        <button class='link' @click=${onShowMoreClicked}>${i18nString(UIStrings.showMore)}</button>
      </div>
    `, this.contentElement);
    // clang-format on

    this.ignoreListMessageElement = ignoreListMessageRef.value as HTMLElement;
    this.ignoreListCheckboxElement = ignoreListCheckboxRef.value as HTMLInputElement;
    this.notPausedMessageElement = notPausedRef.value as HTMLElement;
    this.callFrameWarningsElement = warningRef.value as HTMLElement;
    this.showMoreMessageElement = showMoreRef.value as HTMLElement;

    this.requestUpdate();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CallStackSidebarPane {
    const {forceNew} = opts;
    if (!callstackSidebarPaneInstance || forceNew) {
      callstackSidebarPaneInstance = new CallStackSidebarPane();
    }

    return callstackSidebarPaneInstance;
  }

  async flavorChanged(details: SDK.DebuggerModel.DebuggerPausedDetails|null): Promise<void> {
    this.showIgnoreListed = false;
    this.ignoreListCheckboxElement.checked = false;
    this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;

    if (this.#stackTrace) {
      this.#stackTrace.removeEventListener(StackTrace.StackTrace.Events.UPDATED, this.requestUpdate, this);
      this.#stackTrace = null;
      this.requestUpdate();  // In case creating the stack trace takes a while, we render an empty view first.
    }

    if (details) {
      this.#stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                             .createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
      this.#stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, this.requestUpdate, this);
    }

    this.requestUpdate();
  }

  override performUpdate(): void {
    this.callFrameWarningsElement.classList.add('hidden');

    if (!this.#stackTrace) {
      this.notPausedMessageElement.classList.remove('hidden');
      this.ignoreListMessageElement.classList.add('hidden');
      this.showMoreMessageElement.classList.add('hidden');
      this.items.replaceAll([]);
      UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, null);
      UI.Context.Context.instance().setFlavor(StackTrace.StackTrace.DebuggableFrameFlavor, null);
      return;
    }

    this.notPausedMessageElement.classList.add('hidden');

    const items: Item[] = [];
    const uniqueWarnings = new Set<string>();
    for (const frame of this.#stackTrace.syncFragment.frames) {
      items.push(Item.createForDebuggableFrame(frame));
      if (frame.missingDebugInfo) {
        uniqueWarnings.add(convertMissingDebugInfo(frame.missingDebugInfo, frame.sdkFrame.functionName).details);
      }
    }

    if (uniqueWarnings.size) {
      this.callFrameWarningsElement.classList.remove('hidden');
      UI.Tooltip.Tooltip.install(this.callFrameWarningsElement, Array.from(uniqueWarnings).join('\n'));
    }

    let {maxAsyncStackChainDepth} = this;
    let hasMore = false;
    let previousFragment: StackTrace.StackTrace.Fragment = this.#stackTrace.syncFragment;
    for (const asyncFragment of this.#stackTrace.asyncFragments) {
      items.push(Item.createForAsyncHeader(asyncFragment, previousFragment));
      for (const frame of asyncFragment.frames) {
        items.push(Item.createForFrame(frame));
      }

      previousFragment = asyncFragment;

      if (--maxAsyncStackChainDepth <= 0) {
        hasMore = asyncFragment !== this.#stackTrace.asyncFragments.at(-1);
        break;
      }
    }

    this.showMoreMessageElement.classList.toggle('hidden', !hasMore);
    this.items.replaceAll(items);
    for (const item of this.items) {
      this.refreshItem(item);
    }
    if (this.maxAsyncStackChainDepth === defaultMaxAsyncStackChainDepth) {
      this.list.selectNextItem(true /* canWrap */, false /* center */);
      const selectedItem = this.list.selectedItem();
      if (selectedItem &&
          (UI.Context.Context.instance().flavor(QuickSourceView) ||
           UI.Context.Context.instance().flavor(SourcesPanel))) {
        this.activateItem(selectedItem);
      }
    }
    this.updatedForTest();
  }

  private updatedForTest(): void {
  }

  private refreshItem(item: Item): void {
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
      } else {
        this.showIgnoreListed = this.ignoreListCheckboxElement.checked;
        const itemsSet = new Set<Item>(items);
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

  createElementForItem(item: Item): Element {
    const element = document.createElement('div');
    element.classList.add('call-frame-item');
    const title = element.createChild('div', 'call-frame-item-title');
    const titleElement = title.createChild('div', 'call-frame-title-text');
    titleElement.textContent = item.title;
    if (item.isAsyncHeader) {
      element.classList.add('async-header');
    } else {
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
    const isSelected =
        item.frame === UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor)?.frame;

    element.classList.toggle('selected', isSelected);
    UI.ARIAUtils.setSelected(element, isSelected);
    element.classList.toggle('hidden', !this.showIgnoreListed && item.isIgnoreListed);
    const icon = new Icon();
    icon.name = 'large-arrow-right-filled';
    icon.classList.add('selected-call-frame-icon', 'small');
    element.appendChild(icon);
    element.tabIndex = item === this.list.selectedItem() ? 0 : -1;

    if (item.frame?.missingDebugInfo) {
      const icon = new Icon();
      icon.name = 'warning-filled';
      icon.classList.add('call-frame-warning-icon', 'small');
      const {resources, details} =
          convertMissingDebugInfo(item.frame.missingDebugInfo, item.frame.sdkFrame.functionName);
      const messages = resources.map(
          r => i18nString(UIStrings.debugFileNotFound, {PH1: Common.ParsedURL.ParsedURL.extractName(r.resourceUrl)}));
      UI.Tooltip.Tooltip.install(icon, [details, ...messages].join('\n'));
      element.appendChild(icon);
    }
    return element;
  }

  heightForItem(_item: Item): number {
    console.assert(false);  // Should not be called.
    return 0;
  }

  isItemSelectable(_item: Item): boolean {
    return true;
  }

  selectedItemChanged(_from: Item|null, _to: Item|null, fromElement: HTMLElement|null, toElement: HTMLElement|null):
      void {
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

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return true;
  }

  private onContextMenu(event: Event): void {
    const item = this.list.itemForNode((event.target as Node | null));
    if (!item) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const debuggerCallFrame = item.frame?.sdkFrame;
    if (debuggerCallFrame) {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.restartFrame), () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.StackFrameRestarted);
        void debuggerCallFrame.restart();
      }, {disabled: !debuggerCallFrame.canBeRestarted, jslogContext: 'restart-frame'});
    }
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.copyStackTrace), this.copyStackTrace.bind(this), {jslogContext: 'copy-stack-trace'});
    if (item.uiLocation) {
      this.appendIgnoreListURLContextMenuItems(contextMenu, item.uiLocation.uiSourceCode);
    }
    void contextMenu.show();
  }

  private activateItem(item: Item): void {
    const uiLocation = item.uiLocation;
    if (this.muteActivateItem || !uiLocation) {
      return;
    }
    this.list.selectItem(item);
    const debuggerCallFrame = item.frame;
    const oldItem = this.activeCallFrameItem();
    if (debuggerCallFrame) {
      debuggerCallFrame.sdkFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame.sdkFrame);
      UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, debuggerCallFrame.sdkFrame);
      UI.Context.Context.instance().setFlavor(
          StackTrace.StackTrace.DebuggableFrameFlavor,
          StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggerCallFrame));
    } else {
      void Common.Revealer.reveal(uiLocation);
    }
    if (oldItem !== item) {
      if (oldItem) {
        this.refreshItem(oldItem);
      }
      this.refreshItem(item);
    }
  }

  activeCallFrameItem(): Item|null {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (callFrame) {
      return this.items.find(callFrameItem => callFrameItem.frame?.sdkFrame === callFrame) || null;
    }
    return null;
  }

  appendIgnoreListURLContextMenuItems(
      contextMenu: UI.ContextMenu.ContextMenu, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      uiSourceCode = binding.network;
    }

    const menuSection = contextMenu.section('ignoreList');
    if (menuSection.items.length > 0) {
      // Already added menu items.
      return;
    }

    for (const {text, callback, jslogContext} of Workspace.IgnoreListManager.IgnoreListManager.instance()
             .getIgnoreListURLContextMenuItems(uiSourceCode)) {
      menuSection.appendItem(text, callback, {jslogContext});
    }
  }

  selectNextCallFrameOnStack(): void {
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

  selectPreviousCallFrameOnStack(): void {
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

  private copyStackTrace(): void {
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

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
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
  uiLocation: Workspace.UISourceCode.UILocation|null = null;
  isAsyncHeader = false;

  /** Only set for synchronous frames */
  frame?: StackTrace.StackTrace.DebuggableFrame;

  static createForDebuggableFrame(frame: StackTrace.StackTrace.DebuggableFrame): Item {
    const item = Item.createForFrame(frame);
    item.frame = frame;
    return item;
  }

  static createForFrame(frame: StackTrace.StackTrace.Frame): Item {
    const item = new Item(UI.UIUtils.beautifyFunctionName(frame.name ?? ''));
    const uiSourceCode = frame.uiSourceCode;
    if (uiSourceCode) {
      item.isIgnoreListed = uiSourceCode.isIgnoreListed() ?? false;
      item.uiLocation = uiSourceCode.uiLocation(frame.line, frame.column);
      item.linkText = item.uiLocation.linkText();
    }
    return item;
  }

  static createForAsyncHeader(
      fragment: StackTrace.StackTrace.AsyncFragment, previousFragment: StackTrace.StackTrace.Fragment): Item {
    const description = UI.UIUtils.asyncStackTraceLabel(
        fragment.description, previousFragment.frames.map(f => ({functionName: f.name ?? ''})));
    const item = new Item(description);
    item.isAsyncHeader = true;
    return item;
  }

  private constructor(title: string) {
    this.title = title;
  }
}

export function convertMissingDebugInfo(
    missingDebugInfo: StackTrace.StackTrace.MissingDebugInfo, functionName: string|undefined):
    {details: Platform.UIString.LocalizedString, resources: SDK.DebuggerModel.MissingDebugFiles[]} {
  switch (missingDebugInfo.type) {
    case StackTrace.StackTrace.MissingDebugInfoType.PARTIAL_INFO:
      return {
        details: i18nString(UIStrings.debugSymbolsIncomplete, {PH1: functionName ?? ''}),
        resources: missingDebugInfo.missingDebugFiles
      };
    case StackTrace.StackTrace.MissingDebugInfoType.NO_INFO:
      return {
        details: i18nString(UIStrings.failedToLoadDebugSymbolsForFunction, {PH1: functionName ?? ''}),
        resources: []
      };
  }
}
