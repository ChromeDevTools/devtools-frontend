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
 * @implements {Bindings.CSSWorkspaceBinding.SourceMapping}
 */
Bindings.SASSSourceMapping = class {
  /**
   * @param {!SDK.Target} target
   * @param {!SDK.SourceMapManager} sourceMapManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(target, sourceMapManager, workspace) {
    this._sourceMapManager = sourceMapManager;
    this._project = new Bindings.ContentProviderBasedProject(
        workspace, 'cssSourceMaps:' + target.id(), Workspace.projectTypes.Network, '', false /* isServiceProject */);
    Bindings.NetworkProject.setTargetForProject(this._project, target);

    this._eventListeners = [
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this._sourceMapAttached, this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapDetached, this._sourceMapDetached, this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapChanged, this._sourceMapChanged, this)
    ];
  }

  /**
   * @param {?SDK.SourceMap} sourceMap
   */
  _sourceMapAttachedForTest(sourceMap) {
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapAttached(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data.client);
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    for (var sassURL of sourceMap.sourceURLs()) {
      var uiSourceCode = this._project.uiSourceCodeForURL(sassURL);
      if (uiSourceCode) {
        Bindings.NetworkProject.addFrameAttribution(uiSourceCode, header.frameId);
        continue;
      }

      var contentProvider = sourceMap.sourceContentProvider(sassURL, Common.resourceTypes.SourceMapStyleSheet);
      var mimeType = Common.ResourceType.mimeFromURL(sassURL) || contentProvider.contentType().canonicalMimeType();
      var embeddedContent = sourceMap.embeddedContentByURL(sassURL);
      var metadata =
          typeof embeddedContent === 'string' ? new Workspace.UISourceCodeMetadata(null, embeddedContent.length) : null;
      uiSourceCode = this._project.createUISourceCode(sassURL, contentProvider.contentType());
      Bindings.NetworkProject.setInitialFrameAttribution(uiSourceCode, header.frameId);
      uiSourceCode[Bindings.SASSSourceMapping._sourceMapSymbol] = sourceMap;
      this._project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    }
    Bindings.cssWorkspaceBinding.updateLocations(header);
    this._sourceMapAttachedForTest(sourceMap);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapDetached(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data.client);
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    var headers = this._sourceMapManager.clientsForSourceMap(sourceMap);
    for (var sassURL of sourceMap.sourceURLs()) {
      if (headers.length) {
        var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (this._project.uiSourceCodeForURL(sassURL));
        Bindings.NetworkProject.removeFrameAttribution(uiSourceCode, header.frameId);
      } else {
        this._project.removeFile(sassURL);
      }
    }
    Bindings.cssWorkspaceBinding.updateLocations(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapChanged(event) {
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    var newSources = /** @type {!Map<string, string>} */ (event.data.newSources);
    var headers = this._sourceMapManager.clientsForSourceMap(sourceMap);
    for (var sourceURL of newSources.keys()) {
      var uiSourceCode = this._project.uiSourceCodeForURL(sourceURL);
      if (!uiSourceCode) {
        console.error('Failed to update source for ' + sourceURL);
        continue;
      }
      var sassText = /** @type {string} */ (newSources.get(sourceURL));
      uiSourceCode.setWorkingCopy(sassText);
    }
    for (var header of headers)
      Bindings.cssWorkspaceBinding.updateLocations(header);
  }

  /**
   * @override
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var header = rawLocation.header();
    if (!header)
      return null;
    var sourceMap = this._sourceMapManager.sourceMapForClient(header);
    if (!sourceMap)
      return null;
    var entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    if (!entry || !entry.sourceURL)
      return null;
    var uiSourceCode = this._project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode)
      return null;
    return uiSourceCode.uiLocation(entry.sourceLineNumber || 0, entry.sourceColumnNumber);
  }

  /**
   * @override
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Array<!SDK.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
    var sourceMap = uiLocation.uiSourceCode[Bindings.SASSSourceMapping._sourceMapSymbol];
    if (!sourceMap)
      return [];
    var entries =
        sourceMap.findReverseEntries(uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber);
    var locations = [];
    for (var header of this._sourceMapManager.clientsForSourceMap(sourceMap))
      locations.pushAll(entries.map(entry => new SDK.CSSLocation(header, entry.lineNumber, entry.columnNumber)));
    return locations;
  }

  dispose() {
    this._project.dispose();
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

Bindings.SASSSourceMapping._sourceMapSymbol = Symbol('sourceMap');
