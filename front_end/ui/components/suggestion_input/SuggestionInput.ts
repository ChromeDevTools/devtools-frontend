// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/enforce-custom-element-definitions-location */

import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

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

const {html, Directives} = Lit;
const {classMap} = Directives;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-suggestion-input': SuggestionInput;
    'devtools-editable-content': EditableContent;
    'devtools-suggestion-box': SuggestionBox;
  }
}

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
      this.textContent = this.innerText;
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
  listeners: Array<[string, (event: Event) => void]>;
  constructor(listeners: Array<[string, (event: Event) => void]>) {
    super(SuggestionInitEvent.eventName);
    this.listeners = listeners;
  }
}

export type SuggestionFilter = (option: string, query: string) => boolean;

const defaultSuggestionFilter = (option: string, query: string): boolean =>
    option.toLowerCase().startsWith(query.toLowerCase());

interface SuggestionBoxViewInput {
  suggestions: readonly string[];
  cursor: number;
  hasVisibleSuggestions: boolean;
  onSuggest: (suggestion: string) => void;
}

const SUGGESTION_BOX_VIEW = (input: SuggestionBoxViewInput, _output: undefined, target: ShadowRoot): void => {
  if (!input.hasVisibleSuggestions) {
    Lit.render(Lit.nothing, target);
    return;
  }

  // clang-format off
  Lit.render(html`<style>${contentEditableStyles}</style><ul class="suggestions">
    ${input.suggestions.map((suggestion, index) => html`
      <li class=${classMap({selected: index === input.cursor})}
          @mousedown=${() => input.onSuggest(suggestion)}
          jslog=${VisualLogging.item('suggestion').track({ click: true, resize: true })}>
        ${suggestion}
      </li>`)}
  </ul>`, target);
  // clang-format on
};

/**
 * @fires SuggestionInitEvent#suggestioninit
 * @fires SuggestEvent#suggest
 */
class SuggestionBox extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #view: typeof SUGGESTION_BOX_VIEW;

  #options: readonly string[] = [];
  #expression = '';
  #suggestionFilter?: SuggestionFilter;
  #hideExactMatch = false;
  #cursor = 0;
  #suggestions: string[] = [];

  constructor(view: typeof SUGGESTION_BOX_VIEW = SUGGESTION_BOX_VIEW) {
    super();
    this.#view = view;
  }

  get renderRoot(): ShadowRoot {
    return this.#shadow;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  get options(): readonly string[] {
    return this.#options;
  }

  set options(options: readonly string[]) {
    const sorted = Object.freeze([...options].sort());
    if (JSON.stringify(sorted) === JSON.stringify(this.#options)) {
      return;
    }
    this.#options = sorted;
    this.#cursor = 0;
    this.#updateSuggestions();
    this.#render();
  }

  get expression(): string {
    return this.#expression;
  }

  set expression(expression: string) {
    if (this.#expression === expression) {
      return;
    }
    this.#expression = expression;
    this.#cursor = 0;
    this.#updateSuggestions();
    this.#render();
  }

  get suggestionFilter(): SuggestionFilter|undefined {
    return this.#suggestionFilter;
  }

  set suggestionFilter(suggestionFilter: SuggestionFilter|undefined) {
    if (this.#suggestionFilter === suggestionFilter) {
      return;
    }
    this.#suggestionFilter = suggestionFilter;
    this.#cursor = 0;
    this.#updateSuggestions();
    this.#render();
  }

  get hideExactMatch(): boolean {
    return this.#hideExactMatch;
  }

  set hideExactMatch(hideExactMatch: boolean) {
    if (this.#hideExactMatch === hideExactMatch) {
      return;
    }
    this.#hideExactMatch = hideExactMatch;
    this.#render();
  }

  #updateSuggestions(): void {
    this.#suggestions = this.#options.filter(
        option => (this.#suggestionFilter || defaultSuggestionFilter)(option, this.#expression),
    );
  }

  #hasVisibleSuggestions(): boolean {
    return this.#suggestions.length > 0 &&
        !(this.#hideExactMatch && this.#suggestions.length === 1 && this.#suggestions[0] === this.#expression);
  }

  #handleKeyDownEvent = (event: Event): void => {
    assert(event instanceof KeyboardEvent, 'Bound to the wrong event.');

    if (this.#hasVisibleSuggestions()) {
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
        if (this.#hasVisibleSuggestions() && this.#suggestions[this.#cursor]) {
          this.#dispatchSuggestEvent(this.#suggestions[this.#cursor]);
        }
        event.preventDefault();
        break;
    }
  };

  #moveCursor(delta: number): void {
    this.#cursor = mod(this.#cursor + delta, this.#suggestions.length);
    this.#render();
  }

  #dispatchSuggestEvent = (suggestion: string): void => {
    this.dispatchEvent(new SuggestEvent(suggestion));
  };

  connectedCallback(): void {
    this.dispatchEvent(
        new SuggestionInitEvent([['keydown', this.#handleKeyDownEvent]]),
    );
    this.#render();
  }

  #render(): void {
    this.#view(
        {
          suggestions: this.#suggestions,
          cursor: this.#cursor,
          hasVisibleSuggestions: this.#hasVisibleSuggestions(),
          onSuggest: this.#dispatchSuggestEvent,
        },
        undefined,
        this.#shadow,
    );
  }
}

export interface SuggestionInputViewInput {
  disabled: boolean;
  strikethrough: boolean;
  value: string;
  mimeType: string;
  placeholder: string;
  options: readonly string[];
  suggestionFilter?: SuggestionFilter;
  hideExactMatch: boolean;
  expression: string;
  onFocus: (event: FocusEvent) => void;
  onInput: (event: {target: EditableContent}) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onSuggestionInit: (event: SuggestionInitEvent) => void;
  onSuggest: (event: SuggestEvent) => void;
}

export const SUGGESTION_INPUT_VIEW =
    (input: SuggestionInputViewInput, _output: undefined, target: ShadowRoot): void => {
      // clang-format off
  Lit.render(html`<style>${contentEditableStyles}</style>
    <style>${CodeHighlighter.codeHighlighterStyles}</style>
    <devtools-editable-content
      ?disabled=${input.disabled}
      class=${classMap({
        strikethrough: !input.strikethrough,
      })}
      .enterKeyHint=${'done'}
      .value=${input.value}
      .mimeType=${input.mimeType}
      @focus=${input.onFocus}
      @input=${input.onInput}
      @keydown=${input.onKeyDown}
      autocapitalize="off"
      inputmode="text"
      placeholder=${input.placeholder}
      spellcheck="false"
    ></devtools-editable-content>
    <devtools-suggestion-box
      @suggestioninit=${input.onSuggestionInit}
      @suggest=${input.onSuggest}
      .options=${input.options}
      .suggestionFilter=${input.suggestionFilter}
      .hideExactMatch=${input.hideExactMatch}
      .expression=${input.expression}
    ></devtools-suggestion-box>`, target);
      // clang-format on
    };

export class SuggestionInput extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
  readonly #view: typeof SUGGESTION_INPUT_VIEW;

  /**
   * State passed to devtools-suggestion-box.
   */
  #options: readonly string[] = [];
  #autocomplete?: boolean = true;
  #suggestionFilter?: SuggestionFilter;
  #hideExactMatch = false;
  #expression = '';

  /**
   * State passed to devtools-editable-content.
   */
  #placeholder = '';
  #value = '';
  #disabled = false;
  #strikethrough = true;
  #mimeType = '';
  #jslogContext?: string;

  constructor(view: typeof SUGGESTION_INPUT_VIEW = SUGGESTION_INPUT_VIEW) {
    super();
    this.#view = view;

    this.addEventListener('blur', this.#handleBlurEvent);
    let jslog = VisualLogging.value().track({keydown: 'ArrowUp|ArrowDown|Enter', change: true, click: true});
    if (this.jslogContext) {
      jslog = jslog.context(this.jslogContext);
    }
    this.setAttribute('jslog', jslog.toString());
    this.#render();
  }

  get renderRoot(): ShadowRoot {
    return this.#shadow;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  get options(): readonly string[] {
    return this.#options;
  }

  set options(options: readonly string[]) {
    if (JSON.stringify(options) === JSON.stringify(this.#options)) {
      return;
    }
    this.#options = options;
    this.#render();
  }

  get autocomplete(): boolean|undefined {
    return this.#autocomplete;
  }

  set autocomplete(autocomplete: boolean|undefined) {
    if (this.#autocomplete === autocomplete) {
      return;
    }
    this.#autocomplete = autocomplete;
    this.#render();
  }

  get suggestionFilter(): SuggestionFilter|undefined {
    return this.#suggestionFilter;
  }

  set suggestionFilter(suggestionFilter: SuggestionFilter|undefined) {
    if (this.#suggestionFilter === suggestionFilter) {
      return;
    }
    this.#suggestionFilter = suggestionFilter;
    this.#render();
  }

  get hideExactMatch(): boolean {
    return this.#hideExactMatch;
  }

  set hideExactMatch(hideExactMatch: boolean) {
    if (this.#hideExactMatch === hideExactMatch) {
      return;
    }
    this.#hideExactMatch = hideExactMatch;
    this.#render();
  }

  get expression(): string {
    return this.#expression;
  }

  set expression(expression: string) {
    if (this.#expression === expression) {
      return;
    }
    this.#expression = expression;
    this.#render();
  }

  get placeholder(): string {
    return this.#placeholder;
  }

  set placeholder(placeholder: string) {
    if (this.#placeholder === placeholder) {
      return;
    }
    this.#placeholder = placeholder;
    this.#render();
  }

  get value(): string {
    return this.#value;
  }

  set value(value: string) {
    if (this.#value === value) {
      return;
    }
    this.#value = value;
    this.#expression = value;
    this.#render();
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  set disabled(disabled: boolean) {
    if (this.#disabled === disabled) {
      return;
    }
    this.#disabled = disabled;
    this.#render();
  }

  get strikethrough(): boolean {
    return this.#strikethrough;
  }

  set strikethrough(strikethrough: boolean) {
    if (this.#strikethrough === strikethrough) {
      return;
    }
    this.#strikethrough = strikethrough;
    this.#render();
  }

  get mimeType(): string {
    return this.#mimeType;
  }

  set mimeType(mimeType: string) {
    if (this.#mimeType === mimeType) {
      return;
    }
    this.#mimeType = mimeType;
    this.#render();
  }

  get jslogContext(): string|undefined {
    return this.#jslogContext;
  }

  set jslogContext(jslogContext: string|undefined) {
    if (this.#jslogContext === jslogContext) {
      return;
    }
    this.#jslogContext = jslogContext;
    this.#render();
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

  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    this.#view(
        {
          disabled: this.#disabled,
          strikethrough: this.#strikethrough,
          value: this.#value,
          mimeType: this.#mimeType,
          placeholder: this.#placeholder,
          options: this.#options,
          suggestionFilter: this.#suggestionFilter,
          hideExactMatch: this.#hideExactMatch,
          expression: this.#autocomplete ? this.#expression : '',
          onFocus: this.#handleFocusEvent,
          onInput: this.#handleInputEvent,
          onKeyDown: this.#handleKeyDownEvent,
          onSuggestionInit: this.#handleSuggestionInitEvent,
          onSuggest: this.#handleSuggestEvent,
        },
        undefined,
        this.#shadow,
    );
  }
}

customElements.define('devtools-editable-content', EditableContent);
customElements.define('devtools-suggestion-box', SuggestionBox);
customElements.define('devtools-suggestion-input', SuggestionInput);
