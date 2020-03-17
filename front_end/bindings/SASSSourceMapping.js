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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {CSSWorkspaceBinding, SourceMapping} from './CSSWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {NetworkProject} from './NetworkProject.js';

/**
 * @implements {SourceMapping}
 */
export class SASSSourceMapping {
  /**
   * @param {!SDK.SDKModel.Target} target
   * @param {!SDK.SourceMapManager.SourceMapManager} sourceMapManager
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(target, sourceMapManager, workspace) {
    this._sourceMapManager = sourceMapManager;
    this._project = new ContentProviderBasedProject(
        workspace, 'cssSourceMaps:' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._project, target);

    this._eventListeners = [
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached,
          event => {
            this._sourceMapAttached(event);
          },
          this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapDetached,
          event => {
            this._sourceMapDetached(event);
          },
          this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapChanged,
          event => {
            this._sourceMapChanged(event);
          },
          this)
    ];
  }

  /**
   * @param {?SDK.SourceMap.SourceMap} sourceMap
   */
  _sourceMapAttachedForTest(sourceMap) {
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapAttached(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (event.data.client);
    const sourceMap = /** @type {!SDK.SourceMap.TextSourceMap} */ (event.data.sourceMap);
    for (const sassURL of sourceMap.sourceURLs()) {
      let uiSourceCode = this._project.uiSourceCodeForURL(sassURL);
      if (uiSourceCode) {
        NetworkProject.addFrameAttribution(uiSourceCode, header.frameId);
        continue;
      }

      const contentProvider =
          sourceMap.sourceContentProvider(sassURL, Common.ResourceType.resourceTypes.SourceMapStyleSheet);
      const mimeType =
          Common.ResourceType.ResourceType.mimeFromURL(sassURL) || contentProvider.contentType().canonicalMimeType();
      const embeddedContent = sourceMap.embeddedContentByURL(sassURL);
      const metadata = typeof embeddedContent === 'string' ?
          new Workspace.UISourceCode.UISourceCodeMetadata(null, embeddedContent.length) :
          null;
      uiSourceCode = this._project.createUISourceCode(sassURL, contentProvider.contentType());
      NetworkProject.setInitialFrameAttribution(uiSourceCode, header.frameId);
      uiSourceCode[_sourceMapSymbol] = sourceMap;
      this._project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    }
    await CSSWorkspaceBinding.instance().updateLocations(header);
    this._sourceMapAttachedForTest(sourceMap);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapDetached(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (event.data.client);
    const sourceMap = /** @type {!SDK.SourceMap.SourceMap} */ (event.data.sourceMap);
    const headers = this._sourceMapManager.clientsForSourceMap(sourceMap);
    for (const sassURL of sourceMap.sourceURLs()) {
      if (headers.length) {
        const uiSourceCode = this._project.uiSourceCodeForURL(sassURL);
        if (!uiSourceCode) {
          continue;
        }
        NetworkProject.removeFrameAttribution(uiSourceCode, header.frameId);
      } else {
        this._project.removeFile(sassURL);
      }
    }
    await CSSWorkspaceBinding.instance().updateLocations(header);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapChanged(event) {
    const sourceMap = /** @type {!SDK.SourceMap.SourceMap} */ (event.data.sourceMap);
    const newSources = /** @type {!Map<string, string>} */ (event.data.newSources);
    const headers = this._sourceMapManager.clientsForSourceMap(sourceMap);
    for (const sourceURL of newSources.keys()) {
      const uiSourceCode = this._project.uiSourceCodeForURL(sourceURL);
      if (!uiSourceCode) {
        console.error('Failed to update source for ' + sourceURL);
        continue;
      }
      const sassText = /** @type {string} */ (newSources.get(sourceURL));
      uiSourceCode.setWorkingCopy(sassText);
    }
    const updatePromises = headers.map(header => CSSWorkspaceBinding.instance().updateLocations(header));
    await Promise.all(updatePromises);
  }

  /**
   * @override
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const header = rawLocation.header();
    if (!header) {
      return null;
    }
    const sourceMap = this._sourceMapManager.sourceMapForClient(header);
    if (!sourceMap) {
      return null;
    }
    const entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    if (!entry || !entry.sourceURL) {
      return null;
    }
    const uiSourceCode = this._project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation(entry.sourceLineNumber || 0, entry.sourceColumnNumber);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Array<!SDK.CSSModel.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
    /** @type {!SDK.SourceMap.TextSourceMap} */
    const sourceMap = uiLocation.uiSourceCode[_sourceMapSymbol];
    if (!sourceMap) {
      return [];
    }
    const entries =
        sourceMap.findReverseEntries(uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber);
    const locations = [];
    for (const header of this._sourceMapManager.clientsForSourceMap(sourceMap)) {
      locations.push(
          ...entries.map(entry => new SDK.CSSModel.CSSLocation(header, entry.lineNumber, entry.columnNumber)));
    }
    return locations;
  }

  dispose() {
    this._project.dispose();
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
  }
}

const _sourceMapSymbol = Symbol('sourceMap');
