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
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';

import {type DebuggerSourceMapping, type DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {IgnoreListManager} from './IgnoreListManager.js';
import {NetworkProject} from './NetworkProject.js';

/**
 * The `CompilerScriptMapping` maps script entities from source maps to scripts and vice versa.
 * It is part of the {@link DebuggerWorkspaceBinding} and operates on top of the
 * {@link SDK.SourceMapManager.SourceMapManager}.
 *
 * The `CompilerScriptMapping` maintains a list of {@link ContentProviderBasedProject}s, in which it
 * creates the `UISourceCode`s for the source-mapped entities. The mapping is implemented in various
 * layers:
 *
 * - `#sourceMapToProject` holds a mapping of all the attached `SourceMap`s to their respective
 *   `ContentBasedProviderBasedProject`s. When resolving raw to UI locations this is the first
 *   place to check.
 * - `#uiSourceCodeToSourceMaps` maps every `UISourceCode` created herein to the `SourceMap` that
 *   it originated from. This is the authoritative source of information: The `#projects` might
 *   contain `UISourceCode` objects that were created from this `CompilerScriptMapping`, but which
 *   have become stale, and `#uiSourceCodeToSourceMaps` represents these as having no source maps.
 *
 * @see {@link SDK.SourceMap.SourceMap}
 * @see {@link SDK.SourceMapManager.SourceMapManager}
 */
export class CompilerScriptMapping implements DebuggerSourceMapping {
  readonly #sourceMapManager: SDK.SourceMapManager.SourceMapManager<SDK.Script.Script>;
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #stubUISourceCodes = new Map<SDK.Script.Script, Workspace.UISourceCode.UISourceCode>();
  readonly #stubProject: ContentProviderBasedProject;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  readonly #projects = new Map<string, ContentProviderBasedProject>();
  readonly #sourceMapToProject = new Map<SDK.SourceMap.SourceMap, ContentProviderBasedProject>();
  readonly #uiSourceCodeToSourceMaps =
      new Platform.MapUtilities.Multimap<Workspace.UISourceCode.UISourceCode, SDK.SourceMap.SourceMap>();

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.#sourceMapManager = debuggerModel.sourceMapManager();
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this.#stubProject = new ContentProviderBasedProject(
        workspace, 'jsSourceMaps:stub:' + debuggerModel.target().id(), Workspace.Workspace.projectTypes.Service, '',
        true /* isServiceProject */);
    this.#eventListeners = [
      this.#sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach, this.sourceMapWillAttach, this),
      this.#sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapFailedToAttach, this.sourceMapFailedToAttach, this),
      this.#sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this),
      this.#sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this),
    ];
  }

  private addStubUISourceCode(script: SDK.Script.Script): void {
    const stubUISourceCode = this.#stubProject.addContentProvider(
        Common.ParsedURL.ParsedURL.concatenate(script.sourceURL, ':sourcemap'),
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(
            script.sourceURL, Common.ResourceType.resourceTypes.Script,
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'),
        'text/javascript');
    this.#stubUISourceCodes.set(script, stubUISourceCode);
  }

  private removeStubUISourceCode(script: SDK.Script.Script): void {
    const uiSourceCode = this.#stubUISourceCodes.get(script);
    this.#stubUISourceCodes.delete(script);
    if (uiSourceCode) {
      this.#stubProject.removeUISourceCode(uiSourceCode.url());
    }
  }

  getLocationRangesForSameSourceLocation(rawLocation: SDK.DebuggerModel.Location): SDK.DebuggerModel.LocationRange[] {
    const debuggerModel = rawLocation.debuggerModel;
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const sourceMap = this.#sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return [];
    }

    // Find the source location for the raw location.
    const {lineNumber, columnNumber} = script.rawLocationToRelativeLocation(rawLocation);
    const entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry || !entry.sourceURL) {
      return [];
    }

    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return [];
    }

    const uiSourceCode = project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return [];
    }

    // Check that the reverse is also true and we have a binding for this |uiSourceCode|
    // that is referred to from the |sourceMap| of the |script|.
    if (!this.#uiSourceCodeToSourceMaps.hasValue(uiSourceCode, sourceMap)) {
      return [];
    }

    // Map the source location back to raw location ranges.
    const ranges = sourceMap.findReverseRanges(entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber);
    return ranges.map(({startLine, startColumn, endLine, endColumn}) => {
      const start = script.relativeLocationToRawLocation({lineNumber: startLine, columnNumber: startColumn});
      const end = script.relativeLocationToRawLocation({lineNumber: endLine, columnNumber: endColumn});
      return {
        start: debuggerModel.createRawLocation(script, start.lineNumber, start.columnNumber),
        end: debuggerModel.createRawLocation(script, end.lineNumber, end.columnNumber),
      };
    });
  }

  uiSourceCodeForURL(url: Platform.DevToolsPath.UrlString, isContentScript: boolean):
      Workspace.UISourceCode.UISourceCode|null {
    const projectType =
        isContentScript ? Workspace.Workspace.projectTypes.ContentScripts : Workspace.Workspace.projectTypes.Network;
    for (const project of this.#projects.values()) {
      if (project.type() !== projectType) {
        continue;
      }
      const uiSourceCode = project.uiSourceCodeForURL(url);
      if (uiSourceCode) {
        return uiSourceCode;
      }
    }
    return null;
  }

  /**
   * Resolves the source-mapped entity mapped from the given `rawLocation` if any. If the `rawLocation`
   * does not point into a script with a source map, `null` is returned from here, while if the source
   * map for the script is currently being loaded, a stub `UISourceCode` is returned meanwhile. Otherwise,
   * if the script has a source map entry for the position identified by the `rawLocation`, this method
   * will compute the location in the source-mapped file by a reverse lookup on the source map.
   *
   * If `rawLocation` points to a script with a source map managed by this `CompilerScriptMapping`, which
   * is stale (because it was overridden by a more recent mapping), `null` will be returned.
   *
   * @param rawLocation script location.
   * @returns the {@link Workspace.UISourceCode.UILocation} for the `rawLocation` if any.
   */
  rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation|null {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }

    const {lineNumber, columnNumber} = script.rawLocationToRelativeLocation(rawLocation);
    const stubUISourceCode = this.#stubUISourceCodes.get(script);
    if (stubUISourceCode) {
      return new Workspace.UISourceCode.UILocation(stubUISourceCode, lineNumber, columnNumber);
    }

    const sourceMap = this.#sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return null;
    }

    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return null;
    }

    const entry = sourceMap.findEntry(lineNumber, columnNumber, rawLocation.inlineFrameIndex);
    if (!entry || !entry.sourceURL) {
      return null;
    }

    const uiSourceCode = project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }

    // Check that the reverse is also true and we have a binding for this `uiSourceCode`
    // that is referred to from the `sourceMap` of the `script`.
    if (!this.#uiSourceCodeToSourceMaps.hasValue(uiSourceCode, sourceMap)) {
      return null;
    }

    return uiSourceCode.uiLocation(entry.sourceLineNumber, entry.sourceColumnNumber);
  }

  /**
   * Resolves a location within a source mapped entity managed by the `CompilerScriptMapping`
   * to its script locations. If the `uiSourceCode` does not belong to this mapping or if its
   * mapping is stale, an empty list will be returned.
   *
   * A single UI location can map to multiple different {@link SDK.DebuggerModel.RawLocation}s,
   * and these raw locations don't even need to belong to the same script (e.g. multiple bundles
   * can reference the same shared source file in case of code splitting, and locations within
   * this shared source file will then resolve to locations in all the bundles).
   *
   * @param uiSourceCode the source mapped entity.
   * @param lineNumber the line number in terms of the {@link uiSourceCode}.
   * @param columnNumber the column number in terms of the {@link uiSourceCode}.
   * @returns a list of raw locations that correspond to the UI location.
   */
  uiLocationToRawLocations(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number):
      SDK.DebuggerModel.Location[] {
    const locations = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const entry = sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, columnNumber);
      if (!entry) {
        continue;
      }
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (!script) {
        continue;
      }
      const location = script.relativeLocationToRawLocation(entry);
      locations.push(script.debuggerModel.createRawLocation(script, location.lineNumber, location.columnNumber));
    }
    return locations;
  }

  uiLocationRangeToRawLocationRanges(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      textRange: TextUtils.TextRange.TextRange): SDK.DebuggerModel.LocationRange[]|null {
    if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
      return null;
    }
    const ranges = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (!script) {
        continue;
      }

      for (const scriptTextRange of sourceMap.reverseMapTextRanges(uiSourceCode.url(), textRange)) {
        const startLocation = script.relativeLocationToRawLocation(scriptTextRange.start);
        const endLocation = script.relativeLocationToRawLocation(scriptTextRange.end);
        const start =
            script.debuggerModel.createRawLocation(script, startLocation.lineNumber, startLocation.columnNumber);
        const end = script.debuggerModel.createRawLocation(script, endLocation.lineNumber, endLocation.columnNumber);
        ranges.push({start, end});
      }
    }
    return ranges;
  }

  /**
   * Computes the set of line numbers which are source-mapped to a script within the
   * given {@link uiSourceCode}.
   *
   * @param uiSourceCode the source mapped entity.
   * @return a set of source-mapped line numbers or `null` if the {@link uiSourceCode}
   *         is not provided by this {@link CompilerScriptMapping} instance.
   */
  getMappedLines(uiSourceCode: Workspace.UISourceCode.UISourceCode): Set<number>|null {
    if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
      return null;
    }
    const mappedLines = new Set<number>();
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      for (const entry of sourceMap.mappings()) {
        if (entry.sourceURL !== uiSourceCode.url()) {
          continue;
        }
        mappedLines.add(entry.sourceLineNumber);
      }
    }
    return mappedLines;
  }

  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} whenever it starts loading the
   * source map for a given {@link SDK.Script.Script}. The `CompilerScriptMapping` will set up a
   * {@link Workspace.UISourceCode.UISourceCode} stub for the time that the source map is being
   * loaded to avoid showing the generated code when the DevTools front-end is stopped early (for
   * example on a breakpoint).
   *
   * @param event holds the {@link SDK.Script.Script} whose source map is being loaded.
   */
  private sourceMapWillAttach(event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script}>): void {
    const {client: script} = event.data;
    // Create stub UISourceCode for the time source mapping is being loaded.
    this.addStubUISourceCode(script);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
    if (IgnoreListManager.instance().isUserIgnoreListedURL(
            script.sourceURL, {isContentScript: script.isContentScript()})) {
      this.#sourceMapManager.cancelAttachSourceMap(script);
    }
  }

  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} after an attempt to load the
   * source map for a given {@link SDK.Script.Script} failed. The `CompilerScriptMapping` will
   * remove the {@link Workspace.UISourceCode.UISourceCode} stub, and from this time on won't
   * report any mappings for the `client` script.
   *
   * @param event holds the {@link SDK.Script.Script} whose source map failed to load.
   */
  private sourceMapFailedToAttach(event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script}>): void {
    const {client: script} = event.data;
    this.removeStubUISourceCode(script);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} after an attempt to load the
   * source map for a given {@link SDK.Script.Script} succeeded. The `CompilerScriptMapping` will
   * now create {@link Workspace.UISourceCode.UISourceCode}s for all the sources mentioned in the
   * `sourceMap`.
   *
   * In case of a conflict this method creates a new {@link Workspace.UISourceCode.UISourceCode}
   * and copies over all the mappings from the other source maps that were registered for the
   * same URL and which are compatible (agree on the content and ignore-list hint for the given
   * URL). If they are considered incompatible, the original `UISourceCode` will simply be
   * removed and a new mapping will be established.
   *
   * @param event holds the {@link SDK.Script.Script} and its {@link SDK.SourceMap.SourceMap}.
   */
  private sourceMapAttached(event: Common.EventTarget.EventTargetEvent<{
    client: SDK.Script.Script,
    sourceMap: SDK.SourceMap.SourceMap,
  }>): void {
    const {client: script, sourceMap} = event.data;
    const scripts = new Set<SDK.Script.Script>([script]);
    this.removeStubUISourceCode(script);

    const target = script.target();
    const projectId = `jsSourceMaps:${script.isContentScript() ? 'extensions' : ''}:${target.id()}`;
    let project = this.#projects.get(projectId);
    if (!project) {
      const projectType = script.isContentScript() ? Workspace.Workspace.projectTypes.ContentScripts :
                                                     Workspace.Workspace.projectTypes.Network;
      project = new ContentProviderBasedProject(
          this.#stubProject.workspace(), projectId, projectType, /* displayName */ '', /* isServiceProject */ false);
      NetworkProject.setTargetForProject(project, target);
      this.#projects.set(projectId, project);
    }
    this.#sourceMapToProject.set(sourceMap, project);

    for (const url of sourceMap.sourceURLs()) {
      const contentType = Common.ResourceType.resourceTypes.SourceMapScript;
      const uiSourceCode = project.createUISourceCode(url, contentType);
      if (sourceMap.hasIgnoreListHint(url)) {
        uiSourceCode.markKnownThirdParty();
      }
      const content = sourceMap.embeddedContentByURL(url);
      const contentProvider = content !== null ?
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, contentType, content) :
          new SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(
              url, contentType, script.createPageResourceLoadInitiator());
      let metadata: Workspace.UISourceCode.UISourceCodeMetadata|null = null;
      if (content !== null) {
        const encoder = new TextEncoder();
        metadata = new Workspace.UISourceCode.UISourceCodeMetadata(null, encoder.encode(content).length);
      }
      const mimeType = Common.ResourceType.ResourceType.mimeFromURL(url) ?? contentType.canonicalMimeType();

      this.#uiSourceCodeToSourceMaps.set(uiSourceCode, sourceMap);
      NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);

      // Check if there was already an `UISourceCode` for the given `url`, and if so, discard
      // the previous one. While it would be possible to keep the previous one and just add
      // the new mapping (from the `sourceMap`) to it as long as there's no conflict, this
      // doesn't really work with the way the `BreakpointManager` and other parts of the front-end
      // work, which only listen for additions/removals of `UISourceCode`s, since there's no
      // notion of a 'UISourceCodeChanged` event (yet).
      //
      // Therefore, unless we discard any previous `UISourceCode` for the `url` and publish the
      // new `uiSourceCode`, the `BreakpointManager` will not restore / set breakpoints in newly
      // added scripts in case of code-splitting, since it won't find out about these new mappings.
      // By removing and (re)adding a `UISourceCode` for the `url` we effectively force restoration
      // of breakpoints.
      const otherUISourceCode = project.uiSourceCodeForURL(url);
      if (otherUISourceCode !== null) {
        // Copy the existing source mappings from the `otherUISourceCode` over as long as
        // they are compatible with the `sourceMap` wrt. `url`. While doing so, also clean
        // up the `otherUISourceCode` (in particular its frame attributions).
        for (const otherSourceMap of this.#uiSourceCodeToSourceMaps.get(otherUISourceCode)) {
          this.#uiSourceCodeToSourceMaps.delete(otherUISourceCode, otherSourceMap);
          const otherScript = this.#sourceMapManager.clientForSourceMap(otherSourceMap);
          if (!otherScript) {
            continue;
          }
          NetworkProject.removeFrameAttribution(otherUISourceCode, otherScript.frameId);
          if (sourceMap.compatibleForURL(url, otherSourceMap)) {
            this.#uiSourceCodeToSourceMaps.set(uiSourceCode, otherSourceMap);
            NetworkProject.addFrameAttribution(uiSourceCode, otherScript.frameId);
          }
          scripts.add(otherScript);
        }
        project.removeUISourceCode(url);
      }

      project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    }
    void Promise.all([...scripts].map(script => this.#debuggerWorkspaceBinding.updateLocations(script)))
        .then(() => this.sourceMapAttachedForTest(sourceMap));
  }

  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} when the source map for a given
   * {@link SDK.Script.Script} is removed, which could be either because the target is execution
   * context was destroyed, or the user manually asked to replace the source map for a given
   * script.
   *
   * @param event holds the {@link SDK.Script.Script} and {@link SDK.SourceMap.SourceMap} that
   *              should be detached.
   */
  private sourceMapDetached(event: Common.EventTarget.EventTargetEvent<{
    client: SDK.Script.Script,
    sourceMap: SDK.SourceMap.SourceMap,
  }>): void {
    const {client: script, sourceMap} = event.data;
    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return;
    }

    // Remove all the files in the `project` that (still) belong to the `sourceMap`.
    // In case of conflicts or overrides (for example due to HMR), not all the files
    // that were originally provided by the `sourceMap` might still belong to it.
    for (const uiSourceCode of project.uiSourceCodes()) {
      if (this.#uiSourceCodeToSourceMaps.delete(uiSourceCode, sourceMap)) {
        NetworkProject.removeFrameAttribution(uiSourceCode, script.frameId);
        if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
          project.removeUISourceCode(uiSourceCode.url());
        }
      }
    }

    this.#sourceMapToProject.delete(sourceMap);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }

  scriptsForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SDK.Script.Script[] {
    const scripts = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (script) {
        scripts.push(script);
      }
    }
    return scripts;
  }

  private sourceMapAttachedForTest(_sourceMap: SDK.SourceMap.SourceMap): void {
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    for (const project of this.#projects.values()) {
      project.dispose();
    }
    this.#stubProject.dispose();
  }
}
