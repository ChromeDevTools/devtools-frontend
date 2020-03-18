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
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @implements {UI.ListControl.ListDelegate<!Item>}
 * @unrestricted
 */
export class CallStackSidebarPane extends UI.View.SimpleView {
  constructor() {
    super(Common.UIString.UIString('Call Stack'), true);
    this.registerRequiredCSS('sources/callStackSidebarPane.css');

    this._blackboxedMessageElement = this._createBlackboxedMessageElement();
    this.contentElement.appendChild(this._blackboxedMessageElement);

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

    this._showBlackboxed = false;
    this._locationPool = new Bindings.LiveLocation.LiveLocationPool();

    this._updateThrottler = new Common.Throttler.Throttler(100);
    this._maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this._update();

    this._updateItemThrottler = new Common.Throttler.Throttler(100);
    this._scheduledForUpdateItems = new Set();
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._showBlackboxed = false;
    this._maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this._update();
  }

  _update() {
    this._updateThrottler.schedule(() => this._doUpdate());
  }

  /**
   * @return {!Promise<undefined>}
   */
  async _doUpdate() {
    this._locationPool.disposeAll();

    const details = self.UI.context.flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (!details) {
      this.setDefaultFocusedElement(this._notPausedMessageElement);
      this._notPausedMessageElement.classList.remove('hidden');
      this._blackboxedMessageElement.classList.add('hidden');
      this._showMoreMessageElement.classList.add('hidden');
      this._items.replaceAll([]);
      self.UI.context.setFlavor(SDK.DebuggerModel.CallFrame, null);
      return;
    }

    let debuggerModel = details.debuggerModel;
    this._notPausedMessageElement.classList.add('hidden');

    const itemPromises = [];
    for (const frame of details.callFrames) {
      const itemPromise =
          Item.createForDebuggerCallFrame(frame, this._locationPool, this._refreshItem.bind(this)).then(item => {
            item[debuggerCallFrameSymbol] = frame;
            return item;
          });
      itemPromises.push(itemPromise);
    }
    const items = await Promise.all(itemPromises);

    let asyncStackTrace = details.asyncStackTrace;
    if (!asyncStackTrace && details.asyncStackTraceId) {
      if (details.asyncStackTraceId.debuggerId) {
        debuggerModel = SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(details.asyncStackTraceId.debuggerId);
      }
      asyncStackTrace = debuggerModel ? await debuggerModel.fetchAsyncStackTrace(details.asyncStackTraceId) : null;
    }
    let peviousStackTrace = details.callFrames;
    let maxAsyncStackChainDepth = this._maxAsyncStackChainDepth;
    while (asyncStackTrace && maxAsyncStackChainDepth > 0) {
      let title = '';
      const isAwait = asyncStackTrace.description === 'async function';
      if (isAwait && peviousStackTrace.length && asyncStackTrace.callFrames.length) {
        const lastPreviousFrame = peviousStackTrace[peviousStackTrace.length - 1];
        const lastPreviousFrameName = UI.UIUtils.beautifyFunctionName(lastPreviousFrame.functionName);
        title = UI.UIUtils.asyncStackTraceLabel('await in ' + lastPreviousFrameName);
      } else {
        title = UI.UIUtils.asyncStackTraceLabel(asyncStackTrace.description);
      }

      items.push(...await Item.createItemsForAsyncStack(
          title, debuggerModel, asyncStackTrace.callFrames, this._locationPool, this._refreshItem.bind(this)));

      --maxAsyncStackChainDepth;
      peviousStackTrace = asyncStackTrace.callFrames;
      if (asyncStackTrace.parent) {
        asyncStackTrace = asyncStackTrace.parent;
      } else if (asyncStackTrace.parentId) {
        if (asyncStackTrace.parentId.debuggerId) {
          debuggerModel = SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(asyncStackTrace.parentId.debuggerId);
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
    this._updateItemThrottler.schedule(innerUpdate.bind(this));

    /**
     * @this {!CallStackSidebarPane}
     * @return {!Promise<undefined>}
     */
    function innerUpdate() {
      const items = Array.from(this._scheduledForUpdateItems);
      this._scheduledForUpdateItems.clear();

      this._muteActivateItem = true;
      if (!this._showBlackboxed && this._items.every(item => item.isBlackboxed)) {
        this._showBlackboxed = true;
        for (let i = 0; i < this._items.length; ++i) {
          this._list.refreshItemByIndex(i);
        }
        this._blackboxedMessageElement.classList.toggle('hidden', true);
      } else {
        const itemsSet = new Set(items);
        let hasBlackboxed = false;
        for (let i = 0; i < this._items.length; ++i) {
          const item = this._items.at(i);
          if (itemsSet.has(item)) {
            this._list.refreshItemByIndex(i);
          }
          hasBlackboxed = hasBlackboxed || item.isBlackboxed;
        }
        this._blackboxedMessageElement.classList.toggle('hidden', this._showBlackboxed || !hasBlackboxed);
      }
      delete this._muteActivateItem;
      return Promise.resolve();
    }
  }

  /**
   * @override
   * @param {!Item} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = createElementWithClass('div', 'call-frame-item');
    const title = element.createChild('div', 'call-frame-item-title');
    title.createChild('div', 'call-frame-title-text').textContent = item.title;
    if (item.isAsyncHeader) {
      element.classList.add('async-header');
    } else {
      const linkElement = element.createChild('div', 'call-frame-location');
      linkElement.textContent = item.linkText.trimMiddle(30);
      linkElement.title = item.linkText;
      element.classList.toggle('blackboxed-call-frame', item.isBlackboxed);
      if (item.isBlackboxed) {
        UI.ARIAUtils.setDescription(element, ls`blackboxed`);
      }
      if (!item[debuggerCallFrameSymbol]) {
        UI.ARIAUtils.setDisabled(element, true);
      }
    }
    const isSelected = item[debuggerCallFrameSymbol] === self.UI.context.flavor(SDK.DebuggerModel.CallFrame);
    element.classList.toggle('selected', isSelected);
    UI.ARIAUtils.setSelected(element, isSelected);
    element.classList.toggle('hidden', !this._showBlackboxed && item.isBlackboxed);
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
   * @param {?Element} fromElement
   * @param {?Element} toElement
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
  _createBlackboxedMessageElement() {
    const element = createElementWithClass('div', 'blackboxed-message');
    element.createChild('span');
    const showAllLink = element.createChild('span', 'link');
    showAllLink.textContent = Common.UIString.UIString('Show blackboxed frames');
    UI.ARIAUtils.markAsLink(showAllLink);
    showAllLink.tabIndex = 0;
    const showAll = () => {
      this._showBlackboxed = true;
      for (const item of this._items) {
        this._refreshItem(item);
      }
      this._blackboxedMessageElement.classList.toggle('hidden', true);
    };
    showAllLink.addEventListener('click', showAll);
    showAllLink.addEventListener('keydown', event => isEnterKey(event) && showAll());
    return element;
  }

  /**
   * @return {!Element}
   */
  _createShowMoreMessageElement() {
    const element = createElementWithClass('div', 'show-more-message');
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
    const debuggerCallFrame = item[debuggerCallFrameSymbol];
    if (debuggerCallFrame) {
      contextMenu.defaultSection().appendItem(
          Common.UIString.UIString('Restart frame'), () => debuggerCallFrame.restart());
    }
    contextMenu.defaultSection().appendItem(
        Common.UIString.UIString('Copy stack trace'), this._copyStackTrace.bind(this));
    if (item.uiLocation) {
      this.appendBlackboxURLContextMenuItems(contextMenu, item.uiLocation.uiSourceCode);
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
    const debuggerCallFrame = item[debuggerCallFrameSymbol];
    const oldItem = this.activeCallFrameItem();
    if (debuggerCallFrame && oldItem !== item) {
      debuggerCallFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame);
      self.UI.context.setFlavor(SDK.DebuggerModel.CallFrame, debuggerCallFrame);
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
    const callFrame = self.UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (callFrame) {
      return this._items.find(callFrameItem => callFrameItem[debuggerCallFrameSymbol] === callFrame) || null;
    }
    return null;
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  appendBlackboxURLContextMenuItems(contextMenu, uiSourceCode) {
    const binding = self.Persistence.persistence.binding(uiSourceCode);
    if (binding) {
      uiSourceCode = binding.network;
    }
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const canBlackbox = Bindings.BlackboxManager.BlackboxManager.instance().canBlackboxUISourceCode(uiSourceCode);
    const isBlackboxed = Bindings.BlackboxManager.BlackboxManager.instance().isBlackboxedUISourceCode(uiSourceCode);
    const isContentScript = uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;

    const manager = Bindings.BlackboxManager.BlackboxManager.instance();
    if (canBlackbox) {
      if (isBlackboxed) {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Stop blackboxing'), manager.unblackboxUISourceCode.bind(manager, uiSourceCode));
      } else {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Blackbox script'), manager.blackboxUISourceCode.bind(manager, uiSourceCode));
      }
    }
    if (isContentScript) {
      if (isBlackboxed) {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Stop blackboxing all content scripts'),
            manager.blackboxContentScripts.bind(manager));
      } else {
        contextMenu.defaultSection().appendItem(
            Common.UIString.UIString('Blackbox all content scripts'), manager.unblackboxContentScripts.bind(manager));
      }
    }
  }

  _selectNextCallFrameOnStack() {
    const oldItem = this.activeCallFrameItem();
    const startIndex = oldItem ? this._items.indexOf(oldItem) + 1 : 0;
    for (let i = startIndex; i < this._items.length; i++) {
      const newItem = this._items.at(i);
      if (newItem[debuggerCallFrameSymbol]) {
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
      if (newItem[debuggerCallFrameSymbol]) {
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

export const debuggerCallFrameSymbol = Symbol('debuggerCallFrame');
export const elementSymbol = Symbol('element');
export const defaultMaxAsyncStackChainDepth = 32;

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const callStackSidebarPane = self.runtime.sharedInstance(CallStackSidebarPane);
    switch (actionId) {
      case 'debugger.next-call-frame':
        callStackSidebarPane._selectNextCallFrameOnStack();
        return true;
      case 'debugger.previous-call-frame':
        callStackSidebarPane._selectPreviousCallFrameOnStack();
        return true;
    }
    return false;
  }
}

export class Item {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} frame
   * @param {!Bindings.LiveLocation.LiveLocationPool} locationPool
   * @param {function(!Item)} updateDelegate
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
   * @param {function(!Item)} updateDelegate
   * @return {!Promise<!Array<!Item>>}
   */
  static async createItemsForAsyncStack(title, debuggerModel, frames, locationPool, updateDelegate) {
    const whiteboxedItemsSymbol = Symbol('whiteboxedItems');
    const asyncHeaderItem = new Item(title, updateDelegate);
    asyncHeaderItem[whiteboxedItemsSymbol] = new Set();
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
      const items = asyncHeaderItem[whiteboxedItemsSymbol];
      if (item.isBlackboxed) {
        items.delete(item);
        shouldUpdate = items.size === 0;
      } else {
        shouldUpdate = items.size === 0;
        items.add(item);
      }
      asyncHeaderItem.isBlackboxed = asyncHeaderItem[whiteboxedItemsSymbol].size === 0;
      if (shouldUpdate) {
        updateDelegate(asyncHeaderItem);
      }
    }
  }

  /**
   * @param {string} title
   * @param {function(!Item)} updateDelegate
   */
  constructor(title, updateDelegate) {
    this.isBlackboxed = false;
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
    this.isBlackboxed = await liveLocation.isBlackboxed();
    this.linkText = uiLocation ? uiLocation.linkText() : '';
    this.uiLocation = uiLocation;
    this.updateDelegate(this);
  }
}
