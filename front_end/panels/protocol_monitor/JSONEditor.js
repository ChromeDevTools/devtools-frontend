// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/menus/menus.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SuggestionInput from '../../ui/components/suggestion_input/suggestion_input.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ElementsComponents from '../elements/components/components.js';
import editorWidgetStyles from './JSONEditor.css.js';
const { html, render, Directives, nothing } = Lit;
const { live, classMap, repeat } = Directives;
const UIStrings = {
    /**
     * @description The title of a button that deletes a parameter.
     */
    deleteParameter: 'Delete parameter',
    /**
     * @description The title of a button that adds a parameter.
     */
    addParameter: 'Add a parameter',
    /**
     * @description The title of a button that reset the value of a parameters to its default value.
     */
    resetDefaultValue: 'Reset to default value',
    /**
     * @description The title of a button to add custom key/value pairs to object parameters with no keys defined
     */
    addCustomProperty: 'Add custom property',
    /**
     * @description The title of a button that sends a CDP command.
     */
    sendCommandCtrlEnter: 'Send command - Ctrl+Enter',
    /**
     * @description The title of a button that sends a CDP command.
     */
    sendCommandCmdEnter: 'Send command - ⌘+Enter',
    /**
     * @description The title of a button that copies a CDP command.
     */
    copyCommand: 'Copy command',
    /**
     * @description A label for a select input that allows selecting a CDP target to send the commands to.
     */
    selectTarget: 'Select a target',
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/JSONEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const splitDescription = (description) => {
    // If the description is too long we make the UI a bit better by highlighting the first sentence
    // which contains the most information.
    // The number 150 has been chosen arbitrarily
    if (description.length > 150) {
        const [firstSentence, restOfDescription] = description.split('.');
        // To make the UI nicer, we add a dot at the end of the first sentence.
        firstSentence + '.';
        return [firstSentence, restOfDescription];
    }
    return [description, ''];
};
const defaultValueByType = new Map([
    ['string', ''],
    ['number', 0],
    ['boolean', false],
]);
const DUMMY_DATA = 'dummy';
const EMPTY_STRING = '<empty_string>';
export function suggestionFilter(option, query) {
    return option.toLowerCase().includes(query.toLowerCase());
}
export class JSONEditor extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #metadataByCommand = new Map();
    #typesByName = new Map();
    #enumsByName = new Map();
    #parameters = [];
    #targets = [];
    #command = '';
    #targetId;
    #hintPopoverHelper;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.registerRequiredCSS(editorWidgetStyles);
    }
    get metadataByCommand() {
        return this.#metadataByCommand;
    }
    set metadataByCommand(metadataByCommand) {
        this.#metadataByCommand = metadataByCommand;
        this.requestUpdate();
    }
    get typesByName() {
        return this.#typesByName;
    }
    set typesByName(typesByName) {
        this.#typesByName = typesByName;
        this.requestUpdate();
    }
    get enumsByName() {
        return this.#enumsByName;
    }
    set enumsByName(enumsByName) {
        this.#enumsByName = enumsByName;
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
        this.#hintPopoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, event => this.#handlePopoverDescriptions(event), 'protocol-monitor.hint');
        this.#hintPopoverHelper.setDisableOnClick(true);
        this.#hintPopoverHelper.setTimeout(300);
        const targetManager = SDK.TargetManager.TargetManager.instance();
        targetManager.addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, this.#handleAvailableTargetsChanged, this);
        this.#handleAvailableTargetsChanged();
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#hintPopoverHelper?.hidePopover();
        this.#hintPopoverHelper?.dispose();
        const targetManager = SDK.TargetManager.TargetManager.instance();
        targetManager.removeEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, this.#handleAvailableTargetsChanged, this);
    }
    #handleAvailableTargetsChanged() {
        this.targets = SDK.TargetManager.TargetManager.instance().targets();
        if (this.targets.length && this.targetId === undefined) {
            this.targetId = this.targets[0].id();
        }
    }
    getParameters() {
        const formatParameterValue = (parameter) => {
            if (parameter.value === undefined) {
                return;
            }
            switch (parameter.type) {
                case "number" /* ParameterType.NUMBER */: {
                    return Number(parameter.value);
                }
                case "boolean" /* ParameterType.BOOLEAN */: {
                    return Boolean(parameter.value);
                }
                case "object" /* ParameterType.OBJECT */: {
                    const nestedParameters = {};
                    for (const subParameter of parameter.value) {
                        const formattedValue = formatParameterValue(subParameter);
                        if (formattedValue !== undefined) {
                            nestedParameters[subParameter.name] = formatParameterValue(subParameter);
                        }
                    }
                    if (Object.keys(nestedParameters).length === 0) {
                        return undefined;
                    }
                    return nestedParameters;
                }
                case "array" /* ParameterType.ARRAY */: {
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
            type: "object" /* ParameterType.OBJECT */,
            name: DUMMY_DATA,
            optional: true,
            value: this.parameters,
            description: '',
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
        const displayedParameters = this.#convertObjectToParameterSchema('', parameters, {
            typeRef: DUMMY_DATA,
            type: "object" /* ParameterType.OBJECT */,
            name: '',
            description: '',
            optional: true,
            value: [],
        }, schema.parameters)
            .value;
        const valueByName = new Map(this.parameters.map(param => [param.name, param]));
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
        const description = schema?.description ?? '';
        const optional = schema?.optional ?? true;
        switch (type) {
            case "string" /* ParameterType.STRING */:
            case "boolean" /* ParameterType.BOOLEAN */:
            case "number" /* ParameterType.NUMBER */:
                return this.#convertPrimitiveParameter(key, value, schema);
            case "object" /* ParameterType.OBJECT */:
                return this.#convertObjectParameter(key, value, schema, initialSchema);
            case "array" /* ParameterType.ARRAY */:
                return this.#convertArrayParameter(key, value, schema);
        }
        return {
            type,
            name: key,
            optional,
            typeRef: schema?.typeRef,
            value,
            description,
        };
    }
    #convertPrimitiveParameter(key, value, schema) {
        const type = schema?.type || typeof value;
        const description = schema?.description ?? '';
        const optional = schema?.optional ?? true;
        return {
            type,
            name: key,
            optional,
            typeRef: schema?.typeRef,
            value,
            description,
            isCorrectType: schema ? this.#isValueOfCorrectType(schema, String(value)) : true,
        };
    }
    #convertObjectParameter(key, value, schema, initialSchema) {
        const description = schema?.description ?? '';
        if (typeof value !== 'object' || value === null) {
            throw new Error('The value is not an object');
        }
        const typeRef = schema?.typeRef;
        if (!typeRef) {
            throw new Error('Every object parameters should have a type ref');
        }
        const nestedType = typeRef === DUMMY_DATA ? initialSchema : this.typesByName.get(typeRef);
        if (!nestedType) {
            throw new Error('No nested type for keys were found');
        }
        const objectValues = [];
        for (const objectKey of Object.keys(value)) {
            const objectType = nestedType.find(param => param.name === objectKey);
            objectValues.push(this.#convertObjectToParameterSchema(objectKey, value[objectKey], objectType));
        }
        return {
            type: "object" /* ParameterType.OBJECT */,
            name: key,
            optional: schema.optional,
            typeRef: schema.typeRef,
            value: objectValues,
            description,
            isCorrectType: true,
        };
    }
    #convertArrayParameter(key, value, schema) {
        const description = schema?.description ?? '';
        const optional = schema?.optional ?? true;
        const typeRef = schema?.typeRef;
        if (!typeRef) {
            throw new Error('Every array parameters should have a type ref');
        }
        if (!Array.isArray(value)) {
            throw new Error('The value is not an array');
        }
        const nestedType = isTypePrimitive(typeRef) ? undefined : {
            optional: true,
            type: "object" /* ParameterType.OBJECT */,
            value: [],
            typeRef,
            description: '',
            name: '',
        };
        const objectValues = [];
        for (let i = 0; i < value.length; i++) {
            const temp = this.#convertObjectToParameterSchema(`${i}`, value[i], nestedType);
            objectValues.push(temp);
        }
        return {
            type: "array" /* ParameterType.ARRAY */,
            name: key,
            optional,
            typeRef: schema?.typeRef,
            value: objectValues,
            description,
            isCorrectType: true,
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
        let popupContent = '';
        // replyArgs and type cannot get into conflict because replyArgs is attached to a command and type to a parameter
        if (replyArgs && replyArgs.length > 0) {
            popupContent = tail + `Returns: ${replyArgs}<br>`;
        }
        else if (type) {
            popupContent = tail + `<br>Type: ${type}<br>`;
        }
        else {
            popupContent = tail;
        }
        return {
            box: hintElement.boxInWindow(),
            show: async (popover) => {
                const popupElement = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView({
                    getMessage: () => `<span>${head}</span>`,
                    getPossibleFixMessage: () => popupContent,
                    getLearnMoreLink: () => `https://chromedevtools.github.io/devtools-protocol/tot/${this.command.split('.')[0]}/`,
                });
                popover.contentElement.appendChild(popupElement);
                return true;
            },
        };
    }
    #getDescriptionAndTypeForElement(hintElement) {
        if (hintElement.matches('.command')) {
            const metadata = this.metadataByCommand.get(this.command);
            if (metadata) {
                return { description: metadata.description, replyArgs: metadata.replyArgs };
            }
        }
        if (hintElement.matches('.parameter')) {
            const id = hintElement.dataset.paramid;
            if (!id) {
                return;
            }
            const pathArray = id.split('.');
            const { parameter } = this.#getChildByPath(pathArray);
            if (!parameter.description) {
                return;
            }
            return { description: parameter.description, type: parameter.type };
        }
        return;
    }
    getCommandJson() {
        return this.command !== '' ? JSON.stringify({ command: this.command, parameters: this.getParameters() }) : '';
    }
    #copyToClipboard() {
        const commandJson = this.getCommandJson();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commandJson);
    }
    #handleCommandSend() {
        this.dispatchEventToListeners("submiteditor" /* Events.SUBMIT_EDITOR */, {
            command: this.command,
            parameters: this.getParameters(),
            targetId: this.targetId,
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
        if (parameter.type === "object" /* ParameterType.OBJECT */) {
            let typeRef = parameter.typeRef;
            if (!typeRef) {
                typeRef = DUMMY_DATA;
            }
            // Fallback to empty array is extremely rare.
            // It happens when the keys for an object are not registered like for Tracing.MemoryDumpConfig or headers for instance.
            const nestedTypes = this.typesByName.get(typeRef) ?? [];
            const nestedParameters = nestedTypes.map(nestedType => {
                return this.#populateParameterDefaults(nestedType);
            });
            return {
                ...parameter,
                value: parameter.optional ? undefined : nestedParameters,
                isCorrectType: true,
            };
        }
        if (parameter.type === "array" /* ParameterType.ARRAY */) {
            return {
                ...parameter,
                value: parameter?.optional ? undefined :
                    parameter.value?.map(param => this.#populateParameterDefaults(param)) || [],
                isCorrectType: true,
            };
        }
        return {
            ...parameter,
            value: parameter.optional ? undefined : defaultValueByType.get(parameter.type),
            isCorrectType: true,
        };
    }
    #getChildByPath(pathArray) {
        let parameters = this.parameters;
        let parentParameter;
        for (let i = 0; i < pathArray.length; i++) {
            const name = pathArray[i];
            const parameter = parameters.find(param => param.name === name);
            if (i === pathArray.length - 1) {
                return { parameter, parentParameter };
            }
            if (parameter?.type === "array" /* ParameterType.ARRAY */ || parameter?.type === "object" /* ParameterType.OBJECT */) {
                if (parameter.value) {
                    parameters = parameter.value;
                }
            }
            else {
                throw new Error('Parameter on the path in not an object or an array');
            }
            parentParameter = parameter;
        }
        throw new Error('Not found');
    }
    #isValueOfCorrectType(parameter, value) {
        if (parameter.type === "number" /* ParameterType.NUMBER */ && isNaN(Number(value))) {
            return false;
        }
        // For boolean or array parameters, this will create an array of the values the user can enter
        const acceptedValues = this.#computeDropdownValues(parameter);
        // Check to see if the entered value by the user is indeed part of the values accepted by the enum or boolean parameter
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
            const editableContent = event.target.renderRoot.querySelector('devtools-editable-content');
            if (!editableContent) {
                return;
            }
            value = editableContent.innerText;
        }
        else {
            value = event.target.value;
        }
        const paramId = event.target.getAttribute('data-paramid');
        if (!paramId) {
            return;
        }
        const pathArray = paramId.split('.');
        const object = this.#getChildByPath(pathArray).parameter;
        if (value === '') {
            object.value = defaultValueByType.get(object.type);
        }
        else {
            object.value = value;
            object.isCorrectType = this.#isValueOfCorrectType(object, value);
        }
        // Needed to render the delete button for object parameters
        this.requestUpdate();
    };
    #saveNestedObjectParameterKey = (event) => {
        if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
            return;
        }
        const value = event.target.value;
        const paramId = event.target.getAttribute('data-paramid');
        if (!paramId) {
            return;
        }
        const pathArray = paramId.split('.');
        const { parameter } = this.#getChildByPath(pathArray);
        parameter.name = value;
        // Needed to render the delete button for object parameters
        this.requestUpdate();
    };
    #handleParameterInputKeydown = (event) => {
        if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
            return;
        }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            this.#saveParameterValue(event);
        }
    };
    #handleFocusParameter(event) {
        if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
            return;
        }
        const paramId = event.target.getAttribute('data-paramid');
        if (!paramId) {
            return;
        }
        const pathArray = paramId.split('.');
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
        // FIXME: can we do this via view output?
        const elements = this.contentElement.querySelectorAll('devtools-suggestion-input,.add-button');
        const element = [...elements].findIndex(value => value === target.shadowRoot?.host);
        if (element >= 0 && element + 1 < elements.length) {
            elements[element + 1].focus();
        }
        else {
            this.contentElement.querySelector('devtools-button[jslogcontext="protocol-monitor.send-command"]')
                ?.focus();
        }
    }
    #createNestedParameter(type, name) {
        if (type.type === "object" /* ParameterType.OBJECT */) {
            let typeRef = type.typeRef;
            if (!typeRef) {
                typeRef = DUMMY_DATA;
            }
            const nestedTypes = this.typesByName.get(typeRef) ?? [];
            const nestedValue = nestedTypes.map(nestedType => this.#createNestedParameter(nestedType, nestedType.name));
            return {
                type: "object" /* ParameterType.OBJECT */,
                name,
                optional: type.optional,
                typeRef,
                value: nestedValue,
                isCorrectType: true,
                description: type.description,
            };
        }
        return {
            type: type.type,
            name,
            optional: type.optional,
            isCorrectType: true,
            typeRef: type.typeRef,
            value: type.optional ? undefined : defaultValueByType.get(type.type),
            description: type.description,
        };
    }
    #handleAddParameter(parameterId) {
        const pathArray = parameterId.split('.');
        const { parameter, parentParameter } = this.#getChildByPath(pathArray);
        if (!parameter) {
            return;
        }
        switch (parameter.type) {
            case "array" /* ParameterType.ARRAY */: {
                const typeRef = parameter.typeRef;
                if (!typeRef) {
                    throw new Error('Every array parameter must have a typeRef');
                }
                const nestedType = this.typesByName.get(typeRef) ?? [];
                const nestedValue = nestedType.map(type => this.#createNestedParameter(type, type.name));
                let type = isTypePrimitive(typeRef) ? typeRef : "object" /* ParameterType.OBJECT */;
                // If the typeRef is actually a ref to an enum type, the type of the nested param should be a string
                if (nestedType.length === 0) {
                    if (this.enumsByName.get(typeRef)) {
                        type = "string" /* ParameterType.STRING */;
                    }
                }
                // In case the parameter is an optional array, its value will be undefined so before pushing new value inside,
                // we reset it to empty array
                if (!parameter.value) {
                    parameter.value = [];
                }
                parameter.value.push({
                    type,
                    name: String(parameter.value.length),
                    optional: true,
                    typeRef,
                    value: nestedValue.length !== 0 ? nestedValue : '',
                    description: '',
                    isCorrectType: true,
                });
                break;
            }
            case "object" /* ParameterType.OBJECT */: {
                let typeRef = parameter.typeRef;
                if (!typeRef) {
                    typeRef = DUMMY_DATA;
                }
                if (!parameter.value) {
                    parameter.value = [];
                }
                if (!this.typesByName.get(typeRef)) {
                    parameter.value.push({
                        type: "string" /* ParameterType.STRING */,
                        name: '',
                        optional: true,
                        value: '',
                        isCorrectType: true,
                        description: '',
                        isKeyEditable: true,
                    });
                    break;
                }
                const nestedTypes = this.typesByName.get(typeRef) ?? [];
                const nestedValue = nestedTypes.map(nestedType => this.#createNestedParameter(nestedType, nestedType.name));
                const nestedParameters = nestedTypes.map(nestedType => {
                    return this.#populateParameterDefaults(nestedType);
                });
                if (parentParameter) {
                    parameter.value.push({
                        type: "object" /* ParameterType.OBJECT */,
                        name: '',
                        optional: true,
                        typeRef,
                        value: nestedValue,
                        isCorrectType: true,
                        description: '',
                    });
                }
                else {
                    parameter.value = nestedParameters;
                }
                break;
            }
            default:
                // For non-array and non-object parameters, set the value to the default value if available.
                parameter.value = defaultValueByType.get(parameter.type);
                break;
        }
        this.requestUpdate();
    }
    #handleClearParameter(parameter, isParentArray) {
        if (parameter?.value === undefined) {
            return;
        }
        switch (parameter.type) {
            case "object" /* ParameterType.OBJECT */:
                if (parameter.optional && !isParentArray) {
                    parameter.value = undefined;
                    break;
                }
                if (!parameter.typeRef || !this.typesByName.get(parameter.typeRef)) {
                    parameter.value = [];
                }
                else {
                    parameter.value.forEach(param => this.#handleClearParameter(param, isParentArray));
                }
                break;
            case "array" /* ParameterType.ARRAY */:
                parameter.value = parameter.optional ? undefined : [];
                break;
            default:
                parameter.value = parameter.optional ? undefined : defaultValueByType.get(parameter.type);
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
        parentParameter.value.splice(parentParameter.value.findIndex(p => p === parameter), 1);
        if (parentParameter.type === "array" /* ParameterType.ARRAY */) {
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
        // The suggestion box should only be shown for parameters of type string and boolean
        if (parameter.type === "string" /* ParameterType.STRING */) {
            const enums = this.enumsByName.get(`${parameter.typeRef}`) ?? {};
            return Object.values(enums);
        }
        if (parameter.type === "boolean" /* ParameterType.BOOLEAN */) {
            return ['true', 'false'];
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
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
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
            },
        };
        const viewOutput = {};
        this.#view(viewInput, viewOutput, this.contentElement);
    }
}
function isTypePrimitive(type) {
    if (type === "string" /* ParameterType.STRING */ || type === "boolean" /* ParameterType.BOOLEAN */ || type === "number" /* ParameterType.NUMBER */) {
        return true;
    }
    return false;
}
function renderTargetSelectorRow(input) {
    // clang-format off
    return html `
  <div class="row attribute padded">
    <div>target<span class="separator">:</span></div>
    <select class="target-selector"
            title=${i18nString(UIStrings.selectTarget)}
            jslog=${VisualLogging.dropDown('target-selector').track({ change: true })}
            @change=${input.onTargetSelected}>
      ${input.targets.map(target => html `
        <option jslog=${VisualLogging.item('target').track({ click: true })}
                value=${target.id()} ?selected=${target.id() === input.targetId}>
          ${target.name()} (${target.inspectedURL()})
        </option>`)}
    </select>
  </div>
`;
    // clang-format on
}
function renderInlineButton(opts) {
    return html `
          <devtools-button
            title=${opts.title}
            .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
            .iconName=${opts.iconName}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            class=${classMap(opts.classMap)}
            @click=${opts.onClick}
            .jslogContext=${opts.jslogContext}
          ></devtools-button>
      `;
}
function renderWarningIcon() {
    return html `<devtools-icon name='warning-filled' class='warning-icon small'>
  </devtools-icon>`;
}
/**
 * Renders the parameters list corresponding to a specific CDP command.
 */
function renderParameters(input, parameters, id, parentParameter, parentParameterId) {
    parameters.sort((a, b) => Number(a.optional) - Number(b.optional));
    // clang-format off
    return html `
    <ul>
      ${repeat(parameters, parameter => {
        const parameterId = parentParameter ? `${parentParameterId}` + '.' + `${parameter.name}` : parameter.name;
        const subparameters = parameter.type === "array" /* ParameterType.ARRAY */ || parameter.type === "object" /* ParameterType.OBJECT */ ? (parameter.value ?? []) : [];
        const isPrimitive = isTypePrimitive(parameter.type);
        const isArray = parameter.type === "array" /* ParameterType.ARRAY */;
        const isParentArray = parentParameter && parentParameter.type === "array" /* ParameterType.ARRAY */;
        const isParentObject = parentParameter && parentParameter.type === "object" /* ParameterType.OBJECT */;
        const isObject = parameter.type === "object" /* ParameterType.OBJECT */;
        const isParamValueUndefined = parameter.value === undefined;
        const isParamOptional = parameter.optional;
        const hasTypeRef = isObject && parameter.typeRef && input.typesByName.get(parameter.typeRef) !== undefined;
        // This variable indicates that this parameter is a parameter nested inside an object parameter
        // that no keys defined inside the CDP documentation.
        const hasNoKeys = parameter.isKeyEditable;
        const isCustomEditorDisplayed = isObject && !hasTypeRef;
        const hasOptions = parameter.type === "string" /* ParameterType.STRING */ || parameter.type === "boolean" /* ParameterType.BOOLEAN */;
        const canClearParameter = (isArray && !isParamValueUndefined && parameter.value?.length !== 0) || (isObject && !isParamValueUndefined);
        const parametersClasses = {
            'optional-parameter': parameter.optional,
            parameter: true,
            'undefined-parameter': parameter.value === undefined && parameter.optional,
        };
        const inputClasses = {
            'json-input': true,
        };
        return html `
              <li class="row">
                <div class="row-icons">
                    ${!parameter.isCorrectType ? html `${renderWarningIcon()}` : nothing}

                    <!-- If an object parameter has no predefined keys, show an input to enter the key, otherwise show the name of the parameter -->
                    <div class=${classMap(parametersClasses)} data-paramId=${parameterId}>
                        ${hasNoKeys ?
            html `<devtools-suggestion-input
                            data-paramId=${parameterId}
                            isKey=${true}
                            .isCorrectInput=${live(parameter.isCorrectType)}
                            .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                            .autocomplete=${false}
                            .value=${live(parameter.name ?? '')}
                            .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                            @blur=${input.onParameterKeyBlur}
                            @focus=${input.onParameterFocus}
                            @keydown=${input.onParameterKeydown}
                          ></devtools-suggestion-input>` :
            html `${parameter.name}`} <span class="separator">:</span>
                    </div>

                    <!-- Render button to add values inside an array parameter -->
                    ${isArray ? html `
                      ${renderInlineButton({
            title: i18nString(UIStrings.addParameter),
            iconName: 'plus',
            onClick: () => input.onAddParameter(parameterId),
            classMap: { 'add-button': true },
            jslogContext: 'protocol-monitor.add-parameter',
        })}
                    ` : nothing}

                    <!-- Render button to complete reset an array parameter or an object parameter-->
                    ${canClearParameter ?
            renderInlineButton({
                title: i18nString(UIStrings.resetDefaultValue),
                iconName: 'clear',
                onClick: () => input.onClearParameter(parameter, isParentArray),
                classMap: { 'clear-button': true },
                jslogContext: 'protocol-monitor.reset-to-default-value',
            }) : nothing}

                    <!-- Render the buttons to change the value from undefined to empty string for optional primitive parameters -->
                    ${isPrimitive && !isParentArray && isParamOptional && isParamValueUndefined ?
            html `  ${renderInlineButton({
                title: i18nString(UIStrings.addParameter),
                iconName: 'plus',
                onClick: () => input.onAddParameter(parameterId),
                classMap: { 'add-button': true },
                jslogContext: 'protocol-monitor.add-parameter',
            })}` : nothing}

                    <!-- Render the buttons to change the value from undefined to populate the values inside object with their default values -->
                    ${isObject && isParamOptional && isParamValueUndefined && hasTypeRef ?
            html `  ${renderInlineButton({
                title: i18nString(UIStrings.addParameter),
                iconName: 'plus',
                onClick: () => input.onAddParameter(parameterId),
                classMap: { 'add-button': true },
                jslogContext: 'protocol-monitor.add-parameter',
            })}` : nothing}
                </div>

                <div class="row-icons">
                    <!-- If an object has no predefined keys, show an input to enter the value, and a delete icon to delete the whole key/value pair -->
                    ${hasNoKeys && isParentObject ? html `
                    <!-- @ts-ignore -->
                    <devtools-suggestion-input
                        data-paramId=${parameterId}
                        .isCorrectInput=${live(parameter.isCorrectType)}
                        .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                        .autocomplete=${false}
                        .value=${live(parameter.value ?? '')}
                        .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                        .jslogContext=${'parameter-value'}
                        @blur=${input.onParameterValueBlur}
                        @focus=${input.onParameterFocus}
                        @keydown=${input.onParameterKeydown}
                      ></devtools-suggestion-input>

                      ${renderInlineButton({
            title: i18nString(UIStrings.deleteParameter),
            iconName: 'bin',
            onClick: () => input.onDeleteParameter(parameter, parentParameter),
            classMap: { deleteButton: true, deleteIcon: true },
            jslogContext: 'protocol-monitor.delete-parameter',
        })}` : nothing}

                  <!-- In case  the parameter is not optional or its value is not undefined render the input -->
                  ${isPrimitive && !hasNoKeys && (!isParamValueUndefined || !isParamOptional) && (!isParentArray) ?
            html `
                      <!-- @ts-ignore -->
                      <devtools-suggestion-input
                        data-paramId=${parameterId}
                        .strikethrough=${live(parameter.isCorrectType)}
                        .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                        .autocomplete=${false}
                        .value=${live(parameter.value ?? '')}
                        .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                        .jslogContext=${'parameter-value'}
                        @blur=${input.onParameterValueBlur}
                        @focus=${input.onParameterFocus}
                        @keydown=${input.onParameterKeydown}
                      ></devtools-suggestion-input>` : nothing}

                  <!-- Render the buttons to change the value from empty string to undefined for optional primitive parameters -->
                  ${isPrimitive && !hasNoKeys && !isParentArray && isParamOptional && !isParamValueUndefined ?
            html `  ${renderInlineButton({
                title: i18nString(UIStrings.resetDefaultValue),
                iconName: 'clear',
                onClick: () => input.onClearParameter(parameter),
                classMap: { 'clear-button': true },
                jslogContext: 'protocol-monitor.reset-to-default-value',
            })}` : nothing}

                  <!-- If the parameter is an object with no predefined keys, renders a button to add key/value pairs to it's value -->
                  ${isCustomEditorDisplayed ? html `
                    ${renderInlineButton({
            title: i18nString(UIStrings.addCustomProperty),
            iconName: 'plus',
            onClick: () => input.onAddParameter(parameterId),
            classMap: { 'add-button': true },
            jslogContext: 'protocol-monitor.add-custom-property',
        })}
                  ` : nothing}

                  <!-- In case the parameter is nested inside an array we render the input field as well as a delete button -->
                  ${isParentArray ? html `
                  <!-- If the parameter is an object we don't want to display the input field we just want the delete button-->
                  ${!isObject ? html `
                  <!-- @ts-ignore -->
                  <devtools-suggestion-input
                    data-paramId=${parameterId}
                    .options=${hasOptions ? input.computeDropdownValues(parameter) : []}
                    .autocomplete=${false}
                    .value=${live(parameter.value ?? '')}
                    .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                    .jslogContext=${'parameter'}
                    @blur=${input.onParameterValueBlur}
                    @keydown=${input.onParameterKeydown}
                    class=${classMap(inputClasses)}
                  ></devtools-suggestion-input>` : nothing}

                  ${renderInlineButton({
            title: i18nString(UIStrings.deleteParameter),
            iconName: 'bin',
            onClick: () => input.onDeleteParameter(parameter, parentParameter),
            classMap: { 'delete-button': true },
            jslogContext: 'protocol-monitor.delete-parameter',
        })}` : nothing}
                </div>
              </li>
              ${renderParameters(input, subparameters, id, parameter, parameterId)}
            `;
    })}
    </ul>
  `;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <div class="wrapper" @keydown=${input.onKeydown} jslog=${VisualLogging.pane('command-editor').track({ resize: true })}>
      <div class="editor-wrapper">
        ${renderTargetSelectorRow(input)}
        <div class="row attribute padded">
          <div class="command">command<span class="separator">:</span></div>
          <devtools-suggestion-input
            .options=${[...input.metadataByCommand.keys()]}
            .value=${input.command}
            .placeholder=${'Enter your command…'}
            .suggestionFilter=${suggestionFilter}
            .jslogContext=${'command'}
            @blur=${input.onCommandInputBlur}
            class=${classMap({ 'json-input': true })}
          ></devtools-suggestion-input>
        </div>
        ${input.parameters.length ? html `
        <div class="row attribute padded">
          <div>parameters<span class="separator">:</span></div>
        </div>
          ${renderParameters(input, input.parameters)}
        ` : nothing}
      </div>
      <devtools-toolbar class="protocol-monitor-sidebar-toolbar">
        <devtools-button title=${i18nString(UIStrings.copyCommand)}
                        .iconName=${'copy'}
                        .jslogContext=${'protocol-monitor.copy-command'}
                        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                        @click=${input.onCopyToClipboard}></devtools-button>
          <div class=toolbar-spacer></div>
        <devtools-button title=${Host.Platform.isMac() ? i18nString(UIStrings.sendCommandCmdEnter) : i18nString(UIStrings.sendCommandCtrlEnter)}
                        .iconName=${'send'}
                        jslogContext=${'protocol-monitor.send-command'}
                        .variant=${"primary_toolbar" /* Buttons.Button.Variant.PRIMARY_TOOLBAR */}
                        @click=${input.onCommandSend}></devtools-button>
      </devtools-toolbar>
    </div>`, target);
    // clang-format on
};
//# sourceMappingURL=JSONEditor.js.map