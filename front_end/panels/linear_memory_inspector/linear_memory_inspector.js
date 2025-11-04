var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/linear_memory_inspector/LinearMemoryInspectorController.js
var LinearMemoryInspectorController_exports = {};
__export(LinearMemoryInspectorController_exports, {
  LinearMemoryInspectorController: () => LinearMemoryInspectorController,
  RemoteArrayBufferWrapper: () => RemoteArrayBufferWrapper
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as LinearMemoryInspectorComponents2 from "./components/components.js";

// gen/front_end/panels/linear_memory_inspector/LinearMemoryInspectorPane.js
var LinearMemoryInspectorPane_exports = {};
__export(LinearMemoryInspectorPane_exports, {
  LinearMemoryInspectorPane: () => LinearMemoryInspectorPane,
  LinearMemoryInspectorView: () => LinearMemoryInspectorView
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as LinearMemoryInspectorComponents from "./components/components.js";
var UIStrings = {
  /**
   * @description Label in the Linear Memory inspector tool that serves as a placeholder if no inspections are open (i.e. nothing to see here).
   *             Inspection hereby refers to viewing, navigating and understanding the memory through this tool.
   */
  noOpenInspections: "No open inspections",
  /**
   * @description Label in the Linear Memory inspector tool that serves as a placeholder if no inspections are open (i.e. nothing to see here).
   *             Inspection hereby refers to viewing, navigating and understanding the memory through this tool.
   */
  memoryInspectorExplanation: "On this page you can inspect binary data.",
  /**
   * @description Label in the Linear Memory inspector tool for a link.
   */
  learnMore: "Learn more"
};
var str_ = i18n.i18n.registerUIStrings("panels/linear_memory_inspector/LinearMemoryInspectorPane.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var inspectorInstance;
var MEMORY_INSPECTOR_EXPLANATION_URL = "https://developer.chrome.com/docs/devtools/memory-inspector";
var LinearMemoryInspectorPane = class _LinearMemoryInspectorPane extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
  #tabbedPane;
  constructor() {
    super({ jslog: `${VisualLogging.panel("linear-memory-inspector").track({ resize: true })}` });
    this.#tabbedPane = new UI.TabbedPane.TabbedPane();
    this.#tabbedPane.setPlaceholderElement(this.createPlaceholder());
    this.#tabbedPane.setCloseableTabs(true);
    this.#tabbedPane.setAllowTabReorder(true, true);
    this.#tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.#tabClosed, this);
    this.#tabbedPane.show(this.contentElement);
    this.#tabbedPane.headerElement().setAttribute("jslog", `${VisualLogging.toolbar().track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
  }
  createPlaceholder() {
    const placeholder = document.createElement("div");
    placeholder.classList.add("empty-state");
    placeholder.createChild("span", "empty-state-header").textContent = i18nString(UIStrings.noOpenInspections);
    const description = placeholder.createChild("div", "empty-state-description");
    description.createChild("span").textContent = i18nString(UIStrings.memoryInspectorExplanation);
    const link = UI.XLink.XLink.create(MEMORY_INSPECTOR_EXPLANATION_URL, i18nString(UIStrings.learnMore), void 0, void 0, "learn-more");
    description.appendChild(link);
    return placeholder;
  }
  static instance() {
    if (!inspectorInstance) {
      inspectorInstance = new _LinearMemoryInspectorPane();
    }
    return inspectorInstance;
  }
  #tabView(tabId) {
    const view = this.#tabbedPane.tabView(tabId);
    if (view === null) {
      throw new Error(`No linear memory inspector view for the given tab id: ${tabId}`);
    }
    return view;
  }
  create(tabId, title, arrayWrapper, address) {
    const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address, tabId);
    this.#tabbedPane.appendTab(tabId, title, inspectorView, void 0, false, true);
    this.#tabbedPane.selectTab(tabId);
  }
  close(tabId) {
    this.#tabbedPane.closeTab(tabId, false);
  }
  reveal(tabId, address) {
    const view = this.#tabView(tabId);
    if (address !== void 0) {
      view.updateAddress(address);
    }
    this.refreshView(tabId);
    this.#tabbedPane.selectTab(tabId);
  }
  refreshView(tabId) {
    const view = this.#tabView(tabId);
    view.refreshData();
  }
  #tabClosed(event) {
    const { tabId } = event.data;
    this.dispatchEventToListeners("ViewClosed", tabId);
  }
};
var LinearMemoryInspectorView = class extends UI.Widget.VBox {
  #memoryWrapper;
  #memory;
  #offset = 0;
  #address;
  #tabId;
  #inspector;
  firstTimeOpen;
  #hideValueInspector;
  constructor(memoryWrapper, address = 0, tabId, hideValueInspector) {
    super();
    if (address < 0 || address >= memoryWrapper.length()) {
      throw new Error("Requested address is out of bounds.");
    }
    this.#memoryWrapper = memoryWrapper;
    this.#address = address;
    this.#tabId = tabId;
    this.#hideValueInspector = Boolean(hideValueInspector);
    this.firstTimeOpen = true;
    this.#inspector = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();
    this.#inspector.addEventListener("MemoryRequest", this.#memoryRequested, this);
    this.#inspector.addEventListener("AddressChanged", (event) => this.updateAddress(event.data));
    this.#inspector.addEventListener("SettingsChanged", (event) => this.saveSettings(event.data));
    this.#inspector.addEventListener("DeleteMemoryHighlight", (event) => {
      LinearMemoryInspectorController.instance().removeHighlight(this.#tabId, event.data);
      this.refreshData();
    });
    this.#inspector.show(this.contentElement);
  }
  render() {
    if (this.firstTimeOpen) {
      const settings = LinearMemoryInspectorController.instance().loadSettings();
      this.#inspector.valueTypes = settings.valueTypes;
      this.#inspector.valueTypeModes = settings.modes;
      this.#inspector.endianness = settings.endianness;
      this.firstTimeOpen = false;
    }
    if (!this.#memory) {
      return;
    }
    this.#inspector.memory = this.#memory;
    this.#inspector.memoryOffset = this.#offset;
    this.#inspector.address = this.#address;
    this.#inspector.outerMemoryLength = this.#memoryWrapper.length();
    this.#inspector.highlightInfo = this.#getHighlightInfo();
    this.#inspector.hideValueInspector = this.#hideValueInspector;
  }
  wasShown() {
    super.wasShown();
    this.refreshData();
  }
  saveSettings(settings) {
    LinearMemoryInspectorController.instance().saveSettings(settings);
  }
  updateAddress(address) {
    if (address < 0 || address >= this.#memoryWrapper.length()) {
      throw new Error("Requested address is out of bounds.");
    }
    this.#address = address;
  }
  refreshData() {
    void LinearMemoryInspectorController.getMemoryForAddress(this.#memoryWrapper, this.#address).then(({ memory, offset }) => {
      this.#memory = memory;
      this.#offset = offset;
      this.render();
    });
  }
  #memoryRequested(event) {
    const { start, end, address } = event.data;
    if (address < start || address >= end) {
      throw new Error("Requested address is out of bounds.");
    }
    void LinearMemoryInspectorController.getMemoryRange(this.#memoryWrapper, start, end).then((memory) => {
      this.#memory = memory;
      this.#offset = start;
      this.render();
    });
  }
  #getHighlightInfo() {
    const highlightInfo = LinearMemoryInspectorController.instance().getHighlightInfo(this.#tabId);
    if (highlightInfo !== void 0) {
      if (highlightInfo.startAddress < 0 || highlightInfo.startAddress >= this.#memoryWrapper.length()) {
        throw new Error("HighlightInfo start address is out of bounds.");
      }
      if (highlightInfo.size <= 0) {
        throw new Error("Highlight size must be a positive number.");
      }
    }
    return highlightInfo;
  }
};

// gen/front_end/panels/linear_memory_inspector/LinearMemoryInspectorController.js
var UIStrings2 = {
  /**
   * @description Error message that shows up in the console if a buffer to be opened in the linear memory inspector cannot be found.
   */
  couldNotOpenLinearMemory: "Could not open linear memory inspector: failed locating buffer.",
  /**
   * @description A context menu item in the Scope View of the Sources Panel
   */
  openInMemoryInspectorPanel: "Open in Memory inspector panel"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/linear_memory_inspector/LinearMemoryInspectorController.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP = "linear-memory-inspector";
var MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1e3;
var controllerInstance;
var RemoteArrayBufferWrapper = class {
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
};
async function getBufferFromObject(obj) {
  const response = await obj.runtimeModel().agent.invoke_callFunctionOn({
    objectId: obj.objectId,
    functionDeclaration: "function() { return this instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && this instanceof SharedArrayBuffer) ? this : this.buffer; }",
    silent: true,
    // Set object group in order to bind the object lifetime to the linear memory inspector.
    objectGroup: LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP
  });
  const error = response.getError();
  if (error) {
    throw new Error(`Remote object representing ArrayBuffer could not be retrieved: ${error}`);
  }
  obj = obj.runtimeModel().createRemoteObject(response.result);
  return new SDK.RemoteObject.RemoteArrayBuffer(obj);
}
var LinearMemoryInspectorController = class _LinearMemoryInspectorController extends SDK.TargetManager.SDKModelObserver {
  #paneInstance = LinearMemoryInspectorPane.instance();
  #bufferIdToRemoteObject = /* @__PURE__ */ new Map();
  #bufferIdToHighlightInfo = /* @__PURE__ */ new Map();
  #settings;
  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this.#onGlobalObjectClear, this);
    this.#paneInstance.addEventListener("ViewClosed", this.#viewClosed.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#onDebuggerPause, this);
    const defaultValueTypeModes = LinearMemoryInspectorComponents2.ValueInterpreterDisplayUtils.getDefaultValueTypeMapping();
    const defaultSettings = {
      valueTypes: Array.from(defaultValueTypeModes.keys()),
      valueTypeModes: Array.from(defaultValueTypeModes),
      endianness: "Little Endian"
    };
    this.#settings = Common2.Settings.Settings.instance().createSetting("lmi-interpreter-settings", defaultSettings);
  }
  static instance() {
    if (controllerInstance) {
      return controllerInstance;
    }
    controllerInstance = new _LinearMemoryInspectorController();
    return controllerInstance;
  }
  static async getMemoryForAddress(memoryWrapper, address) {
    const memoryChunkStart = Math.max(0, address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    const memory = await memoryWrapper.getRange(memoryChunkStart, memoryChunkEnd);
    return { memory, offset: memoryChunkStart };
  }
  static async getMemoryRange(memoryWrapper, start, end) {
    if (start < 0 || start > end || start >= memoryWrapper.length()) {
      throw new Error("Requested range is out of bounds.");
    }
    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    return await memoryWrapper.getRange(start, chunkEnd);
  }
  async evaluateExpression(callFrame, expressionName) {
    const result = await callFrame.evaluate({ expression: expressionName });
    if ("error" in result) {
      console.error(`Tried to evaluate the expression '${expressionName}' but got an error: ${result.error}`);
      return void 0;
    }
    if ("exceptionDetails" in result && result?.exceptionDetails?.text) {
      console.error(`Tried to evaluate the expression '${expressionName}' but got an exception: ${result.exceptionDetails.text}`);
      return void 0;
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
      endianness: settings.endianness
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
      return void 0;
    }
    const valueNode = obj;
    const address = obj.linearMemoryAddress;
    if (address === void 0) {
      return void 0;
    }
    const callFrame = valueNode.callFrame;
    const response = await obj.debuggerModel().agent.invoke_evaluateOnCallFrame({
      callFrameId: callFrame.id,
      expression: "memories[0]"
    });
    const error = response.getError();
    if (error) {
      console.error(error);
      Common2.Console.Console.instance().error(i18nString2(UIStrings2.couldNotOpenLinearMemory));
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
      return "";
    }
    const lastChar = objType.charAt(objType.length - 1);
    const secondToLastChar = objType.charAt(objType.length - 2);
    const isPointerType = lastChar === "*" || lastChar === "&";
    const isOneLevelPointer = secondToLastChar === " ";
    if (!isPointerType) {
      return objType;
    }
    if (isOneLevelPointer) {
      return objType.slice(0, objType.length - 2);
    }
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
    const isPointerType = lastChar === "*";
    if (isPointerType) {
      return "*" + expression;
    }
    return expression;
  }
  async reveal({ object, expression }, omitFocus) {
    const response = await _LinearMemoryInspectorController.retrieveDWARFMemoryObjectAndAddress(object);
    let memoryObject = object;
    let memoryAddress = void 0;
    if (response !== void 0) {
      memoryAddress = response.address;
      memoryObject = response.obj;
    }
    const buffer = await getBufferFromObject(memoryObject);
    const { internalProperties } = await buffer.object().getOwnProperties(false);
    const idProperty = internalProperties?.find(({ name }) => name === "[[ArrayBufferData]]");
    const id = idProperty?.value?.value;
    if (!id) {
      throw new Error("Unable to find backing store id for array buffer");
    }
    const memoryProperty = internalProperties?.find(({ name }) => name === "[[WebAssemblyMemory]]");
    const memory = memoryProperty?.value;
    const highlightInfo = _LinearMemoryInspectorController.extractHighlightInfo(object, expression);
    if (highlightInfo) {
      this.setHighlightInfo(id, highlightInfo);
    } else {
      this.#resetHighlightInfo(id);
    }
    if (this.#bufferIdToRemoteObject.has(id)) {
      this.#paneInstance.reveal(id, memoryAddress);
      void UI2.ViewManager.ViewManager.instance().showView("linear-memory-inspector", omitFocus);
      return;
    }
    const title = String(memory ? memory.description : buffer.object().description);
    this.#bufferIdToRemoteObject.set(id, buffer.object());
    const arrayBufferWrapper = new RemoteArrayBufferWrapper(buffer);
    this.#paneInstance.create(id, title, arrayBufferWrapper, memoryAddress);
    void UI2.ViewManager.ViewManager.instance().showView("linear-memory-inspector", omitFocus);
  }
  appendApplicableItems(_event, contextMenu, target) {
    if (target.property.value?.isLinearMemoryInspectable()) {
      const expression = target.path();
      const object = target.property.value;
      contextMenu.debugSection().appendItem(i18nString2(UIStrings2.openInMemoryInspectorPanel), this.reveal.bind(this, new SDK.RemoteObject.LinearMemoryInspectable(object, expression)), { jslogContext: "reveal-in-memory-inspector" });
    }
  }
  static extractHighlightInfo(obj, expression) {
    if (!(obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject)) {
      return void 0;
    }
    const startAddress = obj.linearMemoryAddress ?? 0;
    let highlightInfo;
    try {
      highlightInfo = {
        startAddress,
        size: _LinearMemoryInspectorController.extractObjectSize(obj),
        name: expression ? _LinearMemoryInspectorController.extractObjectName(obj, expression) : expression,
        type: _LinearMemoryInspectorController.extractObjectTypeDescription(obj)
      };
    } catch {
      highlightInfo = void 0;
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
          void this.updateHighlightedMemory(bufferId, topCallFrame).then(() => this.#paneInstance.refreshView(bufferId));
        } else {
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
    const newHighlightInfo = _LinearMemoryInspectorController.extractHighlightInfo(obj, expressionName);
    if (!newHighlightInfo || !this.#pointToSameMemoryObject(newHighlightInfo, oldHighlightInfo)) {
      this.#resetHighlightInfo(bufferId);
    } else {
      this.setHighlightInfo(bufferId, newHighlightInfo);
    }
  }
  #pointToSameMemoryObject(highlightInfoA, highlightInfoB) {
    return highlightInfoA.type === highlightInfoB.type && highlightInfoA.startAddress === highlightInfoB.startAddress;
  }
};
export {
  LinearMemoryInspectorController_exports as LinearMemoryInspectorController,
  LinearMemoryInspectorPane_exports as LinearMemoryInspectorPane
};
//# sourceMappingURL=linear_memory_inspector.js.map
