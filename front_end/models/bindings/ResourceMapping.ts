// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {CSSWorkspaceBinding} from './CSSWorkspaceBinding.js';
import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {NetworkProject} from './NetworkProject.js';
import {resourceMetadata} from './ResourceUtils.js';

let resourceMappingInstance: ResourceMapping;

const styleSheetOffsetMap = new WeakMap<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, TextUtils.TextRange.TextRange>();
const scriptOffsetMap = new WeakMap<SDK.Script.Script, TextUtils.TextRange.TextRange>();
const boundUISourceCodes = new WeakSet<Workspace.UISourceCode.UISourceCode>();

export class ResourceMapping implements SDK.SDKModel.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel> {
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _modelToInfo: Map<SDK.ResourceTreeModel.ResourceTreeModel, ModelInfo>;
  private constructor(targetManager: SDK.SDKModel.TargetManager, workspace: Workspace.Workspace.WorkspaceImpl) {
    this._workspace = workspace;
    this._modelToInfo = new Map();
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
    targetManager: SDK.SDKModel.TargetManager|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
  } = {forceNew: null, targetManager: null, workspace: null}): ResourceMapping {
    const {forceNew, targetManager, workspace} = opts;
    if (!resourceMappingInstance || forceNew) {
      if (!targetManager || !workspace) {
        throw new Error(
            `Unable to create ResourceMapping: targetManager and workspace must be provided: ${new Error().stack}`);
      }

      resourceMappingInstance = new ResourceMapping(targetManager, workspace);
    }

    return resourceMappingInstance;
  }

  modelAdded(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
    const info = new ModelInfo(this._workspace, resourceTreeModel);
    this._modelToInfo.set(resourceTreeModel, info);
  }

  modelRemoved(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
    const info = this._modelToInfo.get(resourceTreeModel);
    if (info) {
      info.dispose();
      this._modelToInfo.delete(resourceTreeModel);
    }
  }

  _infoForTarget(target: SDK.SDKModel.Target): ModelInfo|null {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) || null : null;
  }

  cssLocationToUILocation(cssLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null {
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
    const offset = styleSheetOffsetMap.get(header) ||
        TextUtils.TextRange.TextRange.createFromLocation(header.startLine, header.startColumn);
    const lineNumber = cssLocation.lineNumber + offset.startLine - header.startLine;
    let columnNumber = cssLocation.columnNumber;
    if (cssLocation.lineNumber === header.startLine) {
      columnNumber += offset.startColumn - header.startColumn;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  jsLocationToUILocation(jsLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
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
    const offset = scriptOffsetMap.get(script) ||
        TextUtils.TextRange.TextRange.createFromLocation(script.lineOffset, script.columnOffset);
    const lineNumber = jsLocation.lineNumber + offset.startLine - script.lineOffset;
    let columnNumber = jsLocation.columnNumber;
    if (jsLocation.lineNumber === script.lineOffset) {
      columnNumber += offset.startColumn - script.columnOffset;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  uiLocationToJSLocations(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number):
      SDK.DebuggerModel.Location[] {
    if (!boundUISourceCodes.has(uiSourceCode)) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    const location = debuggerModel.createRawLocationByURL(uiSourceCode.url(), lineNumber, columnNumber);
    if (location) {
      const script = location.script();
      if (script && script.containsLocation(lineNumber, columnNumber)) {
        return [location];
      }
    }
    return [];
  }

  uiLocationToCSSLocations(uiLocation: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[] {
    if (!boundUISourceCodes.has(uiLocation.uiSourceCode)) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);
    if (!target) {
      return [];
    }
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    if (!cssModel) {
      return [];
    }
    return cssModel.createRawLocationsByURL(
        uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber);
  }

  _resetForTest(target: SDK.SDKModel.Target): void {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const info = resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) : null;
    if (info) {
      info._resetForTest();
    }
  }
}

class ModelInfo {
  _project: ContentProviderBasedProject;
  _bindings: Map<string, Binding>;
  _cssModel: SDK.CSSModel.CSSModel;
  _eventListeners: Common.EventTarget.EventDescriptor[];
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel) {
    const target = resourceTreeModel.target();
    this._project = new ContentProviderBasedProject(
        workspace, 'resources:' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._project, target);

    this._bindings = new Map();

    const cssModel = target.model(SDK.CSSModel.CSSModel);
    console.assert(Boolean(cssModel));
    this._cssModel = (cssModel as SDK.CSSModel.CSSModel);
    this._eventListeners = [
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameWillNavigate, this._frameWillNavigate, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this),
      this._cssModel.addEventListener(
          SDK.CSSModel.Events.StyleSheetChanged,
          event => {
            this._styleSheetChanged(event);
          },
          this),
    ];
  }

  async _styleSheetChanged(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const header = this._cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !header.isInline || (header.isInline && header.isMutable)) {
      return;
    }
    const binding = this._bindings.get(header.resourceURL());
    if (!binding) {
      return;
    }
    await binding._styleSheetChanged(header, event.data.edit);
  }

  _acceptsResource(resource: SDK.Resource.Resource): boolean {
    const resourceType = resource.resourceType();
    // Only load selected resource types from resources.
    if (resourceType !== Common.ResourceType.resourceTypes.Image &&
        resourceType !== Common.ResourceType.resourceTypes.Font &&
        resourceType !== Common.ResourceType.resourceTypes.Document &&
        resourceType !== Common.ResourceType.resourceTypes.Manifest) {
      return false;
    }

    // Ignore non-images and non-fonts.
    if (resourceType === Common.ResourceType.resourceTypes.Image && resource.mimeType &&
        !resource.mimeType.startsWith('image')) {
      return false;
    }
    if (resourceType === Common.ResourceType.resourceTypes.Font && resource.mimeType &&
        !resource.mimeType.includes('font')) {
      return false;
    }
    if ((resourceType === Common.ResourceType.resourceTypes.Image ||
         resourceType === Common.ResourceType.resourceTypes.Font) &&
        resource.contentURL().startsWith('data:')) {
      return false;
    }
    return true;
  }

  _resourceAdded(event: Common.EventTarget.EventTargetEvent): void {
    const resource = (event.data as SDK.Resource.Resource);
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

  _removeFrameResources(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    for (const resource of frame.resources()) {
      if (!this._acceptsResource(resource)) {
        continue;
      }
      const binding = this._bindings.get(resource.url);
      if (!binding) {
        continue;
      }
      if (binding._resources.size === 1) {
        binding.dispose();
        this._bindings.delete(resource.url);
      } else {
        binding.removeResource(resource);
      }
    }
  }

  _frameWillNavigate(event: Common.EventTarget.EventTargetEvent): void {
    const frame = (event.data as SDK.ResourceTreeModel.ResourceTreeFrame);
    this._removeFrameResources(frame);
  }

  _frameDetached(event: Common.EventTarget.EventTargetEvent): void {
    const frame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame);
    this._removeFrameResources(frame);
  }

  _resetForTest(): void {
    for (const binding of this._bindings.values()) {
      binding.dispose();
    }
    this._bindings.clear();
  }

  dispose(): void {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    for (const binding of this._bindings.values()) {
      binding.dispose();
    }
    this._bindings.clear();
    this._project.removeProject();
  }
}

class Binding implements TextUtils.ContentProvider.ContentProvider {
  _resources: Set<SDK.Resource.Resource>;
  _project: ContentProviderBasedProject;
  _uiSourceCode: Workspace.UISourceCode.UISourceCode;
  _edits: {
    stylesheet: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader,
    edit: SDK.CSSModel.Edit|null,
  }[];
  constructor(project: ContentProviderBasedProject, resource: SDK.Resource.Resource) {
    this._resources = new Set([resource]);
    this._project = project;
    this._uiSourceCode = this._project.createUISourceCode(resource.url, resource.contentType());
    boundUISourceCodes.add(this._uiSourceCode);
    NetworkProject.setInitialFrameAttribution(this._uiSourceCode, resource.frameId);
    this._project.addUISourceCodeWithProvider(this._uiSourceCode, this, resourceMetadata(resource), resource.mimeType);
    this._edits = [];
  }

  _inlineStyles(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader[] {
    const target = NetworkProject.targetForUISourceCode(this._uiSourceCode);
    const stylesheets: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader[] = [];
    if (!target) {
      return stylesheets;
    }
    const cssModel = target.model(SDK.CSSModel.CSSModel);
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

  _inlineScripts(): SDK.Script.Script[] {
    const target = NetworkProject.targetForUISourceCode(this._uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    return debuggerModel.scriptsForSourceURL(this._uiSourceCode.url());
  }

  async _styleSheetChanged(stylesheet: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, edit: SDK.CSSModel.Edit|null):
      Promise<void> {
    this._edits.push({stylesheet, edit});
    if (this._edits.length > 1) {
      return;
    }  // There is already a _styleSheetChanged loop running

    const {content} = await this._uiSourceCode.requestContent();
    if (content !== null) {
      await this._innerStyleSheetChanged(content);
    }
    this._edits = [];
  }

  async _innerStyleSheetChanged(content: string): Promise<void> {
    const scripts = this._inlineScripts();
    const styles = this._inlineStyles();
    let text: TextUtils.Text.Text = new TextUtils.Text.Text(content);
    for (const data of this._edits) {
      const edit = data.edit;
      if (!edit) {
        continue;
      }
      const stylesheet = data.stylesheet;
      const startLocation = styleSheetOffsetMap.get(stylesheet) ||
          TextUtils.TextRange.TextRange.createFromLocation(stylesheet.startLine, stylesheet.startColumn);

      const oldRange = edit.oldRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      const newRange = edit.newRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      text = new TextUtils.Text.Text(text.replaceRange(oldRange, edit.newText));
      const updatePromises = [];
      for (const script of scripts) {
        const scriptOffset = scriptOffsetMap.get(script) ||
            TextUtils.TextRange.TextRange.createFromLocation(script.lineOffset, script.columnOffset);
        if (!scriptOffset.follows(oldRange)) {
          continue;
        }
        scriptOffsetMap.set(script, scriptOffset.rebaseAfterTextEdit(oldRange, newRange));
        updatePromises.push(DebuggerWorkspaceBinding.instance().updateLocations(script));
      }
      for (const style of styles) {
        const styleOffset = styleSheetOffsetMap.get(style) ||
            TextUtils.TextRange.TextRange.createFromLocation(style.startLine, style.startColumn);
        if (!styleOffset.follows(oldRange)) {
          continue;
        }
        styleSheetOffsetMap.set(style, styleOffset.rebaseAfterTextEdit(oldRange, newRange));
        updatePromises.push(CSSWorkspaceBinding.instance().updateLocations(style));
      }
      await Promise.all(updatePromises);
    }
    this._uiSourceCode.addRevision(text.value());
  }

  addResource(resource: SDK.Resource.Resource): void {
    this._resources.add(resource);
    NetworkProject.addFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  removeResource(resource: SDK.Resource.Resource): void {
    this._resources.delete(resource);
    NetworkProject.removeFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  dispose(): void {
    this._project.removeFile(this._uiSourceCode.url());
  }

  _firstResource(): SDK.Resource.Resource {
    console.assert(this._resources.size > 0);
    return this._resources.values().next().value;
  }

  contentURL(): string {
    return this._firstResource().contentURL();
  }

  contentType(): Common.ResourceType.ResourceType {
    return this._firstResource().contentType();
  }

  contentEncoded(): Promise<boolean> {
    return this._firstResource().contentEncoded();
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return this._firstResource().requestContent();
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    return this._firstResource().searchInContent(query, caseSensitive, isRegex);
  }
}
