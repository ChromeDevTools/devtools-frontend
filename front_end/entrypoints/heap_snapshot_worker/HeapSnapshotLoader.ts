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

import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import {type HeapSnapshotHeader, HeapSnapshotProgress, JSHeapSnapshot, type Profile} from './HeapSnapshot.js';
import type {HeapSnapshotWorkerDispatcher} from './HeapSnapshotWorkerDispatcher.js';

export class HeapSnapshotLoader {
  readonly #progress: HeapSnapshotProgress;
  #buffer: string[];
  #dataCallback: ((value: string|PromiseLike<string>) => void)|null;
  #done: boolean;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #snapshot?: {[x: string]: any};
  #array!: Platform.TypedArrayUtilities.BigUint32Array|null;
  #arrayIndex!: number;
  #json: string = '';
  constructor(dispatcher: HeapSnapshotWorkerDispatcher) {
    this.#reset();
    this.#progress = new HeapSnapshotProgress(dispatcher);
    this.#buffer = [];
    this.#dataCallback = null;
    this.#done = false;
    void this.#parseInput();
  }

  dispose(): void {
    this.#reset();
  }

  #reset(): void {
    this.#json = '';
    this.#snapshot = undefined;
  }

  close(): void {
    this.#done = true;
    if (this.#dataCallback) {
      this.#dataCallback('');
    }
  }

  buildSnapshot(): JSHeapSnapshot {
    this.#snapshot = this.#snapshot || {};

    this.#progress.updateStatus('Processing snapshot…');
    const result = new JSHeapSnapshot((this.#snapshot as Profile), this.#progress);
    this.#reset();
    return result;
  }

  #parseUintArray(): boolean {
    let index = 0;
    const char0 = '0'.charCodeAt(0);
    const char9 = '9'.charCodeAt(0);
    const closingBracket = ']'.charCodeAt(0);
    const length = this.#json.length;
    while (true) {
      while (index < length) {
        const code = this.#json.charCodeAt(index);
        if (char0 <= code && code <= char9) {
          break;
        } else if (code === closingBracket) {
          this.#json = this.#json.slice(index + 1);
          return false;
        }
        ++index;
      }
      if (index === length) {
        this.#json = '';
        return true;
      }
      let nextNumber = 0;
      const startIndex = index;
      while (index < length) {
        const code = this.#json.charCodeAt(index);
        if (char0 > code || code > char9) {
          break;
        }
        nextNumber *= 10;
        nextNumber += (code - char0);
        ++index;
      }
      if (index === length) {
        this.#json = this.#json.slice(startIndex);
        return true;
      }
      if (!this.#array) {
        throw new Error('Array not instantiated');
      }
      this.#array.setValue(this.#arrayIndex++, nextNumber);
    }
  }

  #parseStringsArray(): void {
    this.#progress.updateStatus('Parsing strings…');
    const closingBracketIndex = this.#json.lastIndexOf(']');
    if (closingBracketIndex === -1) {
      throw new Error('Incomplete JSON');
    }
    this.#json = this.#json.slice(0, closingBracketIndex + 1);

    if (!this.#snapshot) {
      throw new Error('No snapshot in parseStringsArray');
    }
    this.#snapshot.strings = JSON.parse(this.#json);
  }

  write(chunk: string): void {
    this.#buffer.push(chunk);
    if (!this.#dataCallback) {
      return;
    }
    this.#dataCallback(this.#buffer.shift() as string);
    this.#dataCallback = null;
  }

  #fetchChunk(): Promise<string> {
    // This method shoudln't be entered more than once since parsing happens
    // sequentially. This means it's fine to stash away a single #dataCallback
    // instead of an array of them.
    if (this.#buffer.length > 0) {
      return Promise.resolve(this.#buffer.shift() as string);
    }

    const {promise, resolve} = Promise.withResolvers<string>();
    this.#dataCallback = resolve;
    return promise;
  }

  async #findToken(token: string, startIndex?: number): Promise<number> {
    while (true) {
      const pos = this.#json.indexOf(token, startIndex || 0);
      if (pos !== -1) {
        return pos;
      }
      startIndex = this.#json.length - token.length + 1;
      this.#json += await this.#fetchChunk();
    }
  }

  async #parseArray(name: string, title: string, length?: number):
      Promise<Platform.TypedArrayUtilities.BigUint32Array> {
    const nameIndex = await this.#findToken(name);
    const bracketIndex = await this.#findToken('[', nameIndex);
    this.#json = this.#json.slice(bracketIndex + 1);
    this.#array = length === undefined ? Platform.TypedArrayUtilities.createExpandableBigUint32Array() :
                                         Platform.TypedArrayUtilities.createFixedBigUint32Array(length);
    this.#arrayIndex = 0;
    while (this.#parseUintArray()) {
      if (length) {
        this.#progress.updateProgress(title, this.#arrayIndex, this.#array.length);
      } else {
        this.#progress.updateStatus(title);
      }
      this.#json += await this.#fetchChunk();
    }
    const result = this.#array;
    this.#array = null;
    return result;
  }

  async #parseInput(): Promise<void> {
    const snapshotToken = '"snapshot"';
    const snapshotTokenIndex = await this.#findToken(snapshotToken);
    if (snapshotTokenIndex === -1) {
      throw new Error('Snapshot token not found');
    }

    this.#progress.updateStatus('Loading snapshot info…');
    const json = this.#json.slice(snapshotTokenIndex + snapshotToken.length + 1);
    let jsonTokenizerDone = false;
    const jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(metaJSON => {
      this.#json = jsonTokenizer.remainder();
      jsonTokenizerDone = true;

      this.#snapshot = this.#snapshot || {};
      this.#snapshot.snapshot = (JSON.parse(metaJSON) as HeapSnapshotHeader);
    });
    jsonTokenizer.write(json);
    while (!jsonTokenizerDone) {
      jsonTokenizer.write(await this.#fetchChunk());
    }

    this.#snapshot = this.#snapshot || {};
    const nodes = await this.#parseArray(
        '"nodes"', 'Loading nodes… {PH1}%',
        this.#snapshot.snapshot.meta.node_fields.length * this.#snapshot.snapshot.node_count);
    this.#snapshot.nodes = nodes;

    const edges = await this.#parseArray(
        '"edges"', 'Loading edges… {PH1}%',
        this.#snapshot.snapshot.meta.edge_fields.length * this.#snapshot.snapshot.edge_count);
    this.#snapshot.edges = edges;

    if (this.#snapshot.snapshot.trace_function_count) {
      const traceFunctionInfos = await this.#parseArray(
          '"trace_function_infos"', 'Loading allocation traces… {PH1}%',
          this.#snapshot.snapshot.meta.trace_function_info_fields.length *
              this.#snapshot.snapshot.trace_function_count);
      this.#snapshot.trace_function_infos = traceFunctionInfos.asUint32ArrayOrFail();

      const thisTokenEndIndex = await this.#findToken(':');
      const nextTokenIndex = await this.#findToken('"', thisTokenEndIndex);
      const openBracketIndex = this.#json.indexOf('[');
      const closeBracketIndex = this.#json.lastIndexOf(']', nextTokenIndex);
      this.#snapshot.trace_tree = JSON.parse(this.#json.substring(openBracketIndex, closeBracketIndex + 1));
      this.#json = this.#json.slice(closeBracketIndex + 1);
    }

    if (this.#snapshot.snapshot.meta.sample_fields) {
      const samples = await this.#parseArray('"samples"', 'Loading samples…');
      this.#snapshot.samples = samples.asArrayOrFail();
    }

    if (this.#snapshot.snapshot.meta['location_fields']) {
      const locations = await this.#parseArray('"locations"', 'Loading locations…');
      this.#snapshot.locations = locations.asArrayOrFail();
    } else {
      this.#snapshot.locations = [];
    }

    this.#progress.updateStatus('Loading strings…');
    const stringsTokenIndex = await this.#findToken('"strings"');
    const bracketIndex = await this.#findToken('[', stringsTokenIndex);
    this.#json = this.#json.slice(bracketIndex);
    while (!this.#done) {
      this.#json += await this.#fetchChunk();
    }
    this.#parseStringsArray();
  }
}
