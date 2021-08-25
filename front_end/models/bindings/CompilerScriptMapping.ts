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
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import type {DebuggerSourceMapping, DebuggerWorkspaceBinding, RawLocationRange} from './DebuggerWorkspaceBinding.js';
import {IgnoreListManager} from './IgnoreListManager.js';
import {NetworkProject} from './NetworkProject.js';

export class CompilerScriptMapping implements DebuggerSourceMapping {
  private readonly debuggerModel: SDK.DebuggerModel.DebuggerModel;
  private readonly sourceMapManager: SDK.SourceMapManager.SourceMapManager<SDK.Script.Script>;
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  private readonly regularProject: ContentProviderBasedProject;
  private readonly contentScriptsProject: ContentProviderBasedProject;
  private readonly regularBindings: Map<string, Binding>;
  private readonly contentScriptsBindings: Map<string, Binding>;
  private readonly stubUISourceCodes: Map<SDK.Script.Script, Workspace.UISourceCode.UISourceCode>;
  private readonly stubProject: ContentProviderBasedProject;
  private readonly eventListeners: Common.EventTarget.EventDescriptor[];
  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.debuggerModel = debuggerModel;
    this.sourceMapManager = this.debuggerModel.sourceMapManager();
    this.workspace = workspace;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    const target = debuggerModel.target();
    this.regularProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps::' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    this.contentScriptsProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps:extensions:' + target.id(), Workspace.Workspace.projectTypes.ContentScripts, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this.regularProject, target);
    NetworkProject.setTargetForProject(this.contentScriptsProject, target);

    this.regularBindings = new Map();
    this.contentScriptsBindings = new Map();

    this.stubUISourceCodes = new Map();

    this.stubProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps:stub:' + target.id(), Workspace.Workspace.projectTypes.Service, '',
        true /* isServiceProject */);
    this.eventListeners = [
      this.sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach, this.sourceMapWillAttach, this),
      this.sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapFailedToAttach, this.sourceMapFailedToAttach, this),
      this.sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this),
      this.sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this),
      this.workspace.addEventListener(
          Workspace.Workspace.Events.UISourceCodeAdded,
          event => {
            this.onUiSourceCodeAdded(event);
          },
          this),
    ];
  }

  private onUiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    if (uiSourceCode.contentType().isDocument()) {
      for (const script of this.debuggerModel.scriptsForSourceURL(uiSourceCode.url())) {
        this.debuggerWorkspaceBinding.updateLocations(script);
      }
    }
  }

  private addStubUISourceCode(script: SDK.Script.Script): void {
    const stubUISourceCode = this.stubProject.addContentProvider(
        script.sourceURL + ':sourcemap',
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(
            script.sourceURL, Common.ResourceType.resourceTypes.Script,
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'),
        'text/javascript');
    this.stubUISourceCodes.set(script, stubUISourceCode);
  }

  private async removeStubUISourceCode(script: SDK.Script.Script): Promise<void> {
    const uiSourceCode = this.stubUISourceCodes.get(script);
    this.stubUISourceCodes.delete(script);
    if (uiSourceCode) {
      this.stubProject.removeFile(uiSourceCode.url());
    }
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  static uiSourceCodeOrigin(uiSourceCode: Workspace.UISourceCode.UISourceCode): string[] {
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (binding) {
      return binding.getReferringSourceMaps().map((sourceMap: SDK.SourceMap.SourceMap) => sourceMap.compiledURL());
    }
    return [];
  }

  getLocationRangesForSameSourceLocation(rawLocation: SDK.DebuggerModel.Location): RawLocationRange[] {
    const debuggerModel = rawLocation.debuggerModel;
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const sourceMap = this.sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return [];
    }

    // Find the source location for the raw location.
    const entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    if (!entry || !entry.sourceURL) {
      return [];
    }

    // Map the source location back to raw location ranges.
    const ranges = sourceMap.findReverseRanges(entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber);
    return ranges.map(textRangeToLocationRange);

    function textRangeToLocationRange(t: TextUtils.TextRange.TextRange): RawLocationRange {
      return {
        start: debuggerModel.createRawLocation(script as SDK.Script.Script, t.startLine, t.startColumn),
        end: debuggerModel.createRawLocation(script as SDK.Script.Script, t.endLine, t.endColumn),
      };
    }
  }

  uiSourceCodeForURL(url: string, isContentScript: boolean): Workspace.UISourceCode.UISourceCode|null {
    return isContentScript ? this.contentScriptsProject.uiSourceCodeForURL(url) :
                             this.regularProject.uiSourceCodeForURL(url);
  }

  rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }

    const lineNumber = rawLocation.lineNumber - script.lineOffset;
    let columnNumber = rawLocation.columnNumber;
    if (!lineNumber) {
      columnNumber -= script.columnOffset;
    }

    const stubUISourceCode = this.stubUISourceCodes.get(script);
    if (stubUISourceCode) {
      return new Workspace.UISourceCode.UILocation(stubUISourceCode, lineNumber, columnNumber);
    }

    const sourceMap = this.sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return null;
    }
    const entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry || !entry.sourceURL) {
      return null;
    }
    const uiSourceCode = script.isContentScript() ? this.contentScriptsProject.uiSourceCodeForURL(entry.sourceURL) :
                                                    this.regularProject.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation((entry.sourceLineNumber as number), (entry.sourceColumnNumber as number));
  }

  uiLocationToRawLocations(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number):
      SDK.DebuggerModel.Location[] {
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (!binding) {
      return [];
    }

    const locations: SDK.DebuggerModel.Location[] = [];
    for (const sourceMap of binding.getReferringSourceMaps()) {
      const entry = sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, columnNumber);
      if (!entry) {
        continue;
      }
      for (const script of this.sourceMapManager.clientsForSourceMap(sourceMap)) {
        locations.push(this.debuggerModel.createRawLocation(
            script, entry.lineNumber + script.lineOffset,
            !entry.lineNumber ? entry.columnNumber + script.columnOffset : entry.columnNumber));
      }
    }
    return locations;
  }

  private async sourceMapWillAttach(event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script}>):
      Promise<void> {
    const script = event.data.client;
    // Create stub UISourceCode for the time source mapping is being loaded.
    this.addStubUISourceCode(script);
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  private async sourceMapFailedToAttach(event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script}>):
      Promise<void> {
    const script = event.data.client;
    await this.removeStubUISourceCode(script);
  }

  private async sourceMapAttached(
      event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap}>):
      Promise<void> {
    const script = event.data.client;
    const sourceMap = event.data.sourceMap;
    await this.removeStubUISourceCode(script);

    if (IgnoreListManager.instance().isIgnoreListedURL(script.sourceURL, script.isContentScript())) {
      this.sourceMapAttachedForTest(sourceMap);
      return;
    }

    await this.populateSourceMapSources(script, sourceMap);
    this.sourceMapAttachedForTest(sourceMap);
  }

  private async sourceMapDetached(
      event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap}>):
      Promise<void> {
    const script = event.data.client;
    const sourceMap = event.data.sourceMap;
    const bindings = script.isContentScript() ? this.contentScriptsBindings : this.regularBindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      const binding = bindings.get(sourceURL);
      if (binding) {
        binding.removeSourceMap(sourceMap, script.frameId);
        if (!binding.getUiSourceCode()) {
          bindings.delete(sourceURL);
        }
      }
    }
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  sourceMapForScript(script: SDK.Script.Script): SDK.SourceMap.SourceMap|null {
    return this.sourceMapManager.sourceMapForClient(script);
  }

  scriptsForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SDK.Script.Script[] {
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (!binding) {
      return [];
    }

    const scripts: SDK.Script.Script[] = [];
    for (const sourceMap of binding.getReferringSourceMaps()) {
      this.sourceMapManager.clientsForSourceMap(sourceMap).forEach(script => scripts.push(script));
    }
    return scripts;
  }

  private sourceMapAttachedForTest(_sourceMap: SDK.SourceMap.SourceMap|null): void {
  }

  private async populateSourceMapSources(script: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap): Promise<void> {
    const project = script.isContentScript() ? this.contentScriptsProject : this.regularProject;
    const bindings = script.isContentScript() ? this.contentScriptsBindings : this.regularBindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      let binding = bindings.get(sourceURL);
      if (!binding) {
        binding = new Binding(project, sourceURL);
        bindings.set(sourceURL, binding);
      }
      binding.addSourceMap(sourceMap, script.frameId);
    }
    await this.debuggerWorkspaceBinding.updateLocations(script);
  }

  static uiLineHasMapping(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number): boolean {
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (!binding) {
      return true;
    }
    for (const sourceMap of binding.getReferringSourceMaps()) {
      if (sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, 0)) {
        return true;
      }
    }
    return false;
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.regularProject.dispose();
    this.contentScriptsProject.dispose();
    this.stubProject.dispose();
  }
}

const uiSourceCodeToBinding = new WeakMap<Workspace.UISourceCode.UISourceCode, Binding>();

class Binding {
  private readonly project: ContentProviderBasedProject;
  private readonly url: string;
  referringSourceMaps: SDK.SourceMap.SourceMap[];
  private readonly activeSourceMap?: SDK.SourceMap.SourceMap|null;
  uiSourceCode: Workspace.UISourceCode.UISourceCode|null;

  constructor(project: ContentProviderBasedProject, url: string) {
    this.project = project;
    this.url = url;

    this.referringSourceMaps = [];
    this.uiSourceCode = null;
  }

  private recreateUISourceCodeIfNeeded(frameId: Protocol.Page.FrameId): void {
    const sourceMap = this.referringSourceMaps[this.referringSourceMaps.length - 1];

    const newUISourceCode =
        this.project.createUISourceCode(this.url, Common.ResourceType.resourceTypes.SourceMapScript);
    uiSourceCodeToBinding.set(newUISourceCode, this);
    const contentProvider =
        sourceMap.sourceContentProvider(this.url, Common.ResourceType.resourceTypes.SourceMapScript);
    const mimeType = Common.ResourceType.ResourceType.mimeFromURL(this.url) || 'text/javascript';
    const embeddedContent = sourceMap.embeddedContentByURL(this.url);
    const metadata = typeof embeddedContent === 'string' ?
        new Workspace.UISourceCode.UISourceCodeMetadata(null, embeddedContent.length) :
        null;

    if (this.uiSourceCode) {
      NetworkProject.cloneInitialFrameAttribution(this.uiSourceCode, newUISourceCode);
      this.project.removeFile(this.uiSourceCode.url());
    } else {
      NetworkProject.setInitialFrameAttribution(newUISourceCode, frameId);
    }
    this.uiSourceCode = newUISourceCode;
    this.project.addUISourceCodeWithProvider(this.uiSourceCode, contentProvider, metadata, mimeType);
  }

  addSourceMap(sourceMap: SDK.SourceMap.SourceMap, frameId: Protocol.Page.FrameId): void {
    if (this.uiSourceCode) {
      NetworkProject.addFrameAttribution(this.uiSourceCode, frameId);
    }
    this.referringSourceMaps.push(sourceMap);
    this.recreateUISourceCodeIfNeeded(frameId);
  }

  removeSourceMap(sourceMap: SDK.SourceMap.SourceMap, frameId: Protocol.Page.FrameId): void {
    const uiSourceCode = (this.uiSourceCode as Workspace.UISourceCode.UISourceCode);
    NetworkProject.removeFrameAttribution(uiSourceCode, frameId);
    const lastIndex = this.referringSourceMaps.lastIndexOf(sourceMap);
    if (lastIndex !== -1) {
      this.referringSourceMaps.splice(lastIndex, 1);
    }
    if (!this.referringSourceMaps.length) {
      this.project.removeFile(uiSourceCode.url());
      this.uiSourceCode = null;
    } else {
      this.recreateUISourceCodeIfNeeded(frameId);
    }
  }

  getReferringSourceMaps(): Array<SDK.SourceMap.SourceMap> {
    return this.referringSourceMaps;
  }

  getUiSourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this.uiSourceCode;
  }
}
