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
import type * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import callStackSidebarPaneStyles from './callStackSidebarPane.css.js';
import {QuickSourceView, SourcesPanel} from './SourcesPanel.js';

const {classMap, ifDefined} = Directives;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/CallStackSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  showIgnoreListMessage: boolean;
  showIgnoreListedChecked: boolean;
  onIgnoreListCheckboxChange: (checked: boolean) => void;
  notPaused: boolean;
  warnings?: string;
  list?: LitTemplate;
  showMore: boolean;
  onShowMore: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

export interface ItemViewInput {
  item: Item;
  isSelected: boolean;
  isFocused: boolean;
  showIgnoreListed: boolean;
}

export type ItemView = (input: ItemViewInput, output: undefined, target: DocumentFragment|HTMLElement) => void;

function getMissingDebugInfoTooltip(missingDebugInfo: StackTrace.StackTrace.MissingDebugInfo,
                                    functionName: string|undefined): string {
  const {resources, details} = convertMissingDebugInfo(missingDebugInfo, functionName);
  const messages = resources.map(
      r => i18nString(UIStrings.debugFileNotFound, {PH1: Common.ParsedURL.ParsedURL.extractName(r.resourceUrl)}));
  return [details, ...messages].join('\n');
}

// clang-format off
export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  render(html`
    <style>${Input.checkboxStyles}</style>
    <style>${callStackSidebarPaneStyles}</style>
    <div
      class="ignore-listed-message"
      ?hidden=${!input.showIgnoreListMessage}>
      <label class="ignore-listed-message-label">
        <input type="checkbox" tabindex="0" class="ignore-listed-checkbox"
            .checked=${input.showIgnoreListedChecked}
            jslog=${VisualLogging.toggle('show-ignore-listed-frames').track({change: true})}
            @change=${(e: Event) => {
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
    ${input.list}
    <div
      class="show-more-message"
      ?hidden=${!input.showMore}>
      <button class="link"
          jslog=${VisualLogging.action('show-more').track({click: true})}
          @click=${input.onShowMore}>${i18nString(UIStrings.showMore)}</button>
    </div>
  `, target, {container: {attributes: {jslog: `${VisualLogging.section('sources.callstack')}`}}});
};
// clang-format on

// clang-format off
export const DEFAULT_ITEM_VIEW =
    (input: ItemViewInput, _output: undefined, target: DocumentFragment | HTMLElement): void => {
  const isHidden = !input.showIgnoreListed && input.item.isIgnoreListed;
  const isAsyncHeader = input.item.isAsyncHeader;
  const isIgnoreListed = !isAsyncHeader && input.item.isIgnoreListed;
  const hasFrame = Boolean(input.item.frame);
  const missingDebugInfoTooltip = input.item.frame?.missingDebugInfo ?
      getMissingDebugInfoTooltip(input.item.frame.missingDebugInfo, input.item.frame.sdkFrame.functionName) :
      undefined;

  render(html`
    <div class=${classMap({
      'call-frame-item': true,
      'async-header': isAsyncHeader,
      'ignore-listed-call-frame': isIgnoreListed,
      selected: input.isSelected,
    })}
        ?hidden=${isHidden}
        tabindex=${input.isFocused ? 0 : -1}
        aria-selected=${input.isSelected ? 'true' : 'false'}
        aria-description=${ifDefined(isIgnoreListed ? i18nString(UIStrings.onIgnoreList) : undefined)}
        aria-disabled=${ifDefined(!isAsyncHeader && !hasFrame ? 'true' : undefined)}>
      <div class="call-frame-item-title">
        <div class="call-frame-title-text"
            title=${ifDefined(!isAsyncHeader ? input.item.title : undefined)}>${input.item.title}</div>
      </div>
      ${!isAsyncHeader ? html`
        <div class="call-frame-location"
            title=${input.item.linkText}>${Platform.StringUtilities.trimMiddle(input.item.linkText, 30)}</div>
      ` : nothing}
      <devtools-icon .name=${'large-arrow-right-filled'} class="selected-call-frame-icon small"></devtools-icon>
      ${missingDebugInfoTooltip ? html`
        <devtools-icon .name=${'warning-filled'} class="call-frame-warning-icon small"
            title=${missingDebugInfoTooltip}></devtools-icon>
      ` : nothing}
    </div>
  `, target);
};
// clang-format on

let callstackSidebarPaneInstance: CallStackSidebarPane;

export class CallStackSidebarPane extends UI.View.SimpleView<DocumentFragment> implements
    UI.ContextFlavorListener.ContextFlavorListener, UI.ListControl.ListDelegate<Item> {
  readonly #view: View;
  readonly #itemView: ItemView;

  private readonly items: UI.ListModel.ListModel<Item>;
  private list: UI.ListControl.ListControl<Item>;

  #showIgnoreListed = false;
  #showIgnoreListMessage = false;
  #ignoreListCheckboxChecked = false;
  #warnings?: string;
  #hasMore = false;
  private maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
  private readonly updateItemThrottler = new Common.Throttler.Throttler(100);
  private readonly scheduledForUpdateItems = new Set<Item>();
  private muteActivateItem?: boolean;

  #stackTrace: StackTrace.StackTrace.DebuggableStackTrace|null = null;
  #flavorChangeId = 0;

  constructor(
      element?: HTMLElement,
      view: View = DEFAULT_VIEW,
      itemView: ItemView = DEFAULT_ITEM_VIEW,
  ) {
    super(element, {
      title: i18nString(UIStrings.callStack),
      viewId: 'sources.callstack',
      useShadowDom: 'pure',
    });
    this.#view = view;
    this.#itemView = itemView;

    this.items = new UI.ListModel.ListModel();
    this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.NonViewport);
    this.list.element.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
    self.onInvokeElement(this.list.element, event => {
      const item = event.target instanceof Node ? this.list.itemForNode(event.target) : null;
      if (item) {
        this.activateItem(item);
        event.consume(true);
      }
    });

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

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #onIgnoreListCheckboxChanged(checked: boolean): void {
    this.#ignoreListCheckboxChecked = checked;
    this.#showIgnoreListed = checked;
    for (const item of this.items) {
      this.refreshItem(item);
    }
    this.requestUpdate();
  }

  #onShowMoreClicked(): void {
    this.maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
    this.requestUpdate();
  }

  async flavorChanged(details: SDK.DebuggerModel.DebuggerPausedDetails|null): Promise<void> {
    const flavorChangeId = ++this.#flavorChangeId;
    this.#showIgnoreListed = false;
    this.#ignoreListCheckboxChecked = false;
    this.#showIgnoreListMessage = false;
    this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;

    if (this.#stackTrace) {
      this.#stackTrace.removeEventListener(StackTrace.StackTrace.Events.UPDATED, this.requestUpdate, this);
      this.#stackTrace = null;
      this.requestUpdate();  // In case creating the stack trace takes a while, we render an empty view first.
    }

    if (details) {
      const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                             .createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
      if (flavorChangeId !== this.#flavorChangeId) {
        return;
      }
      this.#stackTrace = stackTrace;
      this.#stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, this.requestUpdate, this);
    }

    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#stackTrace) {
      this.#warnings = undefined;
      this.#hasMore = false;
      this.#showIgnoreListMessage = false;
      this.items.replaceAll([]);
      UI.Context.Context.instance().setFlavor(StackTrace.StackTrace.DebuggableFrameFlavor, null);
      const viewInput: ViewInput = {
        showIgnoreListMessage: this.#showIgnoreListMessage,
        showIgnoreListedChecked: this.#ignoreListCheckboxChecked,
        onIgnoreListCheckboxChange: this.#onIgnoreListCheckboxChanged.bind(this),
        notPaused: true,
        warnings: undefined,
        list: html`${this.list.element}`,
        showMore: false,
        onShowMore: this.#onShowMoreClicked.bind(this),
      };
      this.#view(viewInput, undefined, this.contentElement);
      return;
    }

    const items: Item[] = [];
    const uniqueWarnings = new Set<string>();
    for (const frame of this.#stackTrace.syncFragment.frames) {
      items.push(Item.createForDebuggableFrame(frame));
      if (frame.missingDebugInfo) {
        uniqueWarnings.add(convertMissingDebugInfo(frame.missingDebugInfo, frame.sdkFrame.functionName).details);
      }
    }

    this.#warnings = uniqueWarnings.size ? Array.from(uniqueWarnings).join('\n') : undefined;

    let {maxAsyncStackChainDepth} = this;
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

    const hasIgnoreListed = items.some(item => item.isIgnoreListed);
    const allIgnoreListed = items.length > 0 && items.every(item => item.isIgnoreListed);

    if (allIgnoreListed) {
      this.#showIgnoreListed = true;
      this.#showIgnoreListMessage = false;
    } else {
      this.#showIgnoreListed = this.#ignoreListCheckboxChecked;
      this.#showIgnoreListMessage = hasIgnoreListed;
    }

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

    const viewInput: ViewInput = {
      showIgnoreListMessage: this.#showIgnoreListMessage,
      showIgnoreListedChecked: this.#ignoreListCheckboxChecked,
      onIgnoreListCheckboxChange: this.#onIgnoreListCheckboxChanged.bind(this),
      notPaused: false,
      warnings: this.#warnings,
      list: html`${this.list.element}`,
      showMore: this.#hasMore,
      onShowMore: this.#onShowMoreClicked.bind(this),
    };
    this.#view(viewInput, undefined, this.contentElement);
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
      let shouldUpdateView = false;
      const allIgnoreListed = this.items.length > 0 && this.items.every(item => item.isIgnoreListed);
      if (allIgnoreListed) {
        if (!this.#showIgnoreListed) {
          this.#showIgnoreListed = true;
          for (let i = 0; i < this.items.length; ++i) {
            this.list.refreshItemByIndex(i);
          }
        } else {
          const itemsSet = new Set<Item>(items);
          for (let i = 0; i < this.items.length; ++i) {
            if (itemsSet.has(this.items.at(i))) {
              this.list.refreshItemByIndex(i);
            }
          }
        }
        if (this.#showIgnoreListMessage) {
          this.#showIgnoreListMessage = false;
          shouldUpdateView = true;
        }
      } else {
        this.#showIgnoreListed = this.#ignoreListCheckboxChecked;
        const itemsSet = new Set<Item>(items);
        let hasIgnoreListed = false;
        for (let i = 0; i < this.items.length; ++i) {
          const item = this.items.at(i);
          if (itemsSet.has(item)) {
            this.list.refreshItemByIndex(i);
          }
          hasIgnoreListed = hasIgnoreListed || item.isIgnoreListed;
        }
        if (this.#showIgnoreListMessage !== hasIgnoreListed) {
          this.#showIgnoreListMessage = hasIgnoreListed;
          shouldUpdateView = true;
        }
      }
      if (shouldUpdateView) {
        this.requestUpdate();
      }
      delete this.muteActivateItem;
    });
  }

  createElementForItem(item: Item): Element {
    const isSelected =
        item.frame === UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor)?.frame;
    const isFocused = item === this.list.selectedItem();
    const fragment = document.createDocumentFragment();
    this.#itemView(
        {
          item,
          isSelected,
          isFocused,
          showIgnoreListed: this.#showIgnoreListed,
        },
        undefined,
        fragment,
    );
    const element = fragment.firstElementChild;
    if (!element) {
      throw new Error('Expected item element to be rendered');
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
    const item = event.target instanceof Node ? this.list.itemForNode(event.target) : null;
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
    const frameFlavor = UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor);
    if (frameFlavor) {
      return this.items.find(callFrameItem => callFrameItem.frame === frameFlavor.frame) || null;
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

export const elementSymbol: unique symbol = Symbol('element');
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
      stackTrace: StackTrace.StackTrace.StackTrace, fragment: StackTrace.StackTrace.AsyncFragment): Item {
    const description = UI.UIUtils.asyncFragmentLabel(stackTrace, fragment);
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
        resources: missingDebugInfo.missingDebugFiles,
      };
    case StackTrace.StackTrace.MissingDebugInfoType.NO_INFO:
      return {
        details: i18nString(UIStrings.failedToLoadDebugSymbolsForFunction, {PH1: functionName ?? ''}),
        resources: [],
      };
  }
}
