// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

  async dispatchMessage({data, ports}:
                            {data: HeapSnapshotModel.HeapSnapshotModel.WorkerCommand, ports: readonly MessagePort[]}):
      Promise<void> {
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
          const args = data.methodArguments.slice();
          args.push(...ports);
          const result = await object[data.methodName].apply(object, args);
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
            // @ts-expect-error
            globalThis.HeapSnapshotWorker = {
              AllocationProfile,
              HeapSnapshot,
              HeapSnapshotLoader,
            };
            // @ts-expect-error
            globalThis.HeapSnapshotModel = HeapSnapshotModel;
            response.result = await self.eval(data.source);
          } catch (error) {
            response.result = error.toString();
          }
          break;
        }
        case 'setupForSecondaryInit': {
          this.#objects[data.objectId] = new HeapSnapshot.SecondaryInitManager(ports[0]);
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
