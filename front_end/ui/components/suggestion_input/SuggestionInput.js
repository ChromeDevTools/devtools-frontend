// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/enforce-custom-element-definitions-location */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
import codeHighlighterStyles from '../../../ui/components/code_highlighter/codeHighlighter.css.js';
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
const { html, Decorators, Directives, LitElement } = Lit;
const { customElement, property, state } = Decorators;
const { classMap } = Directives;
const jsonPropertyOptions = {
    hasChanged(value, oldValue) {
        return JSON.stringify(value) !== JSON.stringify(oldValue);
    },
    attribute: false,
};
let EditableContent = class EditableContent extends HTMLElement {
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
            this.innerHTML = this.innerText;
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
};
EditableContent = __decorate([
    customElement('devtools-editable-content')
], EditableContent);
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
/**
 * @fires SuggestionInitEvent#suggestioninit
 * @fires SuggestEvent#suggest
 */
let SuggestionBox = class SuggestionBox extends LitElement {
    #suggestions = [];
    constructor() {
        super();
        this.options = [];
        this.expression = '';
        this.cursor = 0;
    }
    #handleKeyDownEvent = (event) => {
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
    #moveCursor(delta) {
        this.cursor = mod(this.cursor + delta, this.#suggestions.length);
    }
    #dispatchSuggestEvent(suggestion) {
        this.dispatchEvent(new SuggestEvent(suggestion));
    }
    connectedCallback() {
        super.connectedCallback();
        this.dispatchEvent(new SuggestionInitEvent([['keydown', this.#handleKeyDownEvent]]));
    }
    willUpdate(changedProperties) {
        if (changedProperties.has('options')) {
            this.options = Object.freeze([...this.options].sort());
        }
        if (changedProperties.has('expression') || changedProperties.has('options')) {
            this.cursor = 0;
            this.#suggestions = this.options.filter(option => (this.suggestionFilter || defaultSuggestionFilter)(option, this.expression));
        }
    }
    render() {
        if (this.#suggestions.length === 0) {
            return;
        }
        return html `<style>${contentEditableStyles}</style><ul class="suggestions">
      ${this.#suggestions.map((suggestion, index) => {
            return html `<li
          class=${classMap({
                selected: index === this.cursor,
            })}
          @mousedown=${this.#dispatchSuggestEvent.bind(this, suggestion)}
          jslog=${VisualLogging.item('suggestion').track({
                click: true,
            })}
        >
          ${suggestion}
        </li>`;
        })}
    </ul>`;
    }
};
__decorate([
    property(jsonPropertyOptions)
], SuggestionBox.prototype, "options", void 0);
__decorate([
    property()
], SuggestionBox.prototype, "expression", void 0);
__decorate([
    property()
], SuggestionBox.prototype, "suggestionFilter", void 0);
__decorate([
    state()
], SuggestionBox.prototype, "cursor", void 0);
SuggestionBox = __decorate([
    customElement('devtools-suggestion-box')
], SuggestionBox);
let SuggestionInput = class SuggestionInput extends LitElement {
    static shadowRootOptions = {
        ...LitElement.shadowRootOptions,
        delegatesFocus: true,
    };
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
        let jslog = VisualLogging.value().track({ keydown: 'ArrowUp|ArrowDown|Enter', change: true, click: true });
        if (this.jslogContext) {
            jslog = jslog.context(this.jslogContext);
        }
        this.setAttribute('jslog', jslog.toString());
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
    willUpdate(properties) {
        if (properties.has('value')) {
            this.expression = this.value;
        }
    }
    render() {
        // clang-format off
        return html `<style>${contentEditableStyles}</style>
      <style>${codeHighlighterStyles}</style>
      <devtools-editable-content
        ?disabled=${this.disabled}
        class=${classMap({
            strikethrough: !this.strikethrough,
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
};
__decorate([
    property(jsonPropertyOptions)
], SuggestionInput.prototype, "options", void 0);
__decorate([
    property({ type: Boolean })
], SuggestionInput.prototype, "autocomplete", void 0);
__decorate([
    property()
], SuggestionInput.prototype, "suggestionFilter", void 0);
__decorate([
    state()
], SuggestionInput.prototype, "expression", void 0);
__decorate([
    property()
], SuggestionInput.prototype, "placeholder", void 0);
__decorate([
    property()
], SuggestionInput.prototype, "value", void 0);
__decorate([
    property({ type: Boolean })
], SuggestionInput.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean })
], SuggestionInput.prototype, "strikethrough", void 0);
__decorate([
    property()
], SuggestionInput.prototype, "mimeType", void 0);
__decorate([
    property()
], SuggestionInput.prototype, "jslogContext", void 0);
SuggestionInput = __decorate([
    customElement('devtools-suggestion-input')
], SuggestionInput);
export { SuggestionInput };
//# sourceMappingURL=SuggestionInput.js.map