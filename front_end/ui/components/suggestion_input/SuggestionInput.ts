// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
// eslint-disable-next-line rulesdir/es_modules_import
import codeHighlighterStyles from '../../../ui/components/code_highlighter/codeHighlighter.css.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import contentEditableStyles from './suggestionInput.css.js';

const mod = (a: number, n: number): number => {
  return ((a % n) + n) % n;
};

function assert<T>(
    predicate: T,
    message = 'Assertion failed!',
    ): asserts predicate {
  if (!predicate) {
    throw new Error(message);
  }
}

const {html, Decorators, Directives, LitElement} = LitHtml;
const {customElement, property, state} = Decorators;
const {classMap} = Directives;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-suggestion-input': SuggestionInput;
    'devtools-editable-content': EditableContent;
    'devtools-suggestion-box': SuggestionBox;
  }
}

const jsonPropertyOptions = {
  hasChanged(value: unknown, oldValue: unknown): boolean {
    return JSON.stringify(value) !== JSON.stringify(oldValue);
  },
};

@customElement('devtools-editable-content')
class EditableContent extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['disabled', 'placeholder'];
  }

  set disabled(disabled: boolean) {
    this.contentEditable = String(!disabled);
  }

  get disabled(): boolean {
    return this.contentEditable !== 'true';
  }

  set value(value: string) {
    this.innerText = value;
    this.#highlight();
  }

  get value(): string {
    return this.innerText;
  }

  set mimeType(type: string) {
    this.#mimeType = type;
    this.#highlight();
  }

  get mimeType(): string {
    return this.#mimeType;
  }

  #mimeType = '';

  constructor() {
    super();

    this.contentEditable = 'true';
    this.tabIndex = 0;

    this.addEventListener('focus', () => {
      this.innerHTML = this.innerText;
    });
    this.addEventListener('blur', this.#highlight.bind(this));
  }

  #highlight(): void {
    if (this.#mimeType) {
      void CodeHighlighter.CodeHighlighter.highlightNode(this, this.#mimeType);
    }
  }

  attributeChangedCallback(name: string, _: string|null, value: string|null): void {
    switch (name) {
      case 'disabled':
        this.disabled = value !== null;
        break;
    }
  }
}

/**
 * Contains a suggestion emitted due to action by the user.
 */
class SuggestEvent extends Event {
  static readonly eventName = 'suggest';
  declare suggestion: string;
  constructor(suggestion: string) {
    super(SuggestEvent.eventName);
    this.suggestion = suggestion;
  }
}

/**
 * Parents should listen for this event and register the listeners provided by
 * this event.
 */
class SuggestionInitEvent extends Event {
  static readonly eventName = 'suggestioninit';
  listeners: [string, (event: Event) => void][];
  constructor(listeners: [string, (event: Event) => void][]) {
    super(SuggestionInitEvent.eventName);
    this.listeners = listeners;
  }
}

type SuggestionFilter = (option: string, query: string) => boolean;

const defaultSuggestionFilter = (option: string, query: string): boolean =>
    option.toLowerCase().startsWith(query.toLowerCase());

/**
 * @fires SuggestionInitEvent#suggestioninit
 * @fires SuggestEvent#suggest
 */
@customElement('devtools-suggestion-box')
class SuggestionBox extends LitElement {
  static override styles = [contentEditableStyles];

  @property(jsonPropertyOptions) declare options: Readonly<string[]>;
  @property() declare expression: string;
  @property() declare suggestionFilter?: SuggestionFilter;

  @state() private declare cursor: number;

  #suggestions: string[] = [];

  constructor() {
    super();

    this.options = [];
    this.expression = '';

    this.cursor = 0;
  }

  #handleKeyDownEvent = (event: Event): void => {
    assert(event instanceof KeyboardEvent, 'Bound to the wrong event.');

    if (this.#suggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.stopPropagation();
          event.preventDefault();
          this.#moveCursor(1);
          break;
        case 'ArrowUp':
          event.stopPropagation();
          event.preventDefault();
          this.#moveCursor(-1);
          break;
      }
    }

    switch (event.key) {
      case 'Enter':
        if (this.#suggestions[this.cursor]) {
          this.#dispatchSuggestEvent(this.#suggestions[this.cursor]);
        }
        event.preventDefault();
        break;
    }
  };

  #moveCursor(delta: number): void {
    this.cursor = mod(this.cursor + delta, this.#suggestions.length);
  }

  #dispatchSuggestEvent(suggestion: string): void {
    this.dispatchEvent(new SuggestEvent(suggestion));
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.dispatchEvent(
        new SuggestionInitEvent([['keydown', this.#handleKeyDownEvent]]),
    );
  }

  override willUpdate(changedProperties: LitHtml.PropertyValues<this>): void {
    if (changedProperties.has('options')) {
      this.options = Object.freeze([...this.options].sort());
    }
    if (changedProperties.has('expression') || changedProperties.has('options')) {
      this.cursor = 0;
      this.#suggestions = this.options.filter(
          option => (this.suggestionFilter || defaultSuggestionFilter)(option, this.expression),
      );
    }
  }

  protected override render(): LitHtml.TemplateResult|undefined {
    if (this.#suggestions.length === 0) {
      return;
    }

    return html`<ul class="suggestions">
      ${this.#suggestions.map((suggestion, index) => {
      return html`<li
          class=${classMap({
        selected: index === this.cursor,
      })}
          @mousedown=${this.#dispatchSuggestEvent.bind(this, suggestion)}
        >
          ${suggestion}
        </li>`;
    })}
    </ul>`;
  }
}

@customElement('devtools-suggestion-input')
export class SuggestionInput extends LitElement {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  } as const;

  static override styles = [contentEditableStyles, codeHighlighterStyles];

  /**
   * State passed to devtools-suggestion-box.
   */
  @property(jsonPropertyOptions) declare options: Readonly<string[]>;
  @property() declare autocomplete?: boolean;
  @property() declare suggestionFilter?: SuggestionFilter;
  @state() declare expression: string;

  /**
   * State passed to devtools-editable-content.
   */
  @property() declare placeholder: string;
  @property() declare value: string;
  @property({type: Boolean}) declare disabled: boolean;
  @property() declare strikethrough: boolean;
  @property() declare mimeType: string;

  constructor() {
    super();

    this.options = [];
    this.expression = '';

    this.placeholder = '';
    this.value = '';
    this.disabled = false;
    this.strikethrough = true;
    this.mimeType = '';
    this.autocomplete = true;
    this.addEventListener('blur', this.#handleBlurEvent);
  }

  #cachedEditableContent?: EditableContent;
  get #editableContent(): EditableContent {
    if (this.#cachedEditableContent) {
      return this.#cachedEditableContent;
    }
    const node = this.renderRoot.querySelector('devtools-editable-content');
    if (!node) {
      throw new Error('Attempted to query node before rendering.');
    }
    this.#cachedEditableContent = node;
    return node;
  }

  #handleBlurEvent = (): void => {
    window.getSelection()?.removeAllRanges();
    this.value = this.#editableContent.value;
    this.expression = this.#editableContent.value;
  };

  #handleFocusEvent = (event: FocusEvent): void => {
    assert(event.target instanceof Node);
    const range = document.createRange();
    range.selectNodeContents(event.target);

    const selection = window.getSelection() as Selection;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  #handleKeyDownEvent = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  #handleInputEvent = (event: {target: EditableContent}): void => {
    this.expression = event.target.value;
  };

  #handleSuggestionInitEvent = (event: SuggestionInitEvent): void => {
    for (const [name, listener] of event.listeners) {
      this.addEventListener(name, listener);
    }
  };

  #handleSuggestEvent = (event: SuggestEvent): void => {
    this.#editableContent.value = event.suggestion;
    // If actions result in a `focus` after this blur, then the blur won't
    // happen. `setTimeout` guarantees `blur` will always come after `focus`.
    setTimeout(this.blur.bind(this), 0);
  };

  protected override willUpdate(
      properties: LitHtml.PropertyValues<this>,
      ): void {
    if (properties.has('value')) {
      this.expression = this.value;
    }
  }

  protected override render(): LitHtml.TemplateResult {
    // clang-format off
    return html`<devtools-editable-content
        ?disabled=${this.disabled}
        class=${classMap({
          'strikethrough': !this.strikethrough,
        })}
        .enterKeyHint=${'done'}
        .value=${this.value}
        .mimeType=${this.mimeType}
        @focus=${this.#handleFocusEvent}
        @input=${this.#handleInputEvent}
        @keydown=${this.#handleKeyDownEvent}
        autocapitalize="off"
        inputmode="text"
        placeholder=${this.placeholder}
        spellcheck="false"
      ></devtools-editable-content>
      <devtools-suggestion-box
        @suggestioninit=${this.#handleSuggestionInitEvent}
        @suggest=${this.#handleSuggestEvent}
        .options=${this.options}
        .suggestionFilter=${this.suggestionFilter}
        .expression=${this.autocomplete ? this.expression : ''}
      ></devtools-suggestion-box>`;
    // clang-format on
  }
}
