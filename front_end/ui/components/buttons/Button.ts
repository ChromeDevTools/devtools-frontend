// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as IconButton from '../icon_button/icon_button.js';

import buttonStyles from './button.css.legacy.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-button': Button;
  }
}

export const enum Variant {
  PRIMARY = 'primary',
  TONAL = 'tonal',
  OUTLINED = 'outlined',
  TEXT = 'text',
  TOOLBAR = 'toolbar',
  // Just like toolbar but has a style similar to a primary button.
  PRIMARY_TOOLBAR = 'primary_toolbar',
  ICON = 'icon',
  ICON_TOGGLE = 'icon_toggle',
  ADORNER_ICON = 'adorner_icon',
}

export const enum Size {
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  REGULAR = 'REGULAR',
}

export const enum ToggleType {
  PRIMARY = 'primary-toggle',
  RED = 'red-toggle',
}

type ButtonType = 'button'|'submit'|'reset';

interface ButtonState {
  iconUrl?: string;
  variant: Variant;
  size?: Size;
  reducedFocusRing?: boolean;
  disabled: boolean;
  toggled?: boolean;
  toggleOnClick?: boolean;
  checked?: boolean;
  active: boolean;
  spinner?: boolean;
  type: ButtonType;
  value?: string;
  title?: string;
  iconName?: string;
  toggledIconName?: string;
  toggleType?: ToggleType;
  jslogContext?: string;
  longClickable?: boolean;
}

interface CommonButtonData {
  variant: Variant;
  iconUrl?: string;
  iconName?: string;
  toggledIconName?: string;
  toggleType?: ToggleType;
  toggleOnClick?: boolean;
  size?: Size;
  reducedFocusRing?: boolean;
  disabled?: boolean;
  toggled?: boolean;
  checked?: boolean;
  active?: boolean;
  spinner?: boolean;
  type?: ButtonType;
  value?: string;
  title?: string;
  jslogContext?: string;
  longClickable?: boolean;
}

export type ButtonData = CommonButtonData&(|{
  variant: Variant.PRIMARY_TOOLBAR | Variant.TOOLBAR | Variant.ICON,
  iconUrl: string,
}|{
  variant: Variant.PRIMARY_TOOLBAR | Variant.TOOLBAR | Variant.ICON,
  iconName: string,
}|{
  variant: Variant.PRIMARY | Variant.OUTLINED | Variant.TONAL | Variant.TEXT | Variant.ADORNER_ICON,
}|{
  variant: Variant.ICON_TOGGLE,
  iconName: string,
  toggledIconName: string,
  toggleType: ToggleType,
  toggled: boolean,
});

export class Button extends HTMLElement {
  static formAssociated = true;
  static readonly litTagName = LitHtml.literal`devtools-button`;
  readonly #shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
  readonly #boundOnClick = this.#onClick.bind(this);
  readonly #props: ButtonState = {
    size: Size.REGULAR,
    variant: Variant.PRIMARY,
    toggleOnClick: true,
    disabled: false,
    active: false,
    spinner: false,
    type: 'button',
    longClickable: false,
  };
  #internals = this.attachInternals();
  #slotRef = LitHtml.Directives.createRef();

  constructor() {
    super();
    this.setAttribute('role', 'presentation');
    this.addEventListener('click', this.#boundOnClick, true);

    // TODO(crbug.com/359141904): Ideally we would be using
    // adopted style sheets for installing css styles, but this
    // currently throws an error when sharing the styles across
    // multiple documents. This is a workaround.
    const styleElement = document.createElement('style');
    styleElement.textContent = buttonStyles.cssContent;
    this.#shadow.appendChild(styleElement);
  }

  /**
   * Perfer using the .data= setter instead of setting the individual properties
   * for increased type-safety.
   */
  set data(data: ButtonData) {
    this.#props.variant = data.variant;
    this.#props.iconUrl = data.iconUrl;
    this.#props.iconName = data.iconName;
    this.#props.toggledIconName = data.toggledIconName;
    this.#props.toggleOnClick = data.toggleOnClick !== undefined ? data.toggleOnClick : true;
    this.#props.size = Size.REGULAR;

    if ('size' in data && data.size) {
      this.#props.size = data.size;
    }

    this.#props.active = Boolean(data.active);
    this.#props.spinner = Boolean('spinner' in data ? data.spinner : false);

    this.#props.type = 'button';
    if ('type' in data && data.type) {
      this.#props.type = data.type;
    }
    this.#props.toggled = data.toggled;
    this.#props.toggleType = data.toggleType;
    this.#props.checked = data.checked;
    this.#props.disabled = Boolean(data.disabled);
    this.#props.title = data.title;
    this.#props.jslogContext = data.jslogContext;
    this.#props.longClickable = data.longClickable;
    this.#render();
  }

  set iconUrl(iconUrl: string|undefined) {
    this.#props.iconUrl = iconUrl;
    this.#render();
  }

  set iconName(iconName: string|undefined) {
    this.#props.iconName = iconName;
    this.#render();
  }

  set toggledIconName(toggledIconName: string) {
    this.#props.toggledIconName = toggledIconName;
    this.#render();
  }

  set toggleType(toggleType: ToggleType) {
    this.#props.toggleType = toggleType;
    this.#render();
  }

  set variant(variant: Variant) {
    this.#props.variant = variant;
    this.#render();
  }

  set size(size: Size) {
    this.#props.size = size;
    this.#render();
  }

  set reducedFocusRing(reducedFocusRing: boolean) {
    this.#props.reducedFocusRing = reducedFocusRing;
    this.#render();
  }

  set type(type: ButtonType) {
    this.#props.type = type;
    this.#render();
  }

  override set title(title: string) {
    this.#props.title = title;
    this.#render();
  }

  get disabled(): boolean {
    return this.#props.disabled;
  }

  set disabled(disabled: boolean) {
    this.#setDisabledProperty(disabled);
    this.#render();
  }

  set toggleOnClick(toggleOnClick: boolean) {
    this.#props.toggleOnClick = toggleOnClick;
    this.#render();
  }

  set toggled(toggled: boolean) {
    this.#props.toggled = toggled;
    this.#render();
  }

  get toggled(): boolean {
    return Boolean(this.#props.toggled);
  }

  set checked(checked: boolean) {
    this.#props.checked = checked;
    this.#render();
  }

  set active(active: boolean) {
    this.#props.active = active;
    this.#render();
  }

  get active(): boolean {
    return this.#props.active;
  }

  set spinner(spinner: boolean) {
    this.#props.spinner = spinner;
    this.#render();
  }

  get jslogContext(): string|undefined {
    return this.#props.jslogContext;
  }

  set jslogContext(jslogContext: string|undefined) {
    this.#props.jslogContext = jslogContext;
    this.#render();
  }

  set longClickable(longClickable: boolean) {
    this.#props.longClickable = longClickable;
    this.#render();
  }

  #setDisabledProperty(disabled: boolean): void {
    this.#props.disabled = disabled;
    this.#render();
  }

  override focus(): void {
    this.#shadow.querySelector('button')?.focus();
  }

  connectedCallback(): void {
    this.#render();
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
    if (this.#props.toggleOnClick && this.#props.variant === Variant.ICON_TOGGLE && this.#props.iconName) {
      this.toggled = !this.#props.toggled;
    }
  }

  #isToolbarVariant(): boolean {
    return this.#props.variant === Variant.TOOLBAR || this.#props.variant === Variant.PRIMARY_TOOLBAR;
  }

  #render(): void {
    const nodes = (this.#slotRef.value as HTMLSlotElement | undefined)?.assignedNodes();
    const isEmpty = !Boolean(nodes?.length);
    if (!this.#props.variant) {
      throw new Error('Button requires a variant to be defined');
    }
    if (this.#isToolbarVariant()) {
      if (!this.#props.iconUrl && !this.#props.iconName) {
        throw new Error('Toolbar button requires an icon');
      }
      if (!isEmpty) {
        throw new Error('Toolbar button does not accept children');
      }
    }
    if (this.#props.variant === Variant.ICON) {
      if (!this.#props.iconUrl && !this.#props.iconName) {
        throw new Error('Icon button requires an icon');
      }
      if (!isEmpty) {
        throw new Error('Icon button does not accept children');
      }
    }
    if (this.#props.iconName && this.#props.iconUrl) {
      throw new Error('Both iconName and iconUrl are provided.');
    }
    const hasIcon = Boolean(this.#props.iconUrl) || Boolean(this.#props.iconName);
    const classes = {
      primary: this.#props.variant === Variant.PRIMARY,
      tonal: this.#props.variant === Variant.TONAL,
      outlined: this.#props.variant === Variant.OUTLINED,
      text: this.#props.variant === Variant.TEXT,
      toolbar: this.#isToolbarVariant(),
      'primary-toolbar': this.#props.variant === Variant.PRIMARY_TOOLBAR,
      icon: this.#props.variant === Variant.ICON || this.#props.variant === Variant.ICON_TOGGLE ||
          this.#props.variant === Variant.ADORNER_ICON,
      'primary-toggle': this.#props.toggleType === ToggleType.PRIMARY,
      'red-toggle': this.#props.toggleType === ToggleType.RED,
      toggled: Boolean(this.#props.toggled),
      checked: Boolean(this.#props.checked),
      'text-with-icon': hasIcon && !isEmpty,
      'only-icon': hasIcon && isEmpty,
      micro: this.#props.size === Size.MICRO,
      small: this.#props.size === Size.SMALL,
      'reduced-focus-ring': Boolean(this.#props.reducedFocusRing),
      active: this.#props.active,
    };
    const spinnerClasses = {
      primary: this.#props.variant === Variant.PRIMARY,
      outlined: this.#props.variant === Variant.OUTLINED,
      disabled: this.#props.disabled,
      spinner: true,
    };
    const jslog =
        this.#props.jslogContext && VisualLogging.action().track({click: true}).context(this.#props.jslogContext);
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <button title=${LitHtml.Directives.ifDefined(this.#props.title)}
          .disabled=${this.#props.disabled}
          class=${LitHtml.Directives.classMap(classes)}
          aria-pressed=${LitHtml.Directives.ifDefined(this.#props.toggled)}
          jslog=${LitHtml.Directives.ifDefined(jslog)}
        >${hasIcon
            ? LitHtml.html`
                <${IconButton.Icon.Icon.litTagName} name=${this.#props.toggled ? this.#props.toggledIconName : this.#props.iconName || this.#props.iconUrl}>
                </${IconButton.Icon.Icon.litTagName}>`
            : ''}
          ${this.#props.longClickable ? LitHtml.html`<${IconButton.Icon.Icon.litTagName} name=${'triangle-bottom-right'} class="long-click"
            ></${IconButton.Icon.Icon.litTagName}>`
      : ''}
          ${this.#props.spinner ? LitHtml.html`<span class=${LitHtml.Directives.classMap(spinnerClasses)}></span>` : ''}
          <slot @slotchange=${this.#render} ${LitHtml.Directives.ref(this.#slotRef)}></slot>
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
