// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Bindings.NetworkMapping = class {
  /**
   * @param {!Workspace.Workspace} workspace
   */
  constructor(workspace) {
    this._workspace = workspace;
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _networkUISourceCodeForURL(target, frame, url) {
    return this._workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, false), url);
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _contentScriptUISourceCodeForURL(target, frame, url) {
    return this._workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, true), url);
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _uiSourceCodeForURL(target, frame, url) {
    return this._networkUISourceCodeForURL(target, frame, url) ||
        this._contentScriptUISourceCodeForURL(target, frame, url);
  }

  /**
   * @param {string} url
   * @param {!SDK.Script} script
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForScriptURL(url, script) {
    var frame = SDK.ResourceTreeFrame.fromScript(script);
    return this._uiSourceCodeForURL(script.target(), frame, url);
  }

  /**
   * @param {string} url
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForStyleURL(url, header) {
    var frame = SDK.ResourceTreeFrame.fromStyleSheet(header);
    return this._uiSourceCodeForURL(header.target(), frame, url);
  }

  /**
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForURLForAnyTarget(url) {
    return Workspace.workspace.uiSourceCodeForURL(url);
  }

  /**
   * @param {!Common.Event} event
   */
  _revealSourceLine(event) {
    var url = /** @type {string} */ (event.data['url']);
    var lineNumber = /** @type {number} */ (event.data['lineNumber']);
    var columnNumber = /** @type {number} */ (event.data['columnNumber']);

    var uiSourceCode = this.uiSourceCodeForURLForAnyTarget(url);
    if (uiSourceCode) {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }

    /**
     * @param {!Common.Event} event
     * @this {Bindings.NetworkMapping}
     */
    function listener(event) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
      if (uiSourceCode.url() === url) {
        Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        this._workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener, this);
      }
    }

    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener, this);
  }
};

/**
 * @type {!Bindings.NetworkMapping}
 */
Bindings.networkMapping;
