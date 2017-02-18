/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Bindings.StylesSourceMapping = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Workspace.Workspace} workspace
   */
  constructor(cssModel, workspace) {
    this._cssModel = cssModel;
    this._workspace = workspace;

    /** @type {!Map<string, !Map<string, !Map<string, !SDK.CSSStyleSheetHeader>>>} */
    this._urlToHeadersByFrameId = new Map();
    /** @type {!Map.<!Workspace.UISourceCode, !Bindings.StyleFile>} */
    this._styleFiles = new Map();

    this._eventListeners = [
      this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this),
      this._workspace.addEventListener(
          Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this),
      this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this),
      this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
      this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this),
      this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this._styleSheetChanged, this),
      SDK.ResourceTreeModel.fromTarget(cssModel.target())
          .addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated, this._unbindAllUISourceCodes, this)
    ];
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var header = rawLocation.header();
    if (!header)
      return null;
    var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, rawLocation.url, header);
    if (!uiSourceCode)
      return null;
    var lineNumber = rawLocation.lineNumber;
    var columnNumber = rawLocation.columnNumber;
    if (header && header.isInline && header.hasSourceURL) {
      lineNumber -= header.lineNumberInSource(0);
      columnNumber -= header.columnNumberInSource(lineNumber, 0);
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    var url = header.resourceURL();
    if (!url)
      return;

    var map = this._urlToHeadersByFrameId.get(url);
    if (!map) {
      map = /** @type {!Map.<string, !Map.<string, !SDK.CSSStyleSheetHeader>>} */ (new Map());
      this._urlToHeadersByFrameId.set(url, map);
    }
    var headersById = map.get(header.frameId);
    if (!headersById) {
      headersById = /** @type {!Map.<string, !SDK.CSSStyleSheetHeader>} */ (new Map());
      map.set(header.frameId, headersById);
    }
    headersById.set(header.id, header);
    var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, url, header);
    if (uiSourceCode)
      this._bindUISourceCode(uiSourceCode, header);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    var url = header.resourceURL();
    if (!url)
      return;

    var map = this._urlToHeadersByFrameId.get(url);
    console.assert(map);
    var headersById = map.get(header.frameId);
    console.assert(headersById);
    headersById.delete(header.id);

    if (!headersById.size) {
      map.delete(header.frameId);
      if (!map.size) {
        this._urlToHeadersByFrameId.delete(url);
        var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, url, header);
        if (uiSourceCode)
          this._unbindUISourceCode(uiSourceCode);
      }
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _unbindUISourceCode(uiSourceCode) {
    var styleFile = this._styleFiles.get(uiSourceCode);
    if (!styleFile)
      return;
    styleFile.dispose();
    this._styleFiles.delete(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _unbindAllUISourceCodes(event) {
    if (event.data.target() !== this._cssModel.target())
      return;
    for (var styleFile of this._styleFiles.values())
      styleFile.dispose();
    this._styleFiles.clear();
    this._urlToHeadersByFrameId = new Map();
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeAddedToWorkspace(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    if (!this._urlToHeadersByFrameId.has(uiSourceCode.url()))
      return;
    this._bindUISourceCode(
        uiSourceCode, this._urlToHeadersByFrameId.get(uiSourceCode.url()).valuesArray()[0].valuesArray()[0]);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _bindUISourceCode(uiSourceCode, header) {
    if (this._styleFiles.get(uiSourceCode) || (header.isInline && !header.hasSourceURL))
      return;
    this._styleFiles.set(uiSourceCode, new Bindings.StyleFile(uiSourceCode, this));
    Bindings.cssWorkspaceBinding.updateLocations(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _projectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      this._unbindUISourceCode(uiSourceCodes[i]);
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._unbindUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} content
   * @param {boolean} majorChange
   * @return {!Promise<?string>}
   */
  _setStyleContent(uiSourceCode, content, majorChange) {
    var styleSheetIds = this._cssModel.styleSheetIdsForURL(uiSourceCode.url());
    if (!styleSheetIds.length)
      return Promise.resolve(/** @type {?string} */ ('No stylesheet found: ' + uiSourceCode.url()));

    this._isSettingContent = true;

    /**
     * @param {?string} error
     * @this {Bindings.StylesSourceMapping}
     * @return {?string}
     */
    function callback(error) {
      delete this._isSettingContent;
      return error || null;
    }

    var promises = [];
    for (var i = 0; i < styleSheetIds.length; ++i)
      promises.push(this._cssModel.setStyleSheetText(styleSheetIds[i], content, majorChange));

    return Promise.all(promises).spread(callback.bind(this));
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetChanged(event) {
    if (this._isSettingContent)
      return;

    this._updateStyleSheetTextSoon(event.data.styleSheetId);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   */
  _updateStyleSheetTextSoon(styleSheetId) {
    if (this._updateStyleSheetTextTimer)
      clearTimeout(this._updateStyleSheetTextTimer);

    this._updateStyleSheetTextTimer = setTimeout(
        this._updateStyleSheetText.bind(this, styleSheetId), Bindings.StylesSourceMapping.ChangeUpdateTimeoutMs);
  }

  /**
   * @param {!Protocol.CSS.StyleSheetId} styleSheetId
   */
  _updateStyleSheetText(styleSheetId) {
    if (this._updateStyleSheetTextTimer) {
      clearTimeout(this._updateStyleSheetTextTimer);
      delete this._updateStyleSheetTextTimer;
    }

    var header = this._cssModel.styleSheetHeaderForId(styleSheetId);
    if (!header)
      return;
    var styleSheetURL = header.resourceURL();
    if (!styleSheetURL)
      return;
    var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, styleSheetURL, header);
    if (!uiSourceCode)
      return;
    header.requestContent().then(callback.bind(this, uiSourceCode));

    /**
     * @param {!Workspace.UISourceCode} uiSourceCode
     * @param {?string} content
     * @this {Bindings.StylesSourceMapping}
     */
    function callback(uiSourceCode, content) {
      var styleFile = this._styleFiles.get(uiSourceCode);
      if (typeof content === 'string' && styleFile)
        styleFile.addRevision(content);
      this._styleFileSyncedForTest();
    }
  }

  _styleFileSyncedForTest() {
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

Bindings.StylesSourceMapping.ChangeUpdateTimeoutMs = 200;

/**
 * @unrestricted
 */
Bindings.StyleFile = class {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Bindings.StylesSourceMapping} mapping
   */
  constructor(uiSourceCode, mapping) {
    this._uiSourceCode = uiSourceCode;
    this._mapping = mapping;
    this._eventListeners = [
      this._uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this),
      this._uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this)
    ];
    this._commitThrottler = new Common.Throttler(Bindings.StyleFile.updateTimeout);
    this._terminated = false;
  }

  /**
   * @param {!Common.Event} event
   */
  _workingCopyCommitted(event) {
    if (this._isAddingRevision)
      return;

    this._isMajorChangePending = true;
    this._commitThrottler.schedule(this._commitIncrementalEdit.bind(this), true);
  }

  /**
   * @param {!Common.Event} event
   */
  _workingCopyChanged(event) {
    if (this._isAddingRevision)
      return;

    this._commitThrottler.schedule(this._commitIncrementalEdit.bind(this), false);
  }

  _commitIncrementalEdit() {
    if (this._terminated)
      return;
    var promise =
        this._mapping._setStyleContent(this._uiSourceCode, this._uiSourceCode.workingCopy(), this._isMajorChangePending)
            .then(this._styleContentSet.bind(this));
    this._isMajorChangePending = false;
    return promise;
  }

  /**
   * @param {?string} error
   */
  _styleContentSet(error) {
    if (error)
      console.error(error);
  }

  /**
   * @param {string} content
   */
  addRevision(content) {
    this._isAddingRevision = true;
    this._uiSourceCode.addRevision(content);
    delete this._isAddingRevision;
  }

  dispose() {
    if (this._terminated)
      return;
    this._terminated = true;
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

Bindings.StyleFile.updateTimeout = 200;
