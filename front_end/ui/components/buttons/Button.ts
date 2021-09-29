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
}

interface ButtonData {
  iconUrl?: string;
  variant?: Variant;
}

export interface ButtonDataWithVariant extends ButtonData {
  variant: Variant;
}

export class Button extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-button`;
  private readonly shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
  private readonly boundRender = this.render.bind(this);
  private readonly props: ButtonData = {};
  private isEmpty = true;

  constructor() {
    super();
    this.setAttribute('role', 'button');
  }

  /**
   * Perfer using the .data= setter instead of setting the individual properties
   * for increased type-safety.
   */
  set data(data: ButtonDataWithVariant) {
    this.props.variant = data.variant;
    this.props.iconUrl = data.iconUrl;
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

  focus(): void {
    this.shadow.querySelector('button')?.focus();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [buttonStyles];
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
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
    const classes = {
      primary: this.props.variant === Variant.PRIMARY,
      secondary: this.props.variant === Variant.SECONDARY,
      'text-with-icon': Boolean(this.props.iconUrl) && !this.isEmpty,
      'only-icon': Boolean(this.props.iconUrl) && this.isEmpty,
    };
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <button class=${LitHtml.Directives.classMap(classes)}>
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
