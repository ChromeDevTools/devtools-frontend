// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/menus/menus.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import networkThrottlingSelectorStyles from './networkThrottlingSelector.css.js';

const {html, nothing} = Lit;

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
   * @description Text label for a selection box showing that a specific option is recommended for network throttling.
   * @example {Fast 4G} PH1
   */
  recommendedThrottling: '{PH1} – recommended',
  /**
   * @description Text for why user should change a throttling setting.
   */
  recommendedThrottlingReason: 'Consider changing setting to simulate real user environments',
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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ConditionsGroup {
  name: string;
  items: SDK.NetworkManager.Conditions[];
  showCustomAddOption?: boolean;
  jslogContext?: string;
}

export class NetworkThrottlingSelector extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  #groups: ConditionsGroup[] = [];
  #currentConditions: SDK.NetworkManager.Conditions;
  #recommendedConditions: SDK.NetworkManager.Conditions|null = null;

  constructor() {
    super();
    this.#customNetworkConditionsSetting =
        Common.Settings.Settings.instance().moduleSetting('custom-network-conditions');
    this.#resetPresets();
    this.#currentConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    this.#render();
  }

  set recommendedConditions(recommendedConditions: SDK.NetworkManager.Conditions|null) {
    this.#recommendedConditions = recommendedConditions;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
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
    const newConditions = this.#groups.flatMap(g => g.items).find(item => {
      const keyForItem = this.#keyForNetworkConditions(item);
      return keyForItem === event.itemValue;
    });
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

  /**
   * The key that uniquely identifies the condition setting. All the DevTools
   * presets have the i18nKey, so we rely on that, but for custom user added
   * ones we fallback to using the title (it wouldn't make sense for a user to
   * add presets with the same title)
   */
  #keyForNetworkConditions(conditions: SDK.NetworkManager.Conditions): string {
    return conditions.i18nTitleKey || this.#getConditionsTitle(conditions);
  }

  #render = (): void => {
    const selectionTitle = this.#getConditionsTitle(this.#currentConditions);
    const selectedConditionsKey = this.#keyForNetworkConditions(this.#currentConditions);

    let recommendedInfoEl;
    if (this.#recommendedConditions && this.#currentConditions === SDK.NetworkManager.NoThrottlingConditions) {
      recommendedInfoEl = html`<devtools-icon
        title=${i18nString(UIStrings.recommendedThrottlingReason)}
        name=info></devtools-icon>`;
    }

    // clang-format off
    /* eslint-disable rulesdir/no-deprecated-component-usages */
    const output = html`
      <style>${networkThrottlingSelectorStyles}</style>
      <devtools-select-menu
        @selectmenuselected=${this.#onMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .jslogContext=${'network-conditions'}
        .buttonTitle=${i18nString(UIStrings.network, {PH1: selectionTitle})}
        .title=${i18nString(UIStrings.networkThrottling, {PH1: selectionTitle})}
      >
        ${this.#groups.map(group => {
          return html`
            <devtools-menu-group .name=${group.name} .title=${group.name}>
              ${group.items.map(conditions => {
                let title = this.#getConditionsTitle(conditions);
                if (conditions === this.#recommendedConditions) {
                  title = i18nString(UIStrings.recommendedThrottling, {PH1: title});
                }

                const key = this.#keyForNetworkConditions(conditions);
                const jslogContext = group.jslogContext || Platform.StringUtilities.toKebabCase(conditions.i18nTitleKey || title);
                return html`
                  <devtools-menu-item
                    .value=${key}
                    .selected=${selectedConditionsKey === key}
                    .title=${title}
                    jslog=${VisualLogging.item(jslogContext).track({click: true})}
                  >
                    ${title}
                  </devtools-menu-item>
                `;
              })}
              ${group.showCustomAddOption ? html`
                <devtools-menu-item
                  .value=${1 /* This won't be displayed unless it has some value. */}
                  .title=${i18nString(UIStrings.add)}
                  jslog=${VisualLogging.action('add').track({click: true})}
                  @click=${this.#onAddClick}
                >
                  ${i18nString(UIStrings.add)}
                </devtools-menu-item>
              ` : nothing}
            </devtools-menu-group>
          `;
        })}
      </devtools-select-menu>
      ${recommendedInfoEl}
    `;
    /* eslint-enable rulesdir/no-deprecated-component-usages */
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-network-throttling-selector', NetworkThrottlingSelector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-network-throttling-selector': NetworkThrottlingSelector;
  }
}
