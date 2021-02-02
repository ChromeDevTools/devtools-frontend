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

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Persistence from '../persistence/persistence.js';
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

/** @type {!CallStackSidebarPane} */
let callstackSidebarPaneInstance;

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @implements {UI.ListControl.ListDelegate<!Item>}
 */
export class CallStackSidebarPane extends UI.View.SimpleView {
  /**
   * @private
   */
  constructor() {
    super(Common.UIString.UIString('Call Stack'), true);
    this.registerRequiredCSS('sources/callStackSidebarPane.css', {enableLegacyPatching: true});

    this._ignoreListMessageElement = this._createIgnoreListMessageElement();
    this.contentElement.appendChild(this._ignoreListMessageElement);

    this._notPausedMessageElement = this.contentElement.createChild('div', 'gray-info-message');
    this._notPausedMessageElement.textContent = Common.UIString.UIString('Not paused');
    this._notPausedMessageElement.tabIndex = -1;

    /** @type {!UI.ListModel.ListModel<!Item>} */
    this._items = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl<!Item>} */
    this._list = new UI.ListControl.ListControl(this._items, this, UI.ListControl.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);
    this._list.element.addEventListener('contextmenu', this._onContextMenu.bind(this), false);
    self.onInvokeElement(this._list.element, event => {
      const item = this._list.itemForNode(/** @type {?Node} */ (event.target));
      if (item) {
        this._activateItem(item);
        event.consume(true);
      }
    });

    this._showMoreMessageElement = this._createShowMoreMessageElement();
    this._showMoreMessageElement.classList.add('hidden');
    this.contentElement.appendChild(this._showMoreMessageElement);

    this._showIgnoreListed = false;
    this._locationPool = new Bindings.LiveLocation.LiveLocationPool();

    this._updateThrottler = new Common.Throttler.Throttler(100);
    this._maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this._update();

    this._updateItemThrottler = new Common.Throttler.Throttler(100);
    this._scheduledForUpdateItems = new Set();
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!callstackSidebarPaneInstance || forceNew) {
      callstackSidebarPaneInstance = new CallStackSidebarPane();
    }

    return callstackSidebarPaneInstance;
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._showIgnoreListed = false;
    this._maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this._update();
  }

  _update() {
    this._updateThrottler.schedule(() => this._doUpdate());
  }

  /**
   * @return {!Promise<void>}
   */
  async _doUpdate() {
    this._locationPool.disposeAll();

    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (!details) {
      this.setDefaultFocusedElement(this._notPausedMessageElement);
      this._notPausedMessageElement.classList.remove('hidden');
      this._ignoreListMessageElement.classList.add('hidden');
      this._showMoreMessageElement.classList.add('hidden');
      this._items.replaceAll([]);
      UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, null);
      return;
    }

    /** @type {?SDK.DebuggerModel.DebuggerModel} */
    let debuggerModel = details.debuggerModel;
    this._notPausedMessageElement.classList.add('hidden');

    const itemPromises = [];
    for (const frame of details.callFrames) {
      const itemPromise =
          Item.createForDebuggerCallFrame(frame, this._locationPool, this._refreshItem.bind(this)).then(item => {
            itemToCallFrame.set(item, frame);
            return item;
          });
      itemPromises.push(itemPromise);
    }
    const items = await Promise.all(itemPromises);

    /** @type {(?Protocol.Runtime.StackTrace|undefined)} */
    let asyncStackTrace = details.asyncStackTrace;
    if (!asyncStackTrace && details.asyncStackTraceId) {
      if (details.asyncStackTraceId.debuggerId) {
        debuggerModel = await SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(details.asyncStackTraceId.debuggerId);
      }
      asyncStackTrace = debuggerModel ? await debuggerModel.fetchAsyncStackTrace(details.asyncStackTraceId) : null;
    }
    /** @type {!Array<!{functionName: string}>} */
    let previousStackTrace = details.callFrames;
    let maxAsyncStackChainDepth = this._maxAsyncStackChainDepth;
    while (asyncStackTrace && maxAsyncStackChainDepth > 0) {
      let title = '';
      const isAwait = asyncStackTrace.description === 'async function';
      if (isAwait && previousStackTrace.length && asyncStackTrace.callFrames.length) {
        const lastPreviousFrame = previousStackTrace[previousStackTrace.length - 1];
        const lastPreviousFrameName = UI.UIUtils.beautifyFunctionName(lastPreviousFrame.functionName);
        title = UI.UIUtils.asyncStackTraceLabel('await in ' + lastPreviousFrameName);
      } else {
        title = UI.UIUtils.asyncStackTraceLabel(asyncStackTrace.description);
      }

      items.push(...await Item.createItemsForAsyncStack(
          title, debuggerModel, asyncStackTrace.callFrames, this._locationPool, this._refreshItem.bind(this)));

      --maxAsyncStackChainDepth;
      previousStackTrace = asyncStackTrace.callFrames;
      if (asyncStackTrace.parent) {
        asyncStackTrace = asyncStackTrace.parent;
      } else if (asyncStackTrace.parentId) {
        if (asyncStackTrace.parentId.debuggerId) {
          debuggerModel = await SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(asyncStackTrace.parentId.debuggerId);
        }
        asyncStackTrace = debuggerModel ? await debuggerModel.fetchAsyncStackTrace(asyncStackTrace.parentId) : null;
      } else {
        asyncStackTrace = null;
      }
    }
    this._showMoreMessageElement.classList.toggle('hidden', !asyncStackTrace);
    this._items.replaceAll(items);
    if (this._maxAsyncStackChainDepth === defaultMaxAsyncStackChainDepth) {
      this._list.selectNextItem(true /* canWrap */, false /* center */);
      const selectedItem = this._list.selectedItem();
      if (selectedItem) {
        this._activateItem(selectedItem);
      }
    }
    this._updatedForTest();
  }

  _updatedForTest() {
  }

  /**
   * @param {!Item} item
   */
  _refreshItem(item) {
    this._scheduledForUpdateItems.add(item);
    this._updateItemThrottler.schedule(async () => {
      const items = Array.from(this._scheduledForUpdateItems);
      this._scheduledForUpdateItems.clear();

      this._muteActivateItem = true;
      if (!this._showIgnoreListed && this._items.every(item => item.isIgnoreListed)) {
        this._showIgnoreListed = true;
        for (let i = 0; i < this._items.length; ++i) {
          this._list.refreshItemByIndex(i);
        }
        this._ignoreListMessageElement.classList.toggle('hidden', true);
      } else {
        const itemsSet = new Set(items);
        let hasIgnoreListed = false;
        for (let i = 0; i < this._items.length; ++i) {
          const item = this._items.at(i);
          if (itemsSet.has(item)) {
            this._list.refreshItemByIndex(i);
          }
          hasIgnoreListed = hasIgnoreListed || item.isIgnoreListed;
        }
        this._ignoreListMessageElement.classList.toggle('hidden', this._showIgnoreListed || !hasIgnoreListed);
      }
      delete this._muteActivateItem;
    });
  }

  /**
   * @override
   * @param {!Item} item
   * @return {!Element}
   */
  createElementForItem(item) {
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
        UI.ARIAUtils.setDescription(element, ls`on ignore list`);
      }
      if (!itemToCallFrame.has(item)) {
        UI.ARIAUtils.setDisabled(element, true);
      }
    }
    const isSelected = itemToCallFrame.get(item) === UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    element.classList.toggle('selected', isSelected);
    UI.ARIAUtils.setSelected(element, isSelected);
    element.classList.toggle('hidden', !this._showIgnoreListed && item.isIgnoreListed);
    element.appendChild(UI.Icon.Icon.create('smallicon-thick-right-arrow', 'selected-call-frame-icon'));
    element.tabIndex = item === this._list.selectedItem() ? 0 : -1;
    return element;
  }

  /**
   * @override
   * @param {!Item} item
   * @return {number}
   */
  heightForItem(item) {
    console.assert(false);  // Should not be called.
    return 0;
  }

  /**
   * @override
   * @param {!Item} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?Item} from
   * @param {?Item} to
   * @param {?HTMLElement} fromElement
   * @param {?HTMLElement} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
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

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return true;
  }

  /**
   * @return {!Element}
   */
  _createIgnoreListMessageElement() {
    const element = document.createElement('div');
    element.classList.add('ignore-listed-message');
    element.createChild('span');
    const showAllLink = element.createChild('span', 'link');
    showAllLink.textContent = Common.UIString.UIString('Show ignore-listed frames');
    UI.ARIAUtils.markAsLink(showAllLink);
    showAllLink.tabIndex = 0;
    const showAll = () => {
      this._showIgnoreListed = true;
      for (const item of this._items) {
        this._refreshItem(item);
      }
      this._ignoreListMessageElement.classList.toggle('hidden', true);
    };
    showAllLink.addEventListener('click', showAll);
    showAllLink.addEventListener('keydown', event => event.key === 'Enter' && showAll());
    return element;
  }

  /**
   * @return {!Element}
   */
  _createShowMoreMessageElement() {
    const element = document.createElement('div');
    element.classList.add('show-more-message');
    element.createChild('span');
    const showAllLink = element.createChild('span', 'link');
    showAllLink.textContent = Common.UIString.UIString('Show more');
    showAllLink.addEventListener('click', () => {
      this._maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
      this._update();
    }, false);
    return element;
  }

  /**
   * @param {!Event} event
   */
  _onContextMenu(event) {
    const item = this._list.itemForNode(/** @type {?Node} */ (event.target));
    if (!item) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const debuggerCallFrame = itemToCallFrame.get(item);
    if (debuggerCallFrame) {
      contextMenu.defaultSection().appendItem(
          Common.UIString.UIString('Restart frame'), () => debuggerCallFrame.restart());
    }
    contextMenu.defaultSection().appendItem(
        Common.UIString.UIString('Copy stack trace'), this._copyStackTrace.bind(this));
    if (item.uiLocation) {
      this.appendIgnoreListURLContextMenuItems(contextMenu, item.uiLocation.uiSourceCode);
    }
    contextMenu.show();
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    const item = this._list.itemForNode(/** @type {?Node} */ (event.target));
    if (item) {
      this._activateItem(item);
    }
  }

  /**
   * @param {!Item} item
   */
  _activateItem(item) {
    const uiLocation = item.uiLocation;
    if (this._muteActivateItem || !uiLocation) {
      return;
    }
    this._list.selectItem(item);
    const debuggerCallFrame = itemToCallFrame.get(item);
    const oldItem = this.activeCallFrameItem();
    if (debuggerCallFrame && oldItem !== item) {
      debuggerCallFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame);
      UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.CallFrame, debuggerCallFrame);
      if (oldItem) {
        this._refreshItem(oldItem);
      }
      this._refreshItem(item);
    } else {
      Common.Revealer.reveal(uiLocation);
    }
  }

  /**
   * @return {?Item}
   */
  activeCallFrameItem() {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (callFrame) {
      return this._items.find(callFrameItem => itemToCallFrame.get(callFrameItem) === callFrame) || null;
    }
    return null;
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      uiSourceCode = binding.network;
    }
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const canIgnoreList =
        Bindings.IgnoreListManager.IgnoreListManager.instance().canIgnoreListUISourceCode(uiSourceCode);
    const isIgnoreListed =
        Bindings.IgnoreListManager.IgnoreListManager.instance().isIgnoreListedUISourceCode(uiSourceCode);
    const isContentScript = uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;

    const manager = Bindings.IgnoreListManager.IgnoreListManager.instance();
    if (canIgnoreList) {
      if (isIgnoreListed) {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Remove from ignore list'),
            manager.unIgnoreListUISourceCode.bind(manager, uiSourceCode));
      } else {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Add script to ignore list'),
            manager.ignoreListUISourceCode.bind(manager, uiSourceCode));
      }
    }
    if (isContentScript) {
      if (isIgnoreListed) {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Remove all content scripts from ignore list'),
            manager.ignoreListContentScripts.bind(manager));
      } else {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Add all content scripts to ignore list'),
            manager.unIgnoreListContentScripts.bind(manager));
      }
    }
  }

  _selectNextCallFrameOnStack() {
    const oldItem = this.activeCallFrameItem();
    const startIndex = oldItem ? this._items.indexOf(oldItem) + 1 : 0;
    for (let i = startIndex; i < this._items.length; i++) {
      const newItem = this._items.at(i);
      if (itemToCallFrame.has(newItem)) {
        this._activateItem(newItem);
        break;
      }
    }
  }

  _selectPreviousCallFrameOnStack() {
    const oldItem = this.activeCallFrameItem();
    const startIndex = oldItem ? this._items.indexOf(oldItem) - 1 : this._items.length - 1;
    for (let i = startIndex; i >= 0; i--) {
      const newItem = this._items.at(i);
      if (itemToCallFrame.has(newItem)) {
        this._activateItem(newItem);
        break;
      }
    }
  }

  _copyStackTrace() {
    const text = [];
    for (const item of this._items) {
      let itemText = item.title;
      if (item.uiLocation) {
        itemText += ' (' + item.uiLocation.linkText(true /* skipTrim */) + ')';
      }
      text.push(itemText);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text.join('\n'));
  }
}

/** @type {!WeakMap<!Item, !SDK.DebuggerModel.CallFrame>} */
const itemToCallFrame = new WeakMap();

export const elementSymbol = Symbol('element');
export const defaultMaxAsyncStackChainDepth = 32;

/** @type {!ActionDelegate} */
let actionDelegateInstance;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @param {{forceNew: ?boolean}=} opts
   * @return {!ActionDelegate}
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'debugger.next-call-frame':
        CallStackSidebarPane.instance()._selectNextCallFrameOnStack();
        return true;
      case 'debugger.previous-call-frame':
        CallStackSidebarPane.instance()._selectPreviousCallFrameOnStack();
        return true;
    }
    return false;
  }
}

export class Item {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} frame
   * @param {!Bindings.LiveLocation.LiveLocationPool} locationPool
   * @param {function(!Item):void} updateDelegate
   * @return {!Promise<!Item>}
   */
  static async createForDebuggerCallFrame(frame, locationPool, updateDelegate) {
    const item = new Item(UI.UIUtils.beautifyFunctionName(frame.functionName), updateDelegate);
    await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(
        frame.location(), item._update.bind(item), locationPool);
    return item;
  }

  /**
   * @param {string} title
   * @param {?SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Array<!Protocol.Runtime.CallFrame>} frames
   * @param {!Bindings.LiveLocation.LiveLocationPool} locationPool
   * @param {function(!Item):void} updateDelegate
   * @return {!Promise<!Array<!Item>>}
   */
  static async createItemsForAsyncStack(title, debuggerModel, frames, locationPool, updateDelegate) {
    /** @type {!WeakMap<!Item, !Set<!Item>>} */
    const headerItemToItemsSet = new WeakMap();
    const asyncHeaderItem = new Item(title, updateDelegate);
    headerItemToItemsSet.set(asyncHeaderItem, new Set());
    asyncHeaderItem.isAsyncHeader = true;

    const asyncFrameItems = [];
    const liveLocationPromises = [];
    for (const frame of frames) {
      const item = new Item(UI.UIUtils.beautifyFunctionName(frame.functionName), update);
      const rawLocation = debuggerModel ?
          debuggerModel.createRawLocationByScriptId(frame.scriptId, frame.lineNumber, frame.columnNumber) :
          null;
      if (!rawLocation) {
        item.linkText = (frame.url || '<unknown>') + ':' + (frame.lineNumber + 1);
        item.updateDelegate(item);
      } else {
        liveLocationPromises.push(
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(
                rawLocation, item._update.bind(item), locationPool));
      }
      asyncFrameItems.push(item);
    }

    await Promise.all(liveLocationPromises);
    updateDelegate(asyncHeaderItem);

    return [asyncHeaderItem, ...asyncFrameItems];

    /**
     * @param {!Item} item
     */
    function update(item) {
      updateDelegate(item);
      let shouldUpdate = false;
      const items = headerItemToItemsSet.get(asyncHeaderItem);
      if (items) {
        if (item.isIgnoreListed) {
          items.delete(item);
          shouldUpdate = items.size === 0;
        } else {
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

  /**
   * @param {string} title
   * @param {function(!Item):void} updateDelegate
   */
  constructor(title, updateDelegate) {
    this.isIgnoreListed = false;
    this.title = title;
    this.linkText = '';
    this.uiLocation = null;
    this.isAsyncHeader = false;
    this.updateDelegate = updateDelegate;
  }

  /**
   * @param {!Bindings.LiveLocation.LiveLocation} liveLocation
   */
  async _update(liveLocation) {
    const uiLocation = await liveLocation.uiLocation();
    this.isIgnoreListed = await liveLocation.isIgnoreListed();
    this.linkText = uiLocation ? uiLocation.linkText() : '';
    this.uiLocation = uiLocation;
    this.updateDelegate(this);
  }
}
