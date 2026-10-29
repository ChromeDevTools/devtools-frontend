// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/enforce-custom-element-definitions-location */
import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import contentEditableStyles from './suggestionInput.css.js';
const mod = (a, n) => {
    return ((a % n) + n) % n;
};
function assert(predicate, message = 'Assertion failed!') {
    if (!predicate) {
        throw new Error(message);
    }
}
const { html, Directives } = Lit;
const { classMap } = Directives;
class EditableContent extends HTMLElement {
    static get observedAttributes() {
        return ['disabled', 'placeholder'];
    }
    set disabled(disabled) {
        this.contentEditable = String(!disabled);
    }
    get disabled() {
        return this.contentEditable !== 'true';
    }
    set value(value) {
        this.innerText = value;
        this.#highlight();
    }
    get value() {
        return this.innerText;
    }
    set mimeType(type) {
        this.#mimeType = type;
        this.#highlight();
    }
    get mimeType() {
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
    #highlight() {
        if (this.#mimeType) {
            void CodeHighlighter.CodeHighlighter.highlightNode(this, this.#mimeType);
        }
    }
    attributeChangedCallback(name, _, value) {
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
    static eventName = 'suggest';
    constructor(suggestion) {
        super(SuggestEvent.eventName);
        this.suggestion = suggestion;
    }
}
/**
 * Parents should listen for this event and register the listeners provided by
 * this event.
 */
class SuggestionInitEvent extends Event {
    static eventName = 'suggestioninit';
    listeners;
    constructor(listeners) {
        super(SuggestionInitEvent.eventName);
        this.listeners = listeners;
    }
}
const defaultSuggestionFilter = (option, query) => option.toLowerCase().startsWith(query.toLowerCase());
const SUGGESTION_BOX_VIEW = (input, _output, target) => {
    if (!input.hasVisibleSuggestions) {
        Lit.render(Lit.nothing, target);
        return;
    }
    // clang-format off
    Lit.render(html `<style>${contentEditableStyles}</style><ul class="suggestions">
    ${input.suggestions.map((suggestion, index) => html `
      <li class=${classMap({ selected: index === input.cursor })}
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
    #shadow = this.attachShadow({ mode: 'open' });
    #view;
    #options = [];
    #expression = '';
    #suggestionFilter;
    #hideExactMatch = false;
    #cursor = 0;
    #suggestions = [];
    constructor(view = SUGGESTION_BOX_VIEW) {
        super();
        this.#view = view;
    }
    get renderRoot() {
        return this.#shadow;
    }
    get updateComplete() {
        return Promise.resolve(true);
    }
    get options() {
        return this.#options;
    }
    set options(options) {
        const sorted = Object.freeze([...options].sort());
        if (JSON.stringify(sorted) === JSON.stringify(this.#options)) {
            return;
        }
        this.#options = sorted;
        this.#cursor = 0;
        this.#updateSuggestions();
        this.#render();
    }
    get expression() {
        return this.#expression;
    }
    set expression(expression) {
        if (this.#expression === expression) {
            return;
        }
        this.#expression = expression;
        this.#cursor = 0;
        this.#updateSuggestions();
        this.#render();
    }
    get suggestionFilter() {
        return this.#suggestionFilter;
    }
    set suggestionFilter(suggestionFilter) {
        if (this.#suggestionFilter === suggestionFilter) {
            return;
        }
        this.#suggestionFilter = suggestionFilter;
        this.#cursor = 0;
        this.#updateSuggestions();
        this.#render();
    }
    get hideExactMatch() {
        return this.#hideExactMatch;
    }
    set hideExactMatch(hideExactMatch) {
        if (this.#hideExactMatch === hideExactMatch) {
            return;
        }
        this.#hideExactMatch = hideExactMatch;
        this.#render();
    }
    #updateSuggestions() {
        this.#suggestions = this.#options.filter(option => (this.#suggestionFilter || defaultSuggestionFilter)(option, this.#expression));
    }
    #hasVisibleSuggestions() {
        return this.#suggestions.length > 0 &&
            !(this.#hideExactMatch && this.#suggestions.length === 1 && this.#suggestions[0] === this.#expression);
    }
    #handleKeyDownEvent = (event) => {
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
    #moveCursor(delta) {
        this.#cursor = mod(this.#cursor + delta, this.#suggestions.length);
        this.#render();
    }
    #dispatchSuggestEvent = (suggestion) => {
        this.dispatchEvent(new SuggestEvent(suggestion));
    };
    connectedCallback() {
        this.dispatchEvent(new SuggestionInitEvent([['keydown', this.#handleKeyDownEvent]]));
        this.#render();
    }
    #render() {
        this.#view({
            suggestions: this.#suggestions,
            cursor: this.#cursor,
            hasVisibleSuggestions: this.#hasVisibleSuggestions(),
            onSuggest: this.#dispatchSuggestEvent,
        }, undefined, this.#shadow);
    }
}
export const SUGGESTION_INPUT_VIEW = (input, _output, target) => {
    // clang-format off
    Lit.render(html `<style>${contentEditableStyles}</style>
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
    #shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    #view;
    /**
     * State passed to devtools-suggestion-box.
     */
    #options = [];
    #autocomplete = true;
    #suggestionFilter;
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
    #jslogContext;
    constructor(view = SUGGESTION_INPUT_VIEW) {
        super();
        this.#view = view;
        this.addEventListener('blur', this.#handleBlurEvent);
        let jslog = VisualLogging.value().track({ keydown: 'ArrowUp|ArrowDown|Enter', change: true, click: true });
        if (this.jslogContext) {
            jslog = jslog.context(this.jslogContext);
        }
        this.setAttribute('jslog', jslog.toString());
        this.#render();
    }
    get renderRoot() {
        return this.#shadow;
    }
    get updateComplete() {
        return Promise.resolve(true);
    }
    get options() {
        return this.#options;
    }
    set options(options) {
        if (JSON.stringify(options) === JSON.stringify(this.#options)) {
            return;
        }
        this.#options = options;
        this.#render();
    }
    get autocomplete() {
        return this.#autocomplete;
    }
    set autocomplete(autocomplete) {
        if (this.#autocomplete === autocomplete) {
            return;
        }
        this.#autocomplete = autocomplete;
        this.#render();
    }
    get suggestionFilter() {
        return this.#suggestionFilter;
    }
    set suggestionFilter(suggestionFilter) {
        if (this.#suggestionFilter === suggestionFilter) {
            return;
        }
        this.#suggestionFilter = suggestionFilter;
        this.#render();
    }
    get hideExactMatch() {
        return this.#hideExactMatch;
    }
    set hideExactMatch(hideExactMatch) {
        if (this.#hideExactMatch === hideExactMatch) {
            return;
        }
        this.#hideExactMatch = hideExactMatch;
        this.#render();
    }
    get expression() {
        return this.#expression;
    }
    set expression(expression) {
        if (this.#expression === expression) {
            return;
        }
        this.#expression = expression;
        this.#render();
    }
    get placeholder() {
        return this.#placeholder;
    }
    set placeholder(placeholder) {
        if (this.#placeholder === placeholder) {
            return;
        }
        this.#placeholder = placeholder;
        this.#render();
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        if (this.#value === value) {
            return;
        }
        this.#value = value;
        this.#expression = value;
        this.#render();
    }
    get disabled() {
        return this.#disabled;
    }
    set disabled(disabled) {
        if (this.#disabled === disabled) {
            return;
        }
        this.#disabled = disabled;
        this.#render();
    }
    get strikethrough() {
        return this.#strikethrough;
    }
    set strikethrough(strikethrough) {
        if (this.#strikethrough === strikethrough) {
            return;
        }
        this.#strikethrough = strikethrough;
        this.#render();
    }
    get mimeType() {
        return this.#mimeType;
    }
    set mimeType(mimeType) {
        if (this.#mimeType === mimeType) {
            return;
        }
        this.#mimeType = mimeType;
        this.#render();
    }
    get jslogContext() {
        return this.#jslogContext;
    }
    set jslogContext(jslogContext) {
        if (this.#jslogContext === jslogContext) {
            return;
        }
        this.#jslogContext = jslogContext;
        this.#render();
    }
    #cachedEditableContent;
    get #editableContent() {
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
    #handleBlurEvent = () => {
        window.getSelection()?.removeAllRanges();
        this.value = this.#editableContent.value;
        this.expression = this.#editableContent.value;
    };
    #handleFocusEvent = (event) => {
        assert(event.target instanceof Node);
        const range = document.createRange();
        range.selectNodeContents(event.target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    };
    #handleKeyDownEvent = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };
    #handleInputEvent = (event) => {
        this.expression = event.target.value;
    };
    #handleSuggestionInitEvent = (event) => {
        for (const [name, listener] of event.listeners) {
            this.addEventListener(name, listener);
        }
    };
    #handleSuggestEvent = (event) => {
        this.#editableContent.value = event.suggestion;
        // If actions result in a `focus` after this blur, then the blur won't
        // happen. `setTimeout` guarantees `blur` will always come after `focus`.
        setTimeout(this.blur.bind(this), 0);
    };
    connectedCallback() {
        this.#render();
    }
    #render() {
        this.#view({
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
        }, undefined, this.#shadow);
    }
}
customElements.define('devtools-editable-content', EditableContent);
customElements.define('devtools-suggestion-box', SuggestionBox);
customElements.define('devtools-suggestion-input', SuggestionInput);
//# sourceMappingURL=SuggestionInput.js.map