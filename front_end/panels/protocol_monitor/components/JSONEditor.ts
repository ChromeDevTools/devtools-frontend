// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './Toolbar.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as SuggestionInput from '../../../ui/components/suggestion_input/suggestion_input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as ElementsComponents from '../../elements/components/components.js';

import editorWidgetStyles from './JSONEditor.css.js';

const {html, Decorators, LitElement, Directives, nothing} = LitHtml;
const {customElement, property, state} = Decorators;
const {live, classMap, repeat} = Directives;

const UIStrings = {
  /**
   *@description The title of a button that deletes a parameter.
   */
  deleteParameter: 'Delete parameter',
  /**
   *@description The title of a button that adds a parameter.
   */
  addParameter: 'Add a parameter',
  /**
   *@description The title of a button that reset the value of a paremeters to its default value.
   */
  resetDefaultValue: 'Reset to default value',
  /**
   *@description The title of a button to add custom key/value pairs to object parameters with no keys defined
   */
  addCustomProperty: 'Add custom property',
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/components/JSONEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-json-editor': JSONEditor;
  }
}

export const enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

interface BaseParameter {
  optional: boolean;
  name: string;
  typeRef?: string;
  description: string;
  isCorrectType?: boolean;
  isKeyEditable?: boolean;
}

interface ArrayParameter extends BaseParameter {
  type: ParameterType.ARRAY;
  value?: Parameter[];
}

interface NumberParameter extends BaseParameter {
  type: ParameterType.NUMBER;
  value?: number;
}

interface StringParameter extends BaseParameter {
  type: ParameterType.STRING;
  value?: string;
}

interface BooleanParameter extends BaseParameter {
  type: ParameterType.BOOLEAN;
  value?: boolean;
}

interface ObjectParameter extends BaseParameter {
  type: ParameterType.OBJECT;
  value?: Parameter[];
}

export type Parameter = ArrayParameter|NumberParameter|StringParameter|BooleanParameter|ObjectParameter;

export interface Command {
  command: string;
  parameters: {[x: string]: unknown};
  targetId?: string;
}

/**
 * Parents should listen for this event and register the listeners provided by
 * this event"
 */
export class SubmitEditorEvent extends Event {
  static readonly eventName = 'submiteditor';
  readonly data: Command;

  constructor(data: Command) {
    super(SubmitEditorEvent.eventName);
    this.data = data;
  }
}

const splitDescription = (description: string): [string, string] => {
  // If the description is too long we make the UI a bit better by highlighting the first sentence
  // which contains the most informations.
  // The number 150 has been chosen arbitrarily
  if (description.length > 150) {
    const [firstSentence, restOfDescription] = description.split('.');
    // To make the UI nicer, we add a dot at the end of the first sentence.
    firstSentence + '.';
    return [firstSentence, restOfDescription];
  }
  return [description, ''];
};

const defaultValueByType = new Map<string, string|number|boolean>([
  ['string', ''],
  ['number', 0],
  ['boolean', false],
]);

const DUMMY_DATA = 'dummy';
const EMPTY_STRING = '<empty_string>';

export function suggestionFilter(option: string, query: string): boolean {
  return option.toLowerCase().includes(query.toLowerCase());
}

@customElement('devtools-json-editor')
export class JSONEditor extends LitElement {
  static override styles = [editorWidgetStyles];
  @property({attribute: false})
  declare metadataByCommand: Map<string, {parameters: Parameter[], description: string, replyArgs: string[]}>;
  @property({attribute: false}) declare typesByName: Map<string, Parameter[]>;
  @property({attribute: false}) declare enumsByName: Map<string, Record<string, string>>;
  @state() declare parameters: Parameter[];
  @state() declare targets: SDK.Target.Target[];
  @state() command: string = '';
  @state() targetId?: string;

  #hintPopoverHelper?: UI.PopoverHelper.PopoverHelper;

  constructor() {
    super();
    this.parameters = [];
    this.targets = [];
    this.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        this.#handleParameterInputKeydown(event);
        this.dispatchEvent(new SubmitEditorEvent({
          command: this.command,
          parameters: this.getParameters(),
          targetId: this.targetId,
        }));
      }
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#hintPopoverHelper = new UI.PopoverHelper.PopoverHelper(
        this, event => this.#handlePopoverDescriptions(event), 'protocol-monitor.hint');
    this.#hintPopoverHelper.setDisableOnClick(true);
    this.#hintPopoverHelper.setTimeout(300);
    this.#hintPopoverHelper.setHasPadding(true);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.addEventListener(
        SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED, this.#handleAvailableTargetsChanged, this);
    this.#handleAvailableTargetsChanged();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#hintPopoverHelper?.hidePopover();
    this.#hintPopoverHelper?.dispose();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.removeEventListener(
        SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED, this.#handleAvailableTargetsChanged, this);
  }

  #handleAvailableTargetsChanged(): void {
    this.targets = SDK.TargetManager.TargetManager.instance().targets();
    if (this.targets.length && this.targetId === undefined) {
      this.targetId = this.targets[0].id();
    }
  }

  getParameters(): {[key: string]: unknown} {
    const formatParameterValue = (parameter: Parameter): unknown => {
      if (parameter.value === undefined) {
        return;
      }
      switch (parameter.type) {
        case ParameterType.NUMBER: {
          return Number(parameter.value);
        }
        case ParameterType.BOOLEAN: {
          return Boolean(parameter.value);
        }
        case ParameterType.OBJECT: {
          const nestedParameters: {[key: string]: unknown} = {};
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
        case ParameterType.ARRAY: {
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

    const formattedParameters: {[key: string]: unknown} = {};
    for (const parameter of this.parameters) {
      formattedParameters[parameter.name] = formatParameterValue(parameter);
    }
    return formatParameterValue({
             type: ParameterType.OBJECT,
             name: DUMMY_DATA,
             optional: true,
             value: this.parameters,
             description: '',
           }) as {[key: string]: unknown};
  }

  // Displays a command entered in the input bar inside the editor
  displayCommand(command: string, parameters: Record<string, unknown>, targetId?: string): void {
    this.targetId = targetId;
    this.command = command;
    const schema = this.metadataByCommand.get(this.command);
    if (!schema?.parameters) {
      return;
    }
    this.populateParametersForCommandWithDefaultValues();

    const displayedParameters = this.#convertObjectToParameterSchema(
                                        '', parameters, {
                                          typeRef: DUMMY_DATA,
                                          type: ParameterType.OBJECT,
                                          name: '',
                                          description: '',
                                          optional: true,
                                          value: [],
                                        },
                                        schema.parameters)
                                    .value as Parameter[];

    const valueByName = new Map(this.parameters.map(param => [param.name, param]));
    for (const param of displayedParameters) {
      const existingParam = valueByName.get(param.name);
      if (existingParam) {
        existingParam.value = param.value;
      }
    }

    this.requestUpdate();
  }

  #convertObjectToParameterSchema(key: string, value: unknown, schema?: Parameter, initialSchema?: Parameter[]):
      Parameter {
    const type = schema?.type || typeof value;
    const description = schema?.description ?? '';
    const optional = schema?.optional ?? true;

    switch (type) {
      case ParameterType.STRING:
      case ParameterType.BOOLEAN:
      case ParameterType.NUMBER:
        return this.#convertPrimitiveParameter(key, value, schema);
      case ParameterType.OBJECT:
        return this.#convertObjectParameter(key, value, schema, initialSchema);
      case ParameterType.ARRAY:
        return this.#convertArrayParameter(key, value, schema);
    }
    return {
      type,
      name: key,
      optional,
      typeRef: schema?.typeRef,
      value,
      description,
    } as Parameter;
  }

  #convertPrimitiveParameter(key: string, value: unknown, schema?: Parameter): Parameter {
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
    } as Parameter;
  }

  #convertObjectParameter(key: string, value: unknown, schema?: Parameter, initialSchema?: Parameter[]): Parameter {
    const description = schema?.description ?? '';
    if (typeof value !== 'object' || value === null) {
      throw Error('The value is not an object');
    }
    const typeRef = schema?.typeRef;
    if (!typeRef) {
      throw Error('Every object parameters should have a type ref');
    }

    const nestedType = typeRef === DUMMY_DATA ? initialSchema : this.typesByName.get(typeRef);

    if (!nestedType) {
      throw Error('No nested type for keys were found');
    }
    const objectValues = [];
    for (const objectKey of Object.keys(value)) {
      const objectType = nestedType.find(param => param.name === objectKey);
      objectValues.push(
          this.#convertObjectToParameterSchema(objectKey, (value as Record<string, unknown>)[objectKey], objectType));
    }
    return {
      type: ParameterType.OBJECT,
      name: key,
      optional: schema.optional,
      typeRef: schema.typeRef,
      value: objectValues,
      description,
      isCorrectType: true,
    };
  }

  #convertArrayParameter(key: string, value: unknown, schema?: Parameter): Parameter {
    const description = schema?.description ?? '';
    const optional = schema?.optional ?? true;
    const typeRef = schema?.typeRef;
    if (!typeRef) {
      throw Error('Every array parameters should have a type ref');
    }

    if (!Array.isArray(value)) {
      throw Error('The value is not an array');
    }
    const nestedType = this.#isTypePrimitive(typeRef) ? undefined : {
      optional: true,
      type: ParameterType.OBJECT as ParameterType.OBJECT,
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
      type: ParameterType.ARRAY,
      name: key,
      optional,
      typeRef: schema?.typeRef,
      value: objectValues,
      description,
      isCorrectType: true,
    };
  }

  #handlePopoverDescriptions(event: MouseEvent):
      {box: AnchorBox, show: (popover: UI.GlassPane.GlassPane) => Promise<boolean>}|null {
    const hintElement = event.composedPath()[0] as HTMLElement;
    const elementData = this.#getDescriptionAndTypeForElement(hintElement);
    if (!elementData?.description) {
      return null;
    }
    const [head, tail] = splitDescription(elementData.description);
    const type = elementData.type;
    const replyArgs = elementData.replyArgs;
    let popupContent = '';
    // replyArgs and type cannot get into conflict because replyArgs is attached to a command and type to a parameter
    if (replyArgs) {
      popupContent = tail + `Returns: ${replyArgs}<br>`;
    } else if (type) {
      popupContent = tail + `<br>Type: ${type}<br>`;
    } else {
      popupContent = tail;
    }

    return {
      box: hintElement.boxInWindow(),
      show: async (popover: UI.GlassPane.GlassPane) => {
        const popupElement = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView({
          getMessage: () => `<code><span>${head}</span></code>`,
          getPossibleFixMessage: () => popupContent,
          getLearnMoreLink: () =>
              `https://chromedevtools.github.io/devtools-protocol/tot/${this.command.split('.')[0]}/`,
        });
        popover.contentElement.appendChild(popupElement);
        return true;
      },
    };
  }

  #getDescriptionAndTypeForElement(hintElement: HTMLElement):
      {description: string, type?: ParameterType, replyArgs?: string[]}|undefined {
    if (hintElement.matches('.command')) {
      const metadata = this.metadataByCommand.get(this.command);
      if (metadata) {
        return {description: metadata.description, replyArgs: metadata.replyArgs};
      }
    }
    if (hintElement.matches('.parameter')) {
      const id = hintElement.dataset.paramid;
      if (!id) {
        return;
      }
      const pathArray = id.split('.');
      const {parameter} = this.#getChildByPath(pathArray);
      if (!parameter.description) {
        return;
      }
      return {description: parameter.description, type: parameter.type};
    }
    return;
  }

  getCommandJson(): string {
    return this.command !== '' ? JSON.stringify({command: this.command, parameters: this.getParameters()}) : '';
  }

  #copyToClipboard(): void {
    const commandJson = this.getCommandJson();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commandJson);
  }

  #handleCommandSend(): void {
    this.dispatchEvent(new SubmitEditorEvent({
      command: this.command,
      parameters: this.getParameters(),
      targetId: this.targetId,
    }));
  }

  populateParametersForCommandWithDefaultValues(): void {
    const commandParameters = this.metadataByCommand.get(this.command)?.parameters;
    if (!commandParameters) {
      return;
    }

    this.parameters = commandParameters.map((parameter: Parameter) => {
      return this.#populateParameterDefaults(parameter);
    });
  }

  #populateParameterDefaults(parameter: Parameter): Parameter {
    if (parameter.type === ParameterType.OBJECT) {
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
      } as Parameter;
    }
    if (parameter.type === ParameterType.ARRAY) {
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
    } as Parameter;
  }

  #getChildByPath(pathArray: string[]): {parameter: Parameter, parentParameter: Parameter} {
    let parameters = this.parameters;
    let parentParameter;
    for (let i = 0; i < pathArray.length; i++) {
      const name = pathArray[i];
      const parameter = parameters.find(param => param.name === name);
      if (i === pathArray.length - 1) {
        return {parameter, parentParameter} as {parameter: Parameter, parentParameter: Parameter};
      }
      if (parameter?.type === ParameterType.ARRAY || parameter?.type === ParameterType.OBJECT) {
        if (parameter.value) {
          parameters = parameter.value;
        }
      } else {
        throw new Error('Parameter on the path in not an object or an array');
      }
      parentParameter = parameter;
    }
    throw new Error('Not found');
  }

  #isValueOfCorrectType(parameter: Parameter, value: string): boolean {
    if (parameter.type === ParameterType.NUMBER && isNaN(Number(value))) {
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

  #saveParameterValue = (event: Event): void => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    let value: string;
    if (event instanceof KeyboardEvent) {
      const editableContent = event.target.renderRoot.querySelector('devtools-editable-content');
      if (!editableContent) {
        return;
      }
      value = editableContent.innerText;
    } else {
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
    } else {
      object.value = value;
      object.isCorrectType = this.#isValueOfCorrectType(object, value);
    }
    // Needed to render the delete button for object parameters
    this.requestUpdate();
  };

  #saveNestedObjectParameterKey = (event: Event): void => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    const value = event.target.value;
    const paramId = event.target.getAttribute('data-paramid');
    if (!paramId) {
      return;
    }
    const pathArray = paramId.split('.');
    const {parameter} = this.#getChildByPath(pathArray);
    parameter.name = value;
    // Needed to render the delete button for object parameters
    this.requestUpdate();
  };

  #handleParameterInputKeydown = (event: KeyboardEvent): void => {
    if (!(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput)) {
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      this.#saveParameterValue(event);
    }
  };

  #handleFocusParameter(event: Event): void {
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

  #handleCommandInputBlur = async(event: Event): Promise<void> => {
    if (event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput) {
      this.command = event.target.value;
    }
    this.populateParametersForCommandWithDefaultValues();
  };

  #computeTargetLabel(target: SDK.Target.Target): string|void {
    if (!target) {
      return;
    }
    return `${target.name()} (${target.inspectedURL()})`;
  }

  #isTypePrimitive(type: string): boolean {
    if (type === ParameterType.STRING || type === ParameterType.BOOLEAN || type === ParameterType.NUMBER) {
      return true;
    }
    return false;
  }

  #createNestedParameter(type: Parameter, name: string): Parameter {
    if (type.type === ParameterType.OBJECT) {
      let typeRef = type.typeRef;
      if (!typeRef) {
        typeRef = DUMMY_DATA;
      }
      const nestedTypes = this.typesByName.get(typeRef) ?? [];

      const nestedValue: Parameter[] =
          nestedTypes.map(nestedType => this.#createNestedParameter(nestedType, nestedType.name));

      return {
        type: ParameterType.OBJECT,
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
    } as Parameter;
  }

  #handleAddParameter(parameterId: string): void {
    const pathArray = parameterId.split('.');
    const {parameter, parentParameter} = this.#getChildByPath(pathArray);
    if (!parameter) {
      return;
    }

    switch (parameter.type) {
      case ParameterType.ARRAY: {
        const typeRef = parameter.typeRef;
        if (!typeRef) {
          throw Error('Every array parameter must have a typeRef');
        }

        const nestedType = this.typesByName.get(typeRef) ?? [];
        const nestedValue: Parameter[] = nestedType.map(type => this.#createNestedParameter(type, type.name));

        let type = this.#isTypePrimitive(typeRef) ? typeRef : ParameterType.OBJECT;

        // If the typeRef is actually a ref to an enum type, the type of the nested param should be a string
        if (nestedType.length === 0) {
          if (this.enumsByName.get(typeRef)) {
            type = ParameterType.STRING;
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
        } as Parameter);
        break;
      }
      case ParameterType.OBJECT: {
        let typeRef = parameter.typeRef;
        if (!typeRef) {
          typeRef = DUMMY_DATA;
        }
        if (!parameter.value) {
          parameter.value = [];
        }
        if (!this.typesByName.get(typeRef)) {
          parameter.value.push({
            type: ParameterType.STRING,
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
        const nestedValue: Parameter[] =
            nestedTypes.map(nestedType => this.#createNestedParameter(nestedType, nestedType.name));
        const nestedParameters = nestedTypes.map(nestedType => {
          return this.#populateParameterDefaults(nestedType);
        });

        if (parentParameter) {
          parameter.value.push({
            type: ParameterType.OBJECT,
            name: '',
            optional: true,
            typeRef,
            value: nestedValue,
            isCorrectType: true,
            description: '',
          });
        } else {
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

  #handleClearParameter(parameter: Parameter, isParentArray?: boolean): void {
    if (!parameter || parameter.value === undefined) {
      return;
    }

    switch (parameter.type) {
      case ParameterType.OBJECT:
        if (parameter.optional && !isParentArray) {
          parameter.value = undefined;
          break;
        }
        if (!parameter.typeRef || !this.typesByName.get(parameter.typeRef)) {
          parameter.value = [];
        } else {
          parameter.value.forEach(param => this.#handleClearParameter(param, isParentArray));
        }
        break;

      case ParameterType.ARRAY:
        parameter.value = parameter.optional ? undefined : [];
        break;

      default:
        parameter.value = parameter.optional ? undefined : defaultValueByType.get(parameter.type);
        parameter.isCorrectType = true;
        break;
    }

    this.requestUpdate();
  }

  #handleDeleteParameter(parameter: Parameter, parentParameter: Parameter): void {
    if (!parameter) {
      return;
    }
    if (!Array.isArray(parentParameter.value)) {
      return;
    }
    parentParameter.value.splice(parentParameter.value.findIndex(p => p === parameter), 1);

    if (parentParameter.type === ParameterType.ARRAY) {
      for (let i = 0; i < parentParameter.value.length; i++) {
        parentParameter.value[i].name = String(i);
      }
    }
    this.requestUpdate();
  }

  #renderTargetSelectorRow(): LitHtml.TemplateResult|undefined {
    const target = this.targets.find(el => el.id() === this.targetId);
    const targetLabel = target ? this.#computeTargetLabel(target) : this.#computeTargetLabel(this.targets[0]);

    // clang-format off
    return html`
    <div class="row attribute padded">
      <div>target<span class="separator">:</span></div>
      <${Menus.SelectMenu.SelectMenu.litTagName}
            class="target-select-menu"
            @selectmenuselected=${this.#onTargetSelected}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .showConnector=${false}
            .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
            .buttonTitle=${targetLabel}
            jslog=${VisualLogging.dropDown('targets').track({click: true})}
          >
          ${repeat(this.targets, target => {
          return LitHtml.html`
                <${Menus.Menu.MenuItem.litTagName}
                  .value=${target.id()}>
                    ${this.#computeTargetLabel(target)}
                </${Menus.Menu.MenuItem.litTagName}>
              `;
        },
    )}
          </${Menus.SelectMenu.SelectMenu.litTagName}>
    </div>
  `;
    // clang-format on
  }

  #onTargetSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.targetId = event.itemValue as string;
    this.requestUpdate();
  }

  #computeDropdownValues(parameter: Parameter): string[] {
    // The suggestion box should only be shown for parameters of type string and boolean
    if (parameter.type === ParameterType.STRING) {
      const enums = this.enumsByName.get(`${parameter.typeRef}`) ?? {};
      return Object.values(enums);
    }
    if (parameter.type === ParameterType.BOOLEAN) {
      return ['true', 'false'];
    }
    return [];
  }

  #renderInlineButton(opts: {
    title: string,
    iconName: string,
    classMap: {[name: string]: string|boolean|number},
    onClick: (event: MouseEvent) => void,
    jslogContext: string,
  }): LitHtml.TemplateResult|undefined {
    return html`
          <devtools-button
            title=${opts.title}
            .size=${Buttons.Button.Size.SMALL}
            .iconName=${opts.iconName}
            .variant=${Buttons.Button.Variant.ICON}
            class=${classMap(opts.classMap)}
            @click=${opts.onClick}
            .jslogContext=${opts.jslogContext}
          ></devtools-button>
        `;
  }

  #renderWarningIcon(): LitHtml.TemplateResult|undefined {
    return LitHtml.html`<${IconButton.Icon.Icon.litTagName}
    .data=${{
      iconName: 'warning-filled',
      color: 'var(--icon-warning)',
      width: '14px',
      height: '14px',
    } as IconButton.Icon.IconData}
    class=${classMap({
      'warning-icon': true,
    })}
  >
  </${IconButton.Icon.Icon.litTagName}>`;
  }

  /**
   * Renders the parameters list corresponding to a specific CDP command.
   */
  #renderParameters(parameters: Parameter[], id?: string, parentParameter?: Parameter, parentParameterId?: string):
      LitHtml.TemplateResult|undefined {
    parameters.sort((a, b) => Number(a.optional) - Number(b.optional));

    // clang-format off
    return html`
      <ul>
        ${repeat(parameters, parameter => {
          const parameterId = parentParameter ? `${parentParameterId}` + '.' + `${parameter.name}` : parameter.name;
          const subparameters: Parameter[] = parameter.type === ParameterType.ARRAY || parameter.type === ParameterType.OBJECT ? (parameter.value ?? []) : [];
          const handleInputOnBlur = (event: Event): void => {
            this.#saveParameterValue(event);
          };
          const handleKeydown = (event: KeyboardEvent): void => {
            this.#handleParameterInputKeydown(event);
          };
          const handleFocus = (event: Event): void => {
            this.#handleFocusParameter(event);
          };
          const handleParamKeyOnBlur = (event: Event): void => {
            this.#saveNestedObjectParameterKey(event);
          };
          const isPrimitive = this.#isTypePrimitive(parameter.type);
          const isArray = parameter.type === ParameterType.ARRAY;
          const isParentArray = parentParameter && parentParameter.type === ParameterType.ARRAY;
          const isParentObject = parentParameter && parentParameter.type === ParameterType.OBJECT;

          const isObject = parameter.type === ParameterType.OBJECT;
          const isParamValueUndefined = parameter.value === undefined;
          const isParamOptional = parameter.optional;
          const hasTypeRef = isObject && parameter.typeRef && this.typesByName.get(parameter.typeRef) !== undefined;
          // This variable indicates that this parameter is a parameter nested inside an object parameter
          // that no keys defined inside the CDP documentation.
          const hasNoKeys = parameter.isKeyEditable;
          const isCustomEditorDisplayed = isObject && !hasTypeRef;
          const hasOptions = parameter.type === ParameterType.STRING || parameter.type === ParameterType.BOOLEAN;
          const canClearParameter = (isArray && !isParamValueUndefined && parameter.value?.length !== 0) || (isObject && !isParamValueUndefined);
          const parametersClasses = {
            'optional-parameter': parameter.optional,
            parameter: true,
            'undefined-parameter': parameter.value === undefined && parameter.optional,
          };
          const inputClasses = {
            'json-input': true,
          };
          return html`
                <li class="row">
                  <div class="row-icons">
                      ${!parameter.isCorrectType ? html`${this.#renderWarningIcon()}` : nothing}

                      <!-- If an object parameter has no predefined keys, show an input to enter the key, otherwise show the name of the parameter -->
                      <div class=${classMap(parametersClasses)} data-paramId=${parameterId}>
                          ${hasNoKeys ?
                            html`<devtools-suggestion-input
                              data-paramId=${parameterId}
                              isKey=${true}
                              .isCorrectInput=${live(parameter.isCorrectType)}
                              .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                              .autocomplete=${false}
                              .value=${live(parameter.name ?? '')}
                              .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                              @blur=${handleParamKeyOnBlur}
                              @focus=${handleFocus}
                              @keydown=${handleKeydown}
                            ></devtools-suggestion-input>`:
                            html`${parameter.name}`} <span class="separator">:</span>
                      </div>

                      <!-- Render button to add values inside an array parameter -->
                      ${isArray ? html`
                        ${this.#renderInlineButton({
                            title: i18nString(UIStrings.addParameter),
                            iconName: 'plus',
                            onClick: () => this.#handleAddParameter(parameterId),
                            classMap: { 'add-button': true },
                            jslogContext: 'protocol-monitor.add-parameter',
                          })}
                      `: nothing}

                      <!-- Render button to complete reset an array parameter or an object parameter-->
                      ${canClearParameter ?
                      this.#renderInlineButton({
                        title: i18nString(UIStrings.resetDefaultValue),
                        iconName: 'clear',
                        onClick: () => this.#handleClearParameter(parameter, isParentArray),
                        classMap: {'clear-button': true},
                        jslogContext: 'protocol-monitor.reset-to-default-value',
                      }) : nothing}

                      <!-- Render the buttons to change the value from undefined to empty string for optional primitive parameters -->
                      ${isPrimitive && !isParentArray && isParamOptional && isParamValueUndefined ?
                          html`  ${this.#renderInlineButton({
                            title: i18nString(UIStrings.addParameter),
                            iconName: 'plus',
                            onClick: () => this.#handleAddParameter(parameterId),
                            classMap: { 'add-button': true },
                            jslogContext: 'protocol-monitor.add-parameter',
                      })}` : nothing}

                      <!-- Render the buttons to change the value from undefined to populate the values inside object with their default values -->
                      ${isObject && isParamOptional && isParamValueUndefined && hasTypeRef ?
                          html`  ${this.#renderInlineButton({
                            title: i18nString(UIStrings.addParameter),
                            iconName: 'plus',
                            onClick: () => this.#handleAddParameter(parameterId),
                            classMap: { 'add-button': true },
                            jslogContext: 'protocol-monitor.add-parameter',
                          })}` : nothing}
                  </div>

                  <div class="row-icons">
                      <!-- If an object has no predefined keys, show an input to enter the value, and a delete icon to delete the whole key/value pair -->
                      ${hasNoKeys && isParentObject ?  html`
                      <!-- @ts-ignore -->
                      <devtools-suggestion-input
                          data-paramId=${parameterId}
                          .isCorrectInput=${live(parameter.isCorrectType)}
                          .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                          .autocomplete=${false}
                          .value=${live(parameter.value ?? '')}
                          .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                          .jslogContext=${'parameter-value'}
                          @blur=${handleInputOnBlur}
                          @focus=${handleFocus}
                          @keydown=${handleKeydown}
                        ></devtools-suggestion-input>

                        ${this.#renderInlineButton({
                        title: i18nString(UIStrings.deleteParameter),
                        iconName: 'bin',
                        onClick: () => this.#handleDeleteParameter(parameter, parentParameter),
                        classMap: { deleteButton: true, deleteIcon: true },
                        jslogContext: 'protocol-monitor.delete-parameter',
                      })}`: nothing}

                    <!-- In case  the parameter is not optional or its value is not undefined render the input -->
                    ${isPrimitive && !hasNoKeys && (!isParamValueUndefined || !isParamOptional) && (!isParentArray) ?
                      html`
                        <!-- @ts-ignore -->
                        <devtools-suggestion-input
                          data-paramId=${parameterId}
                          .strikethrough=${live(parameter.isCorrectType)}
                          .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                          .autocomplete=${false}
                          .value=${live(parameter.value ?? '')}
                          .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                          .jslogContext=${'parameter-value'}
                          @blur=${handleInputOnBlur}
                          @focus=${handleFocus}
                          @keydown=${handleKeydown}
                        ></devtools-suggestion-input>` : nothing}

                    <!-- Render the buttons to change the value from empty string to undefined for optional primitive parameters -->
                    ${isPrimitive &&!hasNoKeys && !isParentArray && isParamOptional && !isParamValueUndefined ?
                        html`  ${this.#renderInlineButton({
                          title: i18nString(UIStrings.resetDefaultValue),
                          iconName: 'clear',
                          onClick: () => this.#handleClearParameter(parameter),
                          classMap: { 'clear-button': true },
                          jslogContext: 'protocol-monitor.reset-to-default-value',
                        })}` : nothing}

                    <!-- If the parameter is an object with no predefined keys, renders a button to add key/value pairs to it's value -->
                    ${isCustomEditorDisplayed ? html`
                      ${this.#renderInlineButton({
                        title: i18nString(UIStrings.addCustomProperty),
                        iconName: 'plus',
                        onClick: () => this.#handleAddParameter(parameterId),
                        classMap: { 'add-button': true },
                        jslogContext: 'protocol-monitor.add-custom-property',
                      })}
                    ` : nothing}

                    <!-- In case the parameter is nested inside an array we render the input field as well as a delete button -->
                    ${isParentArray ? html`
                    <!-- If the parameter is an object we don't want to display the input field we just want the delete button-->
                    ${!isObject ? html`
                    <!-- @ts-ignore -->
                    <devtools-suggestion-input
                      data-paramId=${parameterId}
                      .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                      .autocomplete=${false}
                      .value=${live(parameter.value ?? '')}
                      .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                      .jslogContext=${'parameter'}
                      @blur=${handleInputOnBlur}
                      @keydown=${handleKeydown}
                      class=${classMap(inputClasses)}
                    ></devtools-suggestion-input>` : nothing}

                    ${this.#renderInlineButton({
                        title: i18nString(UIStrings.deleteParameter),
                        iconName: 'bin',
                        onClick: () => this.#handleDeleteParameter(parameter, parentParameter),
                        classMap: { 'delete-button': true },
                        jslogContext: 'protocol-monitor.delete-parameter',
                      })}` : nothing}
                  </div>
                </li>
                ${this.#renderParameters(subparameters, id, parameter, parameterId)}
              `;
          })}
      </ul>
    `;
    // clang-format on
  }

  override render(): LitHtml.TemplateResult {
    // clang-format off
    return html`
    <div class="wrapper">
      ${this.#renderTargetSelectorRow()}
      <div class="row attribute padded">
        <div class="command">command<span class="separator">:</span></div>
        <devtools-suggestion-input
          .options=${[...this.metadataByCommand.keys()]}
          .value=${this.command}
          .placeholder=${'Enter your command...'}
          .suggestionFilter=${suggestionFilter}
          .jslogContext=${'command'}
          @blur=${this.#handleCommandInputBlur}
          class=${classMap({'json-input': true})}
        ></devtools-suggestion-input>
      </div>
      ${this.parameters.length ? html`
      <div class="row attribute padded">
        <div>parameters<span class="separator">:</span></div>
      </div>
        ${this.#renderParameters(this.parameters)}
      ` : nothing}
    </div>
    <devtools-pm-toolbar @copycommand=${this.#copyToClipboard} @commandsent=${this.#handleCommandSend}></devtools-pm-toolbar>`;
    // clang-format on
  }
}
