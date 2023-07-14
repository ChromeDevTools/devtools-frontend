// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import sharedStorageMetadataViewStyles from './sharedStorageMetadataView.css.js';
import sharedStorageMetadataViewResetBudgetButtonStyles from './sharedStorageMetadataViewResetBudgetButton.css.js';
import {StorageMetadataView} from './StorageMetadataView.js';

const UIStrings = {
  /**
   *@description Text in SharedStorage Metadata View of the Application panel
   */
  sharedStorage: 'Shared storage',
  /**
   *@description The time when the origin most recently created its shared storage database
   */
  creation: 'Creation Time',
  /**
   *@description The placeholder text if there is no creation time because the origin is not yet using shared storage.
   */
  notYetCreated: 'Not yet created',
  /**
   *@description The number of entries currently in the origin's database
   */
  numEntries: 'Number of Entries',
  /**
   *@description The number of bits remaining in the origin's shared storage privacy budget
   */
  entropyBudget: 'Entropy Budget for Fenced Frames',
  /**
   *@description Hover text for `entropyBudget` giving a more detailed explanation
   */
  budgetExplanation: 'Remaining data leakage allowed within a 24-hour period for this origin in bits of entropy',
  /**
   *@description Label for a button which when clicked causes the budget to be reset to the max.
   */
  resetBudget: 'Reset Budget',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface SharedStorageMetadataGetter {
  getMetadata: () => Promise<Protocol.Storage.SharedStorageMetadata|null>;
  resetBudget: () => Promise<void>;
}

interface SharedStorageResetBudgetButtonData {
  resetBudgetHandler: () => void;
}

class SharedStorageResetBudgetButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-shared-storage-reset-budget-button`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #resetBudgetHandler: (() => void) = () => {};

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sharedStorageMetadataViewResetBudgetButtonStyles];
  }

  set data(data: SharedStorageResetBudgetButtonData) {
    this.#resetBudgetHandler = data.resetBudgetHandler;
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <button class="reset-budget-button"
        title=${i18nString(UIStrings.resetBudget)}
        @click=${(): void => this.#resetBudgetHandler()}>
      <${IconButton.Icon.Icon.litTagName} .data=${
      {iconName: 'undo', color: 'var(--icon-default)', width: '16px', height: '16px'} as
      IconButton.Icon.IconWithName}>
        </${IconButton.Icon.Icon.litTagName}>
      </button>`, this.#shadow, {host: this});
    // clang-format on
  }
}

export class SharedStorageMetadataView extends StorageMetadataView {
  static override readonly litTagName = LitHtml.literal`devtools-shared-storage-metadata-view`;
  #sharedStorageMetadataGetter: SharedStorageMetadataGetter;
  #creationTime: Protocol.Network.TimeSinceEpoch|null = null;
  #length: number = 0;
  #remainingBudget: number = 0;

  constructor(sharedStorageMetadataGetter: SharedStorageMetadataGetter, owner: string) {
    super();
    this.#sharedStorageMetadataGetter = sharedStorageMetadataGetter;
    this.classList.add('overflow-auto');
    this.setStorageKey(owner);
  }

  async #resetBudget(): Promise<void> {
    await this.#sharedStorageMetadataGetter.resetBudget();
    await this.render();
  }

  connectedCallback(): void {
    this.getShadow().adoptedStyleSheets = [sharedStorageMetadataViewStyles];
  }

  override getTitle(): string {
    return i18nString(UIStrings.sharedStorage);
  }

  override async renderReportContent(): Promise<LitHtml.LitTemplate> {
    const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
    this.#creationTime = metadata?.creationTime ?? null;
    this.#length = metadata?.length ?? 0;
    this.#remainingBudget = metadata?.remainingBudget ?? 0;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      ${await super.renderReportContent()}
      ${this.key(i18nString(UIStrings.creation))}
      ${this.value(this.#renderDateForCreationTime())}
      ${this.key(i18nString(UIStrings.numEntries))}
      ${this.value(String(this.#length))}
      ${this.key(LitHtml.html`${i18nString(UIStrings.entropyBudget)}<${IconButton.Icon.Icon.litTagName} class="info-icon" title=${i18nString(UIStrings.budgetExplanation)}
           .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'} as IconButton.Icon.IconWithName}>
         </${IconButton.Icon.Icon.litTagName}>`)}
      ${this.value(LitHtml.html`${this.#remainingBudget}${this.#renderResetBudgetButton()}`)}`;
    // clang-format on
  }

  #renderDateForCreationTime(): LitHtml.TemplateResult {
    if (!this.#creationTime) {
      return LitHtml.html`${i18nString(UIStrings.notYetCreated)}`;
    }
    const date = new Date(1e3 * (this.#creationTime as number));
    return LitHtml.html`${date.toLocaleString()}`;
  }

  #renderResetBudgetButton(): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`<${SharedStorageResetBudgetButton.litTagName}
     .data=${{resetBudgetHandler: this.#resetBudget.bind(this)} as SharedStorageResetBudgetButtonData}
    ></${SharedStorageResetBudgetButton.litTagName}>`;
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-shared-storage-reset-budget-button', SharedStorageResetBudgetButton);
ComponentHelpers.CustomElements.defineComponent('devtools-shared-storage-metadata-view', SharedStorageMetadataView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-shared-storage-metadata-view': SharedStorageMetadataView;
    'devtools-shared-storage-reset-budget-button': SharedStorageResetBudgetButton;
  }
}
