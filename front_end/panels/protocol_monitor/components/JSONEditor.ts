// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../recorder/components/components.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as ElementsComponents from '../../elements/components/components.js';
import * as RecorderComponents from '../../recorder/components/components.js';

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
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/components/JSONEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-json-editor': JSONEditor;
  }
}

export const enum ParameterType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Object = 'object',
}

interface BaseParameter {
  optional: boolean;
  name: string;
  typeRef?: string;
  description: string;
}

interface ArrayParameter extends BaseParameter {
  type: ParameterType.Array;
  value: Parameter[];
}

interface NumberParameter extends BaseParameter {
  type: ParameterType.Number;
  value?: number;
}

interface StringParameter extends BaseParameter {
  type: ParameterType.String;
  value?: string;
}

interface BooleanParameter extends BaseParameter {
  type: ParameterType.Boolean;
  value?: boolean;
}

interface ObjectParameter extends BaseParameter {
  type: ParameterType.Object;
  value: Parameter[];
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

@customElement('devtools-json-editor')
export class JSONEditor extends LitElement {
  static override styles = [editorWidgetStyles];
  @property()
  declare metadataByCommand: Map<string, {parameters: Parameter[], description: string, replyArgs: string[]}>;
  @property() declare typesByName: Map<string, Parameter[]>;
  @property() declare enumsByName: Map<string, Record<string, string>>;
  @property() declare targetManager;
  @state() declare parameters: Parameter[];
  @state() command: string = '';
  @state() targetId?: string;

  #hintPopoverHelper?: UI.PopoverHelper.PopoverHelper;

  constructor() {
    super();
    this.parameters = [];
    this.targetManager = SDK.TargetManager.TargetManager.instance();
    this.targetId = this.targetManager.targets().length !== 0 ? this.targetManager.targets()[0].id() : undefined;
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
    this.#hintPopoverHelper = new UI.PopoverHelper.PopoverHelper(this, event => this.#handlePopoverDescriptions(event));
    this.#hintPopoverHelper.setDisableOnClick(true);
    this.#hintPopoverHelper.setTimeout(300);
    this.#hintPopoverHelper.setHasPadding(true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#hintPopoverHelper?.hidePopover();
    this.#hintPopoverHelper?.dispose();
  }

  getParameters(): {[key: string]: unknown} {
    const formatParameterValue = (parameter: Parameter): unknown => {
      if (parameter.value === undefined) {
        return;
      }
      switch (parameter.type) {
        case ParameterType.Number: {
          return Number(parameter.value);
        }
        case ParameterType.Boolean: {
          return Boolean(parameter.value);
        }
        case ParameterType.Object: {
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
        case ParameterType.Array: {
          const nestedArrayParameters = [];
          for (const subParameter of parameter.value) {
            nestedArrayParameters.push(formatParameterValue(subParameter));
          }
          return nestedArrayParameters;
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
             type: ParameterType.Object,
             name: DUMMY_DATA,
             optional: true,
             value: this.parameters,
             description: '',
           }) as {[key: string]: unknown};
  }

  // Displays a command entered in the input bar inside the editor
  displayCommand(command: string, parameters: Record<string, unknown>): void {
    this.command = command;
    const schema = this.metadataByCommand.get(this.command);
    if (!schema?.parameters) {
      return;
    }
    this.parameters = this.#convertObjectToParameterSchema(
                              '', parameters, {
                                'typeRef': DUMMY_DATA,
                                'type': ParameterType.Object,
                                'name': '',
                                'description': '',
                                'optional': true,
                                'value': [],
                              },
                              schema.parameters)
                          .value as Parameter[];
    this.requestUpdate();
  }

  #convertObjectToParameterSchema(key: string, value: unknown, schema?: Parameter, initialSchema?: Parameter[]):
      Parameter {
    const type = schema?.type || typeof value;
    const description = schema?.description ?? '';
    const optional = schema?.optional ?? true;

    switch (type) {
      case ParameterType.String:
      case ParameterType.Boolean:
      case ParameterType.Number:
        return this.#convertPrimitiveParameter(key, value, schema);
      case ParameterType.Object:
        return this.#convertObjectParameter(key, value, schema, initialSchema);
      case ParameterType.Array:
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
      type: ParameterType.Object,
      name: key,
      optional: schema.optional,
      typeRef: schema.typeRef,
      value: objectValues,
      description,
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
      type: ParameterType.Object as ParameterType.Object,
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
      type: ParameterType.Array,
      name: key,
      optional: optional,
      typeRef: schema?.typeRef,
      value: objectValues,
      description,
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
      show: async(popover: UI.GlassPane.GlassPane): Promise<boolean> => {
        const popupElement = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView({
          'getMessage': (): string => `<code><span>${head}</span></code>`,
          'getPossibleFixMessage': (): string => popupContent,
          'getLearnMoreLink': (): string =>
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
      const realParamId = id.split('.');
      const {parameter} = this.#getChildByPath(realParamId);
      if (!parameter.description) {
        return;
      }
      return {description: parameter.description, type: parameter.type};
    }
    return;
  }

  #copyToClipboard(): void {
    const commandJson = JSON.stringify({command: this.command, parameters: this.getParameters()});
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
      if (parameter.type === ParameterType.Object) {
        const typeInfos = this.typesByName.get(parameter.typeRef as string) ?? [];
        return {
          optional: parameter.optional,
          type: parameter.type,
          description: parameter.description,
          typeRef: parameter.typeRef,
          value: typeInfos.map(type => {
            return {
              optional: type.optional,
              type: this.#isParameterSupported(parameter) ? type.type : ParameterType.String,
              name: type.name,
              description: type.description,
              value: type.optional ? undefined : defaultValueByType.get(type.type),
            } as Parameter;
          }),
          name: parameter.name,
        };
      }
      if (parameter.type === ParameterType.Array) {
        return {
          optional: parameter.optional,
          type: parameter.type,
          description: parameter.description,
          typeRef: parameter.typeRef,
          value: [],
          name: parameter.name,
        };
      }
      return {
        optional: parameter.optional,
        type: parameter.type,
        typeRef: this.#isParameterSupported(parameter) ? parameter.typeRef : ParameterType.String,
        value: parameter.optional ? undefined : defaultValueByType.get(parameter.type),
        name: parameter.name,
        description: parameter.description,
      } as Parameter;
    });
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
      if (parameter?.type === ParameterType.Array || parameter?.type === ParameterType.Object) {
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

  #saveParameterValue = (event: Event): void => {
    if (!(event.target instanceof RecorderComponents.RecorderInput.RecorderInput)) {
      return;
    }
    let value: string|undefined;
    if (event instanceof KeyboardEvent) {
      value = event.target.renderRoot.querySelector('devtools-editable-content')?.innerText;
    } else {
      value = event.target.value;
    }
    const paramId = event.target.getAttribute('data-paramid');
    if (!paramId) {
      return;
    }
    const realParamId = paramId.split('.');
    const object = this.#getChildByPath(realParamId).parameter;
    if (value === '') {
      object.value = defaultValueByType.get(object.type);
    } else {
      object.value = value;
    }
    // Needed to render the delete button for object parameters
    this.requestUpdate();
  };

  #handleParameterInputKeydown = (event: KeyboardEvent): void => {
    if (!(event.target instanceof RecorderComponents.RecorderInput.RecorderInput)) {
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      this.#saveParameterValue(event);
    }
  };

  #handleCommandInputBlur = async(event: Event): Promise<void> => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      this.command = event.target.value;
    }
    this.populateParametersForCommandWithDefaultValues();
  };

  #computeTargetLabel(target: SDK.Target.Target): string {
    return `${target.name()} (${target.inspectedURL()})`;
  }

  #isParameterSupported(parameter: Parameter): boolean {
    if (parameter.type === ParameterType.Array || parameter.type === ParameterType.Object ||
        parameter.type === ParameterType.String || parameter.type === ParameterType.Boolean ||
        parameter.type === ParameterType.Number) {
      return true;
    }
    throw new Error('Parameter is not of correct type');
  }

  #isTypePrimitive(type: string): boolean {
    if (type === ParameterType.String || type === ParameterType.Boolean || type === ParameterType.Number) {
      return true;
    }
    return false;
  }

  #handleAddParameter(parameterId: string): void {
    const createNestedParameter = (type: Parameter, name: string): Parameter => {
      if (type.type === ParameterType.Object) {
        const typeRef = type.typeRef;
        if (!typeRef) {
          throw Error('Every object parameters should have a type ref');
        }
        const nestedType = this.typesByName.get(typeRef) ?? [];

        const nestedValue: Parameter[] =
            nestedType.map(nestedType => createNestedParameter(nestedType, nestedType.name));

        return {
          type: ParameterType.Object,
          name: name,
          optional: type.optional,
          typeRef: typeRef,
          value: nestedValue,
          description: type.description,
        };
      }
      return {
        type: type.type,
        name: name,
        optional: type.optional,
        typeRef: type.typeRef,
        value: defaultValueByType.get(type.type),
        description: type.description,
      } as Parameter;
    };

    const realParamId = parameterId.split('.');
    const {parameter} = this.#getChildByPath(realParamId);

    if (!parameter) {
      return;
    }

    switch (parameter.type) {
      case ParameterType.Array: {
        const typeRef = parameter.typeRef;
        if (!typeRef) {
          return;
        }

        const nestedType = this.typesByName.get(typeRef) ?? [];
        const nestedValue: Parameter[] = nestedType.map(type => createNestedParameter(type, type.name));

        parameter.value.push({
          type: this.#isTypePrimitive(typeRef) ? typeRef : ParameterType.Object,
          name: String(parameter.value.length),
          optional: true,
          typeRef: typeRef,
          value: nestedValue.length !== 0 ? nestedValue : '',
          description: '',
        } as Parameter);
        break;
      }
      case ParameterType.Object: {
        const typeRef = parameter.typeRef;
        if (!typeRef) {
          return;
        }
        const nestedType = this.typesByName.get(typeRef) ?? [];
        const nestedValue: Parameter[] =
            nestedType.map(nestedType => createNestedParameter(nestedType, nestedType.name));

        parameter.value.push({
          type: ParameterType.Object,
          name: '',
          optional: true,
          typeRef: typeRef,
          value: nestedValue,
          description: '',
        });
        break;
      }
      default:
        // For non-array and non-object parameters, set the value to the default value if available.
        parameter.value = defaultValueByType.get(parameter.type);
        break;
    }
    this.requestUpdate();
  }

  #handleClearParameter(parameterId: string): void {
    const realParamId = parameterId.split('.');
    const {parameter} = this.#getChildByPath(realParamId);
    if (!parameter) {
      return;
    }

    if (parameter.type === ParameterType.Object) {
      parameter.value.forEach(param => this.#handleClearParameter(`${parameterId}.${param.name}`));
    } else if (parameter.type === ParameterType.Array) {
      parameter.value = [];
    } else {
      parameter.value = parameter.optional ? undefined : defaultValueByType.get(parameter.type);
    }

    this.requestUpdate();
  }

  #handleDeleteParameter(parameterId: string): void {
    const realParamId = parameterId.split('.');
    const {parameter, parentParameter} = this.#getChildByPath(realParamId);
    if (!parameter) {
      return;
    }
    if (!Array.isArray(parentParameter.value)) {
      return;
    }
    parentParameter.value.splice(parentParameter.value.findIndex(p => p === parameter), 1);
    for (let i = 0; i < parentParameter.value.length; i++) {
      parentParameter.value[i].name = String(i);
    }
    this.requestUpdate();
  }

  #renderTargetSelectorRow(): LitHtml.TemplateResult|undefined {
    const target = this.targetManager.targets().find(el => el.id() === this.targetId);
    const targetLabel = target ? this.#computeTargetLabel(target) : '';
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
          >
          ${repeat(this.targetManager.targets(), target => {
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

  #computeDropdownValues(parameter: Parameter): string[] {
    // The suggestion box should only be shown for parameters of type string and boolean
    if (parameter.type === ParameterType.String) {
      const domainName = this.command.split('.')[0];
      const enums = this.enumsByName.get(`${domainName}.${parameter.typeRef}`) ?? {};
      return Object.values(enums);
    }
    if (parameter.type === ParameterType.Boolean) {
      return ['true', 'false'];
    }
    return [];
  }

  #onTargetSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.targetId = event.itemValue as string;
    this.requestUpdate();
  }

  #renderInlineButton(opts: {
    title: string,
    iconName: string,
    classMap: {[name: string]: string|boolean|number},
    onClick: (event: MouseEvent) => void,
  }): LitHtml.TemplateResult|undefined {
    return html`
          <devtools-button
            title=${opts.title}
            .size=${Buttons.Button.Size.SMALL}
            .iconName=${opts.iconName}
            .variant=${Buttons.Button.Variant.ROUND}
            class=${classMap(opts.classMap)}
            @click=${opts.onClick}
          ></devtools-button>
        `;
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
          const subparameters: Parameter[] = parameter.type === ParameterType.Array || parameter.type === ParameterType.Object ? (parameter.value ?? []) : [];
          const handleInputOnBlur = (event: Event): void => {
            this.#saveParameterValue(event);
          };
          const handleKeydown = (event: KeyboardEvent): void => {
            this.#handleParameterInputKeydown(event);
          };
          const isPrimitive = this.#isTypePrimitive(parameter.type);
          const isArray = parameter.type === ParameterType.Array;
          const isParentArray = parentParameter && parentParameter.type === ParameterType.Array;
          const isObject = parameter.type === ParameterType.Object;
          const hasOptions = parameter.type === ParameterType.String || parameter.type === ParameterType.Boolean;
          const classes = {
            optionalParameter: parameter.optional,
            parameter: true,
            undefinedParameter: parameter.value === undefined && parameter.optional,
          };
          return html`
                <li class="row">
                  <div class="row-icons">
                    <div class=${classMap(classes)} data-paramId=${parameterId}>
                        ${parameter.name}<span class="separator">:</span>
                    </div>

                    <!-- Render button to add values inside an array parameter -->
                    ${isArray ? html`
                      ${this.#renderInlineButton({
                          title: i18nString(UIStrings.addParameter),
                          iconName: 'plus',
                          onClick: () => this.#handleAddParameter(parameterId),
                          classMap: { deleteButton: true },
                        })}
                    `: nothing}

                    <!-- Render button to complete reset an array parameter or an object parameter-->
                    ${(isArray && parameter.value.length !== 0) || isObject ?
                    this.#renderInlineButton({
                      title: i18nString(UIStrings.resetDefaultValue),
                      iconName: 'clear',
                      onClick: () => this.#handleClearParameter(parameterId),
                      classMap: {deleteButton: true},
                    }) : nothing}

                    <!-- Render the buttons to change the value from undefined to empty string for optional primitive parameters -->
                    ${isPrimitive && !isParentArray && parameter.optional && parameter.value === undefined ?
                        html`  ${this.#renderInlineButton({
                          title: i18nString(UIStrings.addParameter),
                          iconName: 'plus',
                          onClick: () => this.#handleAddParameter(parameterId),
                          classMap: { deleteButton: true },
                        })}` : nothing}
                  </div>

                  <div class="row-icons">
                    <!-- In case  the parameter is not optional or its value is not undefined render the input -->
                    ${isPrimitive && (parameter.value !== undefined || !parameter.optional) && (!isParentArray) ?
                      html`
                        <devtools-recorder-input
                          data-paramId=${parameterId}
                          .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                          .autocomplete=${false}
                          .value=${live(parameter.value ?? '')}
                          .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                          @blur=${handleInputOnBlur}
                          @keydown=${handleKeydown}
                        ></devtools-recorder-input>` : nothing}

                    <!-- Render the buttons to change the value from empty string to undefined for optional primitive parameters -->
                    ${isPrimitive && !isParentArray && parameter.optional && parameter.value !== undefined ?
                        html`  ${this.#renderInlineButton({
                          title: i18nString(UIStrings.resetDefaultValue),
                          iconName: 'clear',
                          onClick: () => this.#handleClearParameter(parameterId),
                          classMap: { deleteButton: true, deleteIcon: true },
                        })}` : nothing}


                    <!-- In case the parameter is nested inside an array we render the input field as well as a delete button -->
                    ${isParentArray ? html`
                    <!-- If the parameter is an object we don't want to display the input field we just want the delete button-->
                    ${!isObject ? html`
                    <devtools-recorder-input
                      data-paramId=${parameterId}
                      .options=${hasOptions ? this.#computeDropdownValues(parameter) : []}
                      .autocomplete=${false}
                      .value=${live(parameter.value ?? '')}
                      .placeholder=${parameter.value === '' ? EMPTY_STRING : `<${defaultValueByType.get(parameter.type)}>`}
                      @blur=${handleInputOnBlur}
                      @keydown=${handleKeydown}
                      class=${classMap({'json-input': true})}
                    ></devtools-recorder-input>` : nothing}

                    ${this.#renderInlineButton({
                        title: i18nString(UIStrings.deleteParameter),
                        iconName: 'bin',
                        onClick: () => this.#handleDeleteParameter(parameterId),
                        classMap: { deleteButton: true, deleteIcon: true },
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
        <devtools-recorder-input
          .options=${[...this.metadataByCommand.keys()]}
          .value=${this.command}
          .placeholder=${'Enter your command...'}
          @blur=${this.#handleCommandInputBlur}
          class=${classMap({'json-input': true})}
        ></devtools-recorder-input>
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
