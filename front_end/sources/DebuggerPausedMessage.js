// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Sources.DebuggerPausedMessage = class {
  constructor() {
    this._element = createElementWithClass('div', 'paused-message flex-none');
    var root = UI.createShadowRootWithCoreStyles(this._element, 'sources/debuggerPausedMessage.css');
    this._contentElement = root.createChild('div', 'paused-status');
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {string} description
   */
  static _descriptionWithoutStack(description) {
    var firstCallFrame = /^\s+at\s/m.exec(description);
    return firstCallFrame ? description.substring(0, firstCallFrame.index - 1) :
                            description.substring(0, description.lastIndexOf('\n'));
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} details
   * @return {!Element}
   */
  static _createDOMBreakpointHitMessage(details) {
    var messageWrapper = createElement('span');
    var domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel);
    if (!details.auxData || !domDebuggerModel)
      return messageWrapper;
    var data = domDebuggerModel.resolveDOMBreakpointData(/** @type {!Object} */ (details.auxData));
    if (!data)
      return messageWrapper;

    var mainElement = messageWrapper.createChild('div', 'status-main');
    mainElement.appendChild(UI.Icon.create('smallicon-info', 'status-icon'));
    mainElement.appendChild(createTextNode(
        String.sprintf('Paused on %s', Components.DOMPresentationUtils.BreakpointTypeNouns.get(data.type))));

    var subElement = messageWrapper.createChild('div', 'status-sub monospace');
    var linkifiedNode = Components.DOMPresentationUtils.linkifyNodeReference(data.node);
    subElement.appendChild(linkifiedNode);

    if (data.targetNode) {
      var targetNodeLink = Components.DOMPresentationUtils.linkifyNodeReference(data.targetNode);
      var message;
      if (data.insertion)
        message = data.targetNode === data.node ? 'Child %s added' : 'Descendant %s added';
      else
        message = 'Descendant %s removed';
      subElement.appendChild(createElement('br'));
      subElement.appendChild(UI.formatLocalized(message, [targetNodeLink]));
    }
    return messageWrapper;
  }

  /**
   * @param {?SDK.DebuggerPausedDetails} details
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   * @param {!Bindings.BreakpointManager} breakpointManager
   */
  render(details, debuggerWorkspaceBinding, breakpointManager) {
    var status = this._contentElement;
    status.hidden = !details;
    status.removeChildren();
    if (!details)
      return;

    var errorLike = details.reason === SDK.DebuggerModel.BreakReason.Exception ||
        details.reason === SDK.DebuggerModel.BreakReason.PromiseRejection ||
        details.reason === SDK.DebuggerModel.BreakReason.Assert || details.reason === SDK.DebuggerModel.BreakReason.OOM;
    var messageWrapper;
    if (details.reason === SDK.DebuggerModel.BreakReason.DOM) {
      messageWrapper = Sources.DebuggerPausedMessage._createDOMBreakpointHitMessage(details);
    } else if (details.reason === SDK.DebuggerModel.BreakReason.EventListener) {
      var eventNameForUI = '';
      if (details.auxData) {
        eventNameForUI =
            SDK.domDebuggerManager.resolveEventListenerBreakpointTitle(/** @type {!Object} */ (details.auxData));
      }
      messageWrapper = buildWrapper(Common.UIString('Paused on event listener'), eventNameForUI);
    } else if (details.reason === SDK.DebuggerModel.BreakReason.XHR) {
      messageWrapper = buildWrapper(Common.UIString('Paused on XHR or fetch'), details.auxData['url'] || '');
    } else if (details.reason === SDK.DebuggerModel.BreakReason.Exception) {
      var description = details.auxData['description'] || details.auxData['value'] || '';
      var descriptionWithoutStack = Sources.DebuggerPausedMessage._descriptionWithoutStack(description);
      messageWrapper = buildWrapper(Common.UIString('Paused on exception'), descriptionWithoutStack, description);
    } else if (details.reason === SDK.DebuggerModel.BreakReason.PromiseRejection) {
      var description = details.auxData['description'] || details.auxData['value'] || '';
      var descriptionWithoutStack = Sources.DebuggerPausedMessage._descriptionWithoutStack(description);
      messageWrapper =
          buildWrapper(Common.UIString('Paused on promise rejection'), descriptionWithoutStack, description);
    } else if (details.reason === SDK.DebuggerModel.BreakReason.Assert) {
      messageWrapper = buildWrapper(Common.UIString('Paused on assertion'));
    } else if (details.reason === SDK.DebuggerModel.BreakReason.DebugCommand) {
      messageWrapper = buildWrapper(Common.UIString('Paused on debugged function'));
    } else if (details.reason === SDK.DebuggerModel.BreakReason.OOM) {
      messageWrapper = buildWrapper(Common.UIString('Paused before potential out-of-memory crash'));
    } else if (details.callFrames.length) {
      var uiLocation = debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());
      var breakpoint = uiLocation ?
          breakpointManager.findBreakpoint(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber) :
          null;
      var defaultText = breakpoint ? Common.UIString('Paused on breakpoint') : Common.UIString('Debugger paused');
      messageWrapper = buildWrapper(defaultText);
    } else {
      console.warn(
          'ScriptsPanel paused, but callFrames.length is zero.');  // TODO remove this once we understand this case better
    }

    status.classList.toggle('error-reason', errorLike);
    if (messageWrapper)
      status.appendChild(messageWrapper);

    /**
     * @param  {string} mainText
     * @param  {string=} subText
     * @param  {string=} title
     * @return {!Element}
     */
    function buildWrapper(mainText, subText, title) {
      var messageWrapper = createElement('span');
      var mainElement = messageWrapper.createChild('div', 'status-main');
      var icon = UI.Icon.create(errorLike ? 'smallicon-error' : 'smallicon-info', 'status-icon');
      mainElement.appendChild(icon);
      mainElement.appendChild(createTextNode(mainText));
      if (subText) {
        var subElement = messageWrapper.createChild('div', 'status-sub monospace');
        subElement.textContent = subText;
        subElement.title = title || subText;
      }
      return messageWrapper;
    }
  }
};
