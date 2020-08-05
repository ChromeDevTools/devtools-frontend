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

import * as Common from '../common/common.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars
import * as TextUtils from '../text_utils/text_utils.js';

import {DebuggerModel, Location} from './DebuggerModel.js';  // eslint-disable-line no-unused-vars
import {FrameAssociated} from './FrameAssociated.js';        // eslint-disable-line no-unused-vars
import {PageResourceLoadInitiator} from './PageResourceLoader.js';  // eslint-disable-line no-unused-vars
import {ResourceTreeModel} from './ResourceTreeModel.js';
import {ExecutionContext} from './RuntimeModel.js';  // eslint-disable-line no-unused-vars
import {Target} from './SDKModel.js';                // eslint-disable-line no-unused-vars

/**
 * @implements {TextUtils.ContentProvider.ContentProvider}
 * TODO(chromium:1011811): make `implements {FrameAssociated}` annotation work here.
 * @unrestricted
 */
export class Script {
  /**
   * @param {!DebuggerModel} debuggerModel
   * @param {string} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {boolean} isContentScript
   * @param {boolean} isLiveEdit
   * @param {string|undefined} sourceMapURL
   * @param {boolean} hasSourceURL
   * @param {number} length
   * @param {?Protocol.Runtime.StackTrace} originStackTrace
   * @param {?number} codeOffset
   * @param {?string} scriptLanguage
   * @param {?Protocol.Debugger.DebugSymbols} debugSymbols
   * @param {?string} embedderName
   */
  constructor(
      debuggerModel, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
      isContentScript, isLiveEdit, sourceMapURL, hasSourceURL, length, originStackTrace, codeOffset, scriptLanguage,
      debugSymbols, embedderName) {
    this.debuggerModel = debuggerModel;
    this.scriptId = scriptId;
    this.sourceURL = sourceURL;
    this.lineOffset = startLine;
    this.columnOffset = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;

    this.executionContextId = executionContextId;
    this.hash = hash;
    this._isContentScript = isContentScript;
    this._isLiveEdit = isLiveEdit;
    this.sourceMapURL = sourceMapURL;
    if (!sourceMapURL && debugSymbols && debugSymbols.type === 'EmbeddedDWARF') {
      // TODO(chromium:1064248) Remove this once we either drop gimli or support DebugSymbols all the way down.
      this.sourceMapURL = 'wasm://dwarf';
    }
    this.debugSymbols = debugSymbols;
    this.hasSourceURL = hasSourceURL;
    this.contentLength = length;
    /** @type {?TextUtils.ContentProvider.ContentProvider} */
    this._originalContentProvider = null;
    this.originStackTrace = originStackTrace;
    this._codeOffset = codeOffset;
    this._language = scriptLanguage;
    /** @type {?Promise<!TextUtils.ContentProvider.DeferredContent>} */
    this._contentPromise = null;
    this._embedderName = embedderName;
  }

  /**
   * @returns {?string}
   */
  embedderName() {
    return this._embedderName;
  }

  /**
   * @returns {!Target}
   */
  target() {
    return this.debuggerModel.target();
  }

  /**
   * @param {string} source
   * @return {string}
   */
  static _trimSourceURLComment(source) {
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

  /**
   * @return {boolean}
   */
  isContentScript() {
    return this._isContentScript;
  }

  /**
   * @return {?number}
   */
  codeOffset() {
    return this._codeOffset;
  }

  /**
   * @return {boolean}
   */
  isWasm() {
    return this._language === Protocol.Debugger.ScriptLanguage.WebAssembly;
  }

  /**
   * @return {string|null}
   */
  scriptLanguage() {
    return this._language;
  }

  /**
   * @return {?ExecutionContext}
   */
  executionContext() {
    return this.debuggerModel.runtimeModel().executionContext(this.executionContextId);
  }

  /**
   * @return {boolean}
   */
  isLiveEdit() {
    return this._isLiveEdit;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this.sourceURL;
  }

  /**
   * @override
   * @return {!Common.ResourceType.ResourceType}
   */
  contentType() {
    return Common.ResourceType.resourceTypes.Script;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  contentEncoded() {
    return Promise.resolve(false);
  }

  /**
   * @override
   * @return {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  requestContent() {
    if (!this._contentPromise) {
      this._contentPromise = this.originalContentProvider().requestContent();
    }
    return this._contentPromise;
  }

  /**
   * @return {!Promise<!ArrayBuffer>}
   */
  async getWasmBytecode() {
    const base64 = await this.debuggerModel.target().debuggerAgent().invoke_getWasmBytecode({scriptId: this.scriptId});
    const response = await fetch(`data:application/wasm;base64,${base64.bytecode}`);
    return response.arrayBuffer();
  }

  /**
   * @return {!TextUtils.ContentProvider.ContentProvider}
   */
  originalContentProvider() {
    if (!this._originalContentProvider) {
      /** @type {?Promise<!TextUtils.ContentProvider.DeferredContent>} } */
      let lazyContentPromise;
      this._originalContentProvider =
          new TextUtils.StaticContentProvider.StaticContentProvider(this.contentURL(), this.contentType(), () => {
            if (!lazyContentPromise) {
              lazyContentPromise = (async () => {
                if (!this.scriptId) {
                  return {content: null, error: ls`Script removed or deleted.`, isEncoded: false};
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
                  let content = scriptSource || '';
                  if (this.hasSourceURL) {
                    content = Script._trimSourceURLComment(content);
                  }
                  return {content, isEncoded: false};

                } catch (err) {
                  // TODO(bmeurer): Propagate errors as exceptions / rejections.
                  return {content: null, error: ls`Unable to fetch script source.`, isEncoded: false};
                }
              })();
            }
            return lazyContentPromise;
          });
    }
    return this._originalContentProvider;
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!TextUtils.ContentProvider.SearchMatch>>}
   */
  async searchInContent(query, caseSensitive, isRegex) {
    if (!this.scriptId) {
      return [];
    }

    const matches = await this.debuggerModel.target().debuggerAgent().invoke_searchInContent(
        {scriptId: this.scriptId, query, caseSensitive, isRegex});
    return (matches.result || [])
        .map(match => new TextUtils.ContentProvider.SearchMatch(match.lineNumber, match.lineContent));
  }

  /**
   * @param {string} source
   * @return {string}
   */
  _appendSourceURLCommentIfNeeded(source) {
    if (!this.hasSourceURL) {
      return source;
    }
    return source + '\n //# sourceURL=' + this.sourceURL;
  }

  /**
   * @param {string} newSource
   * @param {function(?ProtocolClient.InspectorBackend.ProtocolError, !Protocol.Runtime.ExceptionDetails=, !Array.<!Protocol.Debugger.CallFrame>=, !Protocol.Runtime.StackTrace=, !Protocol.Runtime.StackTraceId=, boolean=):void} callback
   */
  async editSource(newSource, callback) {
    newSource = Script._trimSourceURLComment(newSource);
    // We append correct sourceURL to script for consistency only. It's not actually needed for things to work correctly.
    newSource = this._appendSourceURLCommentIfNeeded(newSource);

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
      this._contentPromise = Promise.resolve({content: newSource, isEncoded: false});
    }

    const needsStepIn = !!response.stackChanged;
    callback(
        response.getError() || null, response.exceptionDetails, response.callFrames, response.asyncStackTrace,
        response.asyncStackTraceId, needsStepIn);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Location}
   */
  rawLocation(lineNumber, columnNumber) {
    if (this.containsLocation(lineNumber, columnNumber)) {
      return new Location(this.debuggerModel, this.scriptId, lineNumber, columnNumber);
    }
    return null;
  }

  /**
   *
   * @param {!Location} location
   * @return {!Array.<number>}
   */
  toRelativeLocation(location) {
    console.assert(
        location.scriptId === this.scriptId, '`toRelativeLocation` must be used with location of the same script');
    const relativeLineNumber = location.lineNumber - this.lineOffset;
    const relativeColumnNumber = (location.columnNumber || 0) - (relativeLineNumber === 0 ? this.columnOffset : 0);
    return [relativeLineNumber, relativeColumnNumber];
  }

  /**
   * @return {boolean}
   */
  isInlineScript() {
    const startsAtZero = !this.lineOffset && !this.columnOffset;
    return !this.isWasm() && !!this.sourceURL && !startsAtZero;
  }

  /**
   * @return {boolean}
   */
  isAnonymousScript() {
    return !this.sourceURL;
  }

  /**
   * @return {boolean}
   */
  isInlineScriptWithSourceURL() {
    return !!this.hasSourceURL && this.isInlineScript();
  }

  /**
   * @param {!Array<!Protocol.Debugger.ScriptPosition>} positions
   * @return {!Promise<boolean>}
   */
  async setBlackboxedRanges(positions) {
    const response = await this.debuggerModel.target().debuggerAgent().invoke_setBlackboxedRanges(
        {scriptId: this.scriptId, positions});
    return !response.getError();
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {boolean}
   */
  containsLocation(lineNumber, columnNumber) {
    const afterStart =
        (lineNumber === this.lineOffset && columnNumber >= this.columnOffset) || lineNumber > this.lineOffset;
    const beforeEnd = lineNumber < this.endLine || (lineNumber === this.endLine && columnNumber <= this.endColumn);
    return afterStart && beforeEnd;
  }

  /**
   * @return {string}
   */
  get frameId() {
    if (typeof this[frameIdSymbol] !== 'string') {
      this[frameIdSymbol] = frameIdForScript(this);
    }
    return this[frameIdSymbol] || '';
  }

  /**
   * @returns {!PageResourceLoadInitiator}
   */
  createPageResourceLoadInitiator() {
    return {target: this.target(), frameId: this.frameId, initiatorUrl: this.embedderName()};
  }
}

const frameIdSymbol = Symbol('frameid');

/**
 * @param {!Script} script
 * @return {string}
 */
function frameIdForScript(script) {
  const executionContext = script.executionContext();
  if (executionContext) {
    return executionContext.frameId || '';
  }
  // This is to overcome compilation cache which doesn't get reset.
  const resourceTreeModel = script.debuggerModel.target().model(ResourceTreeModel);
  if (!resourceTreeModel || !resourceTreeModel.mainFrame) {
    return '';
  }
  return resourceTreeModel.mainFrame.id;
}

export const sourceURLRegex = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/;
