var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/protocol_monitor/JSONEditor.js
var JSONEditor_exports = {};
__export(JSONEditor_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  JSONEditor: () => JSONEditor,
  suggestionFilter: () => suggestionFilter
});
import "./../../ui/kit/kit.js";
import "./../../ui/components/menus/menus.js";
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as SuggestionInput from "./../../ui/components/suggestion_input/suggestion_input.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as ElementsComponents from "./../elements/components/components.js";

// gen/front_end/panels/protocol_monitor/JSONEditor.css.js
var JSONEditor_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  font-size: inherit;
}

:host {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.target-selector {
  max-width: var(--sys-size-21);
}

.warning-icon {
  margin-left: -18px;
  margin-right: 4px;
}

.row {
  flex-wrap: wrap;
}

.row,
.row-icons {
  display: flex;
  flex-direction: row;
  color: var(--sys-color-token-property-special);
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
  align-items: center;
  line-height: 18px;
  margin-top: 3px;
}

.separator {
  margin-right: 0.5em;
  color: var(--sys-color-on-surface);
}

ul {
  padding-left: 2em;
}

.optional-parameter {
  color: var(--sys-color-token-attribute-value);

  --override-color-recorder-input: var(--sys-color-on-surface);
}

.undefined-parameter {
  color: var(--sys-color-state-disabled);
}

.wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-wrapper {
  padding-left: 1em;
  overflow-x: hidden;
  flex-grow: 1;
  padding-bottom: 50px;
  padding-top: 0.5em;
}

.clear-button,
.add-button,
.delete-button {
  opacity: 0%;
  transition: opacity 0.3s ease-in-out;
}

.clear-button,
.delete-button {
  margin-left: 5px;
}

.row:focus-within .delete-button,
.row:focus-within .add-button,
.row:focus-within .clear-button,
.row:hover .delete-button,
.row:hover .add-button,
.row:hover .clear-button {
  opacity: 100%;
}

.protocol-monitor-sidebar-toolbar {
  border-top: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./JSONEditor.css")} */`;

// gen/front_end/panels/protocol_monitor/JSONEditor.js
var { html, render, Directives, nothing } = Lit;
var { live, classMap, repeat } = Directives;
var UIStrings = {
  /**
   * @description The title of a button that deletes a parameter.
   */
  deleteParameter: "Delete parameter",
  /**
   * @description The title of a button that adds a parameter.
   */
  addParameter: "Add a parameter",
  /**
   * @description The title of a button that reset the value of a parameters to its default value.
   */
  resetDefaultValue: "Reset to default value",
  /**
   * @description The title of a button to add custom key/value pairs to object parameters with no keys defined
   */
  addCustomProperty: "Add custom property",
  /**
   * @description The title of a button that sends a CDP command.
   */
  sendCommandCtrlEnter: "Send command - Ctrl+Enter",
  /**
   * @description The title of a button that sends a CDP command.
   */
  sendCommandCmdEnter: "Send command - \u2318+Enter",
  /**
   * @description The title of a button that copies a CDP command.
   */
  copyCommand: "Copy command",
  /**
   * @description A label for a select input that allows selecting a CDP target to send the commands to.
   */
  selectTarget: "Select a target"
};
var str_ = i18n.i18n.registerUIStrings("panels/protocol_monitor/JSONEditor.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var splitDescription = (description) => {
  if (description.length > 150) {
    const [firstSentence, restOfDescription] = description.split(".");
    firstSentence + ".";
    return [firstSentence, restOfDescription];
  }
  return [description, ""];
};
var defaultValueByType = /* @__PURE__ */ new Map([
  ["string", ""],
  ["number", 0],
  ["boolean", false]
]);
var DUMMY_DATA = "dummy";
var EMPTY_STRING = "<empty_string>";
function suggestionFilter(option, query) {
  return option.toLowerCase().includes(query.toLowerCase());
}
var JSONEditor = class extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
  #metadataByCommand = /* @__PURE__ */ new Map();
  #typesByName = /* @__PURE__ */ new Map();
  #enumsByName = /* @__PURE__ */ new Map();
  #parameters = [];
  #targets = [];
  #command = "";
  #targetId;
  #hintPopoverHelper;
  #view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.registerRequiredCSS(JSONEditor_css_default);
  }
  get metadataByCommand() {
    return this.#metadataByCommand;
  }
  set metadataByCommand(metadataByCommand2) {
    this.#metadataByCommand = metadataByCommand2;
    this.requestUpdate();
  }
  get typesByName() {
    return this.#typesByName;
  }
  set typesByName(typesByName2) {
    this.#typesByName = typesByName2;
    this.requestUpdate();
  }
  get enumsByName() {
    return this.#enumsByName;
  }
  set enumsByName(enumsByName2) {
    this.#enumsByName = enumsByName2;
    this.requestUpdate();
  }
  get parameters() {
    return this.#parameters;
  }
  set parameters(parameters) {
    this.#parameters = parameters;
    this.requestUpdate();
  }
  get targets() {
    return this.#targets;
  }
  set targets(targets) {
    this.#targets = targets;
    this.requestUpdate();
  }
  get command() {
    return this.#command;
  }
  set command(command) {
    if (this.#command !== command) {
      this.#command = command;
      this.requestUpdate();
    }
  }
  get targetId() {
    return this.#targetId;
  }
  set targetId(targetId) {
    if (this.#targetId !== targetId) {
      this.#targetId = targetId;
      this.requestUpdate();
    }
  }
  wasShown() {
    super.wasShown();
    this.#hintPopoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, (event) => this.#handlePopoverDescriptions(event), "protocol-monitor.hint");
    this.#hintPopoverHelper.setDisableOnClick(true);
    this.#hintPopoverHelper.setTimeout(300);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.addEventListener("AvailableTargetsChanged", this.#handleAvailableTargetsChanged, this);
    this.#handleAvailableTargetsChanged();
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#hintPopoverHelper?.hidePopover();
    this.#hintPopoverHelper?.dispose();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.removeEventListener("AvailableTargetsChanged", this.#handleAvailableTargetsChanged, this);
  }
  #handleAvailableTargetsChanged() {
    this.targets = SDK.TargetManager.TargetManager.instance().targets();
    if (this.targets.length && this.targetId === void 0) {
      this.targetId = this.targets[0].id();
    }
  }
  getParameters() {
    const formatParameterValue = (parameter) => {
      if (parameter.value === void 0) {
        return;
      }
      switch (parameter.type) {
        case "number": {
          return Number(parameter.value);
        }
        case "boolean": {
          return Boolean(parameter.value);
        }
        case "object": {
          const nestedParameters = {};
          for (const subParameter of parameter.value) {
            const formattedValue = formatParameterValue(subParameter);
            if (formattedValue !== void 0) {
              nestedParameters[subParameter.name] = formatParameterValue(subParameter);
            }
          }
          if (Object.keys(nestedParameters).length === 0) {
            return void 0;
          }
          return nestedParameters;
        }
        case "array": {
          const nestedArrayParameters = [];
          for (const subParameter of parameter.value) {
            nestedArrayParameters.push(formatParameterValue(subParameter));
          }
          return nestedArrayParameters.length === 0 ? [] : nestedArrayParameters;
        }
        default: {
          return parameter.value;
        }
      }
    };
    const formattedParameters = {};
    for (const parameter of this.parameters) {
      formattedParameters[parameter.name] = formatParameterValue(parameter);
    }
    return formatParameterValue({
      type: "object",
      name: DUMMY_DATA,
      optional: true,
      value: this.parameters,
      description: ""
    });
  }
  // Displays a command entered in the input bar inside the editor
  displayCommand(command, parameters, targetId) {
    this.targetId = targetId;
    this.command = command;
    const schema = this.metadataByCommand.get(this.command);
    if (!schema?.parameters) {
      return;
    }
    this.populateParametersForCommandWithDefaultValues();
    const displayedParameters = this.#convertObjectToParameterSchema("", parameters, {
      typeRef: DUMMY_DATA,
      type: "object",
      name: "",
      description: "",
      optional: true,
      value: []
    }, schema.parameters).value;
    const valueByName = new Map(this.parameters.map((param) => [param.name, param]));
    for (const param of displayedParameters) {
      const existingParam = valueByName.get(param.name);
      if (existingParam) {
        existingParam.value = param.value;
      }
    }
    this.requestUpdate();
  }
  #convertObjectToParameterSchema(key, value, schema, initialSchema) {
    const type = schema?.type || typeof value;
    const description = schema?.description ?? "";
    const optional = schema?.optional ?? true;
    switch (type) {
      case "string":
      case "boolean":
      case "number":
        return this.#convertPrimitiveParameter(key, value, schema);
      case "object":
        return this.#convertObjectParameter(key, value, schema, initialSchema);
      case "array":
        return this.#convertArrayParameter(key, value, schema);
    }
    return {
      type,
      name: key,
      optional,
      typeRef: schema?.typeRef,
      value,
      description
    };
  }
  #convertPrimitiveParameter(key, value, schema) {
    const type = schema?.type || typeof value;
    const description = schema?.description ?? "";
    const optional = schema?.optional ?? true;
    return {
      type,
      name: key,
      optional,
      typeRef: schema?.typeRef,
      value,
      description,
      isCorrectType: schema ? this.#isValueOfCorrectType(schema, String(value)) : true
    };
  }
  #convertObjectParameter(key, value, schema, initialSchema) {
    const description = schema?.description ?? "";
    if (typeof value !== "object" || value === null) {
      throw new Error("The value is not an object");
    }
    const typeRef = schema?.typeRef;
    if (!typeRef) {
      throw new Error("Every object parameters should have a type ref");
    }
    const nestedType = typeRef === DUMMY_DATA ? initialSchema : this.typesByName.get(typeRef);
    if (!nestedType) {
      throw new Error("No nested type for keys were found");
    }
    const objectValues = [];
    for (const objectKey of Object.keys(value)) {
      const objectType = nestedType.find((param) => param.name === objectKey);
      objectValues.push(this.#convertObjectToParameterSchema(objectKey, value[objectKey], objectType));
    }
    return {
      type: "object",
      name: key,
      optional: schema.optional,
      typeRef: schema.typeRef,
      value: objectValues,
      description,
      isCorrectType: true
    };
  }
  #convertArrayParameter(key, value, schema) {
    const description = schema?.description ?? "";
    const optional = schema?.optional ?? true;
    const typeRef = schema?.typeRef;
    if (!typeRef) {
      throw new Error("Every array parameters should have a type ref");
    }
    if (!Array.isArray(value)) {
      throw new Error("The value is not an array");
    }
    const nestedType = isTypePrimitive(typeRef) ? void 0 : {
      optional: true,
      type: "object",
      value: [],
      typeRef,
      description: "",
      name: ""
    };
    const objectValues = [];
    for (let i = 0; i < value.length; i++) {
      const temp = this.#convertObjectToParameterSchema(`${i}`, value[i], nestedType);
      objectValues.push(temp);
    }
    return {
      type: "array",
      name: key,
      optional,
      typeRef: schema?.typeRef,
      value: objectValues,
      description,
      isCorrectType: true
    };
  }
  #handlePopoverDescriptions(event) {
    const hintElement = event.composedPath()[0];
    const elementData = this.#getDescriptionAndTypeForElement(hintElement);
    if (!elementData?.description) {
      return null;
    }
    const [head, tail] = splitDescription(elementData.description);
    const type = elementData.type;
    const replyArgs = elementData.replyArgs;
    let popupContent = "";
    if (replyArgs && replyArgs.length > 0) {
      popupContent = tail + `Returns: ${replyArgs}<br>`;
    } else if (type) {
      popupContent = tail + `<br>Type: ${type}<br>`;
    } else {
      popupContent = tail;
    }
    return {
      box: hintElement.boxInWindow(),
      show: async (popover) => {
        const popupElement = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView({
          getMessage: () => `<span>${head}</span>`,
          getPossibleFixMessage: () => popupContent,
          getLearnMoreLink: () => `https://chromedevtools.github.io/devtools-protocol/tot/${this.command.split(".")[0]}/`
        });
        popover.contentElement.appendChild(popupElement);
        return true;
      }
    };
  }
  #getDescriptionAndTypeForElement(hintElement) {
    if (hintElement.matches(".command")) {
      const metadata = this.metadataByCommand.get(this.command);
      if (metadata) {
        return { description: metadata.description, replyArgs: metadata.replyArgs };
      }
    }
    if (hintElement.matches(".parameter")) {
      const id = hintElement.dataset.paramid;
      if (!id) {
        return;
      }
      const pathArray = id.split(".");
      const { parameter } = this.#getChildByPath(pathArray);
      if (!parameter.description) {
        return;
      }
      return { description: parameter.description, type: parameter.type };
    }
    return;
  }
  getCommandJson() {
    return this.command !== "" ? JSON.stringify({ command: this.command, parameters: this.getParameters() }) : "";
  }
  #copyToClipboard() {
    const commandJson = this.getCommandJson();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commandJson);
  }
  #handleCommandSend() {
    this.dispatchEventToListeners("submiteditor", {
      command: this.command,
      parameters: this.getParameters(),
      targetId: this.targetId
    });
  }
  populateParametersForCommandWithDefaultValues() {
    const commandParameters = this.metadataByCommand.get(this.command)?.parameters;
    if (!commandParameters) {
      return;
    }
    this.parameters = commandParameters.map((parameter) => {
      return this.#populateParameterDefaults(parameter);
    });
  }
  #populateParameterDefaults(parameter) {
    if (parameter.type === "object") {
      let typeRef = parameter.typeRef;
      if (!typeRef) {
        typeRef = DUMMY_DATA;
      }
      const nestedTypes = this.typesByName.get(typeRef) ?? [];
      const nestedParameters = nestedTypes.map((nestedType) => {
        return this.#populateParameterDefaults(nestedType);
      });
      return {
        ...parameter,
        value: parameter.optional ? void 0 : nestedParameters,
        isCorrectType: true
      };
    }
    if (parameter.type === "array") {
      return {
        ...parameter,
        value: parameter?.optional ? void 0 : parameter.value?.map((param) => this.#populateParameterDefaults(param)) || [],
        isCorrectType: true
      };
    }
    return {
      ...parameter,
      value: parameter.optional ? void 0 : defaultValueByType.get(parameter.type),
      isCorrectType: true
    };
  }
  #getChildByPath(pathArray) {
    let parameters = this.parameters;
    let parentParameter;
    for (let i = 0; i < pathArray.length; i++) {
      const name = pathArray[i];
      const parameter = parameters.find((param) => param.name === name);
      if (i === pathArray.length - 1) {
        return { parameter, parentParameter };
      }
      if (parameter?.type === "array" || parameter?.type === "object") {
        if (parameter.value) {
          parameters = parameter.value;
        }
      } else {
        throw new Error("Parameter on the path in not an object or an array");
      }
      parentParameter = parameter;
    }
    throw new Error("Not found");
  }
  #isValueOfCorrectType(parameter, value) {
    if (parameter.type === "number" && isNaN(Number(value))) {
      return false;
    }
    const acceptedValues = this.#computeDropdownValues(parameter);
    if (acceptedValues.length !== 0 && !acceptedValues.includes(value)) {
      return false;
    }
    return true;
  }
  #saveParameterValue = (event) => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    let value;
    if (event instanceof KeyboardEvent) {
      const editableContent = event.target.renderRoot.querySelector("devtools-editable-content");
      if (!editableContent) {
        return;
      }
      value = editableContent.innerText;
    } else {
      value = event.target.value;
    }
    const paramId = event.target.getAttribute("data-paramid");
    if (!paramId) {
      return;
    }
    const pathArray = paramId.split(".");
    const object = this.#getChildByPath(pathArray).parameter;
    if (value === "") {
      object.value = defaultValueByType.get(object.type);
    } else {
      object.value = value;
      object.isCorrectType = this.#isValueOfCorrectType(object, value);
    }
    this.requestUpdate();
  };
  #saveNestedObjectParameterKey = (event) => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    const value = event.target.value;
    const paramId = event.target.getAttribute("data-paramid");
    if (!paramId) {
      return;
    }
    const pathArray = paramId.split(".");
    const { parameter } = this.#getChildByPath(pathArray);
    parameter.name = value;
    this.requestUpdate();
  };
  #handleParameterInputKeydown = (event) => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      this.#saveParameterValue(event);
    }
  };
  #handleFocusParameter(event) {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    const paramId = event.target.getAttribute("data-paramid");
    if (!paramId) {
      return;
    }
    const pathArray = paramId.split(".");
    const object = this.#getChildByPath(pathArray).parameter;
    object.isCorrectType = true;
    this.requestUpdate();
  }
  #handleCommandInputBlur = async (event) => {
    if (event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput) {
      this.command = event.target.value;
    }
    this.populateParametersForCommandWithDefaultValues();
    const target = event.target;
    await this.updateComplete;
    this.#focusNextElement(target);
  };
  /**
   * When devtools-suggestion-input closes, it blurs itself resulting in
   * the focus shifting to the overall DevTools window.
   *
   * This method focuses on the next focusable element (button or input)
   * so that the focus remains in the Editor and Ctrl + Shift works.
   */
  #focusNextElement(target) {
    const elements = this.contentElement.querySelectorAll("devtools-suggestion-input,.add-button");
    const element = [...elements].findIndex((value) => value === target.shadowRoot?.host);
    if (element >= 0 && element + 1 < elements.length) {
      elements[element + 1].focus();
    } else {
      this.contentElement.querySelector('devtools-button[jslogcontext="protocol-monitor.send-command"]')?.focus();
    }
  }
  #createNestedParameter(type, name) {
    if (type.type === "object") {
      let typeRef = type.typeRef;
      if (!typeRef) {
        typeRef = DUMMY_DATA;
      }
      const nestedTypes = this.typesByName.get(typeRef) ?? [];
      const nestedValue = nestedTypes.map((nestedType) => this.#createNestedParameter(nestedType, nestedType.name));
      return {
        type: "object",
        name,
        optional: type.optional,
        typeRef,
        value: nestedValue,
        isCorrectType: true,
        description: type.description
      };
    }
    return {
      type: type.type,
      name,
      optional: type.optional,
      isCorrectType: true,
      typeRef: type.typeRef,
      value: type.optional ? void 0 : defaultValueByType.get(type.type),
      description: type.description
    };
  }
  #handleAddParameter(parameterId) {
    const pathArray = parameterId.split(".");
    const { parameter, parentParameter } = this.#getChildByPath(pathArray);
    if (!parameter) {
      return;
    }
    switch (parameter.type) {
      case "array": {
        const typeRef = parameter.typeRef;
        if (!typeRef) {
          throw new Error("Every array parameter must have a typeRef");
        }
        const nestedType = this.typesByName.get(typeRef) ?? [];
        const nestedValue = nestedType.map((type2) => this.#createNestedParameter(type2, type2.name));
        let type = isTypePrimitive(typeRef) ? typeRef : "object";
        if (nestedType.length === 0) {
          if (this.enumsByName.get(typeRef)) {
            type = "string";
          }
        }
        if (!parameter.value) {
          parameter.value = [];
        }
        parameter.value.push({
          type,
          name: String(parameter.value.length),
          optional: true,
          typeRef,
          value: nestedValue.length !== 0 ? nestedValue : "",
          description: "",
          isCorrectType: true
        });
        break;
      }
      case "object": {
        let typeRef = parameter.typeRef;
        if (!typeRef) {
          typeRef = DUMMY_DATA;
        }
        if (!parameter.value) {
          parameter.value = [];
        }
        if (!this.typesByName.get(typeRef)) {
          parameter.value.push({
            type: "string",
            name: "",
            optional: true,
            value: "",
            isCorrectType: true,
            description: "",
            isKeyEditable: true
          });
          break;
        }
        const nestedTypes = this.typesByName.get(typeRef) ?? [];
        const nestedValue = nestedTypes.map((nestedType) => this.#createNestedParameter(nestedType, nestedType.name));
        const nestedParameters = nestedTypes.map((nestedType) => {
          return this.#populateParameterDefaults(nestedType);
        });
        if (parentParameter) {
          parameter.value.push({
            type: "object",
            name: "",
            optional: true,
            typeRef,
            value: nestedValue,
            isCorrectType: true,
            description: ""
          });
        } else {
          parameter.value = nestedParameters;
        }
        break;
      }
      default:
        parameter.value = defaultValueByType.get(parameter.type);
        break;
    }
    this.requestUpdate();
  }
  #handleClearParameter(parameter, isParentArray) {
    if (parameter?.value === void 0) {
      return;
    }
    switch (parameter.type) {
      case "object":
        if (parameter.optional && !isParentArray) {
          parameter.value = void 0;
          break;
        }
        if (!parameter.typeRef || !this.typesByName.get(parameter.typeRef)) {
          parameter.value = [];
        } else {
          parameter.value.forEach((param) => this.#handleClearParameter(param, isParentArray));
        }
        break;
      case "array":
        parameter.value = parameter.optional ? void 0 : [];
        break;
      default:
        parameter.value = parameter.optional ? void 0 : defaultValueByType.get(parameter.type);
        parameter.isCorrectType = true;
        break;
    }
    this.requestUpdate();
  }
  #handleDeleteParameter(parameter, parentParameter) {
    if (!parameter) {
      return;
    }
    if (!Array.isArray(parentParameter.value)) {
      return;
    }
    parentParameter.value.splice(parentParameter.value.findIndex((p) => p === parameter), 1);
    if (parentParameter.type === "array") {
      for (let i = 0; i < parentParameter.value.length; i++) {
        parentParameter.value[i].name = String(i);
      }
    }
    this.requestUpdate();
  }
  #onTargetSelected(event) {
    if (event.target instanceof HTMLSelectElement) {
      this.targetId = event.target.value;
    }
    this.requestUpdate();
  }
  #computeDropdownValues(parameter) {
    if (parameter.type === "string") {
      const enums = this.enumsByName.get(`${parameter.typeRef}`) ?? {};
      return Object.values(enums);
    }
    if (parameter.type === "boolean") {
      return ["true", "false"];
    }
    return [];
  }
  performUpdate() {
    const viewInput = {
      onParameterValueBlur: (event) => {
        this.#saveParameterValue(event);
      },
      onParameterKeydown: (event) => {
        this.#handleParameterInputKeydown(event);
      },
      onParameterFocus: (event) => {
        this.#handleFocusParameter(event);
      },
      onParameterKeyBlur: (event) => {
        this.#saveNestedObjectParameterKey(event);
      },
      onKeydown: (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          this.#handleParameterInputKeydown(event);
          this.#handleCommandSend();
        }
      },
      parameters: this.parameters,
      metadataByCommand: this.metadataByCommand,
      command: this.command,
      typesByName: this.typesByName,
      onCommandInputBlur: (event) => this.#handleCommandInputBlur(event),
      onCommandSend: () => this.#handleCommandSend(),
      onCopyToClipboard: () => this.#copyToClipboard(),
      targets: this.targets,
      targetId: this.targetId,
      onAddParameter: (parameterId) => {
        this.#handleAddParameter(parameterId);
      },
      onClearParameter: (parameter, isParentArray) => {
        this.#handleClearParameter(parameter, isParentArray);
      },
      onDeleteParameter: (parameter, parentParameter) => {
        this.#handleDeleteParameter(parameter, parentParameter);
      },
      onTargetSelected: (event) => {
        this.#onTargetSelected(event);
      },
      computeDropdownValues: (parameter) => {
        return this.#computeDropdownValues(parameter);
      }
    };
    const viewOutput = {};
    this.#view(viewInput, viewOutput, this.contentElement);
  }
};
function isTypePrimitive(type) {
  if (type === "string" || type === "boolean" || type === "number") {
    return true;
  }
  return false;
}
function renderTargetSelectorRow(input) {
  return html`
  <div class="row attribute padded">
    <div>target<span class="separator">:</span></div>
    <select class="target-selector"
            title=${i18nString(UIStrings.selectTarget)}
            jslog=${VisualLogging.dropDown("target-selector").track({ change: true })}
            @change=${input.onTargetSelected}>
      ${input.targets.map((target) => html`
        <option jslog=${VisualLogging.item("target").track({ click: true })}
                value=${target.id()} ?selected=${target.id() === input.targetId}>
          ${target.name()} (${target.inspectedURL()})
        </option>`)}
    </select>
  </div>
`;
}
function renderInlineButton(opts) {
  return html`
          <devtools-button
            title=${opts.title}
            .size=${"SMALL"}
            .iconName=${opts.iconName}
            .variant=${"icon"}
            class=${classMap(opts.classMap)}
            @click=${opts.onClick}
            .jslogContext=${opts.jslogContext}
          ></devtools-button>
      `;
}
function renderWarningIcon() {
  return html`<devtools-icon name='warning-filled' class='warning-icon small'>
  </devtools-icon>`;
}
function renderParameters(input, parameters, id, parentParameter, parentParameterId) {
  parameters.sort((a, b) => Number(a.optional) - Number(b.optional));
  return html`
    <ul>
      ${repeat(parameters, (parameter) => {
    const parameterId = parentParameter ? `${parentParameterId}.${parameter.name}` : parameter.name;
    const subparameters = parameter.type === "array" || parameter.type === "object" ? parameter.value ?? [] : [];
    const isPrimitive = isTypePrimitive(parameter.type);
    const isArray = parameter.type === "array";
    const isParentArray = parentParameter && parentParameter.type === "array";
    const isParentObject = parentParameter && parentParameter.type === "object";
    const isObject = parameter.type === "object";
    const isParamValueUndefined = parameter.value === void 0;
    const isParamOptional = parameter.optional;
    const hasTypeRef = isObject && parameter.typeRef && input.typesByName.get(parameter.typeRef) !== void 0;
    const hasNoKeys = parameter.isKeyEditable;
    const isCustomEditorDisplayed = isObject && !hasTypeRef;
    const hasOptions = parameter.type === "string" || parameter.type === "boolean";
    const canClearParameter = isArray && !isParamValueUndefined && parameter.value?.length !== 0 || isObject && !isParamValueUndefined;
    const parametersClasses = {
      "optional-parameter": parameter.optional,
      parameter: true,
      "undefined-parameter": parameter.value === void 0 && parameter.optional
    };
    const inputClasses = {
      "json-input": true
    };
    return html`
              <li class="row">
                <div class="row-icons">
                    ${!parameter.isCorrectType ? html`${renderWarningIcon()}` : nothing}

                    <!-- If an object parameter has no predefined keys, show an input to enter the key, otherwise show the name of the parameter -->
                    <div class=${classMap(parametersClasses)} data-paramId=${parameterId}>
                        ${hasNoKeys ? html`<devtools-suggestion-input
                            data-paramId=${parameterId}
                            .isKey=${true}
                            .isCorrectInput=${live(parameter.isCorrectType)}
                            .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                            .autocomplete=${false}
                            .value=${live(parameter.name ?? "")}
                            .placeholder=${parameter.value === "" ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                            @blur=${input.onParameterKeyBlur}
                            @focus=${input.onParameterFocus}
                            @keydown=${input.onParameterKeydown}
                          ></devtools-suggestion-input>` : html`${parameter.name}`} <span class="separator">:</span>
                    </div>

                    <!-- Render button to add values inside an array parameter -->
                    ${isArray ? html`
                      ${renderInlineButton({
      title: i18nString(UIStrings.addParameter),
      iconName: "plus",
      onClick: () => input.onAddParameter(parameterId),
      classMap: { "add-button": true },
      jslogContext: "protocol-monitor.add-parameter"
    })}
                    ` : nothing}

                    <!-- Render button to complete reset an array parameter or an object parameter-->
                    ${canClearParameter ? renderInlineButton({
      title: i18nString(UIStrings.resetDefaultValue),
      iconName: "clear",
      onClick: () => input.onClearParameter(parameter, isParentArray),
      classMap: { "clear-button": true },
      jslogContext: "protocol-monitor.reset-to-default-value"
    }) : nothing}

                    <!-- Render the buttons to change the value from undefined to empty string for optional primitive parameters -->
                    ${isPrimitive && !isParentArray && isParamOptional && isParamValueUndefined ? html`  ${renderInlineButton({
      title: i18nString(UIStrings.addParameter),
      iconName: "plus",
      onClick: () => input.onAddParameter(parameterId),
      classMap: { "add-button": true },
      jslogContext: "protocol-monitor.add-parameter"
    })}` : nothing}

                    <!-- Render the buttons to change the value from undefined to populate the values inside object with their default values -->
                    ${isObject && isParamOptional && isParamValueUndefined && hasTypeRef ? html`  ${renderInlineButton({
      title: i18nString(UIStrings.addParameter),
      iconName: "plus",
      onClick: () => input.onAddParameter(parameterId),
      classMap: { "add-button": true },
      jslogContext: "protocol-monitor.add-parameter"
    })}` : nothing}
                </div>

                <div class="row-icons">
                    <!-- If an object has no predefined keys, show an input to enter the value, and a delete icon to delete the whole key/value pair -->
                    ${hasNoKeys && isParentObject ? html`
                    <!-- @ts-ignore -->
                    <devtools-suggestion-input
                        data-paramId=${parameterId}
                        .isCorrectInput=${live(parameter.isCorrectType)}
                        .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                        .autocomplete=${false}
                        .value=${live(parameter.value ?? "")}
                        .placeholder=${parameter.value === "" ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                        .jslogContext=${"parameter-value"}
                        @blur=${input.onParameterValueBlur}
                        @focus=${input.onParameterFocus}
                        @keydown=${input.onParameterKeydown}
                      ></devtools-suggestion-input>

                      ${renderInlineButton({
      title: i18nString(UIStrings.deleteParameter),
      iconName: "bin",
      onClick: () => input.onDeleteParameter(parameter, parentParameter),
      classMap: { deleteButton: true, deleteIcon: true },
      jslogContext: "protocol-monitor.delete-parameter"
    })}` : nothing}

                  <!-- In case  the parameter is not optional or its value is not undefined render the input -->
                  ${isPrimitive && !hasNoKeys && (!isParamValueUndefined || !isParamOptional) && !isParentArray ? html`
                      <!-- @ts-ignore -->
                      <devtools-suggestion-input
                        data-paramId=${parameterId}
                        .strikethrough=${live(parameter.isCorrectType)}
                        .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                        .autocomplete=${false}
                        .value=${live(parameter.value ?? "")}
                        .placeholder=${parameter.value === "" ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                        .jslogContext=${"parameter-value"}
                        @blur=${input.onParameterValueBlur}
                        @focus=${input.onParameterFocus}
                        @keydown=${input.onParameterKeydown}
                      ></devtools-suggestion-input>` : nothing}

                  <!-- Render the buttons to change the value from empty string to undefined for optional primitive parameters -->
                  ${isPrimitive && !hasNoKeys && !isParentArray && isParamOptional && !isParamValueUndefined ? html`  ${renderInlineButton({
      title: i18nString(UIStrings.resetDefaultValue),
      iconName: "clear",
      onClick: () => input.onClearParameter(parameter),
      classMap: { "clear-button": true },
      jslogContext: "protocol-monitor.reset-to-default-value"
    })}` : nothing}

                  <!-- If the parameter is an object with no predefined keys, renders a button to add key/value pairs to it's value -->
                  ${isCustomEditorDisplayed ? html`
                    ${renderInlineButton({
      title: i18nString(UIStrings.addCustomProperty),
      iconName: "plus",
      onClick: () => input.onAddParameter(parameterId),
      classMap: { "add-button": true },
      jslogContext: "protocol-monitor.add-custom-property"
    })}
                  ` : nothing}

                  <!-- In case the parameter is nested inside an array we render the input field as well as a delete button -->
                  ${isParentArray ? html`
                  <!-- If the parameter is an object we don't want to display the input field we just want the delete button-->
                  ${!isObject ? html`
                  <!-- @ts-ignore -->
                  <devtools-suggestion-input
                    data-paramId=${parameterId}
                    .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                    .autocomplete=${false}
                    .value=${live(parameter.value ?? "")}
                    .placeholder=${parameter.value === "" ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                    .jslogContext=${"parameter"}
                    @blur=${input.onParameterValueBlur}
                    @keydown=${input.onParameterKeydown}
                    class=${classMap(inputClasses)}
                  ></devtools-suggestion-input>` : nothing}

                  ${renderInlineButton({
      title: i18nString(UIStrings.deleteParameter),
      iconName: "bin",
      onClick: () => input.onDeleteParameter(parameter, parentParameter),
      classMap: { "delete-button": true },
      jslogContext: "protocol-monitor.delete-parameter"
    })}` : nothing}
                </div>
              </li>
              ${renderParameters(input, subparameters, id, parameter, parameterId)}
            `;
  })}
    </ul>
  `;
}
var DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div class="wrapper" @keydown=${input.onKeydown} jslog=${VisualLogging.pane("command-editor").track({ resize: true })}>
      <div class="editor-wrapper">
        ${renderTargetSelectorRow(input)}
        <div class="row attribute padded">
          <div class="command">command<span class="separator">:</span></div>
          <devtools-suggestion-input
            .options=${[...input.metadataByCommand.keys()]}
            .value=${input.command}
            .placeholder=${"Enter your command\u2026"}
            .suggestionFilter=${suggestionFilter}
            .jslogContext=${"command"}
            @blur=${input.onCommandInputBlur}
            class=${classMap({ "json-input": true })}
          ></devtools-suggestion-input>
        </div>
        ${input.parameters.length ? html`
        <div class="row attribute padded">
          <div>parameters<span class="separator">:</span></div>
        </div>
          ${renderParameters(input, input.parameters)}
        ` : nothing}
      </div>
      <devtools-toolbar class="protocol-monitor-sidebar-toolbar">
        <devtools-button title=${i18nString(UIStrings.copyCommand)}
                        .iconName=${"copy"}
                        .jslogContext=${"protocol-monitor.copy-command"}
                        .variant=${"toolbar"}
                        @click=${input.onCopyToClipboard}></devtools-button>
          <div class=toolbar-spacer></div>
        <devtools-button title=${Host.Platform.isMac() ? i18nString(UIStrings.sendCommandCmdEnter) : i18nString(UIStrings.sendCommandCtrlEnter)}
                        .iconName=${"send"}
                        jslogContext="protocol-monitor.send-command"
                        .variant=${"primary_toolbar"}
                        @click=${input.onCommandSend}></devtools-button>
      </devtools-toolbar>
    </div>`, target);
};

// gen/front_end/panels/protocol_monitor/ProtocolMonitor.js
var ProtocolMonitor_exports = {};
__export(ProtocolMonitor_exports, {
  CommandAutocompleteSuggestionProvider: () => CommandAutocompleteSuggestionProvider,
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  InfoWidget: () => InfoWidget,
  ProtocolMonitorImpl: () => ProtocolMonitorImpl,
  buildProtocolMetadata: () => buildProtocolMetadata,
  parseCommandInput: () => parseCommandInput
});
import "./../../ui/legacy/legacy.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as ProtocolClient from "./../../core/protocol_client/protocol_client.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/protocol_monitor/protocolMonitor.css.js
var protocolMonitor_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .protocol-monitor-toolbar {
    border-bottom: 1px solid var(--sys-color-divider);
  }

  .protocol-monitor-bottom-toolbar {
    border-top: 1px solid var(--sys-color-divider);
  }

  .target-selector {
    max-width: 120px;
  }

  .protocol-monitor-main {
    /* allows the main area to grow automatically */
    flex-grow: 1;
  }
}

/*# sourceURL=${import.meta.resolve("./protocolMonitor.css")} */`;

// gen/front_end/panels/protocol_monitor/ProtocolMonitor.js
var { styleMap } = Directives2;
var { widgetConfig, widgetRef } = UI2.Widget;
var UIStrings2 = {
  /**
   * @description Text for one or a group of functions
   */
  method: "Method",
  /**
   * @description Text in Protocol Monitor. Title for a table column which shows in which direction
   * the particular protocol message was travelling. Values in this column will either be 'sent' or
   * 'received'.
   */
  type: "Type",
  /**
   * @description Text in Protocol Monitor of the Protocol Monitor tab. Noun relating to a network request.
   */
  request: "Request",
  /**
   * @description Title of a cell content in protocol monitor. A Network response refers to the act of acknowledging a
   * network request. Should not be confused with answer.
   */
  response: "Response",
  /**
   * @description Text for timestamps of items
   */
  timestamp: "Timestamp",
  /**
   * @description Title of a cell content in protocol monitor. It describes the time between sending a request and receiving a response.
   */
  elapsedTime: "Elapsed time",
  /**
   * @description Text in Protocol Monitor of the Protocol Monitor tab
   */
  target: "Target",
  /**
   * @description Text to record a series of actions for analysis
   */
  record: "Record",
  /**
   * @description Text to clear everything
   */
  clearAll: "Clear all",
  /**
   * @description Text to filter result items
   */
  filter: "Filter",
  /**
   * @description Text for the documentation of something
   */
  documentation: "Documentation",
  /**
   * @description Text to open the CDP editor with the selected command
   */
  editAndResend: "Edit and resend",
  /**
   * @description Cell text content in Protocol Monitor of the Protocol Monitor tab
   * @example {30} PH1
   */
  sMs: "{PH1} ms",
  /**
   * @description Text in Protocol Monitor of the Protocol Monitor tab
   */
  noMessageSelected: "No message selected",
  /**
   * @description Text in Protocol Monitor of the Protocol Monitor tab if no message is selected
   */
  selectAMessageToView: "Select a message to see its details",
  /**
   * @description Text in Protocol Monitor for the save button
   */
  save: "Save",
  /**
   * @description Text in Protocol Monitor to describe the sessions column
   */
  session: "Session",
  /**
   * @description A placeholder for an input in Protocol Monitor. The input accepts commands that are sent to the backend on Enter. CDP stands for Chrome DevTools Protocol.
   */
  sendRawCDPCommand: "Send a raw `CDP` command",
  /**
   * @description A tooltip text for the input in the Protocol Monitor panel. The tooltip describes what format is expected.
   */
  sendRawCDPCommandExplanation: "Format: `'Domain.commandName'` for a command without parameters, or `'{\"command\":\"Domain.commandName\", \"parameters\": {...}}'` as a JSON object for a command with parameters. `'cmd'`/`'method'` and `'args'`/`'params'`/`'arguments'` are also supported as alternative keys for the `JSON` object.",
  /**
   * @description A label for a select input that allows selecting a CDP target to send the commands to.
   */
  selectTarget: "Select a target",
  /**
   * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  showCDPCommandEditor: "Show CDP command editor",
  /**
   * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  hideCDPCommandEditor: "Hide  CDP command editor"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/protocol_monitor/ProtocolMonitor.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var buildProtocolMetadata = (domains) => {
  const metadataByCommand2 = /* @__PURE__ */ new Map();
  for (const domain of domains) {
    for (const command of Object.keys(domain.metadata)) {
      metadataByCommand2.set(command, domain.metadata[command]);
    }
  }
  return metadataByCommand2;
};
var metadataByCommand = buildProtocolMetadata(ProtocolClient.InspectorBackend.inspectorBackend.agentPrototypes.values());
var typesByName = ProtocolClient.InspectorBackend.inspectorBackend.typeMap;
var enumsByName = ProtocolClient.InspectorBackend.inspectorBackend.enumMap;
var DEFAULT_VIEW2 = (input, output, target) => {
  render2(html2`
        <style>${UI2.inspectorCommonStyles}</style>
        <style>${protocolMonitor_css_default}</style>
        <devtools-split-view name="protocol-monitor-split-container"
                             direction="column"
                             sidebar-initial-size="400"
                             sidebar-visibility=${input.sidebarVisible ? "visible" : "hidden"}
                             @change=${(e) => input.onSplitChange(e.detail === "OnlyMain")}>
          <div slot="main" class="vbox protocol-monitor-main">
            <devtools-toolbar class="protocol-monitor-toolbar"
                               jslog=${VisualLogging2.toolbar("top")}>
               <devtools-button title=${i18nString2(UIStrings2.record)}
                                .iconName=${"record-start"}
                                .toggledIconName=${"record-stop"}
                                .jslogContext=${"protocol-monitor.toggle-recording"}
                                .variant=${"icon_toggle"}
                                .toggleType=${"red-toggle"}
                                .toggled=${true}
                                @click=${(e) => input.onRecord(e.target.toggled)}>
               </devtools-button>
              <devtools-button title=${i18nString2(UIStrings2.clearAll)}
                               .iconName=${"clear"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.clear-all"}
                               @click=${() => input.onClear()}></devtools-button>
              <devtools-button title=${i18nString2(UIStrings2.save)}
                               .iconName=${"download"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.save"}
                               @click=${() => input.onSave()}></devtools-button>
              <devtools-toolbar-input type="filter"
                                      list="filter-suggestions"
                                      style="flex-grow: 1"
                                      value=${input.filter}
                                      @change=${(e) => input.onFilterChanged(e.detail)}>
                <datalist id="filter-suggestions">
                  ${input.filterKeys.map((key) => html2`
                        <option value=${key + ":"}></option>
                        <option value=${"-" + key + ":"}></option>`)}
                </datalist>
              </devtools-toolbar-input>
            </devtools-toolbar>
            <devtools-split-view direction="column" sidebar-position="second"
                                 name="protocol-monitor-panel-split" sidebar-initial-size="250">
              <devtools-data-grid
                  striped
                  slot="main"
                  .filters=${input.parseFilter(input.filter)}>
                <table>
                    <tr>
                      <th id="type" sortable style="text-align: center" hideable weight="1">
                        ${i18nString2(UIStrings2.type)}
                      </th>
                      <th id="method" weight="5">
                        ${i18nString2(UIStrings2.method)}
                      </th>
                      <th id="request" hideable weight="5">
                        ${i18nString2(UIStrings2.request)}
                      </th>
                      <th id="response" hideable weight="5">
                        ${i18nString2(UIStrings2.response)}
                      </th>
                      <th id="elapsed-time" sortable hideable weight="2">
                        ${i18nString2(UIStrings2.elapsedTime)}
                      </th>
                      <th id="timestamp" sortable hideable weight="5">
                        ${i18nString2(UIStrings2.timestamp)}
                      </th>
                      <th id="target" sortable hideable weight="5">
                        ${i18nString2(UIStrings2.target)}
                      </th>
                      <th id="session" sortable hideable weight="5">
                        ${i18nString2(UIStrings2.session)}
                      </th>
                    </tr>
                    ${input.messages.map((message) => html2`
                      <tr @select=${() => input.onSelect(message)}
                          @contextmenu=${(e) => input.onContextMenu(message, e.detail)}
                          style="--override-data-grid-row-background-color: var(--sys-color-surface3)">
                        ${"id" in message ? html2`
                          <td title="sent">
                            <devtools-icon name="arrow-up-down" class="medium" style="color: var(--icon-request-response);">
                            </devtools-icon>
                          </td>` : html2`
                          <td title="received">
                            <devtools-icon name="arrow-down" class="medium" style="color: var(--icon-request);">
                            </devtools-icon>
                          </td>`}
                        <td>${message.method}</td>
                        <td>${message.params ? html2`<code>${JSON.stringify(message.params)}</code>` : ""}</td>
                        <td>
                          ${message.result ? html2`<code>${JSON.stringify(message.result)}</code>` : message.error ? html2`<code>${JSON.stringify(message.error)}</code>` : "id" in message ? "(pending)" : ""}
                        </td>
                        <td data-value=${message.elapsedTime || 0}>
                          ${!("id" in message) ? "" : message.elapsedTime ? i18nString2(UIStrings2.sMs, { PH1: String(message.elapsedTime) }) : "(pending)"}
                        </td>
                        <td data-value=${message.requestTime}>${i18nString2(UIStrings2.sMs, { PH1: String(message.requestTime) })}</td>
                        <td>${targetToString(message.target)}</td>
                        <td>${message.sessionId || ""}</td>
                      </tr>`)}
                  </table>
              </devtools-data-grid>
              <devtools-widget .widgetConfig=${widgetConfig(InfoWidget, {
    request: input.selectedMessage?.params,
    response: input.selectedMessage?.result || input.selectedMessage?.error,
    type: !input.selectedMessage ? void 0 : "id" in input?.selectedMessage ? "sent" : "received"
  })}
                  class="protocol-monitor-info"
                  slot="sidebar"></devtools-widget>
            </devtools-split-view>
            <devtools-toolbar class="protocol-monitor-bottom-toolbar"
               jslog=${VisualLogging2.toolbar("bottom")}>
              <devtools-button .title=${input.sidebarVisible ? i18nString2(UIStrings2.hideCDPCommandEditor) : i18nString2(UIStrings2.showCDPCommandEditor)}
                               .iconName=${input.sidebarVisible ? "left-panel-close" : "left-panel-open"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.toggle-command-editor"}
                               @click=${() => input.onToggleSidebar()}></devtools-button>
              </devtools-button>
              <devtools-toolbar-input id="command-input"
                                      style=${styleMap({
    "flex-grow": 1,
    display: input.sidebarVisible ? "none" : "flex"
  })}
                                      value=${input.command}
                                      list="command-input-suggestions"
                                      placeholder=${i18nString2(UIStrings2.sendRawCDPCommand)}
                                      title=${i18nString2(UIStrings2.sendRawCDPCommandExplanation)}
                                      @change=${(e) => input.onCommandChange(e.detail)}
                                      @submit=${(e) => input.onCommandSubmitted(e.detail)}>
                <datalist id="command-input-suggestions">
                  ${input.commandSuggestions.map((c) => html2`<option value=${c}></option>`)}
                </datalist>
              </devtools-toolbar-input>
              <select class="target-selector"
                      title=${i18nString2(UIStrings2.selectTarget)}
                      style=${styleMap({ display: input.sidebarVisible ? "none" : "flex" })}
                      jslog=${VisualLogging2.dropDown("target-selector").track({ change: true })}
                      @change=${(e) => input.onTargetChange(e.target.value)}>
                ${input.targets.map((target2) => html2`
                  <option jslog=${VisualLogging2.item("target").track({ click: true })}
                          value=${target2.id()} ?selected=${target2.id() === input.selectedTargetId}>
                    ${target2.name()} (${target2.inspectedURL()})
                  </option>`)}
              </select>
            </devtools-toolbar>
          </div>
          <devtools-widget slot="sidebar"
              .widgetConfig=${widgetConfig(JSONEditor, { metadataByCommand, typesByName, enumsByName })}
              ${widgetRef(JSONEditor, (e) => {
    output.editorWidget = e;
  })}>
          </devtools-widget>
        </devtools-split-view>`, target);
};
var ProtocolMonitorImpl = class extends UI2.Panel.Panel {
  started;
  startTime;
  messageForId = /* @__PURE__ */ new Map();
  filterParser;
  #filterKeys = ["method", "request", "response", "target", "session"];
  #commandAutocompleteSuggestionProvider = new CommandAutocompleteSuggestionProvider();
  #selectedTargetId;
  #command = "";
  #sidebarVisible = false;
  #view;
  #messages = [];
  #selectedMessage;
  #filter = "";
  #editorWidget;
  #targetsBySessionId = /* @__PURE__ */ new Map();
  constructor(view = DEFAULT_VIEW2) {
    super("protocol-monitor", true);
    this.#view = view;
    this.started = false;
    this.startTime = 0;
    this.#filterKeys = ["method", "request", "response", "type", "target", "session"];
    this.filterParser = new TextUtils.TextUtils.FilterParser(this.#filterKeys);
    this.#selectedTargetId = "main";
    this.performUpdate();
    this.#editorWidget.addEventListener("submiteditor", (event) => {
      this.onCommandSend(event.data.command, event.data.parameters, event.data.targetId);
    });
    SDK2.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged", () => {
      this.requestUpdate();
    });
    SDK2.TargetManager.TargetManager.instance().observeTargets(this);
  }
  targetAdded(target) {
    this.#targetsBySessionId.set(target.sessionId, target);
  }
  targetRemoved(target) {
    this.#targetsBySessionId.delete(target.sessionId);
  }
  #populateToolbarInput() {
    const commandJson = this.#editorWidget.getCommandJson();
    const targetId = this.#editorWidget.targetId;
    if (targetId) {
      this.#selectedTargetId = targetId;
    }
    if (commandJson) {
      this.#command = commandJson;
      this.requestUpdate();
    }
  }
  performUpdate() {
    const viewInput = {
      messages: this.#messages,
      selectedMessage: this.#selectedMessage,
      sidebarVisible: this.#sidebarVisible,
      command: this.#command,
      commandSuggestions: this.#commandAutocompleteSuggestionProvider.allSuggestions(),
      filterKeys: this.#filterKeys,
      filter: this.#filter,
      parseFilter: this.filterParser.parse.bind(this.filterParser),
      onSplitChange: (onlyMain) => {
        if (onlyMain) {
          this.#populateToolbarInput();
          this.#sidebarVisible = false;
        } else {
          const { command, parameters } = parseCommandInput(this.#command);
          this.#editorWidget.displayCommand(command, parameters, this.#selectedTargetId);
          this.#sidebarVisible = true;
        }
        this.requestUpdate();
      },
      onRecord: (recording) => {
        this.setRecording(recording);
      },
      onClear: () => {
        this.#messages = [];
        this.messageForId.clear();
        this.requestUpdate();
      },
      onSave: () => {
        void this.saveAsFile();
      },
      onSelect: (message) => {
        this.#selectedMessage = message;
        this.requestUpdate();
      },
      onContextMenu: this.#populateContextMenu.bind(this),
      onCommandChange: (command) => {
        this.#command = command;
      },
      onCommandSubmitted: (input) => {
        this.#commandAutocompleteSuggestionProvider.addEntry(input);
        const { command, parameters } = parseCommandInput(input);
        this.onCommandSend(command, parameters, this.#selectedTargetId);
      },
      onFilterChanged: (filter) => {
        this.#filter = filter;
        this.requestUpdate();
      },
      onTargetChange: (targetId) => {
        this.#selectedTargetId = targetId;
      },
      onToggleSidebar: () => {
        this.#sidebarVisible = !this.#sidebarVisible;
        this.requestUpdate();
      },
      targets: SDK2.TargetManager.TargetManager.instance().targets(),
      selectedTargetId: this.#selectedTargetId
    };
    const that = this;
    const viewOutput = {
      set editorWidget(value) {
        that.#editorWidget = value;
      }
    };
    this.#view(viewInput, viewOutput, this.contentElement);
  }
  #populateContextMenu(message, menu) {
    menu.editSection().appendItem(i18nString2(UIStrings2.editAndResend), () => {
      if (!this.#selectedMessage) {
        return;
      }
      const parameters = this.#selectedMessage.params;
      const targetId = this.#selectedMessage.target?.id() || "";
      const command = message.method;
      this.#command = JSON.stringify({ command, parameters });
      if (!this.#sidebarVisible) {
        this.#sidebarVisible = true;
        this.requestUpdate();
      } else {
        this.#editorWidget.displayCommand(command, parameters, targetId);
      }
    }, { jslogContext: "edit-and-resend", disabled: !("id" in message) });
    menu.editSection().appendItem(i18nString2(UIStrings2.filter), () => {
      this.#filter = `method:${message.method}`;
      this.requestUpdate();
    }, { jslogContext: "filter" });
    menu.footerSection().appendItem(i18nString2(UIStrings2.documentation), () => {
      const [domain, method] = message.method.split(".");
      const type = "id" in message ? "method" : "event";
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(`https://chromedevtools.github.io/devtools-protocol/tot/${domain}#${type}-${method}`);
    }, { jslogContext: "documentation" });
  }
  onCommandSend(command, parameters, target) {
    const test = ProtocolClient.InspectorBackend.test;
    const targetManager = SDK2.TargetManager.TargetManager.instance();
    const selectedTarget = target ? targetManager.targetById(target) : null;
    const sessionId = selectedTarget ? selectedTarget.sessionId : "";
    test.sendRawMessage(command, parameters, () => {
    }, sessionId);
  }
  wasShown() {
    super.wasShown();
    if (this.started) {
      return;
    }
    this.started = true;
    this.startTime = Date.now();
    this.setRecording(true);
  }
  setRecording(recording) {
    const test = ProtocolClient.InspectorBackend.test;
    if (recording) {
      test.onMessageSent = this.messageSent.bind(this);
      test.onMessageReceived = this.messageReceived.bind(this);
    } else {
      test.onMessageSent = null;
      test.onMessageReceived = null;
    }
  }
  messageReceived(message) {
    if ("id" in message && message.id) {
      const existingMessage = this.messageForId.get(message.id);
      if (!existingMessage) {
        return;
      }
      existingMessage.result = message.result;
      existingMessage.error = message.error;
      existingMessage.elapsedTime = Date.now() - this.startTime - existingMessage.requestTime;
      this.messageForId.delete(message.id);
      this.requestUpdate();
      return;
    }
    const target = message.sessionId !== void 0 ? this.#targetsBySessionId.get(message.sessionId) : void 0;
    this.#messages.push({
      method: message.method,
      sessionId: message.sessionId,
      target,
      requestTime: Date.now() - this.startTime,
      result: message.params
    });
    this.requestUpdate();
  }
  messageSent(message) {
    const target = message.sessionId !== void 0 ? this.#targetsBySessionId.get(message.sessionId) : void 0;
    const messageRecord = {
      method: message.method,
      params: message.params,
      id: message.id,
      sessionId: message.sessionId,
      target,
      requestTime: Date.now() - this.startTime
    };
    this.#messages.push(messageRecord);
    this.requestUpdate();
    this.messageForId.set(message.id, messageRecord);
  }
  async saveAsFile() {
    const now = /* @__PURE__ */ new Date();
    const fileName = "ProtocolMonitor-" + Platform2.DateUtilities.toISO8601Compact(now) + ".json";
    const stream = new Bindings.FileUtils.FileOutputStream();
    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }
    const rowEntries = this.#messages.map((m) => ({ ...m, target: m.target?.id() }));
    void stream.write(JSON.stringify(rowEntries, null, "  "));
    void stream.close();
  }
};
var CommandAutocompleteSuggestionProvider = class {
  #maxHistorySize = 200;
  #commandHistory = /* @__PURE__ */ new Set();
  constructor(maxHistorySize) {
    if (maxHistorySize !== void 0) {
      this.#maxHistorySize = maxHistorySize;
    }
  }
  allSuggestions() {
    const newestToOldest = [...this.#commandHistory].reverse();
    newestToOldest.push(...metadataByCommand.keys());
    return newestToOldest;
  }
  buildTextPromptCompletions = async (expression, prefix, force) => {
    if (!prefix && !force && expression) {
      return [];
    }
    const newestToOldest = this.allSuggestions();
    return newestToOldest.filter((cmd) => cmd.startsWith(prefix)).map((text) => ({
      text
    }));
  };
  addEntry(value) {
    if (this.#commandHistory.has(value)) {
      this.#commandHistory.delete(value);
    }
    this.#commandHistory.add(value);
    if (this.#commandHistory.size > this.#maxHistorySize) {
      const earliestEntry = this.#commandHistory.values().next().value;
      this.#commandHistory.delete(earliestEntry);
    }
  }
};
var INFO_WIDGET_VIEW = (input, _output, target) => {
  render2(html2`<devtools-widget .widgetConfig=${widgetConfig(UI2.TabbedPane.TabbedPane, {
    tabs: [
      {
        id: "request",
        title: i18nString2(UIStrings2.request),
        view: input.type === void 0 ? new UI2.EmptyWidget.EmptyWidget(i18nString2(UIStrings2.noMessageSelected), i18nString2(UIStrings2.selectAMessageToView)) : SourceFrame.JSONView.JSONView.createViewSync(input.request || null),
        enabled: input.type === "sent",
        selected: input.selectedTab === "request"
      },
      {
        id: "response",
        title: i18nString2(UIStrings2.response),
        view: input.type === void 0 ? new UI2.EmptyWidget.EmptyWidget(i18nString2(UIStrings2.noMessageSelected), i18nString2(UIStrings2.selectAMessageToView)) : SourceFrame.JSONView.JSONView.createViewSync(input.response || null),
        selected: input.selectedTab === "response"
      }
    ]
  })}>
  </devtools-widget>`, target);
};
var InfoWidget = class extends UI2.Widget.VBox {
  #view;
  request;
  response;
  type;
  constructor(element, view = INFO_WIDGET_VIEW) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      request: this.request,
      response: this.response,
      type: this.type,
      selectedTab: this.type !== "sent" ? "response" : void 0
    }, void 0, this.contentElement);
  }
};
function parseCommandInput(input) {
  let json = null;
  try {
    json = JSON.parse(input);
  } catch {
  }
  const command = json ? json.command || json.method || json.cmd || "" : input;
  const parameters = json?.parameters || json?.params || json?.args || json?.arguments || {};
  return { command, parameters };
}
function targetToString(target) {
  if (!target) {
    return "";
  }
  return target.decorateLabel(`${target.name()} ${target === SDK2.TargetManager.TargetManager.instance().rootTarget() ? "" : target.id()}`);
}
export {
  JSONEditor_exports as JSONEditor,
  ProtocolMonitor_exports as ProtocolMonitor
};
//# sourceMappingURL=protocol_monitor.js.map
