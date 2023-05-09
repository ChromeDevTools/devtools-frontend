// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as Models from '../models/models.js';

import type * as Actions from '../recorder-actions.js'; // eslint-disable-line rulesdir/es_modules_import

import selectButtonStyles from './selectButton.css.js';

export const enum Variant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

type SelectMenuGroup = {
  name: string,
  items: SelectButtonItem[],
};

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
  groups: Array<SelectMenuGroup>;
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

  constructor(public value: string) {
    super(SelectButtonClickEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SelectButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-select-button`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #props: SelectButtonProps = {
    disabled: false,
    value: '',
    items: [],
    groups: [],
    variant: Variant.PRIMARY,
  };

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [selectButtonStyles];
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

  set groups(groups: Array<SelectMenuGroup>) {
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
      evt: Menus.SelectMenu.SelectMenuItemSelectedEvent,
      ): void {
    this.dispatchEvent(new SelectButtonClickEvent(evt.itemValue as string));
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #renderSelectItem(
      item: SelectButtonItem,
      selectedItem: SelectButtonItem,
      ): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <${Menus.Menu.MenuItem.litTagName} .value=${item.value} .selected=${
      item.value === selectedItem.value
    }>
        ${item.label()}
      </${Menus.Menu.MenuItem.litTagName}>
    `;
    // clang-format on
  }

  #renderSelectGroup(
      group: SelectMenuGroup,
      selectedItem: SelectButtonItem,
      ): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <${Menus.Menu.MenuGroup.litTagName} .name=${group.name}>
        ${group.items.map(item => this.#renderSelectItem(item, selectedItem))}
      </${Menus.Menu.MenuGroup.litTagName}>
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
      secondary: this.#props.variant === Variant.SECONDARY,
    };

    const buttonVariant =
        this.#props.variant === Variant.SECONDARY ? Buttons.Button.Variant.SECONDARY : Buttons.Button.Variant.PRIMARY;
    const label = selectedItem.buttonLabel ? selectedItem.buttonLabel() : selectedItem.label();

    // clang-format off
    LitHtml.render(
      LitHtml.html`
      <div class="select-button" title=${
        this.#getTitle(label) || LitHtml.nothing
      }>
        ${
          selectedItem
            ? LitHtml.html`
        <${Buttons.Button.Button.litTagName}
            .disabled=${this.#props.disabled}
            .variant=${buttonVariant}
            .iconName=${selectedItem.buttonIconName}
            @click=${this.#handleClick}>
            ${label}
        </${Buttons.Button.Button.litTagName}>`
            : ''
        }
        <${Menus.SelectMenu.SelectMenu.litTagName}
          class=${LitHtml.Directives.classMap(classes)}
          @selectmenuselected=${this.#handleSelectMenuSelect}
          ?disabled=${this.#props.disabled}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .disabled=${this.#props.disabled}
          .buttonTitle=${LitHtml.html``}
          .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
          .horizontalAlignment=${
            Dialogs.Dialog.DialogHorizontalAlignment.RIGHT
          }
        >
          ${
            hasGroups
              ? this.#props.groups.map(group =>
                  this.#renderSelectGroup(group, selectedItem),
                )
              : this.#props.items.map(item =>
                  this.#renderSelectItem(item, selectedItem),
                )
          }
        </${Menus.SelectMenu.SelectMenu.litTagName}>
      </div>`,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

ComponentHelpers.CustomElements.defineComponent(
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
