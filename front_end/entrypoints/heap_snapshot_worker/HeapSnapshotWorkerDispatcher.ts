/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';

// We mirror what heap_snapshot_worker.ts does, but we can't use it here as we'd have a
// cyclic GN dependency otherwise.

import * as AllocationProfile from './AllocationProfile.js';
import * as HeapSnapshot from './HeapSnapshot.js';
import * as HeapSnapshotLoader from './HeapSnapshotLoader.js';

interface DispatcherResponse {
  callId?: number;
  result: unknown;
  error?: string;
  errorCallStack?: Object;
  errorMethodName?: string;
}

export class HeapSnapshotWorkerDispatcher {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #objects: any[];
  readonly #postMessage: typeof Window.prototype.postMessage;
  constructor(postMessage: typeof Window.prototype.postMessage) {
    this.#objects = [];
    this.#postMessage = postMessage;
  }

  sendEvent(name: string, data: unknown): void {
    this.#postMessage({eventName: name, data});
  }

  dispatchMessage({data}: {data: HeapSnapshotModel.HeapSnapshotModel.WorkerCommand}): void {
    const response: DispatcherResponse =
        {callId: data.callId, result: null, error: undefined, errorCallStack: undefined, errorMethodName: undefined};
    try {
      switch (data.disposition) {
        case 'createLoader':
          this.#objects[data.objectId] = new HeapSnapshotLoader.HeapSnapshotLoader(this);
          break;
        case 'dispose': {
          delete this.#objects[data.objectId];
          break;
        }
        case 'getter': {
          const object = this.#objects[data.objectId];
          const result = object[data.methodName];
          response.result = result;
          break;
        }
        case 'factory': {
          const object = this.#objects[data.objectId];
          const result = object[data.methodName].apply(object, data.methodArguments);
          if (result) {
            this.#objects[data.newObjectId] = result;
          }
          response.result = Boolean(result);
          break;
        }
        case 'method': {
          const object = this.#objects[data.objectId];
          response.result = object[data.methodName].apply(object, data.methodArguments);
          break;
        }
        case 'evaluateForTest': {
          try {
            // Make 'HeapSnapshotWorker' and 'HeapSnapshotModel' available to web tests. 'eval' can't use 'import'.
            // @ts-ignore
            globalThis.HeapSnapshotWorker = {
              AllocationProfile,
              HeapSnapshot,
              HeapSnapshotLoader,
            };
            // @ts-ignore
            globalThis.HeapSnapshotModel = HeapSnapshotModel;
            response.result = self.eval(data.source);
          } catch (error) {
            response.result = error.toString();
          }
          break;
        }
      }
    } catch (error) {
      response.error = error.toString();
      response.errorCallStack = error.stack;
      if (data.methodName) {
        response.errorMethodName = data.methodName;
      }
    }
    this.#postMessage(response);
  }
}
