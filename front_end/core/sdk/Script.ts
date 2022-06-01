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

import type {DebuggerModel} from './DebuggerModel.js';
import {Location} from './DebuggerModel.js';
import type {FrameAssociated} from './FrameAssociated.js';
import type {PageResourceLoadInitiator} from './PageResourceLoader.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';
import type {ExecutionContext} from './RuntimeModel.js';
import type {Target} from './Target.js';

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
  sourceMapURL: Platform.DevToolsPath.UrlString|undefined;
  debugSymbols: Protocol.Debugger.DebugSymbols|null;
  hasSourceURL: boolean;
  contentLength: number;
  #originalContentProviderInternal: TextUtils.ContentProvider.ContentProvider|null;
  originStackTrace: Protocol.Runtime.StackTrace|null;
  readonly #codeOffsetInternal: number|null;
  readonly #language: string|null;
  #contentPromise: Promise<TextUtils.ContentProvider.DeferredContent>|null;
  readonly #embedderNameInternal: Platform.DevToolsPath.UrlString|null;
  readonly isModule: boolean|null;
  constructor(
      debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, sourceURL: Platform.DevToolsPath.UrlString,
      startLine: number, startColumn: number, endLine: number, endColumn: number, executionContextId: number,
      hash: string, isContentScript: boolean, isLiveEdit: boolean,
      sourceMapURL: Platform.DevToolsPath.UrlString|undefined, hasSourceURL: boolean, length: number,
      isModule: boolean|null, originStackTrace: Protocol.Runtime.StackTrace|null, codeOffset: number|null,
      scriptLanguage: string|null, debugSymbols: Protocol.Debugger.DebugSymbols|null,
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
    this.#originalContentProviderInternal = null;
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

  async contentEncoded(): Promise<boolean> {
    return false;
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (!this.#contentPromise) {
      this.#contentPromise = this.originalContentProvider().requestContent();
    }
    return this.#contentPromise;
  }

  async getWasmBytecode(): Promise<ArrayBuffer> {
    const base64 = await this.debuggerModel.target().debuggerAgent().invoke_getWasmBytecode({scriptId: this.scriptId});
    const response = await fetch(`data:application/wasm;base64,${base64.bytecode}`);
    return response.arrayBuffer();
  }

  originalContentProvider(): TextUtils.ContentProvider.ContentProvider {
    if (!this.#originalContentProviderInternal) {
      let lazyContentPromise: Promise<TextUtils.ContentProvider.DeferredContent>|null;
      this.#originalContentProviderInternal =
          new TextUtils.StaticContentProvider.StaticContentProvider(this.contentURL(), this.contentType(), () => {
            if (!lazyContentPromise) {
              lazyContentPromise = (async(): Promise<{
                                      content: null,
                                      error: Common.UIString.LocalizedString,
                                      isEncoded: boolean,
                                    }|{
                                      content: string,
                                      isEncoded: boolean,
                                      error?: undefined,
                                    }> => {
                if (!this.scriptId) {
                  return {content: null, error: i18nString(UIStrings.scriptRemovedOrDeleted), isEncoded: false};
                }
                try {
                  const result = await this.debuggerModel.target().debuggerAgent().invoke_getScriptSource(
                      {scriptId: this.scriptId});
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

                } catch (err) {
                  // TODO(bmeurer): Propagate errors as exceptions / rejections.
                  return {content: null, error: i18nString(UIStrings.unableToFetchScriptSource), isEncoded: false};
                }
              })();
            }
            return lazyContentPromise;
          });
    }
    return this.#originalContentProviderInternal;
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

  async editSource(
      newSource: string,
      callback:
          (error: string|null, arg1?: Protocol.Runtime.ExceptionDetails|undefined,
           arg2?: Array<Protocol.Debugger.CallFrame>|undefined, arg3?: Protocol.Runtime.StackTrace|undefined,
           arg4?: Protocol.Runtime.StackTraceId|undefined, arg5?: boolean|undefined) => void): Promise<void> {
    newSource = Script.trimSourceURLComment(newSource);
    // We append correct #sourceURL to script for consistency only. It's not actually needed for things to work correctly.
    newSource = this.appendSourceURLCommentIfNeeded(newSource);

    if (!this.scriptId) {
      callback('Script failed to parse');
      return;
    }

    const {content: oldSource} = await this.requestContent();
    if (oldSource === newSource) {
      callback(null);
      return;
    }
    const response = await this.debuggerModel.target().debuggerAgent().invoke_setScriptSource(
        {scriptId: this.scriptId, scriptSource: newSource});

    if (!response.getError() && !response.exceptionDetails) {
      this.#contentPromise = Promise.resolve({content: newSource, isEncoded: false});
    }

    const needsStepIn = Boolean(response.stackChanged);
    callback(
        response.getError() || null, response.exceptionDetails, response.callFrames, response.asyncStackTrace,
        response.asyncStackTraceId, needsStepIn);
  }

  rawLocation(lineNumber: number, columnNumber: number): Location|null {
    if (this.containsLocation(lineNumber, columnNumber)) {
      return new Location(this.debuggerModel, this.scriptId, lineNumber, columnNumber);
    }
    return null;
  }

  toRelativeLocation(location: Location): number[] {
    console.assert(
        location.scriptId === this.scriptId, '`toRelativeLocation` must be used with location of the same script');
    const relativeLineNumber = location.lineNumber - this.lineOffset;
    const relativeColumnNumber = (location.columnNumber || 0) - (relativeLineNumber === 0 ? this.columnOffset : 0);
    return [relativeLineNumber, relativeColumnNumber];
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

  createPageResourceLoadInitiator(): PageResourceLoadInitiator {
    return {target: this.target(), frameId: this.frameId, initiatorUrl: this.embedderName()};
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
