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
import {ResourceTreeModel} from './ResourceTreeModel.js';
import {ExecutionContext} from './RuntimeModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {TextUtils.ContentProvider.ContentProvider}
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
   */
  constructor(
      debuggerModel, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
      isContentScript, isLiveEdit, sourceMapURL, hasSourceURL, length, originStackTrace, codeOffset, scriptLanguage) {
    /** @type {string} */
    this._source;

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
    this.hasSourceURL = hasSourceURL;
    this.contentLength = length;
    this._originalContentProvider = null;
    this._originalSource = null;
    this.originStackTrace = originStackTrace;
    this._codeOffset = codeOffset;
    this._language = scriptLanguage;
    this._lineMap = null;
    this._functionBodyOffsets = null;
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
   * @return {boolean}
   */
  hasWasmDisassembly() {
    return !!this._lineMap && !this.sourceMapURL;
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
  async requestContent() {
    if (this._source) {
      return {content: this._source, isEncoded: false};
    }
    if (!this.scriptId) {
      return {error: ls`Script removed or deleted.`, isEncoded: false};
    }

    try {
      const sourceOrBytecode =
          await this.debuggerModel.target().debuggerAgent().invoke_getScriptSource({scriptId: this.scriptId});
      const source = sourceOrBytecode.scriptSource;
      if (source) {
        if (this.hasSourceURL) {
          this._source = Script._trimSourceURLComment(source);
        } else {
          this._source = source;
        }
      } else {
        this._source = '';
        if (sourceOrBytecode.bytecode) {
          const worker = new Common.Worker.WorkerWrapper('wasmparser_worker_entrypoint');
          /** @type {!Promise<!MessageEvent>} */
          const promise = new Promise(function(resolve, reject) {
            worker.onmessage = resolve;
            worker.onerror = reject;
          });
          worker.postMessage({method: 'disassemble', params: {content: sourceOrBytecode.bytecode}});

          /** @type {{source: string, offsets: ?Array<number>, functionBodyOffsets: ?Array<{start: number, end: number}>}} */
          const data = (await promise).data;
          this._source = data.source;
          this._lineMap = data.offsets;
          this._functionBodyOffsets = data.functionBodyOffsets;
          this.endLine = (this._lineMap && this._lineMap.length) || 0;
        }
      }

      if (this._originalSource === null) {
        this._originalSource = this._source;
      }
      return {content: this._source, isEncoded: false};
    } catch (err) {
      return {error: ls`Unable to fetch script source.`, isEncoded: false};
    }
  }

  /**
   * @return {!Promise<!ArrayBuffer>}
   */
  async getWasmBytecode() {
    const base64 = await this.debuggerModel.target().debuggerAgent().invoke_getWasmBytecode({scriptId: this.scriptId});
    const response = await fetch(`data:application/wasm;base64,${base64}`);
    return response.arrayBuffer();
  }

  /**
   * @return {!TextUtils.ContentProvider.ContentProvider}
   */
  originalContentProvider() {
    if (!this._originalContentProvider) {
      const lazyContent = () => this.requestContent().then(() => {
        return {
          content: this._originalSource || '',
          isEncoded: false,
        };
      });
      this._originalContentProvider =
          new TextUtils.StaticContentProvider.StaticContentProvider(this.contentURL(), this.contentType(), lazyContent);
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

    await this.requestContent();
    if (this._source === newSource) {
      callback(null);
      return;
    }
    const response = await this.debuggerModel.target().debuggerAgent().invoke_setScriptSource(
        {scriptId: this.scriptId, scriptSource: newSource});

    if (!response.getError() && !response.exceptionDetails) {
      this._source = newSource;
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
   * @param {number} lineNumber
   * @return {?Location}
   */
  wasmByteLocation(lineNumber) {
    if (this._lineMap && lineNumber < this._lineMap.length) {
      return new Location(this.debuggerModel, this.scriptId, 0, this._lineMap[lineNumber]);
    }
    return null;
  }

  /**
   * @param {number} byteOffset
   * @return {number}
   */
  wasmDisassemblyLine(byteOffset) {
    let line = 0;
    // TODO: Implement binary search if necessary for large wasm modules
    while (this._lineMap && line < this._lineMap.length && byteOffset > this._lineMap[line]) {
      line++;
    }
    return line;
  }

  /**
   * @param {number} lineNumber
   * @return {boolean}
   */
  isWasmDisassemblyBreakableLine(lineNumber) {
    if (!this._functionBodyOffsets || this._functionBodyOffsets.length === 0) {
      return false;
    }
    const location = this.wasmByteLocation(lineNumber);
    if (!location) {
      return false;
    }
    const byteOffset = location.columnNumber;

    // Here, this._functionBodyOffsets is [{start:s0, end:e0}, {start:s1, end:e1}, ...].
    // Also, we have s0 < e0 < s1 < e1 ... and the breakable lines are defined by the union of [a0,b0), [a1,b1), ...
    let first = 0;
    let last = this._functionBodyOffsets.length - 1;
    // Quick return if it is outside of code section.
    if (byteOffset < this._functionBodyOffsets[first].start || byteOffset >= this._functionBodyOffsets[last].end) {
      return false;
    }
    // Binary search.
    while (first <= last) {
      const mid = (first + last) >> 1;
      const functionBodyOffset = this._functionBodyOffsets[mid];
      if (byteOffset < functionBodyOffset.start) {
        last = mid - 1;
      } else if (byteOffset >= functionBodyOffset.end) {
        first = mid + 1;
      } else {
        return true;
      }
    }

    return false;
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
