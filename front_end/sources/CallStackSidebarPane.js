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

/**
 * @implements {UI.ContextFlavorListener}
 * @implements {UI.ListDelegate<!Sources.CallStackSidebarPane.Item>}
 * @unrestricted
 */
Sources.CallStackSidebarPane = class extends UI.SimpleView {
  constructor() {
    super(Common.UIString('Call Stack'), true);
    this.registerRequiredCSS('sources/callStackSidebarPane.css');

    this._blackboxedMessageElement = this._createBlackboxedMessageElement();
    this.contentElement.appendChild(this._blackboxedMessageElement);

    this._notPausedMessageElement = this.contentElement.createChild('div', 'gray-info-message');
    this._notPausedMessageElement.textContent = Common.UIString('Not Paused');

    /** @type {!UI.ListControl<!Sources.CallStackSidebarPane.Item>} */
    this._list = new UI.ListControl(this, UI.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);
    this._list.element.addEventListener('contextmenu', this._onContextMenu.bind(this), false);
    this._list.element.addEventListener('click', this._onClick.bind(this), false);

    this._showBlackboxed = false;
    Bindings.blackboxManager.addChangeListener(this._update.bind(this));
    this._locationPool = new Bindings.LiveLocationPool();

    this._update();
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._showBlackboxed = false;
    this._update();
  }

  _update() {
    this._locationPool.disposeAll();

    var details = UI.context.flavor(SDK.DebuggerPausedDetails);
    if (!details) {
      this._notPausedMessageElement.classList.remove('hidden');
      this._blackboxedMessageElement.classList.add('hidden');
      this._list.replaceAllItems([]);
      this._debuggerModel = null;
      UI.context.setFlavor(SDK.DebuggerModel.CallFrame, null);
      return;
    }

    this._debuggerModel = details.debuggerModel;
    this._notPausedMessageElement.classList.add('hidden');

    var showBlackboxed = this._showBlackboxed ||
        details.callFrames.every(frame => Bindings.blackboxManager.isBlackboxedRawLocation(frame.location()));

    var hiddenCallFramesCount = 0;
    var items = details.callFrames.map(frame => ({debuggerCallFrame: frame}));
    if (!showBlackboxed) {
      items = items.filter(
          item => !Bindings.blackboxManager.isBlackboxedRawLocation(
              /** @type {!SDK.DebuggerModel.Location} */ (this._itemLocation(item))));
      hiddenCallFramesCount += details.callFrames.length - items.length;
    }

    var asyncStackTrace = details.asyncStackTrace;
    var peviousStackTrace = details.callFrames;
    while (asyncStackTrace) {
      var title = '';
      var isAwait = asyncStackTrace.description === 'async function';
      if (isAwait && peviousStackTrace.length && asyncStackTrace.callFrames.length) {
        var lastPreviousFrame = peviousStackTrace[peviousStackTrace.length - 1];
        var topFrame = asyncStackTrace.callFrames[0];
        var lastPreviousFrameName = UI.beautifyFunctionName(lastPreviousFrame.functionName);
        var topFrameName = UI.beautifyFunctionName(topFrame.functionName);
        title = topFrameName + ' awaits ' + lastPreviousFrameName;
      } else {
        title = UI.asyncStackTraceLabel(asyncStackTrace.description);
      }

      var asyncItems = asyncStackTrace.callFrames.map(frame => ({runtimeCallFrame: frame}));
      if (!showBlackboxed) {
        asyncItems = asyncItems.filter(
            item => !Bindings.blackboxManager.isBlackboxedRawLocation(
                /** @type {!SDK.DebuggerModel.Location} */ (this._itemLocation(item))));
        hiddenCallFramesCount += asyncStackTrace.callFrames.length - asyncItems.length;
      }

      if (asyncStackTrace.promiseCreationFrame && !isAwait) {
        var chainedItem = {promiseCreationFrame: asyncStackTrace.promiseCreationFrame};
        if (!Bindings.blackboxManager.isBlackboxedRawLocation(
                /** @type {!SDK.DebuggerModel.Location} */ (this._itemLocation(chainedItem))))
          items.push(chainedItem);
      }

      if (asyncItems.length) {
        items.push({asyncStackHeader: title});
        items = items.concat(asyncItems);
      }

      peviousStackTrace = asyncStackTrace.callFrames;
      asyncStackTrace = asyncStackTrace.parent;
    }

    if (!hiddenCallFramesCount) {
      this._blackboxedMessageElement.classList.add('hidden');
    } else {
      if (hiddenCallFramesCount === 1) {
        this._blackboxedMessageElement.firstChild.textContent =
            Common.UIString('1 stack frame is hidden (black-boxed).');
      } else {
        this._blackboxedMessageElement.firstChild.textContent =
            Common.UIString('%d stack frames are hidden (black-boxed).', hiddenCallFramesCount);
      }
      this._blackboxedMessageElement.classList.remove('hidden');
    }

    this._list.replaceAllItems(items);
    this._list.selectNextItem(true /* canWrap */, false /* center */);
  }

  /**
   * @override
   * @param {!Sources.CallStackSidebarPane.Item} item
   * @return {!Element}
   */
  createElementForItem(item) {
    var element = createElementWithClass('div', 'call-frame-item');
    var title = element.createChild('div', 'call-frame-item-title');
    if (item.promiseCreationFrame)
      title.createChild('div', 'call-frame-chained-arrow').textContent = '\u2935';
    title.createChild('div', 'call-frame-title-text').textContent = this._itemTitle(item);
    if (item.asyncStackHeader)
      element.classList.add('async-header');

    var location = this._itemLocation(item);
    if (location) {
      if (Bindings.blackboxManager.isBlackboxedRawLocation(location))
        element.classList.add('blackboxed-call-frame');

      /**
       * @param {!Bindings.LiveLocation} liveLocation
       */
      function updateLocation(liveLocation) {
        var uiLocation = liveLocation.uiLocation();
        if (!uiLocation)
          return;
        var text = uiLocation.linkText();
        linkElement.textContent = text.trimMiddle(30);
        linkElement.title = text;
      }

      var linkElement = element.createChild('div', 'call-frame-location');
      Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(location, updateLocation, this._locationPool);
    }

    element.appendChild(UI.Icon.create('smallicon-thick-right-arrow', 'selected-call-frame-icon'));
    return element;
  }

  /**
   * @override
   * @param {!Sources.CallStackSidebarPane.Item} item
   * @return {number}
   */
  heightForItem(item) {
    console.assert(false);  // Should not be called.
    return 0;
  }

  /**
   * @override
   * @param {!Sources.CallStackSidebarPane.Item} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return !!item.debuggerCallFrame;
  }

  /**
   * @override
   * @param {?Sources.CallStackSidebarPane.Item} from
   * @param {?Sources.CallStackSidebarPane.Item} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected');
    if (toElement)
      toElement.classList.add('selected');
    if (to)
      this._activateItem(to);
  }

  /**
   * @param {!Sources.CallStackSidebarPane.Item} item
   * @return {string}
   */
  _itemTitle(item) {
    if (item.debuggerCallFrame)
      return UI.beautifyFunctionName(item.debuggerCallFrame.functionName);
    if (item.runtimeCallFrame)
      return UI.beautifyFunctionName(item.runtimeCallFrame.functionName);
    if (item.promiseCreationFrame)
      return Common.UIString('chained at');
    return item.asyncStackHeader || '';
  }

  /**
   * @param {!Sources.CallStackSidebarPane.Item} item
   * @return {?SDK.DebuggerModel.Location}
   */
  _itemLocation(item) {
    if (item.debuggerCallFrame)
      return item.debuggerCallFrame.location();
    if (item.runtimeCallFrame || item.promiseCreationFrame) {
      var frame = item.runtimeCallFrame || item.promiseCreationFrame;
      return new SDK.DebuggerModel.Location(this._debuggerModel, frame.scriptId, frame.lineNumber, frame.columnNumber);
    }
    return null;
  }

  /**
   * @return {!Element}
   */
  _createBlackboxedMessageElement() {
    var element = createElementWithClass('div', 'blackboxed-message');
    element.createChild('span');
    var showAllLink = element.createChild('span', 'link');
    showAllLink.textContent = Common.UIString('Show');
    showAllLink.addEventListener('click', () => {
      this._showBlackboxed = true;
      this._update();
    }, false);
    return element;
  }

  /**
   * @param {!Event} event
   */
  _onContextMenu(event) {
    var item = this._list.itemForNode(/** @type {?Node} */ (event.target));
    if (!item)
      return;
    var contextMenu = new UI.ContextMenu(event);
    if (item.debuggerCallFrame)
      contextMenu.appendItem(Common.UIString.capitalize('Restart ^frame'), () => item.debuggerCallFrame.restart());
    contextMenu.appendItem(Common.UIString.capitalize('Copy ^stack ^trace'), this._copyStackTrace.bind(this));
    var location = this._itemLocation(item);
    if (location) {
      var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);
      this.appendBlackboxURLContextMenuItems(contextMenu, uiLocation.uiSourceCode);
    }
    contextMenu.show();
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    var item = this._list.itemForNode(/** @type {?Node} */ (event.target));
    if (item)
      this._activateItem(item);
  }

  /**
   * @param {!Sources.CallStackSidebarPane.Item} item
   */
  _activateItem(item) {
    var location = this._itemLocation(item);
    if (!location)
      return;
    if (item.debuggerCallFrame && UI.context.flavor(SDK.DebuggerModel.CallFrame) !== item.debuggerCallFrame) {
      UI.context.setFlavor(SDK.DebuggerModel.CallFrame, item.debuggerCallFrame);
      this._debuggerModel.setSelectedCallFrame(item.debuggerCallFrame);
    } else {
      Common.Revealer.reveal(Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location));
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  appendBlackboxURLContextMenuItems(contextMenu, uiSourceCode) {
    var binding = Persistence.persistence.binding(uiSourceCode);
    if (binding)
      uiSourceCode = binding.network;
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem)
      return;
    var canBlackbox = Bindings.blackboxManager.canBlackboxUISourceCode(uiSourceCode);
    var isBlackboxed = Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode);
    var isContentScript = uiSourceCode.project().type() === Workspace.projectTypes.ContentScripts;

    var manager = Bindings.blackboxManager;
    if (canBlackbox) {
      if (isBlackboxed) {
        contextMenu.appendItem(
            Common.UIString.capitalize('Stop ^blackboxing'),
            manager.unblackboxUISourceCode.bind(manager, uiSourceCode));
      } else {
        contextMenu.appendItem(
            Common.UIString.capitalize('Blackbox ^script'), manager.blackboxUISourceCode.bind(manager, uiSourceCode));
      }
    }
    if (isContentScript) {
      if (isBlackboxed) {
        contextMenu.appendItem(
            Common.UIString.capitalize('Stop blackboxing ^all ^content ^scripts'),
            manager.blackboxContentScripts.bind(manager));
      } else {
        contextMenu.appendItem(
            Common.UIString.capitalize('Blackbox ^all ^content ^scripts'),
            manager.unblackboxContentScripts.bind(manager));
      }
    }
  }

  /**
   * @return {boolean}
   */
  _selectNextCallFrameOnStack() {
    return this._list.selectNextItem(false /* canWrap */, false /* center */);
  }

  /**
   * @return {boolean}
   */
  _selectPreviousCallFrameOnStack() {
    return this._list.selectPreviousItem(false /* canWrap */, false /* center */);
  }

  _copyStackTrace() {
    var text = [];
    for (var i = 0; i < this._list.length(); i++) {
      var item = this._list.itemAtIndex(i);
      if (item.promiseCreationFrame)
        continue;
      var itemText = this._itemTitle(item);
      var location = this._itemLocation(item);
      if (location) {
        var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);
        itemText += ' (' + uiLocation.linkText() + ')';
      }
      text.push(itemText);
    }
    InspectorFrontendHost.copyText(text.join('\n'));
  }

  /**
   * @param {function(!Array.<!UI.KeyboardShortcut.Descriptor>, function(!Event=):boolean)} registerShortcutDelegate
   */
  registerShortcuts(registerShortcutDelegate) {
    registerShortcutDelegate(
        UI.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
    registerShortcutDelegate(
        UI.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame, this._selectPreviousCallFrameOnStack.bind(this));
  }
};

/**
 * @typedef {{
 *     debuggerCallFrame: (SDK.DebuggerModel.CallFrame|undefined),
 *     asyncStackHeader: (string|undefined),
 *     runtimeCallFrame: (Protocol.Runtime.CallFrame|undefined),
 *     promiseCreationFrame: (Protocol.Runtime.CallFrame|undefined)
 * }}
 */
Sources.CallStackSidebarPane.Item;
