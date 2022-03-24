// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
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

export class ResourceMapping implements SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel> {
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly #modelToInfo: Map<SDK.ResourceTreeModel.ResourceTreeModel, ModelInfo>;
  private constructor(targetManager: SDK.TargetManager.TargetManager, workspace: Workspace.Workspace.WorkspaceImpl) {
    this.#workspace = workspace;
    this.#modelToInfo = new Map();
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
    targetManager: SDK.TargetManager.TargetManager|null,
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
    const info = new ModelInfo(this.#workspace, resourceTreeModel);
    this.#modelToInfo.set(resourceTreeModel, info);
  }

  modelRemoved(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
    const info = this.#modelToInfo.get(resourceTreeModel);
    if (info) {
      info.dispose();
      this.#modelToInfo.delete(resourceTreeModel);
    }
  }

  private infoForTarget(target: SDK.Target.Target): ModelInfo|null {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel ? this.#modelToInfo.get(resourceTreeModel) || null : null;
  }

  cssLocationToUILocation(cssLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null {
    const header = cssLocation.header();
    if (!header) {
      return null;
    }
    const info = this.infoForTarget(cssLocation.cssModel().target());
    if (!info) {
      return null;
    }
    const uiSourceCode = info.getProject().uiSourceCodeForURL(cssLocation.url);
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
    const info = this.infoForTarget(jsLocation.debuggerModel.target());
    if (!info) {
      return null;
    }
    const uiSourceCode = info.getProject().uiSourceCodeForURL(script.sourceURL);
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

  resetForTest(target: SDK.Target.Target): void {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const info = resourceTreeModel ? this.#modelToInfo.get(resourceTreeModel) : null;
    if (info) {
      info.resetForTest();
    }
  }
}

class ModelInfo {
  project: ContentProviderBasedProject;
  readonly #bindings: Map<string, Binding>;
  readonly #cssModel: SDK.CSSModel.CSSModel;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel) {
    const target = resourceTreeModel.target();
    this.project = new ContentProviderBasedProject(
        workspace, 'resources:' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this.project, target);

    this.#bindings = new Map();

    const cssModel = target.model(SDK.CSSModel.CSSModel);
    console.assert(Boolean(cssModel));
    this.#cssModel = (cssModel as SDK.CSSModel.CSSModel);
    this.#eventListeners = [
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this.resourceAdded, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameWillNavigate, this.frameWillNavigate, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this.frameDetached, this),
      this.#cssModel.addEventListener(
          SDK.CSSModel.Events.StyleSheetChanged,
          event => {
            void this.styleSheetChanged(event);
          },
          this),
    ];
  }

  private async styleSheetChanged(event: Common.EventTarget.EventTargetEvent<SDK.CSSModel.StyleSheetChangedEvent>):
      Promise<void> {
    const header = this.#cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !header.isInline || (header.isInline && header.isMutable)) {
      return;
    }
    const binding = this.#bindings.get(header.resourceURL());
    if (!binding) {
      return;
    }
    await binding.styleSheetChanged(header, event.data.edit || null);
  }

  private acceptsResource(resource: SDK.Resource.Resource): boolean {
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

  private resourceAdded(event: Common.EventTarget.EventTargetEvent<SDK.Resource.Resource>): void {
    const resource = event.data;
    if (!this.acceptsResource(resource)) {
      return;
    }

    let binding = this.#bindings.get(resource.url);
    if (!binding) {
      binding = new Binding(this.project, resource);
      this.#bindings.set(resource.url, binding);
    } else {
      binding.addResource(resource);
    }
  }

  private removeFrameResources(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    for (const resource of frame.resources()) {
      if (!this.acceptsResource(resource)) {
        continue;
      }
      const binding = this.#bindings.get(resource.url);
      if (!binding) {
        continue;
      }
      if (binding.resources.size === 1) {
        binding.dispose();
        this.#bindings.delete(resource.url);
      } else {
        binding.removeResource(resource);
      }
    }
  }

  private frameWillNavigate(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>): void {
    this.removeFrameResources(event.data);
  }

  private frameDetached(
      event: Common.EventTarget.EventTargetEvent<{frame: SDK.ResourceTreeModel.ResourceTreeFrame, isSwap: boolean}>):
      void {
    this.removeFrameResources(event.data.frame);
  }

  resetForTest(): void {
    for (const binding of this.#bindings.values()) {
      binding.dispose();
    }
    this.#bindings.clear();
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    for (const binding of this.#bindings.values()) {
      binding.dispose();
    }
    this.#bindings.clear();
    this.project.removeProject();
  }

  getProject(): ContentProviderBasedProject {
    return this.project;
  }
}

class Binding implements TextUtils.ContentProvider.ContentProvider {
  readonly resources: Set<SDK.Resource.Resource>;
  readonly #project: ContentProviderBasedProject;
  readonly #uiSourceCode: Workspace.UISourceCode.UISourceCode;
  #edits: {
    stylesheet: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader,
    edit: SDK.CSSModel.Edit|null,
  }[];
  constructor(project: ContentProviderBasedProject, resource: SDK.Resource.Resource) {
    this.resources = new Set([resource]);
    this.#project = project;
    this.#uiSourceCode = this.#project.createUISourceCode(resource.url, resource.contentType());
    boundUISourceCodes.add(this.#uiSourceCode);
    if (resource.frameId) {
      NetworkProject.setInitialFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
    this.#project.addUISourceCodeWithProvider(this.#uiSourceCode, this, resourceMetadata(resource), resource.mimeType);
    this.#edits = [];
  }

  private inlineStyles(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader[] {
    const target = NetworkProject.targetForUISourceCode(this.#uiSourceCode);
    const stylesheets: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader[] = [];
    if (!target) {
      return stylesheets;
    }
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    if (cssModel) {
      for (const headerId of cssModel.getStyleSheetIdsForURL(this.#uiSourceCode.url())) {
        const header = cssModel.styleSheetHeaderForId(headerId);
        if (header) {
          stylesheets.push(header);
        }
      }
    }
    return stylesheets;
  }

  private inlineScripts(): SDK.Script.Script[] {
    const target = NetworkProject.targetForUISourceCode(this.#uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    return debuggerModel.scriptsForSourceURL(this.#uiSourceCode.url());
  }

  async styleSheetChanged(stylesheet: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, edit: SDK.CSSModel.Edit|null):
      Promise<void> {
    this.#edits.push({stylesheet, edit});
    if (this.#edits.length > 1) {
      return;
    }  // There is already a styleSheetChanged loop running

    const {content} = await this.#uiSourceCode.requestContent();
    if (content !== null) {
      await this.innerStyleSheetChanged(content);
    }
    this.#edits = [];
  }

  private async innerStyleSheetChanged(content: string): Promise<void> {
    const scripts = this.inlineScripts();
    const styles = this.inlineStyles();
    let text: TextUtils.Text.Text = new TextUtils.Text.Text(content);
    for (const data of this.#edits) {
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
    this.#uiSourceCode.addRevision(text.value());
  }

  addResource(resource: SDK.Resource.Resource): void {
    this.resources.add(resource);
    if (resource.frameId) {
      NetworkProject.addFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
  }

  removeResource(resource: SDK.Resource.Resource): void {
    this.resources.delete(resource);
    if (resource.frameId) {
      NetworkProject.removeFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
  }

  dispose(): void {
    this.#project.removeFile(this.#uiSourceCode.url());
  }

  private firstResource(): SDK.Resource.Resource {
    console.assert(this.resources.size > 0);
    return this.resources.values().next().value;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.firstResource().contentURL();
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.firstResource().contentType();
  }

  contentEncoded(): Promise<boolean> {
    return this.firstResource().contentEncoded();
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return this.firstResource().requestContent();
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    return this.firstResource().searchInContent(query, caseSensitive, isRegex);
  }
}
