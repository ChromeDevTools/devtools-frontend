// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/menus/menus.js';

import * as Platform from '../../../core/platform/platform.js';
import {type LocalizedString} from '../../../core/platform/UIString.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import type * as Actions from '../recorder-actions/recorder-actions.js';

import selectButtonStyles from './selectButton.css.js';

export const enum Variant {
  PRIMARY = 'primary',
  OUTLINED = 'outlined',
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
  buttonLabel: LocalizedString;
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

  set buttonLabel(buttonLabel: LocalizedString) {
    this.#props.buttonLabel = buttonLabel;
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
    this.dispatchEvent(new SelectMenuSelectedEvent(evt.itemValue as string));
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #renderSelectItem(
      item: SelectButtonItem,
      selectedItem: SelectButtonItem,
      ): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <devtools-menu-item .value=${item.value} .selected=${
      item.value === selectedItem.value
    } jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(item.value)).track({click: true})}>
        ${item.label()}
      </devtools-menu-item>
    `;
    // clang-format on
  }

  #renderSelectGroup(
      group: SelectMenuGroup,
      selectedItem: SelectButtonItem,
      ): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <devtools-menu-group .name=${group.name}>
        ${group.items.map(item => this.#renderSelectItem(item, selectedItem))}
      </devtools-menu-group>
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
    LitHtml.render(
      LitHtml.html`
      <div class="select-button" title=${LitHtml.Directives.ifDefined(this.#getTitle(menuLabel))}>
      <devtools-select-menu
          class=${LitHtml.Directives.classMap(classes)}
          @selectmenuselected=${this.#handleSelectMenuSelect}
          ?disabled=${this.#props.disabled}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .disabled=${this.#props.disabled}
          .buttonTitle=${() => LitHtml.html`${menuLabel}`}
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
        </devtools-select-menu>
        ${
          selectedItem
            ? LitHtml.html`
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
