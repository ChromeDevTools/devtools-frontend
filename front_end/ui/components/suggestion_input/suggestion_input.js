var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/suggestion_input/SuggestionInput.js
var SuggestionInput_exports = {};
__export(SuggestionInput_exports, {
  SuggestionInput: () => SuggestionInput
});
import * as CodeHighlighter from "./../code_highlighter/code_highlighter.js";

// gen/front_end/ui/components/code_highlighter/codeHighlighter.css.js
var codeHighlighter_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.token-variable {
  color: var(--sys-color-token-variable);
}

.token-property {
  color: var(--sys-color-token-property);
}

.token-type {
  color: var(--sys-color-token-type);
}

.token-variable-special {
  color: var(--sys-color-token-variable-special);
}

.token-definition {
  color: var(--sys-color-token-definition);
}

.token-builtin {
  color: var(--sys-color-token-builtin);
}

.token-number {
  color: var(--sys-color-token-number);
}

.token-string {
  color: var(--sys-color-token-string);
}

.token-string-special {
  color: var(--sys-color-token-string-special);
}

.token-atom {
  color: var(--sys-color-token-atom);
}

.token-keyword {
  color: var(--sys-color-token-keyword);
}

.token-comment {
  color: var(--sys-color-token-comment);
}

.token-meta {
  color: var(--sys-color-token-meta);
}

.token-invalid {
  color: var(--sys-color-error);
}

.token-tag {
  color: var(--sys-color-token-tag);
}

.token-attribute {
  color: var(--sys-color-token-attribute);
}

.token-attribute-value {
  color: var(--sys-color-token-attribute-value);
}

.token-inserted {
  color: var(--sys-color-token-inserted);
}

.token-deleted {
  color: var(--sys-color-token-deleted);
}

.token-heading {
  color: var(--sys-color-token-variable-special);
  font-weight: bold;
}

.token-link {
  color: var(--sys-color-token-variable-special);
  text-decoration: underline;
}

.token-strikethrough {
  text-decoration: line-through;
}

.token-strong {
  font-weight: bold;
}

.token-emphasis {
  font-style: italic;
}

/*# sourceURL=${import.meta.resolve("./codeHighlighter.css")} */`;

// gen/front_end/ui/components/suggestion_input/SuggestionInput.js
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/suggestion_input/suggestionInput.css.js
var suggestionInput_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  box-sizing: border-box;
  font-size: inherit;
  margin: 0;
  padding: 0;
}

:host {
  position: relative;
}

devtools-editable-content {
  background: transparent;
  border: none;
  color: var(--override-color-recorder-input, var(--sys-color-on-surface));
  cursor: text;
  display: inline-block;
  line-height: 18px;
  min-height: 18px;
  min-width: 0.5em;
  outline: none;
  overflow-wrap: anywhere;
}

devtools-editable-content:hover,
devtools-editable-content:focus {
  box-shadow: 0 0 0 1px var(--sys-color-divider);
  border-radius: 2px;
}

devtools-editable-content[placeholder]:empty::before {
  content: attr(placeholder);
  color: var(--sys-color-on-surface);
  opacity: 50%;
}

devtools-editable-content[placeholder]:empty:focus::before {
  content: "";
}

devtools-suggestion-box {
  position: absolute;
  display: none;
}

devtools-editable-content:focus ~ devtools-suggestion-box {
  display: block;
}

.suggestions {
  background-color: var(--sys-color-cdt-base-container);
  box-shadow: var(--drop-shadow);
  min-height: 1em;
  min-width: 150px;
  overflow: hidden auto;
  position: relative;
  z-index: 100;
  max-height: 350px;
}

.suggestions > li {
  padding: 1px;
  border: 1px solid transparent;
  white-space: nowrap;
  font-family: var(--source-code-font-family);
  font-size: var(--source-code-font-size);
  color: var(--sys-color-on-surface);
}

.suggestions > li:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.suggestions > li.selected {
  background-color: var(--sys-color-primary);
  color: var(--sys-color-cdt-base-container);
}

.strikethrough {
  text-decoration: line-through;
}

/*# sourceURL=${import.meta.resolve("./suggestionInput.css")} */`;

// gen/front_end/ui/components/suggestion_input/SuggestionInput.js
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var mod = (a, n) => {
  return (a % n + n) % n;
};
function assert(predicate, message = "Assertion failed!") {
  if (!predicate) {
    throw new Error(message);
  }
}
var { html, Decorators, Directives, LitElement } = Lit;
var { customElement, property, state } = Decorators;
var { classMap } = Directives;
var jsonPropertyOptions = {
  hasChanged(value2, oldValue) {
    return JSON.stringify(value2) !== JSON.stringify(oldValue);
  },
  attribute: false
};
var EditableContent = class EditableContent2 extends HTMLElement {
  static get observedAttributes() {
    return ["disabled", "placeholder"];
  }
  set disabled(disabled) {
    this.contentEditable = String(!disabled);
  }
  get disabled() {
    return this.contentEditable !== "true";
  }
  set value(value2) {
    this.innerText = value2;
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
  #mimeType = "";
  constructor() {
    super();
    this.contentEditable = "true";
    this.tabIndex = 0;
    this.addEventListener("focus", () => {
      this.innerHTML = this.innerText;
    });
    this.addEventListener("blur", this.#highlight.bind(this));
  }
  #highlight() {
    if (this.#mimeType) {
      void CodeHighlighter.CodeHighlighter.highlightNode(this, this.#mimeType);
    }
  }
  attributeChangedCallback(name, _, value2) {
    switch (name) {
      case "disabled":
        this.disabled = value2 !== null;
        break;
    }
  }
};
EditableContent = __decorate([
  customElement("devtools-editable-content")
], EditableContent);
var SuggestEvent = class _SuggestEvent extends Event {
  static eventName = "suggest";
  constructor(suggestion) {
    super(_SuggestEvent.eventName);
    this.suggestion = suggestion;
  }
};
var SuggestionInitEvent = class _SuggestionInitEvent extends Event {
  static eventName = "suggestioninit";
  listeners;
  constructor(listeners) {
    super(_SuggestionInitEvent.eventName);
    this.listeners = listeners;
  }
};
var defaultSuggestionFilter = (option, query) => option.toLowerCase().startsWith(query.toLowerCase());
var SuggestionBox = class SuggestionBox2 extends LitElement {
  #suggestions = [];
  constructor() {
    super();
    this.options = [];
    this.expression = "";
    this.cursor = 0;
  }
  #handleKeyDownEvent = (event) => {
    assert(event instanceof KeyboardEvent, "Bound to the wrong event.");
    if (this.#suggestions.length > 0) {
      switch (event.key) {
        case "ArrowDown":
          event.stopPropagation();
          event.preventDefault();
          this.#moveCursor(1);
          break;
        case "ArrowUp":
          event.stopPropagation();
          event.preventDefault();
          this.#moveCursor(-1);
          break;
      }
    }
    switch (event.key) {
      case "Enter":
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
    this.dispatchEvent(new SuggestionInitEvent([["keydown", this.#handleKeyDownEvent]]));
  }
  willUpdate(changedProperties) {
    if (changedProperties.has("options")) {
      this.options = Object.freeze([...this.options].sort());
    }
    if (changedProperties.has("expression") || changedProperties.has("options")) {
      this.cursor = 0;
      this.#suggestions = this.options.filter((option) => (this.suggestionFilter || defaultSuggestionFilter)(option, this.expression));
    }
  }
  render() {
    if (this.#suggestions.length === 0) {
      return;
    }
    return html`<style>${suggestionInput_css_default}</style><ul class="suggestions">
      ${this.#suggestions.map((suggestion, index) => {
      return html`<li
          class=${classMap({
        selected: index === this.cursor
      })}
          @mousedown=${this.#dispatchSuggestEvent.bind(this, suggestion)}
          jslog=${VisualLogging.item("suggestion").track({
        click: true
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
  customElement("devtools-suggestion-box")
], SuggestionBox);
var SuggestionInput = class SuggestionInput2 extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };
  constructor() {
    super();
    this.options = [];
    this.expression = "";
    this.placeholder = "";
    this.value = "";
    this.disabled = false;
    this.strikethrough = true;
    this.mimeType = "";
    this.autocomplete = true;
    this.addEventListener("blur", this.#handleBlurEvent);
    let jslog = VisualLogging.value().track({ keydown: "ArrowUp|ArrowDown|Enter", change: true, click: true });
    if (this.jslogContext) {
      jslog = jslog.context(this.jslogContext);
    }
    this.setAttribute("jslog", jslog.toString());
  }
  #cachedEditableContent;
  get #editableContent() {
    if (this.#cachedEditableContent) {
      return this.#cachedEditableContent;
    }
    const node = this.renderRoot.querySelector("devtools-editable-content");
    if (!node) {
      throw new Error("Attempted to query node before rendering.");
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
    if (event.key === "Enter") {
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
    setTimeout(this.blur.bind(this), 0);
  };
  willUpdate(properties) {
    if (properties.has("value")) {
      this.expression = this.value;
    }
  }
  render() {
    return html`<style>${suggestionInput_css_default}</style>
      <style>${codeHighlighter_css_default}</style>
      <devtools-editable-content
        ?disabled=${this.disabled}
        class=${classMap({
      strikethrough: !this.strikethrough
    })}
        .enterKeyHint=${"done"}
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
        .expression=${this.autocomplete ? this.expression : ""}
      ></devtools-suggestion-box>`;
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
  customElement("devtools-suggestion-input")
], SuggestionInput);
export {
  SuggestionInput_exports as SuggestionInput
};
//# sourceMappingURL=suggestion_input.js.map
