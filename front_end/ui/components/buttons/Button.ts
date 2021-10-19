// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';
import * as IconButton from '../icon_button/icon_button.js';

import buttonStyles from './button.css.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-button': Button;
  }
}

export const enum Variant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TOOLBAR = 'toolbar',
}

export const enum Size {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
}

interface ButtonState {
  iconUrl?: string;
  variant?: Variant;
  size?: Size;
  disabled: boolean;
}

export type ButtonData = {
  variant: Variant.TOOLBAR,
  iconUrl: string,
  size?: Size,
  disabled?: boolean,
}|{
  variant: Variant.PRIMARY | Variant.SECONDARY,
  iconUrl?: string,
  size?: Size,
  disabled?: boolean,
};

export class Button extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-button`;
  private readonly shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
  private readonly boundRender = this.render.bind(this);
  private readonly boundOnClick = this.onClick.bind(this);
  private readonly props: ButtonState = {
    size: Size.MEDIUM,
    disabled: false,
  };
  private isEmpty = true;

  constructor() {
    super();
    this.setAttribute('role', 'presentation');
    this.addEventListener('click', this.boundOnClick, true);
  }

  /**
   * Perfer using the .data= setter instead of setting the individual properties
   * for increased type-safety.
   */
  set data(data: ButtonData) {
    this.props.variant = data.variant;
    this.props.iconUrl = data.iconUrl;
    this.props.size = data.size || Size.MEDIUM;
    this.setDisabledProperty(data.disabled || false);
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  set iconUrl(iconUrl: string|undefined) {
    this.props.iconUrl = iconUrl;
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  set variant(variant: Variant) {
    this.props.variant = variant;
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  set size(size: Size) {
    this.props.size = size;
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  set disabled(disabled: boolean) {
    this.setDisabledProperty(disabled);
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  private setDisabledProperty(disabled: boolean): void {
    this.props.disabled = disabled;
    this.toggleAttribute('disabled', disabled);
  }

  focus(): void {
    this.shadow.querySelector('button')?.focus();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [buttonStyles];
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  private onClick(event: Event): void {
    if (this.props.disabled) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  private onSlotChange(event: Event): void {
    const slot = event.target as HTMLSlotElement | undefined;
    const nodes = slot?.assignedNodes();
    this.isEmpty = !nodes || !Boolean(nodes.length);
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  private render(): void {
    if (!this.props.variant) {
      throw new Error('Button requires a variant to be defined');
    }
    if (this.props.variant === Variant.TOOLBAR) {
      if (!this.props.iconUrl) {
        throw new Error('Toolbar button requires an icon');
      }
      if (!this.isEmpty) {
        throw new Error('Tooblar button does not accept children');
      }
    }
    const classes = {
      primary: this.props.variant === Variant.PRIMARY,
      secondary: this.props.variant === Variant.SECONDARY,
      toolbar: this.props.variant === Variant.TOOLBAR,
      'text-with-icon': Boolean(this.props.iconUrl) && !this.isEmpty,
      'only-icon': Boolean(this.props.iconUrl) && this.isEmpty,
      small: Boolean(this.props.size === Size.SMALL),
    };
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <button .disabled=${this.props.disabled} class=${LitHtml.Directives.classMap(classes)}>
          ${this.props.iconUrl ? LitHtml.html`<${IconButton.Icon.Icon.litTagName}
            .data=${{
              iconPath: this.props.iconUrl,
              color: 'var(--color-background)',
            } as IconButton.Icon.IconData}
          >
          </${IconButton.Icon.Icon.litTagName}>` : ''}
          <slot @slotchange=${this.onSlotChange}></slot>
        </button>
      `, this.shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-button', Button);
