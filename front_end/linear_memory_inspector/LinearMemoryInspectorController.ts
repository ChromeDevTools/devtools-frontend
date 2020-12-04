// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {LazyUint8Array, LinearMemoryInspectorPaneImpl} from './LinearMemoryInspectorPane.js';

const LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP = 'linear-memory-inspector';

let controllerInstance: LinearMemoryInspectorController;

export class RemoteArrayWrapper implements LazyUint8Array {
  private remoteArray: SDK.RemoteObject.RemoteArray;

  constructor(array: SDK.RemoteObject.RemoteArray) {
    this.remoteArray = array;
  }

  length() {
    return this.remoteArray.length();
  }

  async getRange(start: number, end: number) {
    const newEnd = Math.min(end, this.remoteArray.length());
    if (start < 0 || start > newEnd) {
      console.error(`Requesting invalid range of memory: (${start}, ${end})`);
      return Promise.resolve(new Uint8Array(0));
    }
    const array = await this.extractByteArray(start, newEnd);
    return new Uint8Array(array);
  }

  private async extractByteArray(start: number, end: number) {
    const promises = [];
    for (let i = start; i < end; ++i) {
      // TODO(kimanh): encode requested range in base64 string.
      promises.push(this.remoteArray.at(i).then(x => x.value));
    }
    return await Promise.all(promises);
  }
}

export class LinearMemoryInspectorController extends SDK.SDKModel.SDKModelObserver<SDK.RuntimeModel.RuntimeModel> {
  private paneInstance = LinearMemoryInspectorPaneImpl.instance();
  private scriptIdToRemoteObject: Map<string, SDK.RemoteObject.RemoteObject> = new Map();

  private constructor() {
    super();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    this.paneInstance.addEventListener('view-closed', this.viewClosed.bind(this));
  }

  static instance() {
    if (controllerInstance) {
      return controllerInstance;
    }
    controllerInstance = new LinearMemoryInspectorController();
    return controllerInstance;
  }

  async openInspectorView(obj: SDK.RemoteObject.RemoteObject, address: number) {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      throw new Error(`Cannot find call frame for ${obj.description}.`);
    }
    const scriptId = callFrame.script.scriptId;
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(callFrame.script.sourceURL);

    if (!uiSourceCode) {
      throw new Error(`Cannot find source code object for source url: ${callFrame.script.sourceURL}`);
    }
    const title = uiSourceCode.displayName();

    // TODO(kimanh): scriptIds are not unique, find a different way to uniquely identify this object
    if (this.scriptIdToRemoteObject.has(scriptId)) {
      this.paneInstance.reveal(scriptId);
      // TODO(kimanh): refresh view to get the latest updates.
      return;
    }
    const objBoundToLMI = await this.getObjectWithExtendedLifetime(obj);
    this.scriptIdToRemoteObject.set(scriptId, objBoundToLMI);
    const remoteArray = new SDK.RemoteObject.RemoteArray(objBoundToLMI);
    const arrayWrapper = new RemoteArrayWrapper(remoteArray);

    this.paneInstance.create(scriptId, title, arrayWrapper, address);
    UI.ViewManager.ViewManager.instance().showView('linear-memory-inspector');
  }

  modelRemoved(model: SDK.RuntimeModel.RuntimeModel) {
    for (const [scriptId, remoteObject] of this.scriptIdToRemoteObject) {
      if (model === remoteObject.runtimeModel()) {
        this.scriptIdToRemoteObject.delete(scriptId);
        this.paneInstance.close(scriptId);
      }
    }
  }

  private globalObjectCleared(event: Common.EventTarget.EventTargetEvent) {
    const debuggerModel = event.data as SDK.DebuggerModel.DebuggerModel;
    this.modelRemoved(debuggerModel._runtimeModel);
  }

  private async getObjectWithExtendedLifetime(obj: SDK.RemoteObject.RemoteObject) {
    const response = await obj.runtimeModel()._agent.invoke_callFunctionOn({
      objectId: obj.objectId,
      functionDeclaration: 'function() { return this; }',
      silent: true,
      objectGroup: LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP,
    });
    const error = response.getError();
    if (error) {
      throw new Error(`Remote object representing Uint8Array could not be retrieved: ${error}`);
    }
    return obj.runtimeModel().createRemoteObject(response.result);
  }

  private viewClosed(event: Common.EventTarget.EventTargetEvent) {
    const scriptId = event.data;
    const remoteObj = this.scriptIdToRemoteObject.get(scriptId);
    if (remoteObj) {
      remoteObj.release();
    }
    this.scriptIdToRemoteObject.delete(event.data);
  }
}
