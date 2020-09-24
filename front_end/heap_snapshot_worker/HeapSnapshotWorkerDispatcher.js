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

import * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *   callId: (number|undefined),
 *   result: *,
 *   error: (string|undefined),
 *   errorCallStack: (!Object|undefined),
 *   errorMethodName: (string|undefined),
 * }}
 */
let DispatcherResponse;  // eslint-disable-line no-unused-vars

/**
 * @unrestricted

 */
export class HeapSnapshotWorkerDispatcher {
  /**
   *
   * @param {!Worker} globalObject
   * @param {!Function} postMessage
   */
  constructor(globalObject, postMessage) {
    /**
     * @type {!Array<*>};
     */
    this._objects = [];
    this._global = globalObject;
    this._postMessage = postMessage;
  }

  /**
   * @param {string} name
   * @return {!Function}
   */
  _findFunction(name) {
    const path = name.split('.');
    let result = /** @type {*} */ (this._global);
    for (let i = 0; i < path.length; ++i) {
      result = result[path[i]];
    }
    return /** @type {!Function} */ (result);
  }

  /**
   * @param {string} name
   * @param {*} data
   */
  sendEvent(name, data) {
    this._postMessage({eventName: name, data: data});
  }

  /**
   * @param {{data: !HeapSnapshotModel.HeapSnapshotModel.WorkerCommand}} event
   */
  dispatchMessage({data}) {
    /**
     * @type {!DispatcherResponse}
     */
    const response =
        {callId: data.callId, result: null, error: undefined, errorCallStack: undefined, errorMethodName: undefined};
    try {
      switch (data.disposition) {
        case 'create': {
          const constructorFunction = this._findFunction(data.methodName);
          // @ts-ignore
          this._objects[data.objectId] = new constructorFunction(this);
          break;
        }
        case 'dispose': {
          delete this._objects[data.objectId];
          break;
        }
        case 'getter': {
          const object = this._objects[data.objectId];
          const result = object[data.methodName];
          response.result = result;
          break;
        }
        case 'factory': {
          const object = this._objects[data.objectId];
          const result = object[data.methodName].apply(object, data.methodArguments);
          if (result) {
            this._objects[data.newObjectId] = result;
          }
          response.result = !!result;
          break;
        }
        case 'method': {
          const object = this._objects[data.objectId];
          response.result = object[data.methodName].apply(object, data.methodArguments);
          break;
        }
        case 'evaluateForTest': {
          try {
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
    this._postMessage(response);
  }
}
