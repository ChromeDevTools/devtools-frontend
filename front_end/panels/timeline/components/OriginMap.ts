// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import originMapStyles from './originMap.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Title for a column in a data table representing a site origin used for development
   */
  developmentOrigin: 'Development origin',
  /**
   * @description Title for a column in a data table representing a site origin used by real users in a production environment
   */
  productionOrigin: 'Production origin',
  /**
   * @description Warning message explaining that an input origin is not a valid origin or URL.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" is not a valid origin or URL.',
  /**
   * @description Warning message explaining that an development origin is already mapped to a productionOrigin.
   * @example {https://example.com} PH1
   */
  alreadyMapped: '"{PH1}" is already mapped to a production origin.',
  /**
   * @description Warning message explaining that a page doesn't have enough real user data to show any information for. "Chrome UX Report" is a product name and should not be translated.
   */
  pageHasNoData: 'The Chrome UX Report does not have sufficient real user data for this page.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/OriginMap.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const DEV_ORIGIN_CONTROL = 'developmentOrigin';
const PROD_ORIGIN_CONTROL = 'productionOrigin';

interface ListItem extends CrUXManager.OriginMapping {
  isTitleRow?: boolean;
}

export class OriginMap extends UI.Widget.VBox {
  #errorMessage = '';
  #prefillDevelopmentOrigin = '';

  constructor(element?: HTMLElement) {
    super(element, {useShadowDom: true});
    this.registerRequiredCSS(originMapStyles);
    CrUXManager.CrUXManager.instance().getConfigSetting().addChangeListener(this.#updateListFromSetting, this);
    this.#updateListFromSetting();
  }

  #pullMappingsFromSetting(): ListItem[] {
    return CrUXManager.CrUXManager.instance().getConfigSetting().get().originMappings || [];
  }

  #pushMappingsToSetting(originMappings: ListItem[]): void {
    const setting = CrUXManager.CrUXManager.instance().getConfigSetting();
    const settingCopy = {...setting.get()};
    settingCopy.originMappings = originMappings;
    setting.set(settingCopy);
  }

  #updateListFromSetting(): void {
    const mappings = this.#pullMappingsFromSetting();
    if (!this.#prefillDevelopmentOrigin && mappings.length === 0) {
      Lit.render(Lit.nothing, this.contentElement, {host: this});
      return;
    }
    // clang-format off
    Lit.render(html`
      <devtools-data-grid striped inline
          @click=${(e: Event) => { e.stopPropagation(); }}
          @create=${this.#onCreate}>
        <table>
          <tr>
            <th id=${DEV_ORIGIN_CONTROL} editable weight="1">${i18nString(UIStrings.developmentOrigin)}</th>
            <th id=${PROD_ORIGIN_CONTROL} editable weight="1">${i18nString(UIStrings.productionOrigin)}</th>
          </tr>
          ${mappings.map((mapping, index) => this.renderItem(mapping, index))}
          ${this.#prefillDevelopmentOrigin ? html`
            <tr placeholder>
              <td>${this.#prefillDevelopmentOrigin}</td>
              <td></td>
            </tr>` : Lit.nothing}
        </table>
      </devtools-data-grid>
      ${this.#errorMessage ? html`<div class="error-message">${this.#errorMessage}</div>` : Lit.nothing}
    `, this.contentElement, {host: this});
    // clang-format on
  }

  #getOrigin(url: string): string|null {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }

  #renderOriginWarning(url: string): Promise<Lit.LitTemplate> {
    return RenderCoordinator.write(async () => {
      if (!CrUXManager.CrUXManager.instance().isEnabled()) {
        return Lit.nothing;
      }

      const cruxManager = CrUXManager.CrUXManager.instance();
      const result = await cruxManager.getFieldDataForPage(url);

      const hasFieldData = Object.entries(result).some(([key, value]) => {
        if (key === 'warnings') {
          return false;
        }
        return Boolean(value);
      });
      if (hasFieldData) {
        return Lit.nothing;
      }

      return html`
        <devtools-icon
          class="origin-warning-icon"
          name="warning-filled"
          title=${i18nString(UIStrings.pageHasNoData)}
        ></devtools-icon>
      `;
    });
  }

  startCreation(): void {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const inspectedURL = targetManager.inspectedURL();
    const currentOrigin = this.#getOrigin(inspectedURL) || '';
    this.#prefillDevelopmentOrigin = currentOrigin;
    this.#updateListFromSetting();
  }

  renderItem(originMapping: ListItem, index: number): Lit.LitTemplate {
    const warningIcon = Lit.Directives.until(this.#renderOriginWarning(originMapping.productionOrigin));
    // clang-format off
    return html`
      <tr data-index=${index} @edit=${this.commitEdit} @delete=${this.removeItemRequested}>
        <td data-value=${originMapping.developmentOrigin}>
          <div class="origin" title=${originMapping.developmentOrigin}>${originMapping.developmentOrigin}</div>
        </td>
        <td data-value=${originMapping.productionOrigin}>
          ${warningIcon}
          <div class="origin" title=${originMapping.productionOrigin}>${originMapping.productionOrigin}</div>
        </td>
      </tr>
    `;
    // clang-format on
  }

  removeItemRequested(event: CustomEvent): void {
    const target = event.currentTarget as HTMLElement;
    const index = Number.parseInt(target.dataset.index ?? '-1', 10);
    if (index < 0) {
      return;
    }

    const mappings = this.#pullMappingsFromSetting();
    mappings.splice(index, 1);
    this.#pushMappingsToSetting(mappings);
  }

  commitEdit(event: CustomEvent<{columnId: string, valueBeforeEditing: string, newText: string}>): void {
    const target = event.currentTarget as HTMLElement;
    const index = Number.parseInt(target.dataset.index ?? '-1', 10);
    if (index < 0) {
      return;
    }

    const mappings = this.#pullMappingsFromSetting();
    const originMapping = mappings[index];
    const isDevOrigin = event.detail.columnId === DEV_ORIGIN_CONTROL;

    let errorMessage = null;
    if (isDevOrigin) {
      errorMessage = this.#developmentValidator(event.detail.newText, index);
    } else {
      errorMessage = this.#productionValidator(event.detail.newText);
    }

    if (errorMessage) {
      this.#errorMessage = errorMessage;
      this.#updateListFromSetting();
      return;
    }
    this.#errorMessage = '';

    if (isDevOrigin) {
      originMapping.developmentOrigin = this.#getOrigin(event.detail.newText) || '';
    } else {
      originMapping.productionOrigin = this.#getOrigin(event.detail.newText) || '';
    }
    this.#pushMappingsToSetting(mappings);
  }

  #developmentValidator(value: string, indexToIgnore?: number): string|null {
    const origin = this.#getOrigin(value);
    if (!origin) {
      return i18nString(UIStrings.invalidOrigin, {PH1: value});
    }

    const mappings = this.#pullMappingsFromSetting();
    for (let i = 0; i < mappings.length; ++i) {
      if (i === indexToIgnore) {
        continue;
      }
      const mapping = mappings[i];
      if (mapping.developmentOrigin === origin) {
        return i18nString(UIStrings.alreadyMapped, {PH1: origin});
      }
    }

    return null;
  }

  #productionValidator(value: string): string|null {
    const origin = this.#getOrigin(value);
    if (!origin) {
      return i18nString(UIStrings.invalidOrigin, {PH1: value});
    }

    return null;
  }

  #onCreate(event: CustomEvent<{developmentorigin?: string, productionorigin?: string}>): void {
    const devOrigin = event.detail[DEV_ORIGIN_CONTROL as keyof typeof event.detail] ?? '';
    const prodOrigin = event.detail[PROD_ORIGIN_CONTROL as keyof typeof event.detail] ?? '';

    // Ignore empty row selection/deselection or if they didn't change the prefilled values
    if ((!devOrigin && !prodOrigin) || (devOrigin === this.#prefillDevelopmentOrigin && !prodOrigin)) {
      this.#prefillDevelopmentOrigin = '';
      this.#errorMessage = '';
      this.#updateListFromSetting();
      return;
    }

    const errors = [this.#developmentValidator(devOrigin), this.#productionValidator(prodOrigin)].filter(Boolean);
    if (errors.length > 0) {
      this.#errorMessage = errors.join('\n');
      this.#updateListFromSetting();
      return;
    }

    this.#errorMessage = '';

    this.#prefillDevelopmentOrigin = '';

    const mappings = this.#pullMappingsFromSetting();
    mappings.push({
      developmentOrigin: this.#getOrigin(devOrigin) || '',
      productionOrigin: this.#getOrigin(prodOrigin) || '',
    });
    this.#pushMappingsToSetting(mappings);
  }
}
