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
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {DebuggerWorkspaceBinding, type DebuggerSourceMapping} from './DebuggerWorkspaceBinding.js';
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
  readonly #scriptToUISourceCode: Map<SDK.Script.Script, Workspace.UISourceCode.UISourceCode>;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.debuggerModel = debuggerModel;
    this.#workspace = workspace;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#uiSourceCodeToScriptFile = new Map();

    this.#projects = new Map();

    this.#scriptToUISourceCode = new Map();
    const runtimeModel = debuggerModel.runtimeModel();
    this.#eventListeners = [
      this.debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.ParsedScriptSource, event => this.addScript(event.data), this),
      this.debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this),
      runtimeModel.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.executionContextDestroyed, this),
      runtimeModel.target().targetManager().addEventListener(
          SDK.TargetManager.Events.InspectedURLChanged, this.inspectedURLChanged, this),
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

  uiSourceCodeForScript(script: SDK.Script.Script): Workspace.UISourceCode.UISourceCode|null {
    return this.#scriptToUISourceCode.get(script) ?? null;
  }

  rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
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
    if (scriptFile.script !== script) {
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

  uiLocationRangeToRawLocationRanges(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      {startLine, startColumn, endLine, endColumn}: TextUtils.TextRange.TextRange):
      SDK.DebuggerModel.LocationRange[]|null {
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return null;
    }

    const {script} = scriptFile;
    if (!script) {
      return null;
    }

    const start = this.debuggerModel.createRawLocation(script, startLine, startColumn);
    const end = this.debuggerModel.createRawLocation(script, endLine, endColumn);
    return [{start, end}];
  }

  private inspectedURLChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    for (let target: SDK.Target.Target|null = this.debuggerModel.target(); target !== event.data;
         target = target.parentTarget()) {
      if (target === null) {
        return;
      }
    }

    // Just remove and readd all scripts to ensure their URLs are reflected correctly.
    for (const script of Array.from(this.#scriptToUISourceCode.keys())) {
      this.removeScripts([script]);
      this.addScript(script);
    }
  }

  private addScript(script: SDK.Script.Script): void {
    // Ignore live edit scripts here.
    if (script.isLiveEdit() || script.isBreakpointCondition) {
      return;
    }

    let url = script.sourceURL;
    if (!url) {
      return;
    }

    if (script.hasSourceURL) {
      // Try to resolve `//# sourceURL=` annotations relative to
      // the base URL, according to the sourcemap specification.
      url = SDK.SourceMapManager.SourceMapManager.resolveRelativeSourceURL(script.debuggerModel.target(), url);
    } else {
      // Ignore inline <script>s without `//# sourceURL` annotation here.
      if (script.isInlineScript()) {
        return;
      }

      // Filter out embedder injected content scripts.
      if (script.isContentScript()) {
        const parsedURL = new Common.ParsedURL.ParsedURL(url);
        if (!parsedURL.isValid) {
          return;
        }
      }
    }

    // Remove previous UISourceCode, if any
    const project = this.project(script);
    const oldUISourceCode = project.uiSourceCodeForURL(url);
    if (oldUISourceCode) {
      const oldScriptFile = this.#uiSourceCodeToScriptFile.get(oldUISourceCode);
      if (oldScriptFile && oldScriptFile.script) {
        this.removeScripts([oldScriptFile.script]);
      }
    }

    // Create UISourceCode.
    const originalContentProvider = script.originalContentProvider();
    const uiSourceCode = project.createUISourceCode(url, originalContentProvider.contentType());
    NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
    const metadata = metadataForURL(this.debuggerModel.target(), script.frameId, url);

    // Bind UISourceCode to scripts.
    const scriptFile = new ResourceScriptFile(this, uiSourceCode, script);
    this.#uiSourceCodeToScriptFile.set(uiSourceCode, scriptFile);
    this.#scriptToUISourceCode.set(script, uiSourceCode);

    const mimeType = script.isWasm() ? 'application/wasm' : 'text/javascript';
    project.addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata, mimeType);
    void this.debuggerWorkspaceBinding.updateLocations(script);
  }

  scriptFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): ResourceScriptFile|null {
    return this.#uiSourceCodeToScriptFile.get(uiSourceCode) || null;
  }

  private removeScripts(scripts: SDK.Script.Script[]): void {
    const uiSourceCodesByProject =
        new Platform.MapUtilities.Multimap<ContentProviderBasedProject, Workspace.UISourceCode.UISourceCode>();
    for (const script of scripts) {
      const uiSourceCode = this.#scriptToUISourceCode.get(script);
      if (!uiSourceCode) {
        continue;
      }
      const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
      if (scriptFile) {
        scriptFile.dispose();
      }

      this.#uiSourceCodeToScriptFile.delete(uiSourceCode);
      this.#scriptToUISourceCode.delete(script);

      uiSourceCodesByProject.set(uiSourceCode.project() as ContentProviderBasedProject, uiSourceCode);
      void this.debuggerWorkspaceBinding.updateLocations(script);
    }
    for (const project of uiSourceCodesByProject.keysArray()) {
      const uiSourceCodes = uiSourceCodesByProject.get(project);
      // Check if all the ui source codes in the project are in |uiSourceCodes|.
      let allInProjectRemoved = true;
      for (const projectSourceCode of project.uiSourceCodes()) {
        if (!uiSourceCodes.has(projectSourceCode)) {
          allInProjectRemoved = false;
          break;
        }
      }
      // Drop the whole project if no source codes are left in it.
      if (allInProjectRemoved) {
        this.#projects.delete(project.id());
        project.removeProject();
      } else {
        // Otherwise, announce the removal of each UI source code individually.
        uiSourceCodes.forEach(c => project.removeUISourceCode(c.url()));
      }
    }
  }

  private executionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>):
      void {
    const executionContext = event.data;
    this.removeScripts(this.debuggerModel.scriptsForExecutionContext(executionContext));
  }

  private globalObjectCleared(): void {
    const scripts = Array.from(this.#scriptToUISourceCode.keys());
    this.removeScripts(scripts);
  }

  resetForTest(): void {
    this.globalObjectCleared();
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.globalObjectCleared();
  }
}

export class ResourceScriptFile extends Common.ObjectWrapper.ObjectWrapper<ResourceScriptFile.EventTypes> {
  readonly #resourceScriptMapping: ResourceScriptMapping;
  readonly #uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;
  #script?: SDK.Script.Script;
  #scriptSource?: string|null;
  #isDivergingFromVMInternal?: boolean;
  #hasDivergedFromVMInternal?: boolean;
  #isMergingToVMInternal?: boolean;
  #updateMutex = new Common.Mutex.Mutex();
  constructor(
      resourceScriptMapping: ResourceScriptMapping, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      script: SDK.Script.Script) {
    super();
    this.#resourceScriptMapping = resourceScriptMapping;
    this.#uiSourceCodeInternal = uiSourceCode;

    if (this.#uiSourceCodeInternal.contentType().isScript()) {
      this.#script = script;
    }

    this.#uiSourceCodeInternal.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.#uiSourceCodeInternal.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
  }

  private isDiverged(): boolean {
    if (this.#uiSourceCodeInternal.isDirty()) {
      return true;
    }
    if (!this.#script) {
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
    if (!this.#script) {
      return;
    }

    const source = this.#uiSourceCodeInternal.workingCopy();
    void this.#script.editSource(source).then(({status, exceptionDetails}) => {
      void this.scriptSourceWasSet(source, status, exceptionDetails);
    });
  }

  async scriptSourceWasSet(
      source: string, status: Protocol.Debugger.SetScriptSourceResponseStatus,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails): Promise<void> {
    if (status === Protocol.Debugger.SetScriptSourceResponseStatus.Ok) {
      this.#scriptSource = source;
    }
    await this.update();

    if (status === Protocol.Debugger.SetScriptSourceResponseStatus.Ok) {
      return;
    }

    if (!exceptionDetails) {
      // TODO(crbug.com/1334484): Instead of to the console, report these errors in an "info bar" at the bottom
      //                          of the text editor, similar to e.g. source mapping errors.
      Common.Console.Console.instance().addMessage(
          i18nString(UIStrings.liveEditFailed, {PH1: getErrorText(status)}), Common.Console.MessageLevel.Warning);
      return;
    }
    const messageText = i18nString(UIStrings.liveEditCompileFailed, {PH1: exceptionDetails.text});
    this.#uiSourceCodeInternal.addLineMessage(
        Workspace.UISourceCode.Message.Level.Error, messageText, exceptionDetails.lineNumber,
        exceptionDetails.columnNumber);

    function getErrorText(status: Protocol.Debugger.SetScriptSourceResponseStatus): string {
      switch (status) {
        case Protocol.Debugger.SetScriptSourceResponseStatus.BlockedByActiveFunction:
          return 'Functions that are on the stack (currently being executed) can not be edited';
        case Protocol.Debugger.SetScriptSourceResponseStatus.BlockedByActiveGenerator:
          return 'Async functions/generators that are active can not be edited';
        case Protocol.Debugger.SetScriptSourceResponseStatus.BlockedByTopLevelEsModuleChange:
          return 'The top-level of ES modules can not be edited';
        case Protocol.Debugger.SetScriptSourceResponseStatus.CompileError:
        case Protocol.Debugger.SetScriptSourceResponseStatus.Ok:
          throw new Error('Compile errors and Ok status must not be reported on the console');
      }
    }
  }

  private async update(): Promise<void> {
    // Do not interleave "divergeFromVM" with "mergeToVM" calls.
    const release = await this.#updateMutex.acquire();
    if (this.isDiverged() && !this.#hasDivergedFromVMInternal) {
      await this.divergeFromVM();
    } else if (!this.isDiverged() && this.#hasDivergedFromVMInternal) {
      await this.mergeToVM();
    }
    release();
  }

  private async divergeFromVM(): Promise<void> {
    if (this.#script) {
      this.#isDivergingFromVMInternal = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.#script);
      this.#isDivergingFromVMInternal = undefined;
      this.#hasDivergedFromVMInternal = true;
      this.dispatchEventToListeners(ResourceScriptFile.Events.DidDivergeFromVM);
    }
  }

  private async mergeToVM(): Promise<void> {
    if (this.#script) {
      this.#hasDivergedFromVMInternal = undefined;
      this.#isMergingToVMInternal = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.#script);
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
    if (!this.#script || typeof this.#scriptSource !== 'undefined') {
      this.mappingCheckedForTest();
      return;
    }
    void this.#script.requestContent().then(deferredContent => {
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
    if (!this.#script) {
      return;
    }
    this.#script.debuggerModel.setSourceMapURL(this.#script, sourceMapURL);
  }

  addDebugInfoURL(debugInfoURL: Platform.DevToolsPath.UrlString): void {
    if (!this.#script) {
      return;
    }
    const {pluginManager} = DebuggerWorkspaceBinding.instance();
    if (pluginManager) {
      pluginManager.setDebugInfoURL(this.#script, debugInfoURL);
    }
  }

  hasSourceMapURL(): boolean {
    return this.#script !== undefined && Boolean(this.#script.sourceMapURL);
  }

  async missingSymbolFiles(): Promise<string[]|null> {
    if (!this.#script) {
      return null;
    }
    const {pluginManager} = this.#resourceScriptMapping.debuggerWorkspaceBinding;
    if (!pluginManager) {
      return null;
    }
    const sources = await pluginManager.getSourcesForScript(this.#script);
    return sources && 'missingSymbolFiles' in sources ? sources.missingSymbolFiles : null;
  }

  get script(): SDK.Script.Script|null {
    return this.#script || null;
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
