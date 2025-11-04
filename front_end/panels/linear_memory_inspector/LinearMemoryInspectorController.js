// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LinearMemoryInspectorComponents from './components/components.js';
import { LinearMemoryInspectorPane } from './LinearMemoryInspectorPane.js';
const UIStrings = {
    /**
     * @description Error message that shows up in the console if a buffer to be opened in the linear memory inspector cannot be found.
     */
    couldNotOpenLinearMemory: 'Could not open linear memory inspector: failed locating buffer.',
    /**
     * @description A context menu item in the Scope View of the Sources Panel
     */
    openInMemoryInspectorPanel: 'Open in Memory inspector panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/LinearMemoryInspectorController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP = 'linear-memory-inspector';
const MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1000;
let controllerInstance;
export class RemoteArrayBufferWrapper {
    #remoteArrayBuffer;
    constructor(arrayBuffer) {
        this.#remoteArrayBuffer = arrayBuffer;
    }
    length() {
        return this.#remoteArrayBuffer.byteLength();
    }
    async getRange(start, end) {
        const newEnd = Math.min(end, this.length());
        if (start < 0 || start > newEnd) {
            console.error(`Requesting invalid range of memory: (${start}, ${end})`);
            return new Uint8Array(0);
        }
        const array = await this.#remoteArrayBuffer.bytes(start, newEnd);
        return new Uint8Array(array ?? []);
    }
}
async function getBufferFromObject(obj) {
    const response = await obj.runtimeModel().agent.invoke_callFunctionOn({
        objectId: obj.objectId,
        functionDeclaration: 'function() { return this instanceof ArrayBuffer || (typeof SharedArrayBuffer !== \'undefined\' && this instanceof SharedArrayBuffer) ? this : this.buffer; }',
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
export class LinearMemoryInspectorController extends SDK.TargetManager.SDKModelObserver {
    #paneInstance = LinearMemoryInspectorPane.instance();
    #bufferIdToRemoteObject = new Map();
    #bufferIdToHighlightInfo = new Map();
    #settings;
    constructor() {
        super();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this.#onGlobalObjectClear, this);
        this.#paneInstance.addEventListener("ViewClosed" /* LmiEvents.VIEW_CLOSED */, this.#viewClosed.bind(this));
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#onDebuggerPause, this);
        const defaultValueTypeModes = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.getDefaultValueTypeMapping();
        const defaultSettings = {
            valueTypes: Array.from(defaultValueTypeModes.keys()),
            valueTypeModes: Array.from(defaultValueTypeModes),
            endianness: "Little Endian" /* LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE */,
        };
        this.#settings = Common.Settings.Settings.instance().createSetting('lmi-interpreter-settings', defaultSettings);
    }
    static instance() {
        if (controllerInstance) {
            return controllerInstance;
        }
        controllerInstance = new LinearMemoryInspectorController();
        return controllerInstance;
    }
    static async getMemoryForAddress(memoryWrapper, address) {
        // Provide a chunk of memory that covers the address to show and some before and after
        // as 1. the address shown is not necessarily at the beginning of a page and
        // 2. to allow for fewer memory requests.
        const memoryChunkStart = Math.max(0, address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
        const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
        const memory = await memoryWrapper.getRange(memoryChunkStart, memoryChunkEnd);
        return { memory, offset: memoryChunkStart };
    }
    static async getMemoryRange(memoryWrapper, start, end) {
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
    async evaluateExpression(callFrame, expressionName) {
        const result = await callFrame.evaluate({ expression: expressionName });
        if ('error' in result) {
            console.error(`Tried to evaluate the expression '${expressionName}' but got an error: ${result.error}`);
            return undefined;
        }
        if ('exceptionDetails' in result && result?.exceptionDetails?.text) {
            console.error(`Tried to evaluate the expression '${expressionName}' but got an exception: ${result.exceptionDetails.text}`);
            return undefined;
        }
        return result.object;
    }
    saveSettings(data) {
        const valueTypes = Array.from(data.valueTypes);
        const modes = [...data.modes];
        this.#settings.set({ valueTypes, valueTypeModes: modes, endianness: data.endianness });
    }
    loadSettings() {
        const settings = this.#settings.get();
        return {
            valueTypes: new Set(settings.valueTypes),
            modes: new Map(settings.valueTypeModes),
            endianness: settings.endianness,
        };
    }
    getHighlightInfo(bufferId) {
        return this.#bufferIdToHighlightInfo.get(bufferId);
    }
    removeHighlight(bufferId, highlightInfo) {
        const currentHighlight = this.getHighlightInfo(bufferId);
        if (currentHighlight === highlightInfo) {
            this.#bufferIdToHighlightInfo.delete(bufferId);
        }
    }
    setHighlightInfo(bufferId, highlightInfo) {
        this.#bufferIdToHighlightInfo.set(bufferId, highlightInfo);
    }
    #resetHighlightInfo(bufferId) {
        this.#bufferIdToHighlightInfo.delete(bufferId);
    }
    static async retrieveDWARFMemoryObjectAndAddress(obj) {
        if (!(obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject)) {
            return undefined;
        }
        const valueNode = obj;
        const address = obj.linearMemoryAddress;
        if (address === undefined) {
            return undefined;
        }
        const callFrame = valueNode.callFrame;
        const response = await obj.debuggerModel().agent.invoke_evaluateOnCallFrame({
            callFrameId: callFrame.id,
            expression: 'memories[0]',
        });
        const error = response.getError();
        if (error) {
            console.error(error);
            Common.Console.Console.instance().error(i18nString(UIStrings.couldNotOpenLinearMemory));
        }
        const runtimeModel = obj.debuggerModel().runtimeModel();
        return { obj: runtimeModel.createRemoteObject(response.result), address };
    }
    // This function returns the size of the source language value represented by the ValueNode or ExtensionRemoteObject.
    // If the value is a pointer, the function returns the size of the pointed-to value. If the pointed-to value is also a
    // pointer, it returns the size of the pointer (usually 4 bytes). This is the convention taken by the DWARF extension.
    // > double x = 42.0;
    // > double *ptr = &x;
    // > double **dblptr = &ptr;
    //
    // retrieveObjectSize(ptr_ValueNode) -> 8, the size of a double
    // retrieveObjectSize(dblptr_ValueNode) -> 4, the size of a pointer
    static extractObjectSize(obj) {
        return obj.linearMemorySize ?? 0;
    }
    // The object type description corresponds to the type of the highlighted memory
    // that the user sees in the memory inspector. For pointers, we highlight the pointed to object.
    //
    // Example: The variable `x` has the type `int *`. Assume that `x` points to the value 3.
    // -> The memory inspector will jump to the address where 3 is stored.
    // -> The memory inspector will highlight the bytes that represent the 3.
    // -> The object type description of what we show will thus be `int` and not `int *`.
    static extractObjectTypeDescription(obj) {
        const objType = obj.description;
        if (!objType) {
            return '';
        }
        const lastChar = objType.charAt(objType.length - 1);
        const secondToLastChar = objType.charAt(objType.length - 2);
        const isPointerType = lastChar === '*' || lastChar === '&';
        const isOneLevelPointer = secondToLastChar === ' ';
        if (!isPointerType) {
            return objType;
        }
        if (isOneLevelPointer) {
            // For example, 'int *'and 'int &' become 'int'.
            return objType.slice(0, objType.length - 2);
        }
        // For example, 'int **' becomes 'int *'.
        return objType.slice(0, objType.length - 1);
    }
    // When inspecting a pointer variable, we indicate that we display the pointed-to object in the viewer
    // by prepending an asterisk to the pointer expression's name (mimicking C++ dereferencing).
    // If the object isn't a pointer, we return the expression unchanged.
    //
    // Examples:
    // (int *) myNumber -> (int) *myNumber
    // (int[]) numbers -> (int[]) numbers
    static extractObjectName(obj, expression) {
        const lastChar = obj.description?.charAt(obj.description.length - 1);
        const isPointerType = lastChar === '*';
        if (isPointerType) {
            return '*' + expression;
        }
        return expression;
    }
    async reveal({ object, expression }, omitFocus) {
        const response = await LinearMemoryInspectorController.retrieveDWARFMemoryObjectAndAddress(object);
        let memoryObject = object;
        let memoryAddress = undefined;
        if (response !== undefined) {
            memoryAddress = response.address;
            memoryObject = response.obj;
        }
        const buffer = await getBufferFromObject(memoryObject);
        const { internalProperties } = await buffer.object().getOwnProperties(false);
        const idProperty = internalProperties?.find(({ name }) => name === '[[ArrayBufferData]]');
        const id = idProperty?.value?.value;
        if (!id) {
            throw new Error('Unable to find backing store id for array buffer');
        }
        const memoryProperty = internalProperties?.find(({ name }) => name === '[[WebAssemblyMemory]]');
        const memory = memoryProperty?.value;
        const highlightInfo = LinearMemoryInspectorController.extractHighlightInfo(object, expression);
        if (highlightInfo) {
            this.setHighlightInfo(id, highlightInfo);
        }
        else {
            this.#resetHighlightInfo(id);
        }
        if (this.#bufferIdToRemoteObject.has(id)) {
            this.#paneInstance.reveal(id, memoryAddress);
            void UI.ViewManager.ViewManager.instance().showView('linear-memory-inspector', omitFocus);
            return;
        }
        const title = String(memory ? memory.description : buffer.object().description);
        this.#bufferIdToRemoteObject.set(id, buffer.object());
        const arrayBufferWrapper = new RemoteArrayBufferWrapper(buffer);
        this.#paneInstance.create(id, title, arrayBufferWrapper, memoryAddress);
        void UI.ViewManager.ViewManager.instance().showView('linear-memory-inspector', omitFocus);
    }
    appendApplicableItems(_event, contextMenu, target) {
        if (target.property.value?.isLinearMemoryInspectable()) {
            const expression = target.path();
            const object = target.property.value;
            contextMenu.debugSection().appendItem(i18nString(UIStrings.openInMemoryInspectorPanel), this.reveal.bind(this, new SDK.RemoteObject.LinearMemoryInspectable(object, expression)), { jslogContext: 'reveal-in-memory-inspector' });
        }
    }
    static extractHighlightInfo(obj, expression) {
        if (!(obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject)) {
            return undefined;
        }
        const startAddress = obj.linearMemoryAddress ?? 0;
        let highlightInfo;
        try {
            highlightInfo = {
                startAddress,
                size: LinearMemoryInspectorController.extractObjectSize(obj),
                name: expression ? LinearMemoryInspectorController.extractObjectName(obj, expression) : expression,
                type: LinearMemoryInspectorController.extractObjectTypeDescription(obj),
            };
        }
        catch {
            highlightInfo = undefined;
        }
        return highlightInfo;
    }
    modelRemoved(model) {
        for (const [bufferId, remoteObject] of this.#bufferIdToRemoteObject) {
            if (model === remoteObject.runtimeModel()) {
                this.#bufferIdToRemoteObject.delete(bufferId);
                this.#resetHighlightInfo(bufferId);
                this.#paneInstance.close(bufferId);
            }
        }
    }
    #onDebuggerPause(event) {
        const debuggerModel = event.data;
        for (const [bufferId, remoteObject] of this.#bufferIdToRemoteObject) {
            if (debuggerModel.runtimeModel() === remoteObject.runtimeModel()) {
                const topCallFrame = debuggerModel.debuggerPausedDetails()?.callFrames[0];
                if (topCallFrame) {
                    void this
                        .updateHighlightedMemory(bufferId, topCallFrame)
                        // Need to call refreshView in the callback to trigger re-render.
                        .then(() => this.#paneInstance.refreshView(bufferId));
                }
                else {
                    this.#resetHighlightInfo(bufferId);
                    this.#paneInstance.refreshView(bufferId);
                }
            }
        }
    }
    #onGlobalObjectClear(event) {
        this.modelRemoved(event.data.runtimeModel());
    }
    #viewClosed({ data: bufferId }) {
        const remoteObj = this.#bufferIdToRemoteObject.get(bufferId);
        if (remoteObj) {
            remoteObj.release();
        }
        this.#bufferIdToRemoteObject.delete(bufferId);
        this.#resetHighlightInfo(bufferId);
    }
    async updateHighlightedMemory(bufferId, callFrame) {
        const oldHighlightInfo = this.getHighlightInfo(bufferId);
        const expressionName = oldHighlightInfo?.name;
        if (!oldHighlightInfo || !expressionName) {
            this.#resetHighlightInfo(bufferId);
            return;
        }
        const obj = await this.evaluateExpression(callFrame, expressionName);
        if (!obj) {
            this.#resetHighlightInfo(bufferId);
            return;
        }
        const newHighlightInfo = LinearMemoryInspectorController.extractHighlightInfo(obj, expressionName);
        if (!newHighlightInfo || !this.#pointToSameMemoryObject(newHighlightInfo, oldHighlightInfo)) {
            this.#resetHighlightInfo(bufferId);
        }
        else {
            this.setHighlightInfo(bufferId, newHighlightInfo);
        }
    }
    #pointToSameMemoryObject(highlightInfoA, highlightInfoB) {
        return highlightInfoA.type === highlightInfoB.type && highlightInfoA.startAddress === highlightInfoB.startAddress;
    }
}
//# sourceMappingURL=LinearMemoryInspectorController.js.map