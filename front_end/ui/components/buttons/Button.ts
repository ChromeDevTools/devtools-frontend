// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
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
  TONAL = 'tonal',
  SECONDARY = 'secondary',
  TOOLBAR = 'toolbar',
  // Just like toolbar but has a style similar to a primary button.
  PRIMARY_TOOLBAR = 'primary_toolbar',
  ROUND = 'round',
}

export const enum Size {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
}

type ButtonType = 'button'|'submit'|'reset';

interface ButtonState {
  iconUrl?: string;
  variant?: Variant;
  size?: Size;
  disabled: boolean;
  active: boolean;
  spinner?: boolean;
  type: ButtonType;
  value?: string;
  title?: string;
  iconName?: string;
  jslogContext?: string;
}

interface CommonButtonData {
  variant: Variant;
  iconUrl?: string;
  iconName?: string;
  size?: Size;
  disabled?: boolean;
  active?: boolean;
  spinner?: boolean;
  type?: ButtonType;
  value?: string;
  title?: string;
  jslogContext?: string;
}

export type ButtonData = CommonButtonData&(|{
  variant: Variant.PRIMARY_TOOLBAR | Variant.TOOLBAR | Variant.ROUND,
  iconUrl: string,
}|{
  variant: Variant.PRIMARY_TOOLBAR | Variant.TOOLBAR | Variant.ROUND,
  iconName: string,
}|{
  variant: Variant.PRIMARY | Variant.SECONDARY | Variant.TONAL,
});

export class Button extends HTMLElement {
  static formAssociated = true;
  static readonly litTagName = LitHtml.literal`devtools-button`;
  readonly #shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
  readonly #boundRender = this.#render.bind(this);
  readonly #boundOnClick = this.#onClick.bind(this);
  readonly #props: ButtonState = {
    size: Size.MEDIUM,
    disabled: false,
    active: false,
    spinner: false,
    type: 'button',
  };
  #isEmpty = true;
  #internals = this.attachInternals();

  constructor() {
    super();
    this.setAttribute('role', 'presentation');
    this.addEventListener('click', this.#boundOnClick, true);
  }

  /**
   * Perfer using the .data= setter instead of setting the individual properties
   * for increased type-safety.
   */
  set data(data: ButtonData) {
    this.#props.variant = data.variant;
    this.#props.iconUrl = data.iconUrl;
    this.#props.iconName = data.iconName;
    this.#props.size = Size.MEDIUM;

    if ('size' in data && data.size) {
      this.#props.size = data.size;
    }

    this.#props.active = Boolean(data.active);
    this.#props.spinner = Boolean('spinner' in data ? data.spinner : false);

    this.#props.type = 'button';
    if ('type' in data && data.type) {
      this.#props.type = data.type;
    }
    this.#setDisabledProperty(data.disabled || false);
    this.#props.title = data.title;
    this.#props.jslogContext = data.jslogContext;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set iconUrl(iconUrl: string|undefined) {
    this.#props.iconUrl = iconUrl;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set iconName(iconName: string|undefined) {
    this.#props.iconName = iconName;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set variant(variant: Variant) {
    this.#props.variant = variant;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set size(size: Size) {
    this.#props.size = size;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set type(type: ButtonType) {
    this.#props.type = type;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  override set title(title: string) {
    this.#props.title = title;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set disabled(disabled: boolean) {
    this.#setDisabledProperty(disabled);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set active(active: boolean) {
    this.#props.active = active;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  get active(): boolean {
    return this.#props.active;
  }

  set spinner(spinner: boolean) {
    this.#props.spinner = spinner;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  get jslogContext(): string|undefined {
    return this.#props.jslogContext;
  }

  set jslogContext(jslogContext: string|undefined) {
    this.#props.jslogContext = jslogContext;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #setDisabledProperty(disabled: boolean): void {
    this.#props.disabled = disabled;
    this.toggleAttribute('disabled', disabled);
  }

  override focus(): void {
    this.#shadow.querySelector('button')?.focus();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [buttonStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #onClick(event: Event): void {
    if (this.#props.disabled) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (this.form && this.#props.type === 'submit') {
      event.preventDefault();
      this.form.dispatchEvent(new SubmitEvent('submit', {
        submitter: this,
      }));
    }
    if (this.form && this.#props.type === 'reset') {
      event.preventDefault();
      this.form.reset();
    }
  }

  #onSlotChange(event: Event): void {
    const slot = event.target as HTMLSlotElement | undefined;
    const nodes = slot?.assignedNodes();
    this.#isEmpty = !nodes || !Boolean(nodes.length);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #isToolbarVariant(): boolean {
    return this.#props.variant === Variant.TOOLBAR || this.#props.variant === Variant.PRIMARY_TOOLBAR;
  }

  #render(): void {
    if (!this.#props.variant) {
      throw new Error('Button requires a variant to be defined');
    }
    if (this.#isToolbarVariant()) {
      if (!this.#props.iconUrl && !this.#props.iconName) {
        throw new Error('Toolbar button requires an icon');
      }
      if (!this.#isEmpty) {
        throw new Error('Toolbar button does not accept children');
      }
    }
    if (this.#props.variant === Variant.ROUND) {
      if (!this.#props.iconUrl && !this.#props.iconName) {
        throw new Error('Round button requires an icon');
      }
      if (!this.#isEmpty) {
        throw new Error('Round button does not accept children');
      }
    }
    if (this.#props.iconName && this.#props.iconUrl) {
      throw new Error('Both iconName and iconUrl are provided.');
    }
    const hasIcon = Boolean(this.#props.iconUrl) || Boolean(this.#props.iconName);
    const classes = {
      primary: this.#props.variant === Variant.PRIMARY,
      tonal: this.#props.variant === Variant.TONAL,
      secondary: this.#props.variant === Variant.SECONDARY,
      toolbar: this.#isToolbarVariant(),
      'primary-toolbar': this.#props.variant === Variant.PRIMARY_TOOLBAR,
      round: this.#props.variant === Variant.ROUND,
      'text-with-icon': hasIcon && !this.#isEmpty,
      'only-icon': hasIcon && this.#isEmpty,
      'only-text': !hasIcon && !this.#isEmpty,
      small: Boolean(this.#props.size === Size.SMALL),
      active: this.#props.active,
    };
    const spinnerClasses = {
      primary: this.#props.variant === Variant.PRIMARY,
      secondary: this.#props.variant === Variant.SECONDARY,
      disabled: Boolean(this.#props.disabled),
      spinner: true,
    };
    const jslog =
        this.#props.jslogContext && VisualLogging.action().track({click: true}).context(this.#props.jslogContext);
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <button title=${LitHtml.Directives.ifDefined(this.#props.title)} .disabled=${this.#props.disabled} class=${LitHtml.Directives.classMap(classes)} jslog=${LitHtml.Directives.ifDefined(jslog)}>
          ${hasIcon
            ? LitHtml.html`
                <${IconButton.Icon.Icon.litTagName} name=${this.#props.iconName || this.#props.iconUrl}>
                </${IconButton.Icon.Icon.litTagName}>`
            : ''}
          ${this.#props.spinner ? LitHtml.html`<span class=${LitHtml.Directives.classMap(spinnerClasses)}></span>` : ''}
          <slot @slotchange=${this.#onSlotChange}></slot>
        </button>
      `, this.#shadow, {host: this});
    // clang-format on
  }

  // Based on https://web.dev/more-capable-form-controls/ to make custom elements form-friendly.
  // Form controls usually expose a "value" property.
  get value(): string {
    return this.#props.value || '';
  }
  set value(value: string) {
    this.#props.value = value;
  }

  // The following properties and methods aren't strictly required,
  // but browser-level form controls provide them. Providing them helps
  // ensure consistency with browser-provided controls.
  get form(): HTMLFormElement|null {
    return this.#internals.form;
  }
  get name(): string|null {
    return this.getAttribute('name');
  }
  get type(): ButtonType {
    return this.#props.type;
  }
  get validity(): ValidityState {
    return this.#internals.validity;
  }
  get validationMessage(): string {
    return this.#internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.#internals.willValidate;
  }
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }
  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }
}

customElements.define('devtools-button', Button);
