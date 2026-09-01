// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Puppeteer from '../../third_party/puppeteer/puppeteer.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SuggestionInput from '../../ui/components/suggestion_input/suggestion_input.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Models from './models/models.js';
import {SelectorPicker} from './SelectorPicker.js';
import stepEditorStyles from './stepEditor.css.js';
import {
  ArrayAssignments,
  assert,
  type Assignments,
  deepFreeze,
  type DeepImmutable,
  type DeepPartial,
  immutableDeepAssign,
  InsertAssignment,
  type Keys,
  type OptionalKeys,
  type RequiredKeys,
  SharedObject,
} from './util/util.js';

const {html, render, Directives} = Lit;
const {live} = Directives;
const {widget} = UI.Widget;

type StepFor<Type> = Extract<Models.Schema.Step, {type: Type}>;
type Attribute = Keys<Models.Schema.Step>;

type DataType<A extends Attribute> = ReturnType<typeof typeConverters[typeof dataTypeByAttribute[A]]>;

const typeConverters: Readonly<{
  string: (value: string) => string,
  number: (value: string) => number,
  boolean: (value: string) => boolean,
}> = Object.freeze({
  string: (value: string): string => value.trim(),
  number: (value: string): number => {
    const number = parseFloat(value);
    if (Number.isNaN(number)) {
      return 0;
    }
    return number;
  },
  boolean: (value: string): boolean => {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    return false;
  },
});

const dataTypeByAttribute: Readonly<{
    readonly selectors: 'string',
    readonly offsetX: 'number',
    readonly offsetY: 'number',
    readonly target: 'string',
    readonly frame: 'number',
    readonly assertedEvents: 'string',
    readonly value: 'string',
    readonly key: 'string',
    readonly operator: 'string',
    readonly count: 'number',
    readonly expression: 'string',
    readonly x: 'number',
    readonly y: 'number',
    readonly url: 'string',
    readonly type: 'string',
    readonly timeout: 'number',
    readonly duration: 'number',
    readonly button: 'string',
    readonly deviceType: 'string',
    readonly width: 'number',
    readonly height: 'number',
    readonly deviceScaleFactor: 'number',
    readonly isMobile: 'boolean',
    readonly hasTouch: 'boolean',
    readonly isLandscape: 'boolean',
    readonly download: 'number',
    readonly upload: 'number',
    readonly latency: 'number',
    readonly name: 'string',
    readonly parameters: 'string',
    readonly visible: 'boolean',
    readonly properties: 'string',
    readonly attributes: 'string',
}> = Object.freeze({
  selectors: 'string',
  offsetX: 'number',
  offsetY: 'number',
  target: 'string',
  frame: 'number',
  assertedEvents: 'string',
  value: 'string',
  key: 'string',
  operator: 'string',
  count: 'number',
  expression: 'string',
  x: 'number',
  y: 'number',
  url: 'string',
  type: 'string',
  timeout: 'number',
  duration: 'number',
  button: 'string',
  deviceType: 'string',
  width: 'number',
  height: 'number',
  deviceScaleFactor: 'number',
  isMobile: 'boolean',
  hasTouch: 'boolean',
  isLandscape: 'boolean',
  download: 'number',
  upload: 'number',
  latency: 'number',
  name: 'string',
  parameters: 'string',
  visible: 'boolean',
  properties: 'string',
  attributes: 'string',
} as const);

const defaultValuesByAttribute: DeepImmutable<{
  selectors: string[][],
  offsetX: number,
  offsetY: number,
  target: string,
  frame: number[],
  assertedEvents: Array<{
    type: string,
    url: string,
    title: string,
  }>,
  value: string,
  key: string,
  operator: string,
  count: number,
  expression: string,
  x: number,
  y: number,
  url: string,
  timeout: number,
  duration: number,
  deviceType: string,
  button: string,
  type: string,
  width: number,
  height: number,
  deviceScaleFactor: number,
  isMobile: boolean,
  hasTouch: boolean,
  isLandscape: boolean,
  download: number,
  upload: number,
  latency: number,
  name: string,
  parameters: string,
  properties: string,
  attributes: Array<{
    name: string,
    value: string,
  }>,
  visible: boolean,
}> = deepFreeze({
  selectors: [['.cls']],
  offsetX: 1,
  offsetY: 1,
  target: 'main',
  frame: [0],
  assertedEvents: [
    {type: 'navigation', url: 'https://example.com', title: 'Title'},
  ],
  value: 'Value',
  key: 'Enter',
  operator: '>=',
  count: 1,
  expression: 'true',
  x: 0,
  y: 0,
  url: 'https://example.com',
  timeout: 5000,
  duration: 50,
  deviceType: 'mouse',
  button: 'primary',
  type: 'click',
  width: 800,
  height: 600,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  isLandscape: true,
  download: 1000,
  upload: 1000,
  latency: 25,
  name: 'customParam',
  parameters: '{}',
  properties: '{}',
  attributes: [{name: 'attribute', value: 'value'}],
  visible: true,
});

const attributesByType = deepFreeze<{
  [Type in Models.Schema.StepType]:
      {required: Array<Exclude<RequiredKeys<StepFor<Type>>, 'type'>>, optional: Array<OptionalKeys<StepFor<Type>>>};
}>({
  [Models.Schema.StepType.Click]: {
    required: ['selectors', 'offsetX', 'offsetY'],
    optional: [
      'assertedEvents',
      'button',
      'deviceType',
      'duration',
      'frame',
      'target',
      'timeout',
    ],
  },
  [Models.Schema.StepType.DoubleClick]: {
    required: ['offsetX', 'offsetY', 'selectors'],
    optional: [
      'assertedEvents',
      'button',
      'deviceType',
      'frame',
      'target',
      'timeout',
    ],
  },
  [Models.Schema.StepType.Hover]: {
    required: ['selectors'],
    optional: ['assertedEvents', 'frame', 'target', 'timeout'],
  },
  [Models.Schema.StepType.Change]: {
    required: ['selectors', 'value'],
    optional: ['assertedEvents', 'frame', 'target', 'timeout'],
  },
  [Models.Schema.StepType.KeyDown]: {
    required: ['key'],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.KeyUp]: {
    required: ['key'],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.Scroll]: {
    required: [],
    optional: ['assertedEvents', 'frame', 'target', 'timeout', 'x', 'y'],
  },
  [Models.Schema.StepType.Close]: {
    required: [],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.Navigate]: {
    required: ['url'],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.WaitForElement]: {
    required: ['selectors'],
    optional: [
      'assertedEvents',
      'attributes',
      'count',
      'frame',
      'operator',
      'properties',
      'target',
      'timeout',
      'visible',
    ],
  },
  [Models.Schema.StepType.WaitForExpression]: {
    required: ['expression'],
    optional: ['assertedEvents', 'frame', 'target', 'timeout'],
  },
  [Models.Schema.StepType.CustomStep]: {
    required: ['name', 'parameters'],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.EmulateNetworkConditions]: {
    required: ['download', 'latency', 'upload'],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
  [Models.Schema.StepType.SetViewport]: {
    required: [
      'deviceScaleFactor',
      'hasTouch',
      'height',
      'isLandscape',
      'isMobile',
      'width',
    ],
    optional: ['assertedEvents', 'target', 'timeout'],
  },
});

const UIStrings = {
  /**
   * @description The text that is displayed when the steps were not saved due to an error. The error message itself is always in English and not translated.
   * @example {Saving failed} error
   */
  notSaved: 'Not saved: {error}',
  /**
   * @description The button title that adds a new attribute to the form.
   * @example {timeout} attributeName
   */
  addAttribute: 'Add {attributeName}',
  /**
   * @description The title of a button that deletes an attribute from the form.
   */
  deleteRow: 'Delete row',
  /**
   * @description The title of a button that adds a new input field for the entry of the frame index. Frame index is the number of the frame within the page's frame tree.
   */
  addFrameIndex: 'Add frame index within the frame tree',
  /**
   * @description The title of a button that removes a frame index field from the form.
   */
  removeFrameIndex: 'Remove frame index',
  /**
   * @description The title of a button that adds a field to input a part of a selector in the editor form.
   */
  addSelectorPart: 'Add a selector part',
  /**
   * @description The title of a button that removes a field to input a part of a selector in the editor form.
   */
  removeSelectorPart: 'Remove a selector part',
  /**
   * @description The title of a button that adds a field to input a selector in the editor form.
   */
  addSelector: 'Add a selector',
  /**
   * @description The title of a button that removes a field to input a selector in the editor form.
   */
  removeSelector: 'Remove a selector',
  /**
   * @description The error message displayed when a user enters a type in the input that is not associated with any existing types.
   */
  unknownActionType: 'Enter a valid action type',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/recorder/StepEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface EditorState {
  type: Models.Schema.StepType;
  target?: string;
  selectors?: string[][];
  frame?: number[];
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  key?: string;
  expression?: string;
  value?: string;
  operator?: string;
  count?: number;
  assertedEvents?: Models.Schema.AssertedEvent[];
  url?: string;
  timeout?: number;
  button?: string;
  duration?: number;
  deviceType?: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
  download?: number;
  upload?: number;
  latency?: number;
  name?: string;
  parameters?: string;
  visible?: boolean;
  properties?: string;
  attributes?: Array<{name: string, value: string}>;
}

// Makes use of the fact that JSON values get their undefined values cleaned
// after stringification.
const cleanUndefineds = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value));
};

interface Puppeteer {
  page: Puppeteer.Page;
  browser: Puppeteer.Browser;
}

export class EditorState {
  static #puppeteer: SharedObject.SharedObject<Puppeteer> =
      new SharedObject.SharedObject(() => Models.RecordingPlayer.RecordingPlayer.connectPuppeteer(),
                                    ({browser}) => Models.RecordingPlayer.RecordingPlayer.disconnectPuppeteer(browser));

  static async default(type: Models.Schema.StepType): Promise<DeepImmutable<EditorState>> {
    const state = {type};
    const attributes = attributesByType[state.type];
    let promise: Promise<unknown> = Promise.resolve();
    for (const attribute of attributes.required) {
      promise = Promise.all([
        promise,
        (async () => Object.assign(state, {
          [attribute]: await this.defaultByAttribute(state, attribute),
        }))(),
      ]);
    }
    await promise;
    return Object.freeze(state);
  }

  static async defaultByAttribute<Attribute extends keyof typeof defaultValuesByAttribute>(
      state: DeepImmutable<EditorState>,
      attribute: Attribute): Promise<DeepImmutable<typeof defaultValuesByAttribute[Attribute]>>;
  static async defaultByAttribute(_state: DeepImmutable<EditorState>,
                                  attribute: keyof typeof defaultValuesByAttribute): Promise<unknown> {
    return await this.#puppeteer.run<unknown>(puppeteer => {
      switch (attribute) {
        case 'assertedEvents': {
          return immutableDeepAssign(defaultValuesByAttribute.assertedEvents, new ArrayAssignments({
                                       0: {
                                         url: puppeteer.page.url() || defaultValuesByAttribute.assertedEvents[0].url,
                                       },
                                     }));
        }
        case 'url': {
          return puppeteer.page.url() || defaultValuesByAttribute.url;
        }
        case 'height': {
          return puppeteer.page.evaluate(() => (visualViewport as VisualViewport).height)
              .then(h => h || defaultValuesByAttribute.height);
        }
        case 'width': {
          return puppeteer.page.evaluate(() => (visualViewport as VisualViewport).width)
              .then(w => w || defaultValuesByAttribute.width);
        }
        default: {
          return defaultValuesByAttribute[attribute];
        }
      }
    });
  }

  static fromStep(step: Models.Schema.Step): DeepImmutable<EditorState> {
    const state = structuredClone(step) as EditorState;
    for (const key of ['parameters', 'properties'] as Array<'properties'>) {
      if (key in step && step[key] !== undefined) {
        state[key] = JSON.stringify(step[key]);
      }
    }
    if ('attributes' in step && step.attributes) {
      state.attributes = [];
      for (const [name, value] of Object.entries(step.attributes)) {
        state.attributes.push({name, value});
      }
    }
    if ('selectors' in step) {
      state.selectors = step.selectors.map(selector => {
        if (typeof selector === 'string') {
          return [selector];
        }
        return [...selector];
      });
    }
    return deepFreeze(state);
  }

  static toStep(state: DeepImmutable<EditorState>): Models.Schema.Step {
    const step = structuredClone(state) as Models.Schema.Step;
    for (const key of ['parameters', 'properties'] as Array<'properties'>) {
      const value = state[key];
      if (value) {
        Object.assign(step, {[key]: JSON.parse(value)});
      }
    }
    if (state.attributes) {
      if (state.attributes.length !== 0) {
        const attributes = {};
        for (const {name, value} of state.attributes) {
          Object.assign(attributes, {[name]: value});
        }
        Object.assign(step, {attributes});
      } else if ('attributes' in step) {
        delete step.attributes;
      }
    }
    if (state.selectors) {
      const selectors = state.selectors.filter(selector => selector.length > 0).map(selector => {
        if (selector.length === 1) {
          return selector[0];
        }
        return [...selector];
      });
      if (selectors.length !== 0) {
        Object.assign(step, {selectors});
      } else if ('selectors' in step) {
        // @ts-expect-error We want to trigger an error in the parsing phase.
        delete step.selectors;
      }
    }
    if (state.frame?.length === 0 && 'frame' in step) {
      delete step.frame;
    }
    return cleanUndefineds(Models.SchemaUtils.parseStep(step));
  }
}

/**
 * @fires RequestSelectorAttributeEvent#requestselectorattribute
 * @fires StepEditedEvent#stepedited
 */
export interface ViewInput {
  state: DeepImmutable<EditorState>;
  disabled: boolean;
  error: string|undefined;
  isTypeEditable: boolean;
  handleInputBlur: <A extends Attribute>(opts: {
    attribute: A,
    from(value: DataType<A>): DeepImmutable<DeepPartial<Assignments<EditorState>>>|undefined,
  }) => (event: Event) => void;
  handleTypeInputBlur: (event: Event) => Promise<void>;
  handleAddRowClickEvent: (event: MouseEvent) => Promise<void>;
  handleDeleteRowClick: (attribute: Attribute) => (event: MouseEvent) => void;
  handleSelectorPicked: (data: Models.Schema.StepWithSelectors&
                         Pick<Models.Schema.ClickAttributes, 'offsetX'|'offsetY'>) => void;
  handleAttributeRequested: (send: (attribute?: string) => void) => void;
  handleAddOrRemoveClick: (assignments: DeepImmutable<DeepPartial<Assignments<EditorState>>>,
                           query: string) => (event: Event) => void;
  handleKeyDownEvent: (event: Event) => void;
}

function renderInlineButton(
    input: ViewInput, opts: {class: string, title: string, iconName: string, onClick: (event: MouseEvent) => void}):
    Lit.TemplateResult|undefined {
  if (input.disabled) {
    return;
  }
  return html`
    <devtools-button
      title=${opts.title}
      .accessibleLabel=${opts.title}
      .size=${Buttons.Button.Size.SMALL}
      .iconName=${opts.iconName}
      .variant=${Buttons.Button.Variant.ICON}
      jslog=${VisualLogging.action(opts.class).track({
    click: true,
  })}
      class="inline-button ${opts.class}"
      @click=${opts.onClick}
    ></devtools-button>
  `;
}

function renderDeleteButton(input: ViewInput, attribute: Attribute): Lit.TemplateResult|undefined {
  if (input.disabled) {
    return;
  }

  const attributes = attributesByType[input.state.type];
  const optional = [...attributes.optional].includes(attribute as typeof attributes.optional[number]);
  if (!optional || input.disabled) {
    return;
  }

  // clang-format off
  return html`<devtools-button
    .size=${Buttons.Button.Size.SMALL}
    .iconName=${'bin'}
    .variant=${Buttons.Button.Variant.ICON}
    .title=${i18nString(UIStrings.deleteRow)}
    class="inline-button delete-row"
    data-attribute=${attribute}
    jslog=${VisualLogging.action('delete').track({click: true})}
    @click=${input.handleDeleteRowClick(attribute)}
  ></devtools-button>`;
  // clang-format on
}

type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderedAttributes = new Set<Attribute>();

  function renderTypeRow(editable: boolean): Lit.TemplateResult {
    renderedAttributes.add('type');
    // clang-format off
    return html`<div class="row attribute" data-attribute="type" jslog=${VisualLogging.treeItem('type').track({resize: true})}>
      <div id="type">type<span class="separator">:</span></div>
      <devtools-suggestion-input
        aria-labelledby="type"
        .disabled=${!editable || input.disabled}
        .options=${Object.values(Models.Schema.StepType)}
        .placeholder=${defaultValuesByAttribute.type}
        .value=${live(input.state.type)}
        @blur=${input.handleTypeInputBlur}
      ></devtools-suggestion-input>
    </div>`;
    // clang-format on
  }

  function renderRow(attribute: Attribute): Lit.TemplateResult|undefined {
    renderedAttributes.add(attribute);
    const attributeValue = input.state[attribute]?.toString();
    if (attributeValue === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="row attribute" data-attribute=${attribute} jslog=${VisualLogging.treeItem(Platform.StringUtilities.toKebabCase(attribute)).track({resize: true})}>
      <div id=${attribute}>${attribute}<span class="separator">:</span></div>
      <devtools-suggestion-input
        .disabled=${input.disabled}
        aria-labelledby=${attribute}
        .placeholder=${defaultValuesByAttribute[attribute].toString()}
        .value=${live(attributeValue)}
        .mimeType=${(() => {
          switch (attribute) {
            case 'expression':
              return 'text/javascript';
            case 'properties':
              return 'application/json';
            default:
              return '';
          }
        })()}
        @blur=${input.handleInputBlur({
      attribute,
      from(value) {
        if (input.state[attribute] === undefined || input.state[attribute] === value) {
          return;
        }
        return {[attribute]: value};
      },
    })}
      ></devtools-suggestion-input>
      ${renderDeleteButton(input, attribute)}
    </div>`;
    // clang-format on
  }

  function renderFrameRow(): Lit.TemplateResult|undefined {
    renderedAttributes.add('frame');
    if (input.state.frame === undefined) {
      return;
    }
    // clang-format off
    return html`
      <div class="attribute" data-attribute="frame" jslog=${VisualLogging.treeItem('frame').track({resize: true})}>
        <div class="row">
          <div id="frame">frame<span class="separator">:</span></div>
          ${renderDeleteButton(input, 'frame')}
        </div>
        ${input.state.frame.map((frame, index, frames) => {
          return html`
            <div class="padded row">
              <devtools-suggestion-input
                aria-labelledby="frame"
                .disabled=${input.disabled}
                .placeholder=${defaultValuesByAttribute.frame[0].toString()}
                .value=${live(frame.toString())}
                data-path=${`frame.${index}`}
                @blur=${input.handleInputBlur({
                  attribute: 'frame',
                  from(value) {
                    if (input.state.frame?.[index] === undefined || input.state.frame[index] === value) {
                      return;
                    }
                    return {
                      frame: new ArrayAssignments({ [index]: value }),
                    };
                  },
                })}
              ></devtools-suggestion-input>
              ${renderInlineButton(input, {
                class: 'add-frame',
                title: i18nString(UIStrings.addFrameIndex),
                iconName: 'plus',
                onClick: input.handleAddOrRemoveClick(
                  {
                    frame: new ArrayAssignments({
                      [index + 1]: new InsertAssignment(
                        defaultValuesByAttribute.frame[0],
                      ),
                    }),
                  },
                  `devtools-suggestion-input[data-path="frame.${index + 1}"]`,
                ),
              })}
              ${renderInlineButton(input, {
                class: 'remove-frame',
                title: i18nString(UIStrings.removeFrameIndex),
                iconName: 'minus',
                onClick: input.handleAddOrRemoveClick(
                  {
                    frame: new ArrayAssignments({ [index]: undefined }),
                  },
                  `devtools-suggestion-input[data-path="frame.${Math.min(
                    index,
                    frames.length - 2,
                  )}"]`,
                ),
              })}
            </div>
          `;
        })}
      </div>
    `;
    // clang-format on
  }

  function renderSelectorsRow(): Lit.TemplateResult|undefined {
    renderedAttributes.add('selectors');
    if (input.state.selectors === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="selectors" jslog=${VisualLogging.treeItem('selectors')}>
      <div class="row">
        <div>selectors<span class="separator">:</span></div>
        ${widget(SelectorPicker, {
          disabled: input.disabled,
          onSelectorPicked: input.handleSelectorPicked,
          onAttributeRequested: input.handleAttributeRequested,
        })}
        ${renderDeleteButton(input, 'selectors')}
      </div>
      ${input.state.selectors.map((selector, index, selectors) => {
        return html`<div class="padded row" data-selector-path=${index}>
            <div id="selector-${index}">selector #${index + 1}<span class="separator">:</span></div>
            ${renderInlineButton(input, {
              class: 'add-selector',
              title: i18nString(UIStrings.addSelector),
              iconName: 'plus',
              onClick: input.handleAddOrRemoveClick(
                {
                  selectors: new ArrayAssignments({
                    [index + 1]: new InsertAssignment(
                      structuredClone(defaultValuesByAttribute.selectors[0]),
                    ),
                  }),
                },
                `devtools-suggestion-input[data-path="selectors.${index + 1}.0"]`,
              ),
            })}
            ${renderInlineButton(input, {
              class: 'remove-selector',
              title: i18nString(UIStrings.removeSelector),
              iconName: 'minus',
              onClick: input.handleAddOrRemoveClick(
                { selectors: new ArrayAssignments({ [index]: undefined }) },
                `devtools-suggestion-input[data-path="selectors.${Math.min(
                  index,
                  selectors.length - 2,
                )}.0"]`,
              ),
            })}
          </div>
          ${selector.map((part, partIndex, parts) => {
            return html`<div
              class="double padded row"
              data-selector-path="${index}.${partIndex}"
            >
              <devtools-suggestion-input
                aria-labelledby="selector-${index}"
                .disabled=${input.disabled}
                .placeholder=${defaultValuesByAttribute.selectors[0][0]}
                .value=${live(part)}
                data-path=${`selectors.${index}.${partIndex}`}
                @blur=${input.handleInputBlur({
                  attribute: 'selectors',
                  from(value) {
                    if (
                      input.state.selectors?.[index]?.[partIndex] === undefined || input.state.selectors[index][partIndex] === value
                    ) {
                      return;
                    }
                    return {
                      selectors: new ArrayAssignments({
                        [index]: new ArrayAssignments({
                          [partIndex]: value,
                        }),
                      }),
                    };
                  },
                })}
              ></devtools-suggestion-input>
              ${renderInlineButton(input, {
                class: 'add-selector-part',
                title: i18nString(UIStrings.addSelectorPart),
                iconName: 'plus',
                onClick: input.handleAddOrRemoveClick(
                  {
                    selectors: new ArrayAssignments({
                      [index]: new ArrayAssignments({
                        [partIndex + 1]: new InsertAssignment(
                          defaultValuesByAttribute.selectors[0][0],
                        ),
                      }),
                    }),
                  },
                  `devtools-suggestion-input[data-path="selectors.${index}.${
                    partIndex + 1
                  }"]`,
                ),
              })}
              ${renderInlineButton(input, {
                class: 'remove-selector-part',
                title: i18nString(UIStrings.removeSelectorPart),
                iconName: 'minus',
                onClick: input.handleAddOrRemoveClick(
                  {
                    selectors: new ArrayAssignments({
                      [index]: new ArrayAssignments({
                        [partIndex]: undefined,
                      }),
                    }),
                  },
                  `devtools-suggestion-input[data-path="selectors.${index}.${Math.min(
                    partIndex,
                    parts.length - 2,
                  )}"]`,
                ),
              })}
            </div>`;
          })}`;
      })}
    </div>`;
    // clang-format on
  }

  function renderAssertedEvents(): Lit.TemplateResult|undefined {
    renderedAttributes.add('assertedEvents');
    if (input.state.assertedEvents === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="assertedEvents" jslog=${VisualLogging.treeItem('asserted-events')}>
      <div class="row">
        <div>asserted events<span class="separator">:</span></div>
        ${renderDeleteButton(input, 'assertedEvents')}
      </div>
      ${input.state.assertedEvents.map((event, index) => {
        return html` <div class="padded row" jslog=${VisualLogging.treeItem('event-type')}>
            <div id="event-type">type<span class="separator">:</span></div>
            <div aria-labelledby="event-type">${event.type}</div>
          </div>
          <div class="padded row" jslog=${VisualLogging.treeItem('event-title')}>
            <div id="event-title">title<span class="separator">:</span></div>
            <devtools-suggestion-input
              aria-labelledby="event-title"
              .disabled=${input.disabled}
              .placeholder=${defaultValuesByAttribute.assertedEvents[0].title}
              .value=${live(event.title ?? '')}
              @blur=${input.handleInputBlur({
                attribute: 'assertedEvents',
                from(value) {
                  if (input.state.assertedEvents?.[index]?.title === undefined || input.state.assertedEvents[index].title === value) {
                    return;
                  }
                  return {
                    assertedEvents: new ArrayAssignments({
                      [index]: { title: value },
                    }),
                  };
                },
              })}
            ></devtools-suggestion-input>
          </div>
          <div  id="event-url" class="padded row" jslog=${VisualLogging.treeItem('event-url')}>
            <div>url<span class="separator">:</span></div>
            <devtools-suggestion-input
              aria-labelledby="event-url"
              .disabled=${input.disabled}
              .placeholder=${defaultValuesByAttribute.assertedEvents[0].url}
              .value=${live(event.url ?? '')}
              @blur=${input.handleInputBlur({
                attribute: 'url',
                from(value) {
                  if (input.state.assertedEvents?.[index]?.url === undefined || input.state.assertedEvents[index].url === value) {
                    return;
                  }
                  return {
                    assertedEvents: new ArrayAssignments({
                      [index]: { url: value },
                    }),
                  };
                },
              })}
            ></devtools-suggestion-input>
          </div>`;
      })}
    </div> `;
    // clang-format on
  }

  function renderAttributesRow(): Lit.TemplateResult|undefined {
    renderedAttributes.add('attributes');
    if (input.state.attributes === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="attributes" jslog=${VisualLogging.treeItem('attributes')}>
      <div class="row">
        <div>attributes<span class="separator">:</span></div>
        ${renderDeleteButton(input, 'attributes')}
      </div>
      ${input.state.attributes.map(({ name, value }, index, attributes) => {
        return html`<div class="padded row" jslog=${VisualLogging.treeItem('attribute')}>
          <devtools-suggestion-input
            .disabled=${input.disabled}
            .placeholder=${defaultValuesByAttribute.attributes[0].name}
            .value=${live(name)}
            data-path=${`attributes.${index}.name`}
            jslog=${VisualLogging.key().track({change: true})}
            @blur=${input.handleInputBlur({
              attribute: 'attributes',
              from(name) {
                if (input.state.attributes?.[index]?.name === undefined || input.state.attributes[index].name === name) {
                  return;
                }
                return {
                  attributes: new ArrayAssignments({ [index]: { name } }),
                };
              },
            })}
          ></devtools-suggestion-input>
          <span class="separator">:</span>
          <devtools-suggestion-input
            .disabled=${input.disabled}
            .placeholder=${defaultValuesByAttribute.attributes[0].value}
            .value=${live(value)}
            data-path=${`attributes.${index}.value`}
            @blur=${input.handleInputBlur({
              attribute: 'attributes',
              from(value) {
                if (input.state.attributes?.[index]?.value === undefined || input.state.attributes[index].value === value) {
                  return;
                }
                return {
                  attributes: new ArrayAssignments({ [index]: { value } }),
                };
              },
            })}
          ></devtools-suggestion-input>
          ${renderInlineButton(input, {
            class: 'add-attribute-assertion',
            title: i18nString(UIStrings.addSelectorPart),
            iconName: 'plus',
            onClick: input.handleAddOrRemoveClick(
              {
                attributes: new ArrayAssignments({
                  [index + 1]: new InsertAssignment(
                    (() => {
                      {
                        const names = new Set(
                          attributes.map(({ name }) => name),
                        );
                        const defaultAttribute =
                          defaultValuesByAttribute.attributes[0];
                        let name = defaultAttribute.name;
                        let i = 0;
                        while (names.has(name)) {
                          ++i;
                          name = `${defaultAttribute.name}-${i}`;
                        }
                        return { ...defaultAttribute, name };
                      }
                    })(),
                  ),
                }),
              },
              `devtools-suggestion-input[data-path="attributes.${
                index + 1
              }.name"]`,
            ),
          })}
          ${renderInlineButton(input, {
            class: 'remove-attribute-assertion',
            title: i18nString(UIStrings.removeSelectorPart),
            iconName: 'minus',
            onClick: input.handleAddOrRemoveClick(
              { attributes: new ArrayAssignments({ [index]: undefined }) },
              `devtools-suggestion-input[data-path="attributes.${Math.min(
                index,
                attributes.length - 2,
              )}.value"]`,
            ),
          })}
        </div>`;
      })}
    </div>`;
    // clang-format on
  }

  function renderAddRowButtons(): Array<Lit.TemplateResult|undefined> {
    const attributes = attributesByType[input.state.type];
    return [...attributes.optional].filter(attr => input.state[attr] === undefined).map(attr => {
      // clang-format off
        return html`<devtools-button
          .variant=${Buttons.Button.Variant.OUTLINED}
          class="add-row"
          data-attribute=${attr}
          jslog=${VisualLogging.action(`add-${Platform.StringUtilities.toKebabCase(attr)}`)}
          @click=${input.handleAddRowClickEvent}
        >
          ${i18nString(UIStrings.addAttribute, {
            attributeName: attr,
          })}
        </devtools-button>`;
      // clang-format on
    });
  }

  // clang-format off
  const result = html`
    <style>${stepEditorStyles}</style>
    <div class="wrapper" jslog=${VisualLogging.tree('step-editor')} >
      ${renderTypeRow(input.isTypeEditable)} ${renderRow('target')}
      ${renderFrameRow()} ${renderSelectorsRow()}
      ${renderRow('deviceType')} ${renderRow('button')}
      ${renderRow('url')} ${renderRow('x')}
      ${renderRow('y')} ${renderRow('offsetX')}
      ${renderRow('offsetY')} ${renderRow('value')}
      ${renderRow('key')} ${renderRow('operator')}
      ${renderRow('count')} ${renderRow('expression')}
      ${renderRow('duration')} ${renderAssertedEvents()}
      ${renderRow('timeout')} ${renderRow('width')}
      ${renderRow('height')} ${renderRow('deviceScaleFactor')}
      ${renderRow('isMobile')} ${renderRow('hasTouch')}
      ${renderRow('isLandscape')} ${renderRow('download')}
      ${renderRow('upload')} ${renderRow('latency')}
      ${renderRow('name')} ${renderRow('parameters')}
      ${renderRow('visible')} ${renderRow('properties')}
      ${renderAttributesRow()}
      ${input.error
        ? html`
            <div class="error">
              ${i18nString(UIStrings.notSaved, {
                error: input.error,
              })}
            </div>
          `
        : undefined}
      ${!input.disabled
        ? html`<div
            class="row-buttons wrapped gap row regular-font no-margin"
          >
            ${renderAddRowButtons()}
          </div>`
        : undefined}
    </div>
  `;

  // clang-format on
  for (const key of Object.keys(dataTypeByAttribute)) {
    if (!renderedAttributes.has(key as Attribute)) {
      throw new Error(`The editable attribute ${key} does not have UI`);
    }
  }

  render(result, target, {container: {listeners: {keydown: input.handleKeyDownEvent}}});
};

export class StepEditor extends UI.Widget.Widget {
  #state: DeepImmutable<EditorState>;
  #error: string|undefined;
  #isTypeEditable = true;
  #disabled = false;
  #view: View;
  onStepEdited?: (step: Models.Schema.Step) => void;
  onAttributeRequested?: (send: (attribute?: string) => void) => void;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#state = {type: Models.Schema.StepType.WaitForElement};
    this.#view = view;
  }

  set isTypeEditable(value: boolean) {
    this.#isTypeEditable = value;
    this.requestUpdate();
  }

  set disabled(value: boolean) {
    this.#disabled = value;
    this.requestUpdate();
  }

  set step(step: Models.Schema.Step) {
    this.#state = deepFreeze(EditorState.fromStep(step));
    this.#error = undefined;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
      state: this.#state,
      disabled: this.#disabled,
      error: this.#error,
      isTypeEditable: this.#isTypeEditable,
      handleInputBlur: this.#handleInputBlur,
      handleTypeInputBlur: this.#handleTypeInputBlur,
      handleAddRowClickEvent: this.#handleAddRowClickEvent,
      handleDeleteRowClick: this.#handleDeleteRowClick,
      handleSelectorPicked: this.#handleSelectorPicked,
      handleAttributeRequested: this.#handleAttributeRequested,
      handleAddOrRemoveClick: this.#handleAddOrRemoveClick,
      handleKeyDownEvent: this.#handleKeyDownEvent,
    };
    this.#view(input, undefined, this.contentElement);
  }

  #commit(updatedState: DeepImmutable<EditorState>): void {
    try {
      this.onStepEdited?.(EditorState.toStep(updatedState));
      // Note we don't need to update this variable since it will come from up
      // the tree, but processing up the tree is asynchronous implying we cannot
      // reliably know when the state will come back down. Since we need to
      // focus the DOM elements that may be created as a result of this new
      // state, we set it here for waiting on the updateComplete promise later.
      this.#state = updatedState;
    } catch (error) {
      this.#error = error.message;
    }
    this.requestUpdate();
  }

  #handleSelectorPicked =
      (data: Models.Schema.StepWithSelectors&Pick<Models.Schema.ClickAttributes, 'offsetX'|'offsetY'>): void => {
        this.#commit(immutableDeepAssign(this.#state, {
          target: data.target,
          frame: data.frame,
          selectors: data.selectors.map(selector => typeof selector === 'string' ? [selector] : selector),
          offsetX: data.offsetX,
          offsetY: data.offsetY,
        }));
      };

  #handleAttributeRequested = (send: (attribute?: string) => void): void => {
    this.onAttributeRequested?.(send);
  };

  #handleAddOrRemoveClick = (assignments: DeepImmutable<DeepPartial<Assignments<EditorState>>>,
                             query: string): ((event: Event) => void) => event => {
    event.preventDefault();
    event.stopPropagation();

    this.#commit(immutableDeepAssign(this.#state, assignments));

    this.#ensureFocus(query);
  };

  #handleDeleteRowClick = (attribute: Attribute) => (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    this.#commit(immutableDeepAssign(this.#state, {[attribute]: undefined}));
  };

  #ensureFocus = (query: string): void => {
    void this.updateComplete.then(() => {
      const node = this.contentElement.querySelector<HTMLElement>(query);
      node?.focus();
    });
  };

  #handleKeyDownEvent = (event: Event): void => {
    assert(event instanceof KeyboardEvent);
    if (event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const elements = this.contentElement.querySelectorAll('devtools-suggestion-input');
      const element = [...elements].findIndex(value => value === event.target);
      if (element >= 0 && element + 1 < elements.length) {
        elements[element + 1].focus();
      } else {
        event.target.blur();
      }
    }
  };

  #handleInputBlur = <A extends Attribute>(opts: {
    attribute: A,
    // If there are not assignments, then we should ignore the event.
    from(this: StepEditor, value: DataType<A>): DeepImmutable<DeepPartial<Assignments<EditorState>>>|undefined,
  }): ((event: Event) => void) => event => {
    assert(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput);
    if (event.target.disabled) {
      return;
    }

    const dataType = dataTypeByAttribute[opts.attribute];
    const value = typeConverters[dataType](event.target.value) as DataType<A>;
    const assignments = opts.from.bind(this)(value);
    if (!assignments) {
      return;
    }
    this.#commit(immutableDeepAssign(this.#state, assignments));
  };

  #handleTypeInputBlur = async(event: Event): Promise<void> => {
    assert(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput);
    if (event.target.disabled) {
      return;
    }

    const value = event.target.value as Models.Schema.StepType;
    if (value === this.#state.type) {
      return;
    }
    if (!Object.values(Models.Schema.StepType).includes(value)) {
      this.#error = i18nString(UIStrings.unknownActionType);
      this.requestUpdate();
      return;
    }
    this.#commit(await EditorState.default(value));
  };

  #handleAddRowClickEvent = async(event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    const attribute = (event.target as HTMLElement).dataset.attribute as Attribute;

    this.#commit(immutableDeepAssign(this.#state, {
      [attribute]: await EditorState.defaultByAttribute(this.#state, attribute),
    }));

    this.#ensureFocus(`[data-attribute=${attribute}].attribute devtools-suggestion-input`);
  };
}
