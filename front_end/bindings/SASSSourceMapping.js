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
Bindings.SASSSourceMapping = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.NetworkProject} networkProject
   */
  constructor(cssModel, workspace, networkProject) {
    this._cssModel = cssModel;
    this._networkProject = networkProject;
    this._workspace = workspace;
    this._eventListeners = [
      this._cssModel.addEventListener(SDK.CSSModel.Events.SourceMapAttached, this._sourceMapAttached, this),
      this._cssModel.addEventListener(SDK.CSSModel.Events.SourceMapDetached, this._sourceMapDetached, this),
      this._cssModel.addEventListener(SDK.CSSModel.Events.SourceMapChanged, this._sourceMapChanged, this)
    ];
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapAttached(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    var sourceMap = this._cssModel.sourceMapForHeader(header);
    for (var sassURL of sourceMap.sourceURLs()) {
      var contentProvider = sourceMap.sourceContentProvider(sassURL, Common.resourceTypes.SourceMapStyleSheet);
      var embeddedContent = sourceMap.embeddedContentByURL(sassURL);
      var embeddedContentLength = typeof embeddedContent === 'string' ? embeddedContent.length : null;
      this._networkProject.addFile(
          contentProvider, SDK.ResourceTreeFrame.fromStyleSheet(header), false, embeddedContentLength);
    }
    Bindings.cssWorkspaceBinding.updateLocations(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapDetached(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    Bindings.cssWorkspaceBinding.updateLocations(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapChanged(event) {
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    var newSources = /** @type {!Map<string, string>} */ (event.data.newSources);
    var headers = this._cssModel.headersForSourceMap(sourceMap);
    var handledUISourceCodes = new Set();
    for (var header of headers) {
      Bindings.cssWorkspaceBinding.updateLocations(header);
      for (var sourceURL of newSources.keys()) {
        var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, sourceURL, header);
        if (!uiSourceCode) {
          console.error('Failed to update source for ' + sourceURL);
          continue;
        }
        if (handledUISourceCodes.has(uiSourceCode))
          continue;
        handledUISourceCodes.add(uiSourceCode);
        var sassText = /** @type {string} */ (newSources.get(sourceURL));
        uiSourceCode.setWorkingCopy(sassText);
      }
    }
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var header = rawLocation.header();
    if (!header)
      return null;
    var sourceMap = this._cssModel.sourceMapForHeader(header);
    if (!sourceMap)
      return null;
    var entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    if (!entry || !entry.sourceURL)
      return null;
    var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForStyleURL(this._workspace, entry.sourceURL, header);
    if (!uiSourceCode)
      return null;
    return uiSourceCode.uiLocation(entry.sourceLineNumber || 0, entry.sourceColumnNumber);
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};
