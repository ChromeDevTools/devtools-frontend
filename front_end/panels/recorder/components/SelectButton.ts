// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/menus/menus.js';

import * as Platform from '../../../core/platform/platform.js';
import type {LocalizedString} from '../../../core/platform/UIString.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import type * as Actions from '../recorder-actions/recorder-actions.js';

import selectButtonStyles from './selectButton.css.js'; // Keep the import for the raw string

const {html, Directives: {ifDefined, classMap}} = Lit;

export const enum Variant {
  PRIMARY = 'primary',
  OUTLINED = 'outlined',
}

interface SelectMenuGroup {
  name: string;
  items: SelectButtonItem[];
}

interface SelectButtonProps {
  /**
   * Whether the button is disabled or not
   * Defaults to false
   */
  disabled: boolean;
  /**
   * Current value of the button
   * The same value must correspond to an item in the `items` array
   */
  value: string;
  /**
   * Items for the select menu of the button
   * Selected item is shown in the button itself
   */
  items: SelectButtonItem[];
  /**
   * Groups for the select menu of the button.
   */
  buttonLabel: LocalizedString;
  /**
   * Groups for the select menu of the button.
   */
  groups: SelectMenuGroup[];
  /**
   * Similar to the button variant
   */
  variant: Variant;
  /**
   * Action that the button is linked to
   */
  action?: Actions.RecorderActions;
}

export interface SelectButtonItem {
  /**
   * Specifies the clicked item
   */
  value: string;
  /**
   * `icon` to be shown on the button
   */
  buttonIconName?: string;
  /**
   * Text to be shown in the select menu
   */
  label: () => string;
  /**
   * Text to be shown in the button when the item is selected for the button
   */
  buttonLabel?: () => string;
}

export class SelectButtonClickEvent extends Event {
  static readonly eventName = 'selectbuttonclick';

  constructor(public value?: string) {
    super(SelectButtonClickEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SelectMenuSelectedEvent extends Event {
  static readonly eventName = 'selectmenuselected';

  constructor(public value: string) {
    super(SelectMenuSelectedEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SelectButton extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #props: SelectButtonProps = {
    disabled: false,
    value: '',
    items: [],
    buttonLabel: '' as LocalizedString,
    groups: [],
    variant: Variant.PRIMARY,
  };

  connectedCallback(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  get disabled(): boolean {
    return this.#props.disabled;
  }

  set disabled(disabled: boolean) {
    this.#props.disabled = disabled;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  get items(): SelectButtonItem[] {
    return this.#props.items;
  }

  set items(items: SelectButtonItem[]) {
    this.#props.items = items;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set buttonLabel(buttonLabel: LocalizedString) {
    this.#props.buttonLabel = buttonLabel;
  }

  set groups(groups: SelectMenuGroup[]) {
    this.#props.groups = groups;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  get value(): string {
    return this.#props.value;
  }

  set value(value: string) {
    this.#props.value = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  get variant(): Variant {
    return this.#props.variant;
  }

  set variant(variant: Variant) {
    this.#props.variant = variant;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set action(value: Actions.RecorderActions) {
    this.#props.action = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #handleClick(ev: Event): void {
    ev.stopPropagation();
    this.dispatchEvent(new SelectButtonClickEvent(this.#props.value));
  }

  #handleSelectMenuSelect(
      evt: Event,
      ): void {
    if (evt.target instanceof HTMLSelectElement) {
      this.dispatchEvent(new SelectMenuSelectedEvent(evt.target.value as string));
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
  }

  #renderSelectItem(
      item: SelectButtonItem,
      selectedItem: SelectButtonItem,
      ): Lit.TemplateResult {
    const selected = item.value === selectedItem.value;
    // clang-format off
    return html`
      <option
      .title=${item.label()}
      value=${item.value}
      ?selected=${selected}
      jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(item.value)).track({click: true})}
      >${
        (selected && item.buttonLabel) ? item.buttonLabel() : item.label()
      }</option>
    `;
    // clang-format on
  }

  #renderSelectGroup(
      group: SelectMenuGroup,
      selectedItem: SelectButtonItem,
      ): Lit.TemplateResult {
    // clang-format off
    return html`
      <optgroup label=${group.name}>
        ${group.items.map(item => this.#renderSelectItem(item, selectedItem))}
      </optgroup>
    `;
    // clang-format on
  }

  #getTitle(label: string): string {
    return this.#props.action ? Models.Tooltip.getTooltipForActions(label, this.#props.action) : '';
  }

  #render = (): void => {
    const hasGroups = Boolean(this.#props.groups.length);
    const items = hasGroups ? this.#props.groups.flatMap(group => group.items) : this.#props.items;
    const selectedItem = items.find(item => item.value === this.#props.value) || items[0];
    if (!selectedItem) {
      return;
    }

    const classes = {
      primary: this.#props.variant === Variant.PRIMARY,
      secondary: this.#props.variant === Variant.OUTLINED,
    };

    const buttonVariant =
        this.#props.variant === Variant.OUTLINED ? Buttons.Button.Variant.OUTLINED : Buttons.Button.Variant.PRIMARY;
    const menuLabel = selectedItem.buttonLabel ? selectedItem.buttonLabel() : selectedItem.label();

    // clang-format off
    Lit.render(
      html`
      <style>${UI.inspectorCommonStyles}</style>
      <style>${selectButtonStyles}</style>
      <div class="select-button" title=${ifDefined(this.#getTitle(menuLabel))}>
      <select
      class=${classMap(classes)}
      ?disabled=${this.#props.disabled}
      jslog=${VisualLogging.dropDown('network-conditions').track({change: true})}
      @change=${this.#handleSelectMenuSelect}>
        ${
          hasGroups
            ? this.#props.groups.map(group =>
                this.#renderSelectGroup(group, selectedItem),
              )
            : this.#props.items.map(item =>
                this.#renderSelectItem(item, selectedItem),
              )
        }
    </select>
        ${
          selectedItem
            ? html`
        <devtools-button
            .disabled=${this.#props.disabled}
            .variant=${buttonVariant}
            .iconName=${selectedItem.buttonIconName}
            @click=${this.#handleClick}>
            ${this.#props.buttonLabel}
        </devtools-button>`
            : ''
        }
      </div>`,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

customElements.define(
    'devtools-select-button',
    SelectButton,
);

declare global {
  interface HTMLElementEventMap {
    selectbuttonclick: SelectButtonClickEvent;
  }

  interface HTMLElementTagNameMap {
    'devtools-select-button': SelectButton;
  }
}
