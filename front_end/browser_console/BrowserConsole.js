// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Renderer}
 * @implements {UI.ContextMenu.Provider}
 */
BrowserConsole.BrowserConsole = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendApplicableItems(event, contextMenu, object) {
    var consoleMessage = /** @type {!SDK.ConsoleMessage} */ (object);
    var request = BrowserSDK.NetworkLog.requestForConsoleMessage(consoleMessage);
    if (request && SDK.NetworkManager.canReplayRequest(request)) {
      contextMenu.debugSection().appendItem(
          Common.UIString('Replay XHR'), SDK.NetworkManager.replayRequest.bind(null, request));
    }
  }

  /**
   * @override
   * @param {!Object} object
   * @param {!Common.Renderer.Options} options
   * @return {!Promise.<?Node>}
   */
  render(object, options) {
    var consoleMessage = /** @type {!SDK.ConsoleMessage} */ (object);
    var request = BrowserSDK.NetworkLog.requestForConsoleMessage(consoleMessage);
    var messageElement = null;
    if (request) {
      messageElement = createElement('span');
      if (consoleMessage.level === SDK.ConsoleMessage.MessageLevel.Error) {
        messageElement.createTextChild(request.requestMethod + ' ');
        messageElement.appendChild(Components.Linkifier.linkifyRevealable(request, request.url(), request.url()));
        messageElement.createTextChildren(' ', String(request.statusCode), ' (', request.statusText, ')');
      } else {
        var fragment = Console.ConsoleViewMessage.linkifyWithCustomLinkifier(
            consoleMessage.messageText,
            title => Components.Linkifier.linkifyRevealable(
                /** @type {!SDK.NetworkRequest} */ (request), title, request.url()));
        messageElement.appendChild(fragment);
      }
    }
    return Promise.resolve(/** @type {?Node} */ (messageElement));
  }
};
