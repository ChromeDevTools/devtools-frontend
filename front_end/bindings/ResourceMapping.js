// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {NetworkProject} from './NetworkProject.js';
import {resourceMetadata} from './ResourceUtils.js';

/**
 * @implements {SDK.SDKModelObserver<!SDK.ResourceTreeModel>}
 */
export class ResourceMapping {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;
    /** @type {!Map<!SDK.ResourceTreeModel, !ModelInfo>} */
    this._modelToInfo = new Map();
    targetManager.observeModels(SDK.ResourceTreeModel, this);
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  modelAdded(resourceTreeModel) {
    const info = new ModelInfo(this._workspace, resourceTreeModel);
    this._modelToInfo.set(resourceTreeModel, info);
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  modelRemoved(resourceTreeModel) {
    const info = this._modelToInfo.get(resourceTreeModel);
    info.dispose();
    this._modelToInfo.delete(resourceTreeModel);
  }

  /**
   * @param {!SDK.Target} target
   * @return {?ModelInfo}
   */
  _infoForTarget(target) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel);
    return resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) : null;
  }

  /**
   * @param {!SDK.CSSLocation} cssLocation
   * @return {?Workspace.UILocation}
   */
  cssLocationToUILocation(cssLocation) {
    const header = cssLocation.header();
    if (!header) {
      return null;
    }
    const info = this._infoForTarget(cssLocation.cssModel().target());
    if (!info) {
      return null;
    }
    const uiSourceCode = info._project.uiSourceCodeForURL(cssLocation.url);
    if (!uiSourceCode) {
      return null;
    }
    const offset = header[offsetSymbol] || TextUtils.TextRange.createFromLocation(header.startLine, header.startColumn);
    const lineNumber = cssLocation.lineNumber + offset.startLine - header.startLine;
    let columnNumber = cssLocation.columnNumber;
    if (cssLocation.lineNumber === header.startLine) {
      columnNumber += offset.startColumn - header.startColumn;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} jsLocation
   * @return {?Workspace.UILocation}
   */
  jsLocationToUILocation(jsLocation) {
    const script = jsLocation.script();
    if (!script) {
      return null;
    }
    const info = this._infoForTarget(jsLocation.debuggerModel.target());
    if (!info) {
      return null;
    }
    const uiSourceCode = info._project.uiSourceCodeForURL(script.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    const offset =
        script[offsetSymbol] || TextUtils.TextRange.createFromLocation(script.lineOffset, script.columnOffset);
    const lineNumber = jsLocation.lineNumber + offset.startLine - script.lineOffset;
    let columnNumber = jsLocation.columnNumber;
    if (jsLocation.lineNumber === script.lineOffset) {
      columnNumber += offset.startColumn - script.columnOffset;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToJSLocations(uiSourceCode, lineNumber, columnNumber) {
    if (!uiSourceCode[symbol]) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    const location = debuggerModel.createRawLocationByURL(uiSourceCode.url(), lineNumber, columnNumber);
    if (location && location.script().containsLocation(lineNumber, columnNumber)) {
      return [location];
    }
    return [];
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Array<!SDK.CSSLocation>}
   */
  uiLocationToCSSLocations(uiLocation) {
    if (!uiLocation.uiSourceCode[symbol]) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);
    if (!target) {
      return [];
    }
    const cssModel = target.model(SDK.CSSModel);
    if (!cssModel) {
      return [];
    }
    return cssModel.createRawLocationsByURL(
        uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber);
  }

  /**
   * @param {!SDK.Target} target
   */
  _resetForTest(target) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel);
    const info = resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) : null;
    if (info) {
      info._resetForTest();
    }
  }
}

class ModelInfo {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  constructor(workspace, resourceTreeModel) {
    const target = resourceTreeModel.target();
    this._project = new ContentProviderBasedProject(
        workspace, 'resources:' + target.id(), Workspace.projectTypes.Network, '', false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._project, target);

    /** @type {!Map<string, !Binding>} */
    this._bindings = new Map();

    const cssModel = target.model(SDK.CSSModel);
    this._cssModel = cssModel;
    this._eventListeners = [
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameWillNavigate, this._frameWillNavigate, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this),
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this._styleSheetChanged, this)
    ];
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetChanged(event) {
    const header = this._cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !header.isInline) {
      return;
    }
    const binding = this._bindings.get(header.resourceURL());
    if (!binding) {
      return;
    }
    binding._styleSheetChanged(header, event.data.edit);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  _acceptsResource(resource) {
    const resourceType = resource.resourceType();
    // Only load selected resource types from resources.
    if (resourceType !== Common.resourceTypes.Image && resourceType !== Common.resourceTypes.Font &&
        resourceType !== Common.resourceTypes.Document && resourceType !== Common.resourceTypes.Manifest) {
      return false;
    }

    // Ignore non-images and non-fonts.
    if (resourceType === Common.resourceTypes.Image && resource.mimeType && !resource.mimeType.startsWith('image')) {
      return false;
    }
    if (resourceType === Common.resourceTypes.Font && resource.mimeType && !resource.mimeType.includes('font')) {
      return false;
    }
    if ((resourceType === Common.resourceTypes.Image || resourceType === Common.resourceTypes.Font) &&
        resource.contentURL().startsWith('data:')) {
      return false;
    }
    return true;
  }

  /**
   * @param {!Common.Event} event
   */
  _resourceAdded(event) {
    const resource = /** @type {!SDK.Resource} */ (event.data);
    if (!this._acceptsResource(resource)) {
      return;
    }

    let binding = this._bindings.get(resource.url);
    if (!binding) {
      binding = new Binding(this._project, resource);
      this._bindings.set(resource.url, binding);
    } else {
      binding.addResource(resource);
    }
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _removeFrameResources(frame) {
    for (const resource of frame.resources()) {
      if (!this._acceptsResource(resource)) {
        continue;
      }
      const binding = this._bindings.get(resource.url);
      if (binding._resources.size === 1) {
        binding.dispose();
        this._bindings.delete(resource.url);
      } else {
        binding.removeResource(resource);
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _frameWillNavigate(event) {
    const frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    this._removeFrameResources(frame);
  }

  /**
   * @param {!Common.Event} event
   */
  _frameDetached(event) {
    const frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    this._removeFrameResources(frame);
  }

  _resetForTest() {
    for (const binding of this._bindings.valuesArray()) {
      binding.dispose();
    }
    this._bindings.clear();
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    for (const binding of this._bindings.valuesArray()) {
      binding.dispose();
    }
    this._bindings.clear();
    this._project.removeProject();
  }
}

/**
 * @implements {Common.ContentProvider}
 */
class Binding {
  /**
   * @param {!ContentProviderBasedProject} project
   * @param {!SDK.Resource} resource
   */
  constructor(project, resource) {
    this._resources = new Set([resource]);
    this._project = project;
    this._uiSourceCode = this._project.createUISourceCode(resource.url, resource.contentType());
    this._uiSourceCode[symbol] = true;
    NetworkProject.setInitialFrameAttribution(this._uiSourceCode, resource.frameId);
    this._project.addUISourceCodeWithProvider(this._uiSourceCode, this, resourceMetadata(resource), resource.mimeType);
    /** @type {!Array<{stylesheet: !SDK.CSSStyleSheetHeader, edit: ?SDK.CSSModel.Edit}>} */
    this._edits = [];
  }

  /**
   * @return {!Array<!SDK.CSSStyleSheetHeader>}
   */
  _inlineStyles() {
    const target = NetworkProject.targetForUISourceCode(this._uiSourceCode);
    const cssModel = target.model(SDK.CSSModel);
    const stylesheets = [];
    if (cssModel) {
      for (const headerId of cssModel.styleSheetIdsForURL(this._uiSourceCode.url())) {
        const header = cssModel.styleSheetHeaderForId(headerId);
        if (header) {
          stylesheets.push(header);
        }
      }
    }
    return stylesheets;
  }

  /**
   * @return {!Array<!SDK.Script>}
   */
  _inlineScripts() {
    const target = NetworkProject.targetForUISourceCode(this._uiSourceCode);
    const debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    return debuggerModel.scriptsForSourceURL(this._uiSourceCode.url());
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} stylesheet
   * @param {?SDK.CSSModel.Edit} edit
   */
  async _styleSheetChanged(stylesheet, edit) {
    this._edits.push({stylesheet, edit});
    if (this._edits.length > 1) {
      return;
    }  // There is already a _styleSheetChanged loop running

    const {content} = await this._uiSourceCode.requestContent();
    if (content !== null) {
      this._innerStyleSheetChanged(content);
    }
    this._edits = [];
  }

  /**
   * @param {string} content
   */
  _innerStyleSheetChanged(content) {
    const scripts = this._inlineScripts();
    const styles = this._inlineStyles();
    let text = new TextUtils.Text(content);
    for (const data of this._edits) {
      const edit = data.edit;
      if (!edit) {
        continue;
      }
      const stylesheet = data.stylesheet;
      const startLocation = stylesheet[offsetSymbol] ||
          TextUtils.TextRange.createFromLocation(stylesheet.startLine, stylesheet.startColumn);

      const oldRange = edit.oldRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      const newRange = edit.newRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      text = new TextUtils.Text(text.replaceRange(oldRange, edit.newText));
      for (const script of scripts) {
        const scriptOffset =
            script[offsetSymbol] || TextUtils.TextRange.createFromLocation(script.lineOffset, script.columnOffset);
        if (!scriptOffset.follows(oldRange)) {
          continue;
        }
        script[offsetSymbol] = scriptOffset.rebaseAfterTextEdit(oldRange, newRange);
        Bindings.debuggerWorkspaceBinding.updateLocations(script);
      }
      for (const style of styles) {
        const styleOffset =
            style[offsetSymbol] || TextUtils.TextRange.createFromLocation(style.startLine, style.startColumn);
        if (!styleOffset.follows(oldRange)) {
          continue;
        }
        style[offsetSymbol] = styleOffset.rebaseAfterTextEdit(oldRange, newRange);
        Bindings.cssWorkspaceBinding.updateLocations(style);
      }
    }
    this._uiSourceCode.addRevision(text.value());
  }

  /**
   * @param {!SDK.Resource} resource
   */
  addResource(resource) {
    this._resources.add(resource);
    NetworkProject.addFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  removeResource(resource) {
    this._resources.delete(resource);
    NetworkProject.removeFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  dispose() {
    this._project.removeFile(this._uiSourceCode.url());
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._resources.firstValue().contentURL();
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return this._resources.firstValue().contentType();
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  contentEncoded() {
    return this._resources.firstValue().contentEncoded();
  }

  /**
   * @override
   * @return {!Promise<!Common.DeferredContent>}
   */
  requestContent() {
    return this._resources.firstValue().requestContent();
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!Common.ContentProvider.SearchMatch>>}
   */
  searchInContent(query, caseSensitive, isRegex) {
    return this._resources.firstValue().searchInContent(query, caseSensitive, isRegex);
  }
}

export const symbol = Symbol('Bindings.ResourceMapping._symbol');
export const offsetSymbol = Symbol('Bindings.ResourceMapping._offsetSymbol');
