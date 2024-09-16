// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import networkThrottlingSelectorStyles from './networkThrottlingSelector.css.js';

const {html, nothing} = LitHtml;

const UIStrings = {
  /**
   * @description Text label for a selection box showing which network throttling option is applied.
   * @example {No throttling} PH1
   */
  network: 'Network: {PH1}',
  /**
   * @description Text label for a selection box showing which network throttling option is applied.
   * @example {No throttling} PH1
   */
  networkThrottling: 'Network throttling: {PH1}',
  /**
   * @description Text label for a menu group that disables network throttling.
   */
  disabled: 'Disabled',
  /**
   * @description Text label for a menu group that contains default presets for network throttling.
   */
  presets: 'Presets',
  /**
   * @description Text label for a menu group that contains custom presets for network throttling.
   */
  custom: 'Custom',
  /**
   * @description Text label for a menu option to add a new custom throttling preset.
   */
  add: 'Add…',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ConditionsGroup {
  name: string;
  items: SDK.NetworkManager.Conditions[];
  showCustomAddOption?: boolean;
  jslogContext?: string;
}

export class NetworkThrottlingSelector extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-network-throttling-selector`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  #groups: ConditionsGroup[] = [];
  #currentConditions: SDK.NetworkManager.Conditions;

  constructor() {
    super();
    this.#customNetworkConditionsSetting =
        Common.Settings.Settings.instance().moduleSetting('custom-network-conditions');
    this.#resetPresets();
    this.#currentConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [networkThrottlingSelectorStyles];
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, this.#onConditionsChanged, this);

    // Also call onConditionsChanged immediately to make sure we get the
    // latest snapshot. Otherwise if another panel updated this value and this
    // component wasn't in the DOM, this component will not update itself
    // when it is put into the page
    this.#onConditionsChanged();
    this.#customNetworkConditionsSetting.addChangeListener(this.#onSettingChanged, this);
  }

  disconnectedCallback(): void {
    SDK.NetworkManager.MultitargetNetworkManager.instance().removeEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, this.#onConditionsChanged, this);
    this.#customNetworkConditionsSetting.removeChangeListener(this.#onSettingChanged, this);
  }

  #resetPresets(): void {
    this.#groups = [
      {
        name: i18nString(UIStrings.disabled),
        items: [
          SDK.NetworkManager.NoThrottlingConditions,
        ],
      },
      {
        name: i18nString(UIStrings.presets),
        items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets,
      },
      {
        name: i18nString(UIStrings.custom),
        items: this.#customNetworkConditionsSetting.get(),
        showCustomAddOption: true,
        jslogContext: 'custom-network-throttling-item',
      },
    ];
  }

  #onConditionsChanged(): void {
    this.#currentConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    const newConditions = this.#groups.flatMap(g => g.items).find(item => item.i18nTitleKey === event.itemValue);
    if (newConditions) {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(newConditions);
    }
  }

  #onSettingChanged(): void {
    this.#resetPresets();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getConditionsTitle(conditions: SDK.NetworkManager.Conditions): string {
    return conditions.title instanceof Function ? conditions.title() : conditions.title;
  }

  #onAddClick(): void {
    void Common.Revealer.reveal(this.#customNetworkConditionsSetting);
  }

  #render = (): void => {
    const selectionTitle = this.#getConditionsTitle(this.#currentConditions);

    // clang-format off
    const output = html`
      <${Menus.SelectMenu.SelectMenu.litTagName}
        @selectmenuselected=${this.#onMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .showConnector=${false}
        .jslogContext=${'network-conditions'}
        .buttonTitle=${i18nString(UIStrings.network, {PH1: selectionTitle})}
        title=${i18nString(UIStrings.networkThrottling, {PH1: selectionTitle})}
      >
        ${this.#groups.map(group => {
          return html`
            <${Menus.Menu.MenuGroup.litTagName} .name=${group.name}>
              ${group.items.map(conditions => {
                const title = this.#getConditionsTitle(conditions);
                const jslogContext = group.jslogContext || Platform.StringUtilities.toKebabCase(conditions.i18nTitleKey || title);
                return html`
                  <${Menus.Menu.MenuItem.litTagName}
                    .value=${conditions.i18nTitleKey}
                    .selected=${this.#currentConditions.i18nTitleKey === conditions.i18nTitleKey}
                    jslog=${VisualLogging.item(jslogContext).track({click: true})}
                  >
                    ${title}
                  </${Menus.Menu.MenuItem.litTagName}>
                `;
              })}
              ${group.showCustomAddOption ? html`
                <${Menus.Menu.MenuItem.litTagName}
                  .value=${1 /* This won't be displayed unless it has some value. */}
                  jslog=${VisualLogging.action('add').track({click: true})}
                  @click=${this.#onAddClick}
                >
                  ${i18nString(UIStrings.add)}
                </${Menus.Menu.MenuItem.litTagName}>
              ` : nothing}
            </${Menus.Menu.MenuGroup.litTagName}>
          `;
        })}
      </${Menus.SelectMenu.SelectMenu.litTagName}>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-network-throttling-selector', NetworkThrottlingSelector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-network-throttling-selector': NetworkThrottlingSelector;
  }
}
