// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

import {Location, type DebuggerModel, COND_BREAKPOINT_SOURCE_URL, LOGPOINT_SOURCE_URL} from './DebuggerModel.js';
import {type FrameAssociated} from './FrameAssociated.js';
import {type PageResourceLoadInitiator} from './PageResourceLoader.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';
import {type ExecutionContext} from './RuntimeModel.js';
import {type Target} from './Target.js';

const UIStrings = {
  /**
   *@description Error message for when a script can't be loaded which had been previously
   */
  scriptRemovedOrDeleted: 'Script removed or deleted.',
  /**
   *@description Error message when failing to load a script source text
   */
  unableToFetchScriptSource: 'Unable to fetch script source.',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/Script.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Script implements TextUtils.ContentProvider.ContentProvider, FrameAssociated {
  debuggerModel: DebuggerModel;
  scriptId: Protocol.Runtime.ScriptId;
  sourceURL: Platform.DevToolsPath.UrlString;
  lineOffset: number;
  columnOffset: number;
  endLine: number;
  endColumn: number;
  executionContextId: number;
  hash: string;
  readonly #isContentScriptInternal: boolean;
  readonly #isLiveEditInternal: boolean;
  sourceMapURL?: string;
  debugSymbols: Protocol.Debugger.DebugSymbols|null;
  hasSourceURL: boolean;
  contentLength: number;
  originStackTrace: Protocol.Runtime.StackTrace|null;
  readonly #codeOffsetInternal: number|null;
  readonly #language: string|null;
  #contentPromise: Promise<TextUtils.ContentProvider.DeferredContent>|null;
  readonly #embedderNameInternal: Platform.DevToolsPath.UrlString|null;
  readonly isModule: boolean|null;
  constructor(
      debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, sourceURL: Platform.DevToolsPath.UrlString,
      startLine: number, startColumn: number, endLine: number, endColumn: number, executionContextId: number,
      hash: string, isContentScript: boolean, isLiveEdit: boolean, sourceMapURL: string|undefined,
      hasSourceURL: boolean, length: number, isModule: boolean|null, originStackTrace: Protocol.Runtime.StackTrace|null,
      codeOffset: number|null, scriptLanguage: string|null, debugSymbols: Protocol.Debugger.DebugSymbols|null,
      embedderName: Platform.DevToolsPath.UrlString|null) {
    this.debuggerModel = debuggerModel;
    this.scriptId = scriptId;
    this.sourceURL = sourceURL;
    this.lineOffset = startLine;
    this.columnOffset = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
    this.isModule = isModule;

    this.executionContextId = executionContextId;
    this.hash = hash;
    this.#isContentScriptInternal = isContentScript;
    this.#isLiveEditInternal = isLiveEdit;
    this.sourceMapURL = sourceMapURL;
    this.debugSymbols = debugSymbols;
    this.hasSourceURL = hasSourceURL;
    this.contentLength = length;
    this.originStackTrace = originStackTrace;
    this.#codeOffsetInternal = codeOffset;
    this.#language = scriptLanguage;
    this.#contentPromise = null;
    this.#embedderNameInternal = embedderName;
  }

  embedderName(): Platform.DevToolsPath.UrlString|null {
    return this.#embedderNameInternal;
  }

  target(): Target {
    return this.debuggerModel.target();
  }

  private static trimSourceURLComment(source: string): string {
    let sourceURLIndex = source.lastIndexOf('//# sourceURL=');
    if (sourceURLIndex === -1) {
      sourceURLIndex = source.lastIndexOf('//@ sourceURL=');
      if (sourceURLIndex === -1) {
        return source;
      }
    }
    const sourceURLLineIndex = source.lastIndexOf('\n', sourceURLIndex);
    if (sourceURLLineIndex === -1) {
      return source;
    }
    const sourceURLLine = source.substr(sourceURLLineIndex + 1);
    if (!sourceURLLine.match(sourceURLRegex)) {
      return source;
    }
    return source.substr(0, sourceURLLineIndex);
  }

  isContentScript(): boolean {
    return this.#isContentScriptInternal;
  }

  codeOffset(): number|null {
    return this.#codeOffsetInternal;
  }

  isJavaScript(): boolean {
    return this.#language === Protocol.Debugger.ScriptLanguage.JavaScript;
  }

  isWasm(): boolean {
    return this.#language === Protocol.Debugger.ScriptLanguage.WebAssembly;
  }

  scriptLanguage(): string|null {
    return this.#language;
  }

  executionContext(): ExecutionContext|null {
    return this.debuggerModel.runtimeModel().executionContext(this.executionContextId);
  }

  isLiveEdit(): boolean {
    return this.#isLiveEditInternal;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.sourceURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return Common.ResourceType.resourceTypes.Script;
  }

  private async loadTextContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    const result = await this.debuggerModel.target().debuggerAgent().invoke_getScriptSource({scriptId: this.scriptId});
    if (result.getError()) {
      throw new Error(result.getError());
    }
    const {scriptSource, bytecode} = result;
    if (bytecode) {
      return {content: bytecode, isEncoded: true};
    }
    let content: string = scriptSource || '';
    if (this.hasSourceURL && this.sourceURL.startsWith('snippet://')) {
      // TODO(crbug.com/1330846): Find a better way to establish the snippet automapping binding then adding
      // a sourceURL comment before evaluation and removing it here.
      content = Script.trimSourceURLComment(content);
    }
    return {content, isEncoded: false};
  }

  private async loadWasmContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (!this.isWasm()) {
      throw new Error('Not a wasm script');
    }
    const result =
        await this.debuggerModel.target().debuggerAgent().invoke_disassembleWasmModule({scriptId: this.scriptId});

    if (result.getError()) {
      // Fall through to text content loading if v8-based disassembly fails. This is to ensure backwards compatibility with
      // older v8 versions;
      return this.loadTextContent();
    }

    const {streamId, functionBodyOffsets, chunk: {lines, bytecodeOffsets}} = result;
    const lineChunks = [];
    const bytecodeOffsetChunks = [];
    let totalLength = lines.reduce<number>((sum, line) => sum + line.length + 1, 0);
    const truncationMessage = '<truncated>';
    // This is a magic number used in code mirror which, when exceeded, sends it into an infinite loop.
    const cmSizeLimit = 1000000000 - truncationMessage.length;
    if (streamId) {
      while (true) {
        const result = await this.debuggerModel.target().debuggerAgent().invoke_nextWasmDisassemblyChunk({streamId});

        if (result.getError()) {
          throw new Error(result.getError());
        }

        const {chunk: {lines: linesChunk, bytecodeOffsets: bytecodeOffsetsChunk}} = result;
        totalLength += linesChunk.reduce<number>((sum, line) => sum + line.length + 1, 0);
        if (linesChunk.length === 0) {
          break;
        }
        if (totalLength >= cmSizeLimit) {
          lineChunks.push([truncationMessage]);
          bytecodeOffsetChunks.push([0]);
          break;
        }

        lineChunks.push(linesChunk);
        bytecodeOffsetChunks.push(bytecodeOffsetsChunk);
      }
    }
    const functionBodyRanges: Array<{start: number, end: number}> = [];
    // functionBodyOffsets contains a sequence of pairs of start and end offsets
    for (let i = 0; i < functionBodyOffsets.length; i += 2) {
      functionBodyRanges.push({start: functionBodyOffsets[i], end: functionBodyOffsets[i + 1]});
    }
    const wasmDisassemblyInfo = new Common.WasmDisassembly.WasmDisassembly(
        lines.concat(...lineChunks), bytecodeOffsets.concat(...bytecodeOffsetChunks), functionBodyRanges);
    return {content: '', isEncoded: false, wasmDisassemblyInfo};
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (!this.#contentPromise) {
      this.#contentPromise = (async(): Promise<TextUtils.ContentProvider.DeferredContent> => {
        if (!this.scriptId) {
          return {content: null, error: i18nString(UIStrings.scriptRemovedOrDeleted), isEncoded: false};
        }
        try {
          return this.isWasm() ? await this.loadWasmContent() : await this.loadTextContent();
        } catch (err) {
          // TODO(bmeurer): Propagate errors as exceptions / rejections.
          return {content: null, error: i18nString(UIStrings.unableToFetchScriptSource), isEncoded: false};
        }
      })();
    }
    return this.#contentPromise;
  }

  async getWasmBytecode(): Promise<ArrayBuffer> {
    const base64 = await this.debuggerModel.target().debuggerAgent().invoke_getWasmBytecode({scriptId: this.scriptId});
    const response = await fetch(`data:application/wasm;base64,${base64.bytecode}`);
    return response.arrayBuffer();
  }

  originalContentProvider(): TextUtils.ContentProvider.ContentProvider {
    return new TextUtils.StaticContentProvider.StaticContentProvider(
        this.contentURL(), this.contentType(), () => this.requestContent());
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!this.scriptId) {
      return [];
    }

    const matches = await this.debuggerModel.target().debuggerAgent().invoke_searchInContent(
        {scriptId: this.scriptId, query, caseSensitive, isRegex});
    return (matches.result || [])
        .map(match => new TextUtils.ContentProvider.SearchMatch(match.lineNumber, match.lineContent));
  }

  private appendSourceURLCommentIfNeeded(source: string): string {
    if (!this.hasSourceURL) {
      return source;
    }
    return source + '\n //# sourceURL=' + this.sourceURL;
  }

  async editSource(newSource: string): Promise<{
    changed: boolean,
    status: Protocol.Debugger.SetScriptSourceResponseStatus,
    exceptionDetails?: Protocol.Runtime.ExceptionDetails,
  }> {
    newSource = Script.trimSourceURLComment(newSource);
    // We append correct #sourceURL to script for consistency only. It's not actually needed for things to work correctly.
    newSource = this.appendSourceURLCommentIfNeeded(newSource);

    const {content: oldSource} = await this.requestContent();
    if (oldSource === newSource) {
      return {changed: false, status: Protocol.Debugger.SetScriptSourceResponseStatus.Ok};
    }
    const response = await this.debuggerModel.target().debuggerAgent().invoke_setScriptSource(
        {scriptId: this.scriptId, scriptSource: newSource, allowTopFrameEditing: true});
    if (response.getError()) {
      // Something went seriously wrong, like the V8 inspector no longer knowing about this script without
      // shutting down the Debugger agent etc.
      throw new Error(`Script#editSource failed for script with id ${this.scriptId}: ${response.getError()}`);
    }

    if (!response.getError() && response.status === Protocol.Debugger.SetScriptSourceResponseStatus.Ok) {
      this.#contentPromise = Promise.resolve({content: newSource, isEncoded: false});
    }

    return {changed: true, status: response.status, exceptionDetails: response.exceptionDetails};
  }

  rawLocation(lineNumber: number, columnNumber: number): Location|null {
    if (this.containsLocation(lineNumber, columnNumber)) {
      return new Location(this.debuggerModel, this.scriptId, lineNumber, columnNumber);
    }
    return null;
  }

  isInlineScript(): boolean {
    const startsAtZero = !this.lineOffset && !this.columnOffset;
    return !this.isWasm() && Boolean(this.sourceURL) && !startsAtZero;
  }

  isAnonymousScript(): boolean {
    return !this.sourceURL;
  }

  async setBlackboxedRanges(positions: Protocol.Debugger.ScriptPosition[]): Promise<boolean> {
    const response = await this.debuggerModel.target().debuggerAgent().invoke_setBlackboxedRanges(
        {scriptId: this.scriptId, positions});
    return !response.getError();
  }

  containsLocation(lineNumber: number, columnNumber: number): boolean {
    const afterStart =
        (lineNumber === this.lineOffset && columnNumber >= this.columnOffset) || lineNumber > this.lineOffset;
    const beforeEnd = lineNumber < this.endLine || (lineNumber === this.endLine && columnNumber <= this.endColumn);
    return afterStart && beforeEnd;
  }

  get frameId(): Protocol.Page.FrameId {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    if (typeof this[frameIdSymbol] !== 'string') {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      this[frameIdSymbol] = frameIdForScript(this);
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    return this[frameIdSymbol];
  }

  /**
   * @returns true, iff this script originates from a breakpoint/logpoint condition
   */
  get isBreakpointCondition(): boolean {
    return [COND_BREAKPOINT_SOURCE_URL, LOGPOINT_SOURCE_URL].includes(this.sourceURL);
  }

  createPageResourceLoadInitiator(): PageResourceLoadInitiator {
    return {target: this.target(), frameId: this.frameId, initiatorUrl: this.embedderName()};
  }

  /**
   * Translates the `rawLocation` from line and column number in terms of what V8 understands
   * to a script relative location. Specifically this means that for inline `<script>`'s
   * without a `//# sourceURL=` annotation, the line and column offset of the script
   * content is subtracted to make the location within the script independent of the
   * location of the `<script>` tag within the surrounding document.
   *
   * @param rawLocation the raw location in terms of what V8 understands.
   * @returns the script relative line and column number for the {@link rawLocation}.
   */
  rawLocationToRelativeLocation(rawLocation: {lineNumber: number, columnNumber: number}):
      {lineNumber: number, columnNumber: number};
  rawLocationToRelativeLocation(rawLocation: {lineNumber: number, columnNumber: number|undefined}):
      {lineNumber: number, columnNumber: number|undefined};
  rawLocationToRelativeLocation(rawLocation: {lineNumber: number, columnNumber: number|undefined}):
      {lineNumber: number, columnNumber: number|undefined} {
    let {lineNumber, columnNumber} = rawLocation;
    if (!this.hasSourceURL && this.isInlineScript()) {
      lineNumber -= this.lineOffset;
      if (lineNumber === 0 && columnNumber !== undefined) {
        columnNumber -= this.columnOffset;
      }
    }
    return {lineNumber, columnNumber};
  }

  /**
   * Translates the `relativeLocation` from script relative line and column number to
   * the raw location in terms of what V8 understands. Specifically this means that for
   * inline `<script>`'s without a `//# sourceURL=` annotation, the line and column offset
   * of the script content is added to make the location relative to the start of the
   * surrounding document.
   *
   * @param relativeLocation the script relative location.
   * @returns the raw location in terms of what V8 understands for the {@link relativeLocation}.
   */
  relativeLocationToRawLocation(relativeLocation: {lineNumber: number, columnNumber: number}):
      {lineNumber: number, columnNumber: number};
  relativeLocationToRawLocation(relativeLocation: {lineNumber: number, columnNumber: number|undefined}):
      {lineNumber: number, columnNumber: number|undefined};
  relativeLocationToRawLocation(relativeLocation: {lineNumber: number, columnNumber: number|undefined}):
      {lineNumber: number, columnNumber: number|undefined} {
    let {lineNumber, columnNumber} = relativeLocation;
    if (!this.hasSourceURL && this.isInlineScript()) {
      if (lineNumber === 0 && columnNumber !== undefined) {
        columnNumber += this.columnOffset;
      }
      lineNumber += this.lineOffset;
    }
    return {lineNumber, columnNumber};
  }
}

const frameIdSymbol = Symbol('frameid');

function frameIdForScript(script: Script): Protocol.Page.FrameId|null {
  const executionContext = script.executionContext();
  if (executionContext) {
    return executionContext.frameId || null;
  }
  // This is to overcome compilation cache which doesn't get reset.
  const resourceTreeModel = script.debuggerModel.target().model(ResourceTreeModel);
  if (!resourceTreeModel || !resourceTreeModel.mainFrame) {
    return null;
  }
  return resourceTreeModel.mainFrame.id;
}

export const sourceURLRegex = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/;
