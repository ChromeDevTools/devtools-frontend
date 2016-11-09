// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.DebuggerPausedMessage = class {
  constructor() {
    this._element = createElementWithClass('div', 'paused-message flex-none');
    var root = WebInspector.createShadowRootWithCoreStyles(this._element, 'sources/debuggerPausedMessage.css');
    this._contentElement = root.createChild('div', 'paused-status');
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {?WebInspector.DebuggerPausedDetails} details
   * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   * @param {!WebInspector.BreakpointManager} breakpointManager
   */
  render(details, debuggerWorkspaceBinding, breakpointManager) {
    var status = this._contentElement;
    status.hidden = !details;
    status.removeChildren();
    if (!details)
      return;

    var messageWrapper;
    if (details.reason === WebInspector.DebuggerModel.BreakReason.DOM) {
      messageWrapper = WebInspector.DOMBreakpointsSidebarPane.createBreakpointHitMessage(details);
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.EventListener) {
      var eventName = details.auxData['eventName'];
      var eventNameForUI = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName, details.auxData);
      messageWrapper = buildWrapper(WebInspector.UIString('Paused on event listener'), eventNameForUI);
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.XHR) {
      messageWrapper = buildWrapper(WebInspector.UIString('Paused on XMLHttpRequest'), details.auxData['url'] || '');
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.Exception) {
      var description = details.auxData['description'] || details.auxData['value'] || '';
      var descriptionFirstLine = description.split('\n', 1)[0];
      messageWrapper = buildWrapper(WebInspector.UIString('Paused on exception'), descriptionFirstLine, description);
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.PromiseRejection) {
      var description = details.auxData['description'] || details.auxData['value'] || '';
      var descriptionFirstLine = description.split('\n', 1)[0];
      messageWrapper =
          buildWrapper(WebInspector.UIString('Paused on promise rejection'), descriptionFirstLine, description);
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.Assert) {
      messageWrapper = buildWrapper(WebInspector.UIString('Paused on assertion'));
    } else if (details.reason === WebInspector.DebuggerModel.BreakReason.DebugCommand) {
      messageWrapper = buildWrapper(WebInspector.UIString('Paused on debugged function'));
    } else if (details.callFrames.length) {
      var uiLocation = debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());
      var breakpoint =
          uiLocation ? breakpointManager.findBreakpoint(
              uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber) : null;
      var defaultText =
          breakpoint ? WebInspector.UIString('Paused on breakpoint') : WebInspector.UIString('Debugger paused');
      messageWrapper = buildWrapper(defaultText);
    } else {
      console.warn(
          'ScriptsPanel paused, but callFrames.length is zero.');  // TODO remove this once we understand this case better
    }

    var errorLike = details.reason === WebInspector.DebuggerModel.BreakReason.Exception ||
        details.reason === WebInspector.DebuggerModel.BreakReason.PromiseRejection ||
        details.reason === WebInspector.DebuggerModel.BreakReason.Assert;
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
      mainElement.appendChild(WebInspector.Icon.create('smallicon-info', 'status-icon'));
      mainElement.appendChild(createTextNode(mainText));
      if (subText) {
        var subElement = messageWrapper.createChild('div', 'status-sub monospace');
        subElement.textContent = subText;
      }
      if (title)
        messageWrapper.title = title;
      return messageWrapper;
    }
  }
};
