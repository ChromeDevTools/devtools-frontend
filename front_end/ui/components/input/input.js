// gen/front_end/ui/components/input/checkbox.css.js
var checkbox_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

input[type="checkbox"] {
  width: var(--sys-size-6);
  height: var(--sys-size-6);
  accent-color: var(--sys-color-primary-bright);
  color: var(--sys-color-on-primary);
  position: relative;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover::after,
  &:active::before {
    content: "";
    height: var(--sys-size-11);
    width: var(--sys-size-11);
    border-radius: var(--sys-shape-corner-full);
    position: absolute;
  }

  &:not(:disabled):hover::after {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:not(:disabled):active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }

  &:not(:disabled):focus-visible::before {
    content: "";
    height: 15px;
    width: 15px;
    border-radius: 5px;
    position: absolute;
    border: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  }

  &.small:hover::after,
  &.small:active::before {
    height: var(--sys-size-6);
    width: var(--sys-size-6);
    border-radius: var(--sys-size-2);
  }
}

/*# sourceURL=${import.meta.resolve("./checkbox.css")} */`;

// gen/front_end/ui/components/input/textInput.css.js
var textInput_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.devtools-text-input {
  height: var(--sys-size-13);
  width: 100%;
  padding: var(--sys-size-5) 11px;
  line-height: 1.16;
  letter-spacing: 0.015em;
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
  color: var(--sys-color-on-surface);
  border-radius: 3px;
  background-color: var(--sys-color-cdt-base-container);
  font-family: inherit;
  font-size: inherit;
}

.devtools-text-input:focus-visible {
  outline-offset: calc(-1 * var(--sys-size-1));
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
}

.devtools-text-input::placeholder {
  color: var(--sys-color-state-disabled);
}

/*# sourceURL=${import.meta.resolve("./textInput.css")} */`;
export {
  checkbox_css_default as checkboxStyles,
  textInput_css_default as textInputStyles
};
//# sourceMappingURL=input.js.map
