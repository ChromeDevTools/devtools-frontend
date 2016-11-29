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
 * @unrestricted
 */
Sources.CallStackSidebarPane = class extends UI.SimpleView {
  constructor() {
    super(Common.UIString('Call Stack'));
    this.callFrameList = new Sources.UIList();
    this.callFrameList.show(this.element);
    this._linkifier = new Components.Linkifier();
    Common.moduleSetting('enableAsyncStackTraces').addChangeListener(this._asyncStackTracesStateChanged, this);
    Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._update, this);
    /** @type {!Array<!Sources.CallStackSidebarPane.CallFrame>} */
    this.callFrames = [];
    this._locationPool = new Bindings.LiveLocationPool();
    this._update();
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    var details = UI.context.flavor(SDK.DebuggerPausedDetails);

    this.callFrameList.detach();
    this.callFrameList.clear();
    this._linkifier.reset();
    this.element.removeChildren();
    this._locationPool.disposeAll();

    this.callFrameList.show(this.element);
    delete this._hiddenCallFramesMessageElement;
    this.callFrames = [];
    this._hiddenCallFrames = 0;

    if (!details) {
      var infoElement = this.element.createChild('div', 'gray-info-message');
      infoElement.textContent = Common.UIString('Not Paused');
      UI.context.setFlavor(SDK.DebuggerModel.CallFrame, null);
      return;
    }
    this._debuggerModel = details.debuggerModel;
    var asyncStackTrace = details.asyncStackTrace;

    this._appendSidebarCallFrames(this._callFramesFromDebugger(details.callFrames));
    var topStackHidden = (this._hiddenCallFrames === this.callFrames.length);

    var peviousStackTrace = details.callFrames;
    while (asyncStackTrace) {
      var title = '';
      if (asyncStackTrace.description === 'async function') {
        var lastPreviousFrame = peviousStackTrace[peviousStackTrace.length - 1];
        var topFrame = asyncStackTrace.callFrames[0];
        var lastPreviousFrameName = UI.beautifyFunctionName(lastPreviousFrame.functionName);
        var topFrameName = UI.beautifyFunctionName(topFrame.functionName);
        title = topFrameName + ' awaits ' + lastPreviousFrameName;
      } else {
        title = UI.asyncStackTraceLabel(asyncStackTrace.description);
      }
      var asyncCallFrame = new Sources.UIList.Item(title, '', true);
      asyncCallFrame.setHoverable(false);
      asyncCallFrame.element.addEventListener(
          'contextmenu', this._asyncCallFrameContextMenu.bind(this, this.callFrames.length), true);
      this._appendSidebarCallFrames(
          this._callFramesFromRuntime(asyncStackTrace.callFrames, asyncCallFrame), asyncCallFrame);
      peviousStackTrace = asyncStackTrace.callFrames;
      asyncStackTrace = asyncStackTrace.parent;
    }

    if (topStackHidden)
      this._revealHiddenCallFrames();
    if (this._hiddenCallFrames) {
      var element = createElementWithClass('div', 'hidden-callframes-message');
      if (this._hiddenCallFrames === 1)
        element.textContent = Common.UIString('1 stack frame is hidden (black-boxed).');
      else
        element.textContent = Common.UIString('%d stack frames are hidden (black-boxed).', this._hiddenCallFrames);
      element.createTextChild(' ');
      var showAllLink = element.createChild('span', 'link');
      showAllLink.textContent = Common.UIString('Show');
      showAllLink.addEventListener('click', this._revealHiddenCallFrames.bind(this), false);
      this.element.insertBefore(element, this.element.firstChild);
      this._hiddenCallFramesMessageElement = element;
    }
    this._selectNextVisibleCallFrame(0);
    this.revealView();
  }

  /**
   * @param {!Array.<!SDK.DebuggerModel.CallFrame>} callFrames
   * @return {!Array<!Sources.CallStackSidebarPane.CallFrame>}
   */
  _callFramesFromDebugger(callFrames) {
    var callFrameItems = [];
    for (var i = 0, n = callFrames.length; i < n; ++i) {
      var callFrame = callFrames[i];
      var callFrameItem = new Sources.CallStackSidebarPane.CallFrame(
          callFrame.functionName, callFrame.location(), this._linkifier, callFrame, this._locationPool);
      callFrameItem.element.addEventListener('click', this._callFrameSelected.bind(this, callFrameItem), false);
      callFrameItems.push(callFrameItem);
    }
    return callFrameItems;
  }

  /**
   * @param {!Array<!Protocol.Runtime.CallFrame>} callFrames
   * @param {!Sources.UIList.Item} asyncCallFrameItem
   * @return {!Array<!Sources.CallStackSidebarPane.CallFrame>}
   */
  _callFramesFromRuntime(callFrames, asyncCallFrameItem) {
    var callFrameItems = [];
    for (var i = 0, n = callFrames.length; i < n; ++i) {
      var callFrame = callFrames[i];
      var location = new SDK.DebuggerModel.Location(
          this._debuggerModel, callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
      var callFrameItem = new Sources.CallStackSidebarPane.CallFrame(
          callFrame.functionName, location, this._linkifier, null, this._locationPool, asyncCallFrameItem);
      callFrameItem.element.addEventListener('click', this._asyncCallFrameClicked.bind(this, callFrameItem), false);
      callFrameItems.push(callFrameItem);
    }
    return callFrameItems;
  }

  /**
   * @param {!Array.<!Sources.CallStackSidebarPane.CallFrame>} callFrames
   * @param {!Sources.UIList.Item=} asyncCallFrameItem
   */
  _appendSidebarCallFrames(callFrames, asyncCallFrameItem) {
    if (asyncCallFrameItem)
      this.callFrameList.addItem(asyncCallFrameItem);

    var allCallFramesHidden = true;
    for (var i = 0, n = callFrames.length; i < n; ++i) {
      var callFrameItem = callFrames[i];
      callFrameItem.element.addEventListener('contextmenu', this._callFrameContextMenu.bind(this, callFrameItem), true);
      this.callFrames.push(callFrameItem);

      if (Bindings.blackboxManager.isBlackboxedRawLocation(callFrameItem._location)) {
        callFrameItem.setHidden(true);
        callFrameItem.setDimmed(true);
        ++this._hiddenCallFrames;
      } else {
        this.callFrameList.addItem(callFrameItem);
        allCallFramesHidden = false;
      }
    }
    if (allCallFramesHidden && asyncCallFrameItem) {
      asyncCallFrameItem.setHidden(true);
      asyncCallFrameItem.element.remove();
    }
  }

  _revealHiddenCallFrames() {
    if (!this._hiddenCallFrames)
      return;
    this._hiddenCallFrames = 0;
    this.callFrameList.clear();
    for (var i = 0; i < this.callFrames.length; ++i) {
      var callFrame = this.callFrames[i];
      if (callFrame._asyncCallFrame) {
        callFrame._asyncCallFrame.setHidden(false);
        if (i && callFrame._asyncCallFrame !== this.callFrames[i - 1]._asyncCallFrame)
          this.callFrameList.addItem(callFrame._asyncCallFrame);
      }
      callFrame.setHidden(false);
      this.callFrameList.addItem(callFrame);
    }
    if (this._hiddenCallFramesMessageElement) {
      this._hiddenCallFramesMessageElement.remove();
      delete this._hiddenCallFramesMessageElement;
    }
  }

  /**
   * @param {!Sources.CallStackSidebarPane.CallFrame} callFrame
   * @param {!Event} event
   */
  _callFrameContextMenu(callFrame, event) {
    var contextMenu = new UI.ContextMenu(event);
    var debuggerCallFrame = callFrame._debuggerCallFrame;
    if (debuggerCallFrame) {
      contextMenu.appendItem(
          Common.UIString.capitalize('Restart ^frame'), debuggerCallFrame.restart.bind(debuggerCallFrame));
    }

    contextMenu.appendItem(Common.UIString.capitalize('Copy ^stack ^trace'), this._copyStackTrace.bind(this));

    var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame._location);
    this.appendBlackboxURLContextMenuItems(contextMenu, uiLocation.uiSourceCode);

    contextMenu.show();
  }

  /**
   * @param {number} index
   * @param {!Event} event
   */
  _asyncCallFrameContextMenu(index, event) {
    for (; index < this.callFrames.length; ++index) {
      var callFrame = this.callFrames[index];
      if (!callFrame.isHidden()) {
        this._callFrameContextMenu(callFrame, event);
        break;
      }
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

  _asyncStackTracesStateChanged() {
    var enabled = Common.moduleSetting('enableAsyncStackTraces').get();
    if (!enabled && this.callFrames)
      this._removeAsyncCallFrames();
  }

  _removeAsyncCallFrames() {
    var shouldSelectTopFrame = false;
    var lastSyncCallFrameIndex = -1;
    for (var i = 0; i < this.callFrames.length; ++i) {
      var callFrame = this.callFrames[i];
      if (callFrame._asyncCallFrame) {
        if (callFrame.isSelected())
          shouldSelectTopFrame = true;
        callFrame._asyncCallFrame.element.remove();
        callFrame.element.remove();
      } else {
        lastSyncCallFrameIndex = i;
      }
    }
    this.callFrames.length = lastSyncCallFrameIndex + 1;
    if (shouldSelectTopFrame)
      this._selectNextVisibleCallFrame(0);
  }

  /**
   * @return {boolean}
   */
  _selectNextCallFrameOnStack() {
    var index = this._selectedCallFrameIndex();
    if (index === -1)
      return false;
    return this._selectNextVisibleCallFrame(index + 1);
  }

  /**
   * @return {boolean}
   */
  _selectPreviousCallFrameOnStack() {
    var index = this._selectedCallFrameIndex();
    if (index === -1)
      return false;
    return this._selectNextVisibleCallFrame(index - 1, true);
  }

  /**
   * @param {number} index
   * @param {boolean=} backward
   * @return {boolean}
   */
  _selectNextVisibleCallFrame(index, backward) {
    while (0 <= index && index < this.callFrames.length) {
      var callFrame = this.callFrames[index];
      if (!callFrame.isHidden() && !callFrame.isLabel() && !callFrame._asyncCallFrame) {
        this._callFrameSelected(callFrame);
        return true;
      }
      index += backward ? -1 : 1;
    }
    return false;
  }

  /**
   * @return {number}
   */
  _selectedCallFrameIndex() {
    if (!this._debuggerModel)
      return -1;
    var selectedCallFrame = this._debuggerModel.selectedCallFrame();
    if (!selectedCallFrame)
      return -1;
    for (var i = 0; i < this.callFrames.length; ++i) {
      if (this.callFrames[i]._debuggerCallFrame === selectedCallFrame)
        return i;
    }
    return -1;
  }

  /**
   * @param {!Sources.CallStackSidebarPane.CallFrame} callFrameItem
   */
  _asyncCallFrameClicked(callFrameItem) {
    var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrameItem._location);
    Common.Revealer.reveal(uiLocation);
  }

  /**
   * @param {!Sources.CallStackSidebarPane.CallFrame} selectedCallFrame
   */
  _callFrameSelected(selectedCallFrame) {
    selectedCallFrame.element.scrollIntoViewIfNeeded();
    var callFrame = selectedCallFrame._debuggerCallFrame;

    for (var i = 0; i < this.callFrames.length; ++i) {
      var callFrameItem = this.callFrames[i];
      callFrameItem.setSelected(callFrameItem === selectedCallFrame);
      if (callFrameItem.isSelected() && callFrameItem.isHidden())
        this._revealHiddenCallFrames();
    }

    var oldCallFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (oldCallFrame === callFrame) {
      var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame.location());
      Common.Revealer.reveal(uiLocation);
      return;
    }

    UI.context.setFlavor(SDK.DebuggerModel.CallFrame, callFrame);
    callFrame.debuggerModel.setSelectedCallFrame(callFrame);
  }

  _copyStackTrace() {
    var text = '';
    var lastCallFrame = null;
    for (var i = 0; i < this.callFrames.length; ++i) {
      var callFrame = this.callFrames[i];
      if (callFrame.isHidden())
        continue;
      if (lastCallFrame && callFrame._asyncCallFrame !== lastCallFrame._asyncCallFrame)
        text += callFrame._asyncCallFrame.title() + '\n';
      text += callFrame.title() + ' (' + callFrame.subtitle() + ')\n';
      lastCallFrame = callFrame;
    }
    InspectorFrontendHost.copyText(text);
  }

  /**
   * @param {function(!Array.<!UI.KeyboardShortcut.Descriptor>, function(!Event=):boolean)} registerShortcutDelegate
   */
  registerShortcuts(registerShortcutDelegate) {
    registerShortcutDelegate(
        Components.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
    registerShortcutDelegate(
        Components.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame,
        this._selectPreviousCallFrameOnStack.bind(this));
  }
};

/**
 * @unrestricted
 */
Sources.CallStackSidebarPane.CallFrame = class extends Sources.UIList.Item {
  /**
   * @param {string} functionName
   * @param {!SDK.DebuggerModel.Location} location
   * @param {!Components.Linkifier} linkifier
   * @param {?SDK.DebuggerModel.CallFrame} debuggerCallFrame
   * @param {!Bindings.LiveLocationPool} locationPool
   * @param {!Sources.UIList.Item=} asyncCallFrame
   */
  constructor(functionName, location, linkifier, debuggerCallFrame, locationPool, asyncCallFrame) {
    super(UI.beautifyFunctionName(functionName), '');
    this._location = location;
    this._debuggerCallFrame = debuggerCallFrame;
    this._asyncCallFrame = asyncCallFrame;
    Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(location, this._update.bind(this), locationPool);
  }

  /**
   * @param {!Bindings.LiveLocation} liveLocation
   */
  _update(liveLocation) {
    var uiLocation = liveLocation.uiLocation();
    if (!uiLocation)
      return;
    var text = uiLocation.linkText();
    this.setSubtitle(text.trimMiddle(30));
    this.subtitleElement.title = text;
  }
};
