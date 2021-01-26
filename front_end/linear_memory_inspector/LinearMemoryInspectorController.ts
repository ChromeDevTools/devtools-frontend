// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {LinearMemoryInspectorPaneImpl} from './LinearMemoryInspectorPane.js';

const LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP = 'linear-memory-inspector';
const MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1000;
export const ACCEPTED_MEMORY_TYPES = ['webassemblymemory', 'typedarray', 'dataview', 'arraybuffer'];

let controllerInstance: LinearMemoryInspectorController;

export interface LazyUint8Array {
  getRange(start: number, end: number): Promise<Uint8Array>;
  length(): number;
}

export class RemoteArrayBufferWrapper implements LazyUint8Array {
  private remoteArrayBuffer: SDK.RemoteObject.RemoteArrayBuffer;

  constructor(arrayBuffer: SDK.RemoteObject.RemoteArrayBuffer) {
    this.remoteArrayBuffer = arrayBuffer;
  }

  length(): number {
    return this.remoteArrayBuffer.byteLength();
  }

  async getRange(start: number, end: number): Promise<Uint8Array> {
    const newEnd = Math.min(end, this.length());
    if (start < 0 || start > newEnd) {
      console.error(`Requesting invalid range of memory: (${start}, ${end})`);
      return new Uint8Array(0);
    }
    const array = await this.remoteArrayBuffer.bytes(start, newEnd);
    return new Uint8Array(array);
  }
}

async function getBufferFromObject(obj: SDK.RemoteObject.RemoteObject): Promise<SDK.RemoteObject.RemoteArrayBuffer> {
  console.assert(obj.type === 'object');
  console.assert(obj.subtype !== undefined && ACCEPTED_MEMORY_TYPES.includes(obj.subtype));
  const response = await obj.runtimeModel()._agent.invoke_callFunctionOn({
    objectId: obj.objectId,
    functionDeclaration:
        'function() { return this instanceof ArrayBuffer || this instanceof SharedArrayBuffer ? this : this.buffer; }',
    silent: true,
    // Set object group in order to bind the object lifetime to the linear memory inspector.
    objectGroup: LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP,
  });

  const error = response.getError();
  if (error) {
    throw new Error(`Remote object representing ArrayBuffer could not be retrieved: ${error}`);
  }
  obj = obj.runtimeModel().createRemoteObject(response.result);
  return new SDK.RemoteObject.RemoteArrayBuffer(obj);
}

async function getBufferId(buffer: SDK.RemoteObject.RemoteArrayBuffer): Promise<string> {
  const properties = await buffer.object().getOwnProperties(false);
  const idProperty = properties.internalProperties?.find(prop => prop.name === '[[ArrayBufferData]]');
  const id = idProperty?.value?.value;
  if (!id) {
    throw new Error('Unable to find backing store id for array buffer');
  }
  return id;
}

export class LinearMemoryInspectorController extends SDK.SDKModel.SDKModelObserver<SDK.RuntimeModel.RuntimeModel> {
  private paneInstance = LinearMemoryInspectorPaneImpl.instance();
  private bufferIdToRemoteObject: Map<string, SDK.RemoteObject.RemoteObject> = new Map();

  private constructor() {
    super();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this.onGlobalObjectClear, this);
    this.paneInstance.addEventListener('view-closed', this.viewClosed.bind(this));

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.onDebuggerPause, this);
  }

  static instance(): LinearMemoryInspectorController {
    if (controllerInstance) {
      return controllerInstance;
    }
    controllerInstance = new LinearMemoryInspectorController();
    return controllerInstance;
  }

  static async getMemoryForAddress(memoryWrapper: LazyUint8Array, address: number):
      Promise<{memory: Uint8Array, offset: number}> {
    // Provide a chunk of memory that covers the address to show and some before and after
    // as 1. the address shown is not necessarily at the beginning of a page and
    // 2. to allow for fewer memory requests.
    const memoryChunkStart = Math.max(0, address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    const memory = await memoryWrapper.getRange(memoryChunkStart, memoryChunkEnd);
    return {memory: memory, offset: memoryChunkStart};
  }

  static async getMemoryRange(memoryWrapper: LazyUint8Array, start: number, end: number): Promise<Uint8Array> {
    // Check that the requested start is within bounds.
    // If the requested end is larger than the actual
    // memory, it will be automatically capped when
    // requesting the range.
    if (start < 0 || start > end || start >= memoryWrapper.length()) {
      throw new Error('Requested range is out of bounds.');
    }
    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    return await memoryWrapper.getRange(start, chunkEnd);
  }

  async openInspectorView(obj: SDK.RemoteObject.RemoteObject, address: number): Promise<void> {
    const buffer = await getBufferFromObject(obj);
    const bufferId = await getBufferId(buffer);

    if (this.bufferIdToRemoteObject.has(bufferId)) {
      this.paneInstance.reveal(bufferId);
      UI.ViewManager.ViewManager.instance().showView('linear-memory-inspector');
      return;
    }

    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      throw new Error(`Cannot find call frame for ${obj.description}.`);
    }
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(callFrame.script.sourceURL);

    if (!uiSourceCode) {
      throw new Error(`Cannot find source code object for source url: ${callFrame.script.sourceURL}`);
    }
    const title = uiSourceCode.displayName();

    this.bufferIdToRemoteObject.set(bufferId, buffer.object());
    const arrayBufferWrapper = new RemoteArrayBufferWrapper(buffer);

    this.paneInstance.create(bufferId, title, arrayBufferWrapper, address);
    UI.ViewManager.ViewManager.instance().showView('linear-memory-inspector');
  }

  modelRemoved(model: SDK.RuntimeModel.RuntimeModel): void {
    for (const [bufferId, remoteObject] of this.bufferIdToRemoteObject) {
      if (model === remoteObject.runtimeModel()) {
        this.bufferIdToRemoteObject.delete(bufferId);
        this.paneInstance.close(bufferId);
      }
    }
  }

  private onDebuggerPause(event: Common.EventTarget.EventTargetEvent): void {
    const debuggerModel = event.data as SDK.DebuggerModel.DebuggerModel;
    for (const [bufferId, remoteObject] of this.bufferIdToRemoteObject) {
      if (debuggerModel.runtimeModel() === remoteObject.runtimeModel()) {
        this.paneInstance.refreshView(bufferId);
      }
    }
  }

  private onGlobalObjectClear(event: Common.EventTarget.EventTargetEvent): void {
    const debuggerModel = event.data as SDK.DebuggerModel.DebuggerModel;
    this.modelRemoved(debuggerModel.runtimeModel());
  }

  private viewClosed(event: Common.EventTarget.EventTargetEvent): void {
    const bufferId = event.data;
    const remoteObj = this.bufferIdToRemoteObject.get(bufferId);
    if (remoteObj) {
      remoteObj.release();
    }
    this.bufferIdToRemoteObject.delete(event.data);
  }
}
