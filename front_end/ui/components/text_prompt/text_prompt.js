var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/text_prompt/TextPrompt.js
var TextPrompt_exports = {};
__export(TextPrompt_exports, {
  PromptInputEvent: () => PromptInputEvent,
  TextPrompt: () => TextPrompt
});
import * as Platform from "./../../../core/platform/platform.js";
import { html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/text_prompt/textPrompt.css.js
var textPrompt_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  white-space: pre;
  overflow: hidden;
  display: flex;
}

input {
  font-size: var(--sys-typescale-body3-size);
}

.prefix {
  flex: none;
  font-weight: var(--ref-typeface-weight-medium);
  font-size: var(--sys-typescale-body3-size);
  color: var(--sys-color-primary);
}

.text-prompt-input {
  flex: auto;
  position: relative;
}

.text-prompt-input input {
  width: 100%;
  border: none;
  outline: none;
  position: absolute;
  left: 0;
  padding: 0;
  z-index: 2;
  color: var(--sys-color-on-surface);
  background-color: transparent;
  line-height: var(--sys-typescale-body3-line-height);
}

.text-prompt-input .suggestion {
  color: var(--sys-color-on-surface-subtle);
  line-height: var(--sys-typescale-body3-line-height);
  position: absolute;
  left: 0;
  z-index: 1;
}

/*# sourceURL=${import.meta.resolve("./textPrompt.css")} */`;

// gen/front_end/ui/components/text_prompt/TextPrompt.js
var PromptInputEvent = class _PromptInputEvent extends Event {
  static eventName = "promptinputchanged";
  data;
  constructor(value) {
    super(_PromptInputEvent.eventName);
    this.data = value;
  }
};
var TextPrompt = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #ariaLabelText = "";
  #prefixText = "";
  #suggestionText = "";
  set data(data) {
    this.#ariaLabelText = data.ariaLabel;
    this.#prefixText = data.prefix;
    this.#suggestionText = data.suggestion;
    this.#render();
  }
  get data() {
    return {
      ariaLabel: this.#ariaLabelText,
      prefix: this.#prefixText,
      suggestion: this.#suggestionText
    };
  }
  focus() {
    this.#input().focus();
  }
  #input() {
    const inputElement = this.#shadow.querySelector(".input");
    if (!inputElement) {
      throw new Error("Expected an input element!");
    }
    return inputElement;
  }
  moveCaretToEndOfInput() {
    this.setSelectedRange(this.#text().length, this.#text().length);
  }
  onKeyDown(event) {
    if (event.key === Platform.KeyboardUtilities.ENTER_KEY) {
      event.preventDefault();
    }
  }
  setSelectedRange(startIndex, endIndex) {
    if (startIndex < 0) {
      throw new RangeError("Selected range start must be a nonnegative integer");
    }
    const textContentLength = this.#text().length;
    if (endIndex > textContentLength) {
      endIndex = textContentLength;
    }
    if (endIndex < startIndex) {
      endIndex = startIndex;
    }
    this.#input().setSelectionRange(startIndex, endIndex);
  }
  setPrefix(prefix) {
    this.#prefixText = prefix;
    this.#render();
  }
  setSuggestion(suggestion) {
    this.#suggestionText = suggestion;
    this.#suggestion().value = this.#suggestionText;
    this.#render();
  }
  setText(text) {
    this.#input().value = text;
    if (this.#input().hasFocus()) {
      this.moveCaretToEndOfInput();
      this.#input().scrollIntoView();
    }
  }
  #suggestion() {
    const suggestionElement = this.#shadow.querySelector(".suggestion");
    if (!suggestionElement) {
      throw new Error("Expected an suggestion element!");
    }
    return suggestionElement;
  }
  #text() {
    return this.#input().value || "";
  }
  connectedCallback() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "dir") {
          const writingDirection = this.#input().getAttribute("dir");
          if (!writingDirection) {
            this.#suggestion().removeAttribute("dir");
            return;
          }
          this.#suggestion().setAttribute("dir", writingDirection);
        }
      }
    });
    observer.observe(this.#input(), { attributeFilter: ["dir"] });
  }
  #render() {
    const output = html`
      <style>${textPrompt_css_default}</style>
      <span class="prefix">${this.#prefixText} </span>
      <span class="text-prompt-input">
        <input
            class="input" aria-label=${this.#ariaLabelText} spellcheck="false"
            @input=${() => this.dispatchEvent(new PromptInputEvent(this.#text()))}
            @keydown=${this.onKeyDown}>
        <input class="suggestion" tabindex=-1 aria-label=${this.#ariaLabelText + " Suggestion"}>
      </span>`;
    render(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-text-prompt", TextPrompt);
export {
  TextPrompt_exports as TextPrompt
};
//# sourceMappingURL=text_prompt.js.map
