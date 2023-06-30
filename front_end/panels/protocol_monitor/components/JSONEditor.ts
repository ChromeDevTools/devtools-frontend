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
const {live, classMap} = Directives;
declare global {
  interface HTMLElementTagNameMap {
    'devtools-json-editor': JSONEditor;
  }
}

interface ArrayParameter {
  type: 'array';
  optional: boolean;
  value: string[]|undefined;
  name: string;
}

interface NonArrayParameter {
  type: 'string'|'number'|'boolean';
  optional: boolean;
  value: string|boolean|number|undefined;
  name: string;
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

  getParameters = (): {[key: string]: unknown} => {
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
      return parameter.value;
    };

    const formattedParameters: {[key: string]: unknown} = {};
    for (const parameter of this.parameters) {
      formattedParameters[parameter.name] = formatParameterValue(parameter);
    }
    return formattedParameters;
  };

  populateParametersForCommand(): void {
    const commandParameters = this.protocolMethodWithParametersMap.get(this.command);
    if (!commandParameters) {
      return;
    }
    this.parameters = commandParameters.map(parameter => {
      if (parameter.type === 'object') {
        const typeInfos = this.protocolTypesMap.get(parameter.typeRef as string) ?? [];
        return {
          optional: parameter.optional,
          type: parameter.type,
          value: typeInfos.map(type => {
            return {
              optional: type.optional,
              type: type.type,
              name: type.name,
              value: undefined,
            } as Parameter;
          }),
          name: parameter.name,
        } as Parameter;
      }
      return {
        optional: parameter.optional,
        type: parameter.type,
        value: parameter.value || undefined,
        name: parameter.name,
      } as Parameter;
    });
  }

  #handleArrayParameterInputBlur = (event: Event, parameterName: string, index: number): void => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      const value = event.target.value;
      const parameter = this.parameters.find(param => param.name === parameterName);
      if (!parameter) {
        return;
      }
      if (parameter.value === undefined) {
        parameter.value = [value];
      } else if (Array.isArray(parameter.value)) {
        parameter.value[index] = value;
      }
    }
  };

  #handleObjectParameterInputBlur = (event: Event, parameterName: string, key: string): void => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      const value = event.target.value;
      const parameter = this.parameters.find(param => param.name === parameterName);
      if (!parameter) {
        return;
      }
      if (parameter.type === 'object') {
        if (!parameter.value) {
          parameter.value = [];
        }
        const subParameter = parameter.value.find(subParam => subParam.name === key);
        if (subParameter) {
          if (subParameter.type === 'number') {
            subParameter.value = Number(value);
          } else if (subParameter.type === 'boolean') {
            subParameter.value = Boolean(value);
          } else {
            subParameter.value = value;
          }
        }
      }
    }
  };

  #handleParameterInputBlur = (event: Event, parameterName: string): void => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      const value = event.target.value;
      const parameter = this.parameters.find(param => param.name === parameterName);
      if (!parameter) {
        return;
      }
      parameter.value = value;
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

  #handleAddArrayParameter(parameterName: string): void {
    const parameter = this.parameters.find(param => param.name === parameterName);
    if (!parameter) {
      return;
    }
    if (parameter.type === 'array') {
      // At the moment it only support arrays parameters containing string (Object and boolean will be considered as string)
      if (!parameter.value) {
        parameter.value = [];
      }
      parameter.value.push('');
    }
    this.requestUpdate();
  }

  #handleDeleteArrayParameter(index: number, parameterName: string): void {
    const parameter = this.parameters.find(param => param.name === parameterName);
    if (!parameter) {
      return;
    }
    if (parameter.value !== undefined && Array.isArray(parameter.value)) {
      parameter.value.splice(index, 1);
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
          ${LitHtml.Directives.repeat(
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

  #renderInlineButton(opts: {title: string, iconName: string, onClick: (event: MouseEvent) => void}):
      LitHtml.TemplateResult|undefined {
    return html`
      <devtools-button
        title=${opts.title}
        .size=${Buttons.Button.Size.MEDIUM}
        .iconName=${opts.iconName}
        .variant=${Buttons.Button.Variant.ROUND}
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
          })}
        `: nothing}
          ${!handleAdd && options.handleInputOnBlur ? html`
          <devtools-recorder-input
            .disabled=${false}
            .value=${live(options.value ?? '')}
            .placeholder=${'Enter your parameter...'}
            @blur=${options.handleInputOnBlur}
          ></devtools-recorder-input>` : nothing}

          ${options.handleDelete ? html`
            ${this.#renderInlineButton({
                  title: 'Delete',
                  iconName: 'minus',
                  onClick: options.handleDelete,
            })}` : nothing}
      </div>
    `;
    // clang-format on
  }

  /**
   * Renders the parameters list corresponding to a specific CDP command.
   */
  #renderParameters(parameters: Parameter[], parentParameter?: Parameter): LitHtml.TemplateResult|undefined {
    parameters.sort((a, b) => Number(a.optional) - Number(b.optional));

    // clang-format off
    return html`
      <ul>
        ${LitHtml.Directives.repeat(parameters, (parameter, index) => {
          let subparameters: Parameter[] = [];
          let handleInputOnBlur = (event: Event): void => {
            this.#handleParameterInputBlur(event, parameter.name);
          };
           switch (parameter.type) {
            case 'array':
              subparameters = (parameter.value || []).map((value, idx) => {
                return {
                  type: 'string',
                  optional: true,
                  value,
                  name: String(idx),
                };
              });
              break;
            case 'object':
              subparameters = parameter.value ?? [];
              break;
          }
           switch (parentParameter?.type) {
            case 'array':
              handleInputOnBlur = (event: Event) : void => {
                this.#handleArrayParameterInputBlur(event, parentParameter.name, index);
              };
              break;
            case 'object':
              handleInputOnBlur = (event: Event) : void => {
                this.#handleObjectParameterInputBlur(event, parentParameter.name, parameter.name);
              };
              break;
          }
          return html`
            <li class="row">
              ${this.#renderParametersHelper({
                  value: parameter.value,
                  optional: parameter.optional,
                  handleAdd: parameter.type === 'array' ? () : void => {
                    this.#handleAddArrayParameter(parameter.name);
                  }: undefined,
                  handleDelete: parameter.optional ? () : void => {
                    this.#handleDeleteArrayParameter(index, parentParameter?.name ?? '');
                  }: undefined,
                  handleInputOnBlur: parameter.type !== 'object' ? handleInputOnBlur: undefined,
                  key: parameter.name,
                })}
            </li>
            ${this.#renderParameters(subparameters, parameter)}
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
