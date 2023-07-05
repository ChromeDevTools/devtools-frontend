// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../recorder/components/components.js';

import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as RecorderComponents from '../../recorder/components/components.js';

import editorWidgetStyles from './JSONEditor.css.js';

const {html, Decorators, LitElement, Directives, nothing} = LitHtml;
const {customElement, property, state} = Decorators;
const {live, classMap, repeat} = Directives;
declare global {
  interface HTMLElementTagNameMap {
    'devtools-json-editor': JSONEditor;
  }
}

interface ArrayParameter {
  type: 'array';
  optional: boolean;
  value: Parameter[];
  name: string;
  typeRef?: string;
}

interface NonArrayParameter {
  type: 'string'|'number'|'boolean';
  optional: boolean;
  value: string|boolean|number|undefined;
  name: string;
  typeRef?: string;
}

interface ObjectParameter {
  type: 'object';
  optional: boolean;
  value: Parameter[];
  name: string;
  typeRef?: string;
}

export type Parameter = ArrayParameter|NonArrayParameter|ObjectParameter;

export interface Command {
  command: string;
  parameters: {[x: string]: unknown};
  targetId?: string;
}

interface Type {
  name: string;
  type: string;
  optional: boolean;
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

@customElement('devtools-json-editor')
export class JSONEditor extends LitElement {
  static override styles = [editorWidgetStyles];
  @property() declare protocolMethodWithParametersMap: Map<string, Parameter[]>;
  @property() declare protocolTypesMap: Map<string, Type[]>;
  @property() declare targetManager;
  @state() declare parameters: Parameter[];
  @state() command: string = '';
  @state() targetId?: string;

  constructor() {
    super();
    this.parameters = [];
    this.targetManager = SDK.TargetManager.TargetManager.instance();
    this.targetId = this.targetManager.targets().length !== 0 ? this.targetManager.targets()[0].id() : undefined;
    this.addEventListener('keydown', (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter' &&
          ((event as KeyboardEvent).metaKey || (event as KeyboardEvent).ctrlKey)) {
        this.dispatchEvent(new SubmitEditorEvent({
          command: this.command,
          parameters: this.getParameters(),
          targetId: this.targetId,
        }));
      }
    });
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

  getParameters(): {[key: string]: unknown} {
    const formatParameterValue = (parameter: Parameter): unknown => {
      if (parameter.type === 'number') {
        return Number(parameter.value);
      }
      if (parameter.type === 'boolean') {
        return Boolean(parameter.value);
      }
      if (parameter.type === 'object') {
        const nestedParameters: {[key: string]: unknown} = {};
        for (const subParameter of parameter.value) {
          nestedParameters[subParameter.name] = formatParameterValue(subParameter);
        }
        return nestedParameters;
      }
      if (parameter.type === 'array') {
        const nestedParameters = [];
        for (const subParameter of parameter.value) {
          nestedParameters.push(formatParameterValue(subParameter));
        }
        return nestedParameters;
      }

      return parameter.value;
    };

    const formattedParameters: {[key: string]: unknown} = {};
    for (const parameter of this.parameters) {
      formattedParameters[parameter.name] = formatParameterValue(parameter);
    }
    return formattedParameters;
  }

  populateParametersForCommand(): void {
    const commandParameters = this.protocolMethodWithParametersMap.get(this.command);

    if (!commandParameters) {
      return;
    }
    this.parameters = commandParameters.map((parameter: Parameter) => {
      if (parameter.type === 'object') {
        const typeInfos = this.protocolTypesMap.get(parameter.typeRef as string) ?? [];
        return {
          optional: parameter.optional,
          type: parameter.type,
          typeRef: parameter.typeRef,
          value: typeInfos.map(type => {
            const param: Parameter = {
              optional: type.optional,
              type: this.#isParameterSupported(parameter) ? type.type : 'string',
              name: type.name,
              value: undefined,
            } as Parameter;
            return param;
          }),
          name: parameter.name,
        };
      }
      return {
        optional: parameter.optional,
        type: parameter.type,
        typeRef: this.#isParameterSupported(parameter) ? parameter.typeRef : 'string',
        value: parameter.value || undefined,
        name: parameter.name,
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
      if (parameter?.type === 'array' || parameter?.type === 'object') {
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

  #handleParameterInputBlur = (event: Event): void => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      const value = event.target.value;
      const paramId = event.target.getAttribute('data-paramid');
      if (paramId) {
        const realParamId = paramId.split('.');
        const object = this.#getChildByPath(realParamId).parameter;
        object.value = value;
      }
    }
  };

  #handleCommandInputBlur = async(event: Event): Promise<void> => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      this.command = event.target.value;
    }
    this.populateParametersForCommand();
  };

  #computeTargetLabel(target: SDK.Target.Target): string {
    return `${target.name()} (${target.inspectedURL()})`;
  }

  #isParameterSupported(parameter: Parameter): boolean {
    if (parameter.type === 'array' || parameter.type === 'object' || parameter.type === 'string' ||
        parameter.type === 'boolean' || parameter.type === 'number') {
      return true;
    }
    throw new Error('Parameter is not of correct type');
  }

  #isTypePrimitive(type: string): boolean {
    if (type === 'string' || type === 'boolean' || type === 'number') {
      return true;
    }
    return false;
  }

  #handleAddArrayParameter(parameterId: string): void {
    const realParamId = parameterId.split('.');
    const parameter = this.#getChildByPath(realParamId).parameter;
    if (!parameter) {
      return;
    }
    if (parameter.type !== 'array' || !parameter.typeRef) {
      return;
    }
    if (!parameter.value) {
      parameter.value = [];
    }
    const typeInfos = this.protocolTypesMap.get(parameter.typeRef as string) ?? [];
    parameter.value.push({
      optional: true,
      type: this.#isTypePrimitive(parameter.typeRef) ? parameter.typeRef : 'object',
      name: String(parameter.value.length),
      value: typeInfos.length !== 0 ?
          typeInfos.map(type => ({
                          optional: type.optional,
                          type: this.#isParameterSupported(parameter) ? type.type : 'string',
                          name: type.name,
                          value: undefined,
                        })) :
          undefined,
    } as Parameter);
    this.requestUpdate();
  }

  #handleDeleteArrayParameter(parameterId: string): void {
    const realParamId = parameterId.split('.');
    const {parameter, parentParameter} = this.#getChildByPath(realParamId);
    if (!parameter) {
      return;
    }
    if (parentParameter.value !== undefined && Array.isArray(parentParameter.value)) {
      parentParameter.value.splice(parentParameter.value.findIndex(p => p === parameter), 1);
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
          ${repeat(
              this.targetManager.targets(),
              target => {
                return LitHtml.html`<${Menus.Menu.MenuItem.litTagName}
                .value=${target.id()}
              >
                  ${this.#computeTargetLabel(target)}
              </${Menus.Menu.MenuItem.litTagName}>`;
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

  #renderCommandRow(): LitHtml.TemplateResult|undefined {
    // clang-format off
    return html`<div class="row attribute padded">
      <div>command<span class="separator">:</span></div>
      <devtools-recorder-input
        .disabled=${false}
        .options=${[...this.protocolMethodWithParametersMap.keys()]}
        .value=${this.command}
        .placeholder=${'Enter your command...'}
        @blur=${this.#handleCommandInputBlur}
      ></devtools-recorder-input>
    </div>`;
    // clang-format on
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
            .size=${Buttons.Button.Size.MEDIUM}
            .iconName=${opts.iconName}
            .variant=${Buttons.Button.Variant.ROUND}
            class=${classMap(opts.classMap)}
            @click=${opts.onClick}
          ></devtools-button>
        `;
  }

  /**
   * Renders the line with the word "parameter" in red. As opposed to the renderParametersRow method,
   * it does not render the value of a parameter.
   */
  #renderParameterRow(): LitHtml.TemplateResult|undefined {
    // clang-format off
    return html`<div class="row attribute padded">
      <div>parameters<span class="separator">:</span></div>
    </div>`;
    // clang-format on
  }

  #renderParametersHelper(options: {
    id: string,
    value: Parameter['value'],
    optional: boolean,
    handleDelete?: () => void,
    handleInputOnBlur?: (event: Event) => void,
    handleAdd?: () => void, key: string,
  }): LitHtml.TemplateResult|undefined {
    const classes = {colorBlue: options.optional};
    const handleAdd = options.handleAdd;
    // clang-format off
    return html`
      <div class="row">
          <div class=${classMap(classes)}>${options.key}<span class="separator">:</span></div>
          ${handleAdd ? html`
          ${this.#renderInlineButton({
            title: 'Add parameter',
            iconName: 'plus',
            onClick: handleAdd,
            classMap: {deleteButton: true},
          })}
        `: nothing}
          ${!handleAdd && options.handleInputOnBlur ? html`
          <devtools-recorder-input
            .disabled=${false}
            data-paramId=${options.id}
            .value=${live(options.value ?? '')}
            .placeholder=${'Enter your parameter...'}
            @blur=${options.handleInputOnBlur}
          ></devtools-recorder-input>` : nothing}

          ${options.handleDelete ? html`
            ${this.#renderInlineButton({
                  title: 'Delete',
                  iconName: 'minus',
                  onClick: options.handleDelete,
                  classMap: {deleteButton: true},
            })}` : nothing}
      </div>
    `;
    // clang-format on
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
          const subparameters: Parameter[] = parameter.type === 'array' || parameter.type === 'object' ? (parameter.value ?? []) : [];
          const handleInputOnBlur = (event: Event): void => {
            this.#handleParameterInputBlur(event);
          };
          return html`
            <li class="row">
              ${this.#renderParametersHelper({
                  id: parameterId,
                  value: parameter.value,
                  optional: parameter.optional,
                  handleAdd: parameter.type === 'array' ? () : void => {
                    this.#handleAddArrayParameter(parameterId);
                  }: undefined,
                  handleDelete: parameter.optional ? () : void => {
                    this.#handleDeleteArrayParameter(parameterId);
                  }: undefined,
                  handleInputOnBlur: parameter.type !== 'object' ? handleInputOnBlur: undefined,
                  key: parameter.name,
                })}
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
      ${this.#renderCommandRow()}
      ${this.parameters.length ? html`
        ${this.#renderParameterRow()}
        ${this.#renderParameters(this.parameters)}
      ` : nothing}
    </div>
    <devtools-pm-toolbar @copycommand=${this.#copyToClipboard} @commandsent=${this.#handleCommandSend}></devtools-pm-toolbar>`;
    // clang-format on
  }
}
