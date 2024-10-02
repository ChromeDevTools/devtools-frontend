// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Puppeteer from '../../../third_party/puppeteer/puppeteer.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as SuggestionInput from '../../../ui/components/suggestion_input/suggestion_input.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Controllers from '../controllers/controllers.js';
import * as Models from '../models/models.js';
import * as Util from '../util/util.js';

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
} from './util.js';

const {html, Decorators, Directives, LitElement} = LitHtml;
const {customElement, property, state} = Decorators;
const {live} = Directives;

type StepFor<Type> = Extract<Models.Schema.Step, {type: Type}>;
type Attribute = Keys<Models.Schema.Step>;

type DataType<A extends Attribute> = ReturnType<typeof typeConverters[typeof dataTypeByAttribute[A]]>;

const typeConverters = Object.freeze({
  string: (value: string) => value.trim(),
  number: (value: string) => {
    const number = parseFloat(value);
    if (Number.isNaN(number)) {
      return 0;
    }
    return number;
  },
  boolean: (value: string) => {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    return false;
  },
});

const dataTypeByAttribute = Object.freeze({
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

const defaultValuesByAttribute = deepFreeze({
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
      {required: Exclude<RequiredKeys<StepFor<Type>>, 'type'>[], optional: OptionalKeys<StepFor<Type>>[]};
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
   *@description The text that is disabled when the steps were not saved due to an error. The error message itself is always in English and not translated.
   *@example {Saving failed} error
   */
  notSaved: 'Not saved: {error}',
  /**
   *@description The button title that adds a new attribute to the form.
   *@example {timeout} attributeName
   */
  addAttribute: 'Add {attributeName}',
  /**
   *@description The title of a button that deletes an attribute from the form.
   */
  deleteRow: 'Delete row',
  /**
   *@description The title of a button that allows you to select an element on the page and update CSS/ARIA selectors.
   */
  selectorPicker: 'Select an element in the page to update selectors',
  /**
   *@description The title of a button that adds a new input field for the entry of the frame index. Frame index is the number of the frame within the page's frame tree.
   */
  addFrameIndex: 'Add frame index within the frame tree',
  /**
   *@description The title of a button that removes a frame index field from the form.
   */
  removeFrameIndex: 'Remove frame index',
  /**
   *@description The title of a button that adds a field to input a part of a selector in the editor form.
   */
  addSelectorPart: 'Add a selector part',
  /**
   *@description The title of a button that removes a field to input a part of a selector in the editor form.
   */
  removeSelectorPart: 'Remove a selector part',
  /**
   *@description The title of a button that adds a field to input a selector in the editor form.
   */
  addSelector: 'Add a selector',
  /**
   *@description The title of a button that removes a field to input a selector in the editor form.
   */
  removeSelector: 'Remove a selector',
  /**
   *@description The error message display when a user enters a type in the input not associates with any existing types.
   */
  unknownActionType: 'Unknown action type.',
};
const str_ = i18n.i18n.registerUIStrings('panels/recorder/components/StepEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-recorder-step-editor': StepEditor;
    'devtools-recorder-selector-picker-button': RecorderSelectorPickerButton;
  }
}

export class StepEditedEvent extends Event {
  static readonly eventName = 'stepedited';
  data: Models.Schema.Step;

  constructor(step: Models.Schema.Step) {
    super(StepEditedEvent.eventName, {bubbles: true, composed: true});
    this.data = step;
  }
}

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
  static #puppeteer: Util.SharedObject.SharedObject<Puppeteer> = new Util.SharedObject.SharedObject(
      () => Models.RecordingPlayer.RecordingPlayer.connectPuppeteer(),
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
  static async defaultByAttribute(_state: DeepImmutable<EditorState>, attribute: keyof typeof defaultValuesByAttribute):
      Promise<unknown> {
    return this.#puppeteer.run(puppeteer => {
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
          return (
              puppeteer.page.evaluate(() => (visualViewport as VisualViewport).height) ||
              defaultValuesByAttribute.height);
        }
        case 'width': {
          return (
              puppeteer.page.evaluate(() => (visualViewport as VisualViewport).width) ||
              defaultValuesByAttribute.width);
        }
        default: {
          return defaultValuesByAttribute[attribute];
        }
      }
    });
  }

  static fromStep(step: DeepImmutable<Models.Schema.Step>): DeepImmutable<EditorState> {
    const state = structuredClone(step) as EditorState;
    for (const key of ['parameters', 'properties'] as Array<'properties'>) {
      if (key in step && step[key] !== undefined) {
        // @ts-ignore Potential infinite type instantiation.
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
    return deepFreeze(state as EditorState);
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
    if (state.frame && state.frame.length === 0 && 'frame' in step) {
      delete step.frame;
    }
    return cleanUndefineds(Models.SchemaUtils.parseStep(step));
  }
}

/**
 * @fires RequestSelectorAttributeEvent#requestselectorattribute
 * @fires SelectorPickedEvent#selectorpicked
 */
@customElement('devtools-recorder-selector-picker-button')
class RecorderSelectorPickerButton extends LitElement {
  static override styles = [stepEditorStyles];

  @property({type: Boolean}) declare disabled: boolean;

  #picker = new Controllers.SelectorPicker.SelectorPicker(this);

  constructor() {
    super();
    this.disabled = false;
  }

  #handleClickEvent = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    void this.#picker.toggle();
  };

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    void this.#picker.stop();
  }

  protected override render(): LitHtml.TemplateResult|undefined {
    if (this.disabled) {
      return;
    }
    return html`<devtools-button
      @click=${this.#handleClickEvent}
      .title=${i18nString(UIStrings.selectorPicker)}
      class="selector-picker"
      .size=${Buttons.Button.Size.SMALL}
      .iconName=${'select-element'}
      .active=${this.#picker.active}
      .variant=${Buttons.Button.Variant.ICON}
      jslog=${VisualLogging.toggle('selector-picker').track({
      click: true,
    })}
    ></devtools-button>`;
  }
}

/**
 * @fires RequestSelectorAttributeEvent#requestselectorattribute
 * @fires StepEditedEvent#stepedited
 */
@customElement('devtools-recorder-step-editor')
export class StepEditor extends LitElement {
  static override styles = [stepEditorStyles];

  @state() private declare state: DeepImmutable<EditorState>;
  @state() private declare error: string|undefined;

  @property({type: Boolean}) declare isTypeEditable: boolean;
  @property({type: Boolean}) declare disabled: boolean;

  #renderedAttributes: Set<Attribute> = new Set();

  constructor() {
    super();

    this.state = {type: Models.Schema.StepType.WaitForElement};

    this.isTypeEditable = true;
    this.disabled = false;
  }

  protected override createRenderRoot(): HTMLElement|DocumentFragment {
    const root = super.createRenderRoot();
    root.addEventListener('keydown', this.#handleKeyDownEvent);
    return root;
  }

  set step(step: DeepImmutable<Models.Schema.Step>) {
    this.state = deepFreeze(EditorState.fromStep(step));
    this.error = undefined;
  }

  #commit(updatedState: DeepImmutable<EditorState>): void {
    try {
      this.dispatchEvent(new StepEditedEvent(EditorState.toStep(updatedState)));
      // Note we don't need to update this variable since it will come from up
      // the tree, but processing up the tree is asynchronous implying we cannot
      // reliably know when the state will come back down. Since we need to
      // focus the DOM elements that may be created as a result of this new
      // state, we set it here for waiting on the updateComplete promise later.
      this.state = updatedState;
    } catch (error) {
      this.error = error.message;
    }
  }

  #handleSelectorPickedEvent = (event: Controllers.SelectorPicker.SelectorPickedEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    this.#commit(immutableDeepAssign(this.state, {
      target: event.data.target,
      frame: event.data.frame,
      selectors: event.data.selectors.map(selector => typeof selector === 'string' ? [selector] : selector),
      offsetX: event.data.offsetX,
      offsetY: event.data.offsetY,
    }));
  };

  #handleAddOrRemoveClick =
      (assignments: DeepImmutable<DeepPartial<Assignments<EditorState>>>, query: string,
       metric: Host.UserMetrics.RecordingEdited): ((event: Event) => void) => event => {
        event.preventDefault();
        event.stopPropagation();

        this.#commit(immutableDeepAssign(this.state, assignments));

        this.#ensureFocus(query);

        if (metric) {
          Host.userMetrics.recordingEdited(metric);
        }
      };

  #handleKeyDownEvent = (event: Event): void => {
    assert(event instanceof KeyboardEvent);
    if (event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const elements = this.renderRoot.querySelectorAll('devtools-suggestion-input');
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
    metric: Host.UserMetrics.RecordingEdited,
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
    this.#commit(immutableDeepAssign(this.state, assignments));

    if (opts.metric) {
      Host.userMetrics.recordingEdited(opts.metric);
    }
  };

  #handleTypeInputBlur = async(event: Event): Promise<void> => {
    assert(event.target instanceof SuggestionInput.SuggestionInput.SuggestionInput);
    if (event.target.disabled) {
      return;
    }

    const value = event.target.value as Models.Schema.StepType;
    if (value === this.state.type) {
      return;
    }
    if (!Object.values(Models.Schema.StepType).includes(value)) {
      this.error = i18nString(UIStrings.unknownActionType);
      return;
    }
    this.#commit(await EditorState.default(value));
    Host.userMetrics.recordingEdited(Host.UserMetrics.RecordingEdited.TYPE_CHANGED);
  };

  #handleAddRowClickEvent = async(event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    const attribute = (event.target as HTMLElement).dataset.attribute as Attribute;

    this.#commit(immutableDeepAssign(this.state, {
      [attribute]: await EditorState.defaultByAttribute(this.state, attribute),
    }));

    this.#ensureFocus(`[data-attribute=${attribute}].attribute devtools-suggestion-input`);
  };

  #renderInlineButton(opts: {class: string, title: string, iconName: string, onClick: (event: MouseEvent) => void}):
      LitHtml.TemplateResult|undefined {
    if (this.disabled) {
      return;
    }
    return html`
      <devtools-button
        title=${opts.title}
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

  #renderDeleteButton(attribute: Attribute): LitHtml.TemplateResult|undefined {
    if (this.disabled) {
      return;
    }

    const attributes = attributesByType[this.state.type];
    const optional = [...attributes.optional].includes(attribute as typeof attributes.optional[number]);
    if (!optional || this.disabled) {
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
      @click=${(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        this.#commit(
          immutableDeepAssign(this.state, { [attribute]: undefined }),
        );
      }}
    ></devtools-button>`;
    // clang-format on
  }

  #renderTypeRow(editable: boolean): LitHtml.TemplateResult {
    this.#renderedAttributes.add('type');
    // clang-format off
    return html`<div class="row attribute" data-attribute="type" jslog=${VisualLogging.treeItem('type')}>
      <div>type<span class="separator">:</span></div>
      <devtools-suggestion-input
        .disabled=${!editable || this.disabled}
        .options=${Object.values(Models.Schema.StepType)}
        .placeholder=${defaultValuesByAttribute.type}
        .value=${live(this.state.type)}
        @blur=${this.#handleTypeInputBlur}
      ></devtools-suggestion-input>
    </div>`;
    // clang-format on
  }

  #renderRow(attribute: Attribute): LitHtml.TemplateResult|undefined {
    this.#renderedAttributes.add(attribute);
    const attributeValue = this.state[attribute]?.toString();
    if (attributeValue === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="row attribute" data-attribute=${attribute} jslog=${VisualLogging.treeItem(Platform.StringUtilities.toKebabCase(attribute))}>
      <div>${attribute}<span class="separator">:</span></div>
      <devtools-suggestion-input
        .disabled=${this.disabled}
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
        @blur=${this.#handleInputBlur({
      attribute,
      from(value) {
        if (this.state[attribute] === undefined) {
          return;
        }
        switch (attribute) {
          case 'properties':
            Host.userMetrics.recordingAssertion(Host.UserMetrics.RecordingAssertion.PROPERTY_ASSERTION_EDITED);
            break;
        }
        return {[attribute]: value};
      },
      metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
    })}
      ></devtools-suggestion-input>
      ${this.#renderDeleteButton(attribute)}
    </div>`;
    // clang-format on
  }

  #renderFrameRow(): LitHtml.TemplateResult|undefined {
    this.#renderedAttributes.add('frame');
    if (this.state.frame === undefined) {
      return;
    }
    // clang-format off
    return html`
      <div class="attribute" data-attribute="frame" jslog=${VisualLogging.treeItem('frame')}>
        <div class="row">
          <div>frame<span class="separator">:</span></div>
          ${this.#renderDeleteButton('frame')}
        </div>
        ${this.state.frame.map((frame, index, frames) => {
          return html`
            <div class="padded row">
              <devtools-suggestion-input
                .disabled=${this.disabled}
                .placeholder=${defaultValuesByAttribute.frame[0].toString()}
                .value=${live(frame.toString())}
                data-path=${`frame.${index}`}
                @blur=${this.#handleInputBlur({
                  attribute: 'frame',
                  from(value) {
                    if (this.state.frame?.[index] === undefined) {
                      return;
                    }
                    return {
                      frame: new ArrayAssignments({ [index]: value }),
                    };
                  },
                  metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
                })}
              ></devtools-suggestion-input>
              ${this.#renderInlineButton({
                class: 'add-frame',
                title: i18nString(UIStrings.addFrameIndex),
                iconName: 'plus',
                onClick: this.#handleAddOrRemoveClick(
                  {
                    frame: new ArrayAssignments({
                      [index + 1]: new InsertAssignment(
                        defaultValuesByAttribute.frame[0],
                      ),
                    }),
                  },
                  `devtools-suggestion-input[data-path="frame.${index + 1}"]`,
                  Host.UserMetrics.RecordingEdited.OTHER_EDITING,
                ),
              })}
              ${this.#renderInlineButton({
                class: 'remove-frame',
                title: i18nString(UIStrings.removeFrameIndex),
                iconName: 'minus',
                onClick: this.#handleAddOrRemoveClick(
                  {
                    frame: new ArrayAssignments({ [index]: undefined }),
                  },
                  `devtools-suggestion-input[data-path="frame.${Math.min(
                    index,
                    frames.length - 2,
                  )}"]`,
                  Host.UserMetrics.RecordingEdited.OTHER_EDITING,
                ),
              })}
            </div>
          `;
        })}
      </div>
    `;
    // clang-format on
  }

  #renderSelectorsRow(): LitHtml.TemplateResult|undefined {
    this.#renderedAttributes.add('selectors');
    if (this.state.selectors === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="selectors" jslog=${VisualLogging.treeItem('selectors')}>
      <div class="row">
        <div>selectors<span class="separator">:</span></div>
        <devtools-recorder-selector-picker-button
          @selectorpicked=${this.#handleSelectorPickedEvent}
          .disabled=${this.disabled}
        ></devtools-recorder-selector-picker-button>
        ${this.#renderDeleteButton('selectors')}
      </div>
      ${this.state.selectors.map((selector, index, selectors) => {
        return html`<div class="padded row" data-selector-path=${index}>
            <div>selector #${index + 1}<span class="separator">:</span></div>
            ${this.#renderInlineButton({
              class: 'add-selector',
              title: i18nString(UIStrings.addSelector),
              iconName: 'plus',
              onClick: this.#handleAddOrRemoveClick(
                {
                  selectors: new ArrayAssignments({
                    [index + 1]: new InsertAssignment(
                      structuredClone(defaultValuesByAttribute.selectors[0]),
                    ),
                  }),
                },
                `devtools-suggestion-input[data-path="selectors.${index + 1}.0"]`,
                Host.UserMetrics.RecordingEdited.SELECTOR_ADDED,
              ),
            })}
            ${this.#renderInlineButton({
              class: 'remove-selector',
              title: i18nString(UIStrings.removeSelector),
              iconName: 'minus',
              onClick: this.#handleAddOrRemoveClick(
                { selectors: new ArrayAssignments({ [index]: undefined }) },
                `devtools-suggestion-input[data-path="selectors.${Math.min(
                  index,
                  selectors.length - 2,
                )}.0"]`,
                Host.UserMetrics.RecordingEdited.SELECTOR_REMOVED,
              ),
            })}
          </div>
          ${selector.map((part, partIndex, parts) => {
            return html`<div
              class="double padded row"
              data-selector-path="${index}.${partIndex}"
            >
              <devtools-suggestion-input
                .disabled=${this.disabled}
                .placeholder=${defaultValuesByAttribute.selectors[0][0]}
                .value=${live(part)}
                data-path=${`selectors.${index}.${partIndex}`}
                @blur=${this.#handleInputBlur({
                  attribute: 'selectors',
                  from(value) {
                    if (
                      this.state.selectors?.[index]?.[partIndex] === undefined
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
                  metric: Host.UserMetrics.RecordingEdited.SELECTOR_PART_EDITED,
                })}
              ></devtools-suggestion-input>
              ${this.#renderInlineButton({
                class: 'add-selector-part',
                title: i18nString(UIStrings.addSelectorPart),
                iconName: 'plus',
                onClick: this.#handleAddOrRemoveClick(
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
                  Host.UserMetrics.RecordingEdited.SELECTOR_PART_ADDED,
                ),
              })}
              ${this.#renderInlineButton({
                class: 'remove-selector-part',
                title: i18nString(UIStrings.removeSelectorPart),
                iconName: 'minus',
                onClick: this.#handleAddOrRemoveClick(
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
                  Host.UserMetrics.RecordingEdited.SELECTOR_PART_REMOVED,
                ),
              })}
            </div>`;
          })}`;
      })}
    </div>`;
    // clang-format on
  }

  #renderAssertedEvents(): LitHtml.TemplateResult|undefined {
    this.#renderedAttributes.add('assertedEvents');
    if (this.state.assertedEvents === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="assertedEvents" jslog=${VisualLogging.treeItem('asserted-events')}>
      <div class="row">
        <div>asserted events<span class="separator">:</span></div>
        ${this.#renderDeleteButton('assertedEvents')}
      </div>
      ${this.state.assertedEvents.map((event, index) => {
        return html` <div class="padded row" jslog=${VisualLogging.treeItem('event-type')}>
            <div>type<span class="separator">:</span></div>
            <div>${event.type}</div>
          </div>
          <div class="padded row" jslog=${VisualLogging.treeItem('event-title')}>
            <div>title<span class="separator">:</span></div>
            <devtools-suggestion-input
              .disabled=${this.disabled}
              .placeholder=${defaultValuesByAttribute.assertedEvents[0].title}
              .value=${live(event.title ?? '')}
              @blur=${this.#handleInputBlur({
                attribute: 'assertedEvents',
                from(value) {
                  if (this.state.assertedEvents?.[index]?.title === undefined) {
                    return;
                  }
                  return {
                    assertedEvents: new ArrayAssignments({
                      [index]: { title: value },
                    }),
                  };
                },
                metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
              })}
            ></devtools-suggestion-input>
          </div>
          <div class="padded row" jslog=${VisualLogging.treeItem('event-url')}>
            <div>url<span class="separator">:</span></div>
            <devtools-suggestion-input
              .disabled=${this.disabled}
              .placeholder=${defaultValuesByAttribute.assertedEvents[0].url}
              .value=${live(event.url ?? '')}
              @blur=${this.#handleInputBlur({
                attribute: 'url',
                from(value) {
                  if (this.state.assertedEvents?.[index]?.url === undefined) {
                    return;
                  }
                  return {
                    assertedEvents: new ArrayAssignments({
                      [index]: { url: value },
                    }),
                  };
                },
                metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
              })}
            ></devtools-suggestion-input>
          </div>`;
      })}
    </div> `;
    // clang-format on
  }

  #renderAttributesRow(): LitHtml.TemplateResult|undefined {
    this.#renderedAttributes.add('attributes');
    if (this.state.attributes === undefined) {
      return;
    }
    // clang-format off
    return html`<div class="attribute" data-attribute="attributes" jslog=${VisualLogging.treeItem('attributes')}>
      <div class="row">
        <div>attributes<span class="separator">:</span></div>
        ${this.#renderDeleteButton('attributes')}
      </div>
      ${this.state.attributes.map(({ name, value }, index, attributes) => {
        return html`<div class="padded row" jslog=${VisualLogging.treeItem('attribute')}>
          <devtools-suggestion-input
            .disabled=${this.disabled}
            .placeholder=${defaultValuesByAttribute.attributes[0].name}
            .value=${live(name)}
            data-path=${`attributes.${index}.name`}
            jslog=${VisualLogging.key().track({change: true})}
            @blur=${this.#handleInputBlur({
              attribute: 'attributes',
              from(name) {
                if (this.state.attributes?.[index]?.name === undefined) {
                  return;
                }
                Host.userMetrics.recordingAssertion(
                  Host.UserMetrics.RecordingAssertion.ATTRIBUTE_ASSERTION_EDITED,
                );
                return {
                  attributes: new ArrayAssignments({ [index]: { name } }),
                };
              },
              metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
            })}
          ></devtools-suggestion-input>
          <span class="separator">:</span>
          <devtools-suggestion-input
            .disabled=${this.disabled}
            .placeholder=${defaultValuesByAttribute.attributes[0].value}
            .value=${live(value)}
            data-path=${`attributes.${index}.value`}
            @blur=${this.#handleInputBlur({
              attribute: 'attributes',
              from(value) {
                if (this.state.attributes?.[index]?.value === undefined) {
                  return;
                }
                Host.userMetrics.recordingAssertion(
                  Host.UserMetrics.RecordingAssertion.ATTRIBUTE_ASSERTION_EDITED,
                );
                return {
                  attributes: new ArrayAssignments({ [index]: { value } }),
                };
              },
              metric: Host.UserMetrics.RecordingEdited.OTHER_EDITING,
            })}
          ></devtools-suggestion-input>
          ${this.#renderInlineButton({
            class: 'add-attribute-assertion',
            title: i18nString(UIStrings.addSelectorPart),
            iconName: 'plus',
            onClick: this.#handleAddOrRemoveClick(
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
              Host.UserMetrics.RecordingEdited.OTHER_EDITING,
            ),
          })}
          ${this.#renderInlineButton({
            class: 'remove-attribute-assertion',
            title: i18nString(UIStrings.removeSelectorPart),
            iconName: 'minus',
            onClick: this.#handleAddOrRemoveClick(
              { attributes: new ArrayAssignments({ [index]: undefined }) },
              `devtools-suggestion-input[data-path="attributes.${Math.min(
                index,
                attributes.length - 2,
              )}.value"]`,
              Host.UserMetrics.RecordingEdited.OTHER_EDITING,
            ),
          })}
        </div>`;
      })}
    </div>`;
    // clang-format on
  }

  #renderAddRowButtons(): Array<LitHtml.TemplateResult|undefined> {
    const attributes = attributesByType[this.state.type];
    return [...attributes.optional].filter(attr => this.state[attr] === undefined).map(attr => {
      // clang-format off
        return html`<devtools-button
          .variant=${Buttons.Button.Variant.OUTLINED}
          class="add-row"
          data-attribute=${attr}
          jslog=${VisualLogging.action(`add-${Platform.StringUtilities.toKebabCase(attr)}`)}
          @click=${this.#handleAddRowClickEvent}
        >
          ${i18nString(UIStrings.addAttribute, {
            attributeName: attr,
          })}
        </devtools-button>`;
      // clang-format on
    });
  }

  #ensureFocus = (query: string): void => {
    void this.updateComplete.then(() => {
      const node = this.renderRoot.querySelector<HTMLElement>(query);
      node?.focus();
    });
  };

  protected override render(): LitHtml.TemplateResult {
    this.#renderedAttributes = new Set();

    // clang-format off
    const result = html`
      <div class="wrapper" jslog=${VisualLogging.tree('step-editor')}>
        ${this.#renderTypeRow(this.isTypeEditable)} ${this.#renderRow('target')}
        ${this.#renderFrameRow()} ${this.#renderSelectorsRow()}
        ${this.#renderRow('deviceType')} ${this.#renderRow('button')}
        ${this.#renderRow('url')} ${this.#renderRow('x')}
        ${this.#renderRow('y')} ${this.#renderRow('offsetX')}
        ${this.#renderRow('offsetY')} ${this.#renderRow('value')}
        ${this.#renderRow('key')} ${this.#renderRow('operator')}
        ${this.#renderRow('count')} ${this.#renderRow('expression')}
        ${this.#renderRow('duration')} ${this.#renderAssertedEvents()}
        ${this.#renderRow('timeout')} ${this.#renderRow('width')}
        ${this.#renderRow('height')} ${this.#renderRow('deviceScaleFactor')}
        ${this.#renderRow('isMobile')} ${this.#renderRow('hasTouch')}
        ${this.#renderRow('isLandscape')} ${this.#renderRow('download')}
        ${this.#renderRow('upload')} ${this.#renderRow('latency')}
        ${this.#renderRow('name')} ${this.#renderRow('parameters')}
        ${this.#renderRow('visible')} ${this.#renderRow('properties')}
        ${this.#renderAttributesRow()}
        ${this.error
          ? html`
              <div class="error">
                ${i18nString(UIStrings.notSaved, {
                  error: this.error,
                })}
              </div>
            `
          : undefined}
        ${!this.disabled
          ? html`<div
              class="row-buttons wrapped gap row regular-font no-margin"
            >
              ${this.#renderAddRowButtons()}
            </div>`
          : undefined}
      </div>
    `;

    // clang-format on
    for (const key of Object.keys(dataTypeByAttribute)) {
      if (!this.#renderedAttributes.has(key as Attribute)) {
        throw new Error(`The editable attribute ${key} does not have UI`);
      }
    }

    return result;
  }
}
