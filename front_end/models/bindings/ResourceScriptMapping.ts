// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Formatter from '../formatter/formatter.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {type DebuggerSourceMapping, DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {NetworkProject} from './NetworkProject.js';
import {metadataForURL} from './ResourceUtils.js';

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
          SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.inspectedURLChanged, this),
    ];
  }

  private project(script: SDK.Script.Script): ContentProviderBasedProject {
    const prefix = script.isContentScript() ? 'js:extensions:' : 'js::';
    const projectId = prefix + this.debuggerModel.target().id() + ':' + script.frameId;
    let project = this.#projects.get(projectId);
    if (!project) {
      const projectType = script.isContentScript() ? Workspace.Workspace.projectTypes.ContentScripts :
                                                     Workspace.Workspace.projectTypes.Network;
      project = new ContentProviderBasedProject(this.#workspace, projectId, projectType, '' /* displayName */,
                                                false /* isServiceProject */);
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

  async functionBoundsAtRawLocation(rawLocation: SDK.DebuggerModel.Location):
      Promise<Workspace.UISourceCode.UIFunctionBounds|null> {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }

    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (!uiSourceCode) {
      return null;
    }

    const scopeTreeAndText = script ? await SDK.ScopeTreeCache.scopeTreeForScript(script) : null;
    if (!scopeTreeAndText) {
      return null;
    }

    // Find the inner-most scope that maps to the given position.

    const offset = scopeTreeAndText.text.offsetFromPosition(rawLocation.lineNumber, rawLocation.columnNumber);

    const results = [];
    (function walk(nodes: Formatter.FormatterWorkerPool.ScopeTreeNode[]) {
      for (const node of nodes) {
        if (!(offset >= node.start && offset < node.end)) {
          continue;
        }
        results.push(node);
        walk(node.children);
      }
    })([scopeTreeAndText.scopeTree]);

    const result = results.findLast(
        node => node.kind === Formatter.FormatterWorkerPool.ScopeKind.FUNCTION ||
            node.kind === Formatter.FormatterWorkerPool.ScopeKind.ARROW_FUNCTION);
    if (!result) {
      return null;
    }

    // Map back to positions.
    const startPosition = scopeTreeAndText.text.positionFromOffset(result.start);
    const endPosition = scopeTreeAndText.text.positionFromOffset(result.end);

    const name = '';  // TODO(crbug.com/452333154): update ScopeVariableAnalysis to include function name.
    const range = new TextUtils.TextRange.TextRange(
        startPosition.lineNumber, startPosition.columnNumber, endPosition.lineNumber, endPosition.columnNumber);
    return new Workspace.UISourceCode.UIFunctionBounds(uiSourceCode, range, name);
  }

  private addScript(script: SDK.Script.Script): void {
    if (script.isBreakpointCondition) {
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
      if (oldScriptFile?.script) {
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

export class ResourceScriptFile {
  readonly #resourceScriptMapping: ResourceScriptMapping;
  readonly uiSourceCode: Workspace.UISourceCode.UISourceCode;
  readonly script: SDK.Script.Script|null;

  constructor(
      resourceScriptMapping: ResourceScriptMapping, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      script: SDK.Script.Script) {
    this.#resourceScriptMapping = resourceScriptMapping;
    this.uiSourceCode = uiSourceCode;
    this.script = this.uiSourceCode.contentType().isScript() ? script : null;
  }

  addSourceMapURL(sourceMapURL: Platform.DevToolsPath.UrlString): void {
    if (!this.script) {
      return;
    }
    this.script.debuggerModel.setSourceMapURL(this.script, sourceMapURL);
  }

  addDebugInfoURL(debugInfoURL: Platform.DevToolsPath.UrlString): void {
    if (!this.script) {
      return;
    }
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const {pluginManager} = DebuggerWorkspaceBinding.instance();
    pluginManager.setDebugInfoURL(this.script, debugInfoURL);
  }

  hasSourceMapURL(): boolean {
    return Boolean(this.script?.sourceMapURL);
  }

  async missingSymbolFiles(): Promise<SDK.DebuggerModel.MissingDebugFiles[]|null> {
    if (!this.script) {
      return null;
    }
    const {pluginManager} = this.#resourceScriptMapping.debuggerWorkspaceBinding;
    const sources = await pluginManager.getSourcesForScript(this.script);
    return sources && 'missingSymbolFiles' in sources ? sources.missingSymbolFiles : null;
  }
}
