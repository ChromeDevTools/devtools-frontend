// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import controlButtonStyles from './controlButton.css.js';

const {html} = Lit;

export interface ViewInput {
  label: string;
  shape: string;
  disabled: boolean;
  onClick: (event: Event) => void;
}

export const DEFAULT_VIEW = (input: ViewInput, _output: unknown, target: HTMLElement): void => {
  const {label, shape, disabled, onClick} = input;
  const handleClickEvent = (event: Event): void => {
    if (disabled) {
      event.stopPropagation();
      event.preventDefault();
    } else {
      onClick(event);
    }
  };
  // clang-format off
  Lit.render(html`
    <style>${controlButtonStyles}</style>
    <button
        @click=${handleClickEvent}
        .disabled=${disabled}
        class="control">
      <div class="icon ${shape}"></div>
      <div class="label">${label}</div>
    </button>
  `, target);
  // clang-format on
};

export class ControlButton extends UI.Widget.Widget {
  #label = '';
  #shape = 'square';
  #disabled = false;
  #onClick: (event: Event) => void = () => {};

  #view: typeof DEFAULT_VIEW;

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true, classes: ['flex-none']});
    this.#view = view || DEFAULT_VIEW;
  }

  set label(label: string) {
    this.#label = label;
    this.requestUpdate();
  }

  set shape(shape: string) {
    this.#shape = shape;
    this.requestUpdate();
  }

  set disabled(disabled: boolean) {
    this.#disabled = disabled;
    this.requestUpdate();
  }

  set onClick(onClick: (event: Event) => void) {
    this.#onClick = onClick;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          label: this.#label,
          shape: this.#shape,
          disabled: this.#disabled,
          onClick: this.#onClick,
        },
        {}, this.contentElement);
  }
}
