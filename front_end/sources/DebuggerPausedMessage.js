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
      messageWrapper = Components.DOMBreakpointsSidebarPane.createBreakpointHitMessage(details);
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
      var descriptionFirstLine = description.split('\n', 1)[0];
      messageWrapper = buildWrapper(Common.UIString('Paused on exception'), descriptionFirstLine, description);
    } else if (details.reason === SDK.DebuggerModel.BreakReason.PromiseRejection) {
      var description = details.auxData['description'] || details.auxData['value'] || '';
      var descriptionFirstLine = description.split('\n', 1)[0];
      messageWrapper = buildWrapper(Common.UIString('Paused on promise rejection'), descriptionFirstLine, description);
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
