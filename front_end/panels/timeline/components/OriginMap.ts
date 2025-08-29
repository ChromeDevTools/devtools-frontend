// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';

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

export class OriginMap extends UI.Widget.WidgetElement<UI.Widget.Widget> implements UI.ListWidget.Delegate<ListItem> {
  #list: UI.ListWidget.ListWidget<ListItem>;
  #editor?: UI.ListWidget.Editor<ListItem>;

  constructor() {
    super();

    this.#list = new UI.ListWidget.ListWidget<ListItem>(this, false /* delegatesFocus */, true /* isTable */);

    CrUXManager.CrUXManager.instance().getConfigSetting().addChangeListener(this.#updateListFromSetting, this);
    this.#updateListFromSetting();
  }

  override createWidget(): UI.Widget.Widget {
    const containerWidget = new UI.Widget.Widget(this);

    this.#list.registerRequiredCSS(originMapStyles);
    this.#list.show(containerWidget.contentElement);

    return containerWidget;
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
    this.#list.clear();
    this.#list.appendItem(
        {
          developmentOrigin: i18nString(UIStrings.developmentOrigin),
          productionOrigin: i18nString(UIStrings.productionOrigin),
          isTitleRow: true,
        },
        false);
    for (const originMapping of mappings) {
      this.#list.appendItem(originMapping, true);
    }
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

    this.#list.addNewItem(-1, {
      developmentOrigin: currentOrigin,
      productionOrigin: '',
    });
  }

  renderItem(originMapping: ListItem): Element {
    const element = document.createElement('div');
    element.classList.add('origin-mapping-row');
    element.role = 'row';

    let cellRole: 'columnheader'|'cell';
    let warningIcon;
    if (originMapping.isTitleRow) {
      element.classList.add('header');
      cellRole = 'columnheader';
      warningIcon = Lit.nothing;
    } else {
      cellRole = 'cell';
      warningIcon = Lit.Directives.until(this.#renderOriginWarning(originMapping.productionOrigin));
    }

    // clang-format off
    Lit.render(html`
      <div class="origin-mapping-cell development-origin" role=${cellRole}>
        <div class="origin" title=${originMapping.developmentOrigin}>${originMapping.developmentOrigin}</div>
      </div>
      <div class="origin-mapping-cell production-origin" role=${cellRole}>
        ${warningIcon}
        <div class="origin" title=${originMapping.productionOrigin}>${originMapping.productionOrigin}</div>
      </div>
    `, element, {host: this});
    // clang-format on
    return element;
  }

  removeItemRequested(_item: ListItem, index: number): void {
    const mappings = this.#pullMappingsFromSetting();

    // `index` will be 1-indexed due to the header row
    mappings.splice(index - 1, 1);

    this.#pushMappingsToSetting(mappings);
  }

  commitEdit(originMapping: ListItem, editor: UI.ListWidget.Editor<ListItem>, isNew: boolean): void {
    originMapping.developmentOrigin = this.#getOrigin(editor.control(DEV_ORIGIN_CONTROL).value) || '';
    originMapping.productionOrigin = this.#getOrigin(editor.control(PROD_ORIGIN_CONTROL).value) || '';

    const mappings = this.#pullMappingsFromSetting();
    if (isNew) {
      mappings.push(originMapping);
    }
    this.#pushMappingsToSetting(mappings);
  }

  beginEdit(originMapping: ListItem): UI.ListWidget.Editor<ListItem> {
    const editor = this.#createEditor();
    editor.control(DEV_ORIGIN_CONTROL).value = originMapping.developmentOrigin;
    editor.control(PROD_ORIGIN_CONTROL).value = originMapping.productionOrigin;
    return editor;
  }

  #developmentValidator(_item: ListItem, index: number, input: UI.ListWidget.EditorControl):
      UI.ListWidget.ValidatorResult {
    const origin = this.#getOrigin(input.value);

    if (!origin) {
      return {valid: false, errorMessage: i18nString(UIStrings.invalidOrigin, {PH1: input.value})};
    }

    const mappings = this.#pullMappingsFromSetting();
    for (let i = 0; i < mappings.length; ++i) {
      // `index` will be 1-indexed due to the header row
      if (i === index - 1) {
        continue;
      }

      const mapping = mappings[i];
      if (mapping.developmentOrigin === origin) {
        return {valid: true, errorMessage: i18nString(UIStrings.alreadyMapped, {PH1: origin})};
      }
    }

    return {valid: true};
  }

  #productionValidator(_item: ListItem, _index: number, input: UI.ListWidget.EditorControl):
      UI.ListWidget.ValidatorResult {
    const origin = this.#getOrigin(input.value);

    if (!origin) {
      return {valid: false, errorMessage: i18nString(UIStrings.invalidOrigin, {PH1: input.value})};
    }

    return {valid: true};
  }

  #createEditor(): UI.ListWidget.Editor<ListItem> {
    if (this.#editor) {
      return this.#editor;
    }

    const editor = new UI.ListWidget.Editor<ListItem>();
    this.#editor = editor;
    const content = editor.contentElement().createChild('div', 'origin-mapping-editor');

    const devInput = editor.createInput(
        DEV_ORIGIN_CONTROL, 'text', i18nString(UIStrings.developmentOrigin), this.#developmentValidator.bind(this));
    const prodInput = editor.createInput(
        PROD_ORIGIN_CONTROL, 'text', i18nString(UIStrings.productionOrigin), this.#productionValidator.bind(this));

    // clang-format off
    Lit.render(html`
      <label class="development-origin-input">
        ${i18nString(UIStrings.developmentOrigin)}
        ${devInput}
      </label>
      <label class="production-origin-input">
        ${i18nString(UIStrings.productionOrigin)}
        ${prodInput}
      </label>
    `, content, {host: this});
    // clang-format on

    return editor;
  }
}

customElements.define('devtools-origin-map', OriginMap);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-origin-map': OriginMap;
  }
}
