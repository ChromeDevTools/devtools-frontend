var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/switch/SwitchImpl.js
var SwitchImpl_exports = {};
__export(SwitchImpl_exports, {
  Switch: () => Switch,
  SwitchChangeEvent: () => SwitchChangeEvent
});
import { html, nothing, render } from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/switch/switch.css.js
var switch_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  position: relative;
  display: inline-block;
  width: 26px;
  height: var(--sys-size-8);
}

input {
  opacity: 0%;
  width: 0;
  height: 0;
}

.slider {
  box-sizing: border-box;
  position: absolute;
  cursor: pointer;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: var(--sys-color-surface-variant);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-shape-corner-full);
  transition: background-color 80ms linear;
}

.slider::before {
  position: absolute;
  content: "";
  height: var(--sys-size-5);
  width: var(--sys-size-5);
  border-radius: var(--sys-shape-corner-full);
  top: calc(50% - 4px);
  left: 3px;
  background-color: var(--sys-color-outline);
  transition:
    transform 80ms linear,
    background-color 80ms linear,
    width 80ms linear,
    height 80ms linear,
    top 80ms linear,
    left 80ms linear;
}

input:focus-visible + .slider {
  outline: 2px solid var(--sys-color-state-focus-ring);
  outline-offset: 2px;
}

input:checked {
  & + .slider {
    background-color: var(--sys-color-primary);
    border: 1px solid var(--sys-color-primary);
  }

  & + .slider::before {
    left: 11px;
    height: var(--sys-size-6);
    width: var(--sys-size-6);
    top: calc(50% - 6px);
    background-color: var(--sys-color-on-primary);
  }
}

input:disabled:not(:checked) {
  & + .slider {
    background-color: transparent;
    border-color: var(--sys-color-state-disabled);
  }

  & + .slider::before {
    background-color: var(--sys-color-state-disabled);
  }
}

input:disabled:checked {
  & + .slider {
    background-color: var(--sys-color-state-disabled-container);
    border-color: transparent;
  }

  & + .slider::before {
    background-color: var(--sys-color-surface);
  }
}

@media (forced-colors: active) {
  .slider::before,
  input:checked + .slider::before {
    background-color: ButtonText;
  }

  input:disabled:not(:checked) + .slider,
  input:disabled:checked + .slider {
    background-color: transparent;
    border-color: GrayText;
  }

  input:disabled:not(:checked) + .slider::before,
  input:disabled:checked + .slider::before {
    background-color: GrayText;
  }
}

/*# sourceURL=${import.meta.resolve("./switch.css")} */`;

// gen/front_end/ui/components/switch/SwitchImpl.js
var SwitchChangeEvent = class _SwitchChangeEvent extends Event {
  checked;
  static eventName = "switchchange";
  constructor(checked) {
    super(_SwitchChangeEvent.eventName);
    this.checked = checked;
  }
};
var Switch = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #checked = false;
  #disabled = false;
  #jslogContext = "";
  #label = "";
  connectedCallback() {
    this.#render();
  }
  set checked(isChecked) {
    this.#checked = isChecked;
    this.#render();
  }
  get checked() {
    return this.#checked;
  }
  set disabled(isDisabled) {
    this.#disabled = isDisabled;
    this.#render();
  }
  get disabled() {
    return this.#disabled;
  }
  get jslogContext() {
    return this.#jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#jslogContext = jslogContext;
    this.#render();
  }
  get label() {
    return this.#label;
  }
  set label(label) {
    this.#label = label;
    this.#render();
  }
  #handleChange = (ev) => {
    this.#checked = ev.target.checked;
    this.dispatchEvent(new SwitchChangeEvent(this.#checked));
  };
  #render() {
    const jslog = this.#jslogContext && VisualLogging.toggle(this.#jslogContext).track({ change: true });
    render(html`
    <style>${switch_css_default}</style>
    <label jslog=${jslog || nothing}>
      <input type="checkbox"
        aria-label=${this.#label || nothing}
        @change=${this.#handleChange}
        ?disabled=${this.#disabled}
        .checked=${this.#checked}
      >
      <span class="slider" @click=${(ev) => ev.stopPropagation()}></span>
    </label>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-switch", Switch);
export {
  SwitchImpl_exports as Switch
};
//# sourceMappingURL=switch.js.map
