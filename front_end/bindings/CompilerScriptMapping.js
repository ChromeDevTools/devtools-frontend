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
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {BlackboxManager} from './BlackboxManager.js';
import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {DebuggerSourceMapping, DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {NetworkProject} from './NetworkProject.js';

/**
 * @implements {DebuggerSourceMapping}
 * @unrestricted
 */
export class CompilerScriptMapping {
  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   * @param {!DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._sourceMapManager = this._debuggerModel.sourceMapManager();
    this._workspace = workspace;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    const target = debuggerModel.target();
    this._regularProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps::' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    this._contentScriptsProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps:extensions:' + target.id(), Workspace.Workspace.projectTypes.ContentScripts, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._regularProject, target);
    NetworkProject.setTargetForProject(this._contentScriptsProject, target);

    /** @type {!Map<string, !Binding>} */
    this._regularBindings = new Map();
    /** @type {!Map<string, !Binding>} */
    this._contentScriptsBindings = new Map();

    /** @type {!Map<!SDK.Script.Script, !Workspace.UISourceCode.UISourceCode>} */
    this._stubUISourceCodes = new Map();

    this._stubProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps:stub:' + target.id(), Workspace.Workspace.projectTypes.Service, '',
        true /* isServiceProject */);
    this._eventListeners = [
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach,
          event => {
            this._sourceMapWillAttach(event);
          },
          this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapFailedToAttach,
          event => {
            this._sourceMapFailedToAttach(event);
          },
          this),
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
    ];
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  _addStubUISourceCode(script) {
    const stubUISourceCode = this._stubProject.addContentProvider(
        script.sourceURL + ':sourcemap',
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(
            script.sourceURL, Common.ResourceType.resourceTypes.Script,
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'),
        'text/javascript');
    this._stubUISourceCodes.set(script, stubUISourceCode);
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  async _removeStubUISourceCode(script) {
    const uiSourceCode = this._stubUISourceCodes.get(script);
    this._stubUISourceCodes.delete(script);
    if (uiSourceCode) {
      this._stubProject.removeFile(uiSourceCode.url());
    }
    await this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?string}
   */
  static uiSourceCodeOrigin(uiSourceCode) {
    const sourceMap = uiSourceCode[_sourceMapSymbol];
    if (!sourceMap) {
      return null;
    }
    return sourceMap.compiledURL();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {boolean}
   */
  mapsToSourceCode(rawLocation) {
    const script = rawLocation.script();
    const sourceMap = script ? this._sourceMapManager.sourceMapForClient(script) : null;
    if (!sourceMap) {
      return true;
    }
    const entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    return !!entry && entry.lineNumber === rawLocation.lineNumber && entry.columnNumber === rawLocation.columnNumber;
  }

  /**
   * @param {string} url
   * @param {boolean} isContentScript
   */
  uiSourceCodeForURL(url, isContentScript) {
    return isContentScript ? this._contentScriptsProject.uiSourceCodeForURL(url) :
                             this._regularProject.uiSourceCodeForURL(url);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }

    const lineNumber = rawLocation.lineNumber - script.lineOffset;
    let columnNumber = rawLocation.columnNumber;
    if (!lineNumber) {
      columnNumber -= script.columnOffset;
    }

    const stubUISourceCode = this._stubUISourceCodes.get(script);
    if (stubUISourceCode) {
      return new Workspace.UISourceCode.UILocation(stubUISourceCode, lineNumber, columnNumber);
    }

    const sourceMap = this._sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return null;
    }
    const entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry || !entry.sourceURL) {
      return null;
    }
    const uiSourceCode = script.isContentScript() ? this._contentScriptsProject.uiSourceCodeForURL(entry.sourceURL) :
                                                    this._regularProject.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation(
        /** @type {number} */ (entry.sourceLineNumber), /** @type {number} */ (entry.sourceColumnNumber));
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const sourceMap = uiSourceCode[_sourceMapSymbol];
    if (!sourceMap) {
      return [];
    }
    const scripts = this._sourceMapManager.clientsForSourceMap(sourceMap);
    if (!scripts.length) {
      return [];
    }
    const entry = sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, columnNumber);
    if (!entry) {
      return [];
    }
    return scripts.map(
        script => this._debuggerModel.createRawLocation(
            script, entry.lineNumber + script.lineOffset,
            !entry.lineNumber ? entry.columnNumber + script.columnOffset : entry.columnNumber));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapWillAttach(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data);
    // Create stub UISourceCode for the time source mapping is being loaded.
    this._addStubUISourceCode(script);
    await this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapFailedToAttach(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data);
    await this._removeStubUISourceCode(script);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapAttached(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data.client);
    const sourceMap = /** @type {!SDK.SourceMap.SourceMap} */ (event.data.sourceMap);
    await this._removeStubUISourceCode(script);

    if (BlackboxManager.instance().isBlackboxedURL(script.sourceURL, script.isContentScript())) {
      this._sourceMapAttachedForTest(sourceMap);
      return;
    }

    await this._populateSourceMapSources(script, sourceMap);
    this._sourceMapAttachedForTest(sourceMap);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _sourceMapDetached(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data.client);
    const sourceMap = /** @type {!SDK.SourceMap.SourceMap} */ (event.data.sourceMap);
    const bindings = script.isContentScript() ? this._contentScriptsBindings : this._regularBindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      const binding = bindings.get(sourceURL);
      if (binding) {
        binding.removeSourceMap(sourceMap, script.frameId);
        if (!binding._uiSourceCode) {
          bindings.delete(sourceURL);
        }
      }
    }
    await this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {?SDK.SourceMap.SourceMap}
   */
  sourceMapForScript(script) {
    return this._sourceMapManager.sourceMapForClient(script);
  }

  /**
   * @param {?SDK.SourceMap.SourceMap} sourceMap
   */
  _sourceMapAttachedForTest(sourceMap) {
  }

  /**
   * @param {!SDK.Script.Script} script
   * @param {!SDK.SourceMap.SourceMap} sourceMap
   */
  async _populateSourceMapSources(script, sourceMap) {
    const project = script.isContentScript() ? this._contentScriptsProject : this._regularProject;
    const bindings = script.isContentScript() ? this._contentScriptsBindings : this._regularBindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      let binding = bindings.get(sourceURL);
      if (!binding) {
        binding = new Binding(project, sourceURL);
        bindings.set(sourceURL, binding);
      }
      binding.addSourceMap(sourceMap, script.frameId);
    }
    await this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  static uiLineHasMapping(uiSourceCode, lineNumber) {
    const sourceMap = uiSourceCode[_sourceMapSymbol];
    if (!sourceMap) {
      return true;
    }
    return !!sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, 0);
  }

  dispose() {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._regularProject.dispose();
    this._contentScriptsProject.dispose();
    this._stubProject.dispose();
  }
}

const _sourceMapSymbol = Symbol('_sourceMapSymbol');

class Binding {
  /**
   * @param {!ContentProviderBasedProject} project
   * @param {string} url
   */
  constructor(project, url) {
    this._project = project;
    this._url = url;

    /** @type {!Array<!SDK.SourceMap.SourceMap>} */
    this._referringSourceMaps = [];
    this._activeSourceMap = null;
    this._uiSourceCode = null;
  }

  /**
   * @param {string} frameId
   */
  _recreateUISourceCodeIfNeeded(frameId) {
    const sourceMap = this._referringSourceMaps.peekLast();
    if (this._activeSourceMap === sourceMap) {
      return;
    }
    this._activeSourceMap = sourceMap;

    const newUISourceCode =
        this._project.createUISourceCode(this._url, Common.ResourceType.resourceTypes.SourceMapScript);
    newUISourceCode[_sourceMapSymbol] = sourceMap;
    const contentProvider =
        sourceMap.sourceContentProvider(this._url, Common.ResourceType.resourceTypes.SourceMapScript);
    const mimeType = Common.ResourceType.ResourceType.mimeFromURL(this._url) || 'text/javascript';
    const embeddedContent = sourceMap.embeddedContentByURL(this._url);
    const metadata = typeof embeddedContent === 'string' ?
        new Workspace.UISourceCode.UISourceCodeMetadata(null, embeddedContent.length) :
        null;

    if (this._uiSourceCode) {
      NetworkProject.cloneInitialFrameAttribution(this._uiSourceCode, newUISourceCode);
      this._project.removeFile(this._uiSourceCode.url());
    } else {
      NetworkProject.setInitialFrameAttribution(newUISourceCode, frameId);
    }
    this._uiSourceCode = newUISourceCode;
    this._project.addUISourceCodeWithProvider(this._uiSourceCode, contentProvider, metadata, mimeType);
  }

  /**
   * @param {!SDK.SourceMap.SourceMap} sourceMap
   * @param {string} frameId
   */
  addSourceMap(sourceMap, frameId) {
    if (this._uiSourceCode) {
      NetworkProject.addFrameAttribution(this._uiSourceCode, frameId);
    }
    this._referringSourceMaps.push(sourceMap);
    this._recreateUISourceCodeIfNeeded(frameId);
  }

  /**
   * @param {!SDK.SourceMap.SourceMap} sourceMap
   * @param {string} frameId
   */
  removeSourceMap(sourceMap, frameId) {
    NetworkProject.removeFrameAttribution(
        /** @type {!Workspace.UISourceCode.UISourceCode} */ (this._uiSourceCode), frameId);
    const lastIndex = this._referringSourceMaps.lastIndexOf(sourceMap);
    if (lastIndex !== -1) {
      this._referringSourceMaps.splice(lastIndex, 1);
    }
    if (!this._referringSourceMaps.length) {
      this._project.removeFile(this._uiSourceCode.url());
      this._uiSourceCode = null;
    } else {
      this._recreateUISourceCodeIfNeeded(frameId);
    }
  }
}
