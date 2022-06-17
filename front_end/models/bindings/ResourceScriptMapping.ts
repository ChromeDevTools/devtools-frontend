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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';
import type * as Protocol from '../../generated/protocol.js';

import type {Breakpoint} from './BreakpointManager.js';
import {BreakpointManager} from './BreakpointManager.js';
import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import type {DebuggerSourceMapping, DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {NetworkProject} from './NetworkProject.js';
import {metadataForURL} from './ResourceUtils.js';

const UIStrings = {
  /**
  *@description Error text displayed in the console when editing a live script fails. LiveEdit is
  *the name of the feature for editing code that is already running.
  *@example {warning} PH1
  */
  liveEditFailed: '`LiveEdit` failed: {PH1}',
  /**
  *@description Error text displayed in the console when compiling a live-edited script fails. LiveEdit is
  *the name of the feature for editing code that is already running.
  *@example {connection lost} PH1
  */
  liveEditCompileFailed: '`LiveEdit` compile failed: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('models/bindings/ResourceScriptMapping.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ResourceScriptMapping implements DebuggerSourceMapping {
  readonly debuggerModel: SDK.DebuggerModel.DebuggerModel;
  #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #uiSourceCodeToScriptFile: Map<Workspace.UISourceCode.UISourceCode, ResourceScriptFile>;
  readonly #projects: Map<string, ContentProviderBasedProject>;
  #acceptedScripts: Set<SDK.Script.Script>;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.debuggerModel = debuggerModel;
    this.#workspace = workspace;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#uiSourceCodeToScriptFile = new Map();

    this.#projects = new Map();

    this.#acceptedScripts = new Set();
    const runtimeModel = debuggerModel.runtimeModel();
    this.#eventListeners = [
      this.debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.ParsedScriptSource,
          event => {
            void this.parsedScriptSource(event);
          },
          this),
      this.debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this),
      runtimeModel.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.executionContextDestroyed, this),
    ];
  }

  private project(script: SDK.Script.Script): ContentProviderBasedProject {
    const prefix = script.isContentScript() ? 'js:extensions:' : 'js::';
    const projectId = prefix + this.debuggerModel.target().id() + ':' + script.frameId;
    let project = this.#projects.get(projectId);
    if (!project) {
      const projectType = script.isContentScript() ? Workspace.Workspace.projectTypes.ContentScripts :
                                                     Workspace.Workspace.projectTypes.Network;
      project = new ContentProviderBasedProject(
          this.#workspace, projectId, projectType, '' /* displayName */, false /* isServiceProject */);
      NetworkProject.setTargetForProject(project, this.debuggerModel.target());
      this.#projects.set(projectId, project);
    }
    return project;
  }

  rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const project = this.project(script);
    const uiSourceCode = project.uiSourceCodeForURL(script.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return null;
    }
    if ((scriptFile.hasDivergedFromVM() && !scriptFile.isMergingToVM()) || scriptFile.isDivergingFromVM()) {
      return null;
    }
    if (!scriptFile.hasScripts([script])) {
      return null;
    }
    const {lineNumber, columnNumber = 0} = rawLocation;
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  uiLocationToRawLocations(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number):
      SDK.DebuggerModel.Location[] {
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return [];
    }

    const {script} = scriptFile;
    if (!script) {
      return [];
    }

    return [this.debuggerModel.createRawLocation(script, lineNumber, columnNumber)];
  }

  private acceptsScript(script: SDK.Script.Script): boolean {
    if (!script.sourceURL || script.isLiveEdit() || (script.isInlineScript() && !script.hasSourceURL)) {
      return false;
    }
    // Filter out embedder injected content scripts.
    if (script.isContentScript() && !script.hasSourceURL) {
      const parsedURL = new Common.ParsedURL.ParsedURL(script.sourceURL);
      if (!parsedURL.isValid) {
        return false;
      }
    }
    return true;
  }

  private async parsedScriptSource(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): Promise<void> {
    const script = event.data;
    if (!this.acceptsScript(script)) {
      return;
    }
    this.#acceptedScripts.add(script);
    const originalContentProvider = script.originalContentProvider();

    const url = script.sourceURL;
    const project = this.project(script);

    // Remove previous UISourceCode, if any
    const oldUISourceCode = project.uiSourceCodeForURL(url);
    if (oldUISourceCode) {
      const scriptFile = this.#uiSourceCodeToScriptFile.get(oldUISourceCode);
      if (scriptFile && scriptFile.script) {
        await this.removeScript(scriptFile.script);
      }
    }

    // Create UISourceCode.
    const uiSourceCode = project.createUISourceCode(url, originalContentProvider.contentType());
    NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
    const metadata = metadataForURL(this.debuggerModel.target(), script.frameId, url);

    // Bind UISourceCode to scripts.
    const scriptFile = new ResourceScriptFile(this, uiSourceCode, [script]);
    this.#uiSourceCodeToScriptFile.set(uiSourceCode, scriptFile);

    const mimeType = script.isWasm() ? 'application/wasm' : 'text/javascript';
    project.addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata, mimeType);
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  scriptFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): ResourceScriptFile|null {
    return this.#uiSourceCodeToScriptFile.get(uiSourceCode) || null;
  }

  private async removeScript(script: SDK.Script.Script): Promise<void> {
    if (!this.#acceptedScripts.has(script)) {
      return;
    }
    this.#acceptedScripts.delete(script);
    const project = this.project(script);
    const uiSourceCode = (project.uiSourceCodeForURL(script.sourceURL) as Workspace.UISourceCode.UISourceCode);
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (scriptFile) {
      scriptFile.dispose();
    }
    this.#uiSourceCodeToScriptFile.delete(uiSourceCode);
    project.removeFile(script.sourceURL);
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  private executionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>):
      void {
    const executionContext = event.data;
    const scripts = this.debuggerModel.scriptsForExecutionContext(executionContext);
    for (const script of scripts) {
      void this.removeScript(script);
    }
  }

  private globalObjectCleared(): void {
    const scripts = Array.from(this.#acceptedScripts);
    for (const script of scripts) {
      void this.removeScript(script);
    }
  }

  resetForTest(): void {
    const scripts = Array.from(this.#acceptedScripts);
    for (const script of scripts) {
      void this.removeScript(script);
    }
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    const scripts = Array.from(this.#acceptedScripts);
    for (const script of scripts) {
      void this.removeScript(script);
    }
    for (const project of this.#projects.values()) {
      project.removeProject();
    }
    this.#projects.clear();
  }
}

export class ResourceScriptFile extends Common.ObjectWrapper.ObjectWrapper<ResourceScriptFile.EventTypes> {
  readonly #resourceScriptMapping: ResourceScriptMapping;
  readonly #uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;
  scriptInternal: SDK.Script.Script|undefined;
  #scriptSource?: string|null;
  #isDivergingFromVMInternal?: boolean;
  #hasDivergedFromVMInternal?: boolean;
  #isMergingToVMInternal?: boolean;
  constructor(
      resourceScriptMapping: ResourceScriptMapping, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      scripts: SDK.Script.Script[]) {
    super();
    console.assert(scripts.length > 0);

    this.#resourceScriptMapping = resourceScriptMapping;
    this.#uiSourceCodeInternal = uiSourceCode;

    if (this.#uiSourceCodeInternal.contentType().isScript()) {
      this.scriptInternal = scripts[scripts.length - 1];
    }

    this.#uiSourceCodeInternal.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.#uiSourceCodeInternal.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
  }

  hasScripts(scripts: SDK.Script.Script[]): boolean {
    return Boolean(this.scriptInternal) && this.scriptInternal === scripts[0];
  }

  private isDiverged(): boolean {
    if (this.#uiSourceCodeInternal.isDirty()) {
      return true;
    }
    if (!this.scriptInternal) {
      return false;
    }
    if (typeof this.#scriptSource === 'undefined' || this.#scriptSource === null) {
      return false;
    }
    const workingCopy = this.#uiSourceCodeInternal.workingCopy();
    if (!workingCopy) {
      return false;
    }

    // Match ignoring sourceURL.
    if (!workingCopy.startsWith(this.#scriptSource.trimEnd())) {
      return true;
    }
    const suffix = this.#uiSourceCodeInternal.workingCopy().substr(this.#scriptSource.length);
    return Boolean(suffix.length) && !suffix.match(SDK.Script.sourceURLRegex);
  }

  private workingCopyChanged(): void {
    void this.update();
  }

  private workingCopyCommitted(): void {
    if (this.#uiSourceCodeInternal.project().canSetFileContent()) {
      return;
    }
    if (!this.scriptInternal) {
      return;
    }
    const breakpoints = BreakpointManager.instance()
                            .breakpointLocationsForUISourceCode(this.#uiSourceCodeInternal)
                            .map(breakpointLocation => breakpointLocation.breakpoint);
    const source = this.#uiSourceCodeInternal.workingCopy();
    void this.scriptInternal.editSource(source).then(({error, exceptionDetails}) => {
      void this.scriptSourceWasSet(source, breakpoints, error, exceptionDetails);
    });
  }

  async scriptSourceWasSet(
      source: string, breakpoints: Breakpoint[], error: string|null,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails): Promise<void> {
    if (!error && !exceptionDetails) {
      this.#scriptSource = source;
    }
    await this.update();

    if (!error && !exceptionDetails) {
      // Live edit can cause #breakpoints to be in the wrong position, or to be lost altogether.
      // If any #breakpoints were in the pre-live edit script, they need to be re-added.
      await Promise.all(breakpoints.map(breakpoint => breakpoint.refreshInDebugger()));
      return;
    }
    if (!exceptionDetails) {
      Common.Console.Console.instance().addMessage(
          i18nString(UIStrings.liveEditFailed, {PH1: String(error)}), Common.Console.MessageLevel.Warning);
      return;
    }
    const messageText = i18nString(UIStrings.liveEditCompileFailed, {PH1: exceptionDetails.text});
    this.#uiSourceCodeInternal.addLineMessage(
        Workspace.UISourceCode.Message.Level.Error, messageText, exceptionDetails.lineNumber,
        exceptionDetails.columnNumber);
  }

  private async update(): Promise<void> {
    if (this.isDiverged() && !this.#hasDivergedFromVMInternal) {
      await this.divergeFromVM();
    } else if (!this.isDiverged() && this.#hasDivergedFromVMInternal) {
      await this.mergeToVM();
    }
  }

  private async divergeFromVM(): Promise<void> {
    if (this.scriptInternal) {
      this.#isDivergingFromVMInternal = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.scriptInternal);
      this.#isDivergingFromVMInternal = undefined;
      this.#hasDivergedFromVMInternal = true;
      this.dispatchEventToListeners(ResourceScriptFile.Events.DidDivergeFromVM);
    }
  }

  private async mergeToVM(): Promise<void> {
    if (this.scriptInternal) {
      this.#hasDivergedFromVMInternal = undefined;
      this.#isMergingToVMInternal = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.scriptInternal);
      this.#isMergingToVMInternal = undefined;
      this.dispatchEventToListeners(ResourceScriptFile.Events.DidMergeToVM);
    }
  }

  hasDivergedFromVM(): boolean {
    return Boolean(this.#hasDivergedFromVMInternal);
  }

  isDivergingFromVM(): boolean {
    return Boolean(this.#isDivergingFromVMInternal);
  }

  isMergingToVM(): boolean {
    return Boolean(this.#isMergingToVMInternal);
  }

  checkMapping(): void {
    if (!this.scriptInternal || typeof this.#scriptSource !== 'undefined') {
      this.mappingCheckedForTest();
      return;
    }
    void this.scriptInternal.requestContent().then(deferredContent => {
      this.#scriptSource = deferredContent.content;
      void this.update().then(() => this.mappingCheckedForTest());
    });
  }

  private mappingCheckedForTest(): void {
  }

  dispose(): void {
    this.#uiSourceCodeInternal.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.#uiSourceCodeInternal.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
  }

  addSourceMapURL(sourceMapURL: Platform.DevToolsPath.UrlString): void {
    if (!this.scriptInternal) {
      return;
    }
    this.scriptInternal.debuggerModel.setSourceMapURL(this.scriptInternal, sourceMapURL);
  }

  hasSourceMapURL(): boolean {
    return this.scriptInternal !== undefined && Boolean(this.scriptInternal.sourceMapURL);
  }

  async missingSymbolFiles(): Promise<string[]|null> {
    if (!this.scriptInternal) {
      return null;
    }
    const {pluginManager} = this.#resourceScriptMapping.debuggerWorkspaceBinding;
    if (!pluginManager) {
      return null;
    }
    const sources = await pluginManager.getSourcesForScript(this.scriptInternal);
    return sources && 'missingSymbolFiles' in sources ? sources.missingSymbolFiles : null;
  }

  get script(): SDK.Script.Script|null {
    return this.scriptInternal || null;
  }

  get uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.#uiSourceCodeInternal;
  }
}

export namespace ResourceScriptFile {
  export const enum Events {
    DidMergeToVM = 'DidMergeToVM',
    DidDivergeFromVM = 'DidDivergeFromVM',
  }

  export type EventTypes = {
    [Events.DidMergeToVM]: void,
    [Events.DidDivergeFromVM]: void,
  };
}
