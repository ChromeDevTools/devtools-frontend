// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import sharedStorageMetadataViewStyles from './sharedStorageMetadataView.css.js';

const UIStrings = {
  /**
  *@description Text in SharedStorage Metadata View of the Application panel
  */
  sharedStorage: 'Shared Storage',
  /**
  *@description Section header for Metadata
  */
  metadata: 'Metadata',
  /**
  *@description The origin of a URL (https://web.dev/same-site-same-origin/#origin)
  *(for a lot of languages this does not need to be translated, please translate only where necessary)
  */
  origin: 'Origin',
  /**
  *@description The time when the origin most recently created its shared storage database
  */
  creationTime: 'Creation',
  /**
  *@description The number of entries currently in the origin's database
  */
  length: 'Length',
  /**
  *@description The number of bits remaining in the origin's shared storage privacy budget
  */
  remainingBudget: 'Budget',
  /**
  *@description Section header above Entries
  */
  entries: 'Entries',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface SharedStorageMetadataGetter {
  getMetadata: () => Promise<Protocol.Storage.SharedStorageMetadata|null>;
}

export class SharedStorageMetadataView extends UI.Widget.VBox {
  readonly #reportView = new SharedStorageMetadataReportView();
  #sharedStorageMetadataGetter: SharedStorageMetadataGetter;

  constructor(sharedStorageMetadataGetter: SharedStorageMetadataGetter, owner: string) {
    super();
    this.#sharedStorageMetadataGetter = sharedStorageMetadataGetter;
    this.contentElement.classList.add('overflow-auto');
    this.contentElement.appendChild(this.#reportView);
    this.#reportView.origin = owner;
    void this.doUpdate();
  }

  async doUpdate(): Promise<void> {
    const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
    const creationTime = metadata?.creationTime ?? null;
    const length = metadata?.length ?? 0;
    const remainingBudget = metadata?.remainingBudget ?? 0;
    this.#reportView.data = {creationTime, length, remainingBudget};
  }
}

export interface SharedStorageMetadataViewData {
  creationTime: Protocol.Network.TimeSinceEpoch|null;
  length: number;
  remainingBudget: number;
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class SharedStorageMetadataReportView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-shared-storage-metadata-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #origin: string = '';
  #creationTime: Protocol.Network.TimeSinceEpoch|null = null;
  #length: number = 0;
  #remainingBudget: number = 0;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sharedStorageMetadataViewStyles];
  }

  set data(data: SharedStorageMetadataViewData) {
    if (data.creationTime) {
      this.#creationTime = data.creationTime;
      this.#length = data.length;
      this.#remainingBudget = data.remainingBudget;
    }
    void this.#render();
  }

  set origin(origin: string) {
    this.#origin = origin;
  }

  async #render(): Promise<void> {
    await coordinator.write('SharedStorageMetadataView render', () => {
      const titleForReport = {reportTitle: i18nString(UIStrings.sharedStorage)} as ReportView.ReportView.ReportData;

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${titleForReport as ReportView.ReportView.ReportData}>
          ${this.#renderMetadataSection()}
          ${this.#renderEntriesSection()}
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #renderMetadataSection(): LitHtml.LitTemplate {
    return LitHtml.html`
      <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.metadata)}</${
        ReportView.ReportView.ReportSectionHeader.litTagName}>
      <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.origin)}</${
        ReportView.ReportView.ReportKey.litTagName}>
      <${ReportView.ReportView.ReportValue.litTagName}>
          <div class="text-ellipsis" title=${this.#origin}>${this.#origin}</div>
      </${ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.creationTime)}</${
        ReportView.ReportView.ReportKey.litTagName}>
     <${ReportView.ReportView.ReportValue.litTagName}>
      ${this.#renderDateForCreationTime()}</${ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.remainingBudget)}</${
        ReportView.ReportView.ReportKey.litTagName}>
     <${ReportView.ReportView.ReportValue.litTagName}>${this.#remainingBudget}</${
        ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.length)}
     </${ReportView.ReportView.ReportKey.litTagName}>
     <${ReportView.ReportView.ReportValue.litTagName}>${this.#length}</${ReportView.ReportView.ReportValue.litTagName}>
      <${ReportView.ReportView.ReportSectionDivider.litTagName}></${
        ReportView.ReportView.ReportSectionDivider.litTagName}>
    `;
  }

  #renderDateForCreationTime(): LitHtml.LitTemplate {
    if (!this.#creationTime) {
      return LitHtml.nothing;
    }
    const date = new Date(1e3 * (this.#creationTime as number));
    return LitHtml.html`${date.toLocaleString()}`;
  }

  #renderEntriesSection(): LitHtml.LitTemplate {
    return LitHtml.html`
      <${ReportView.ReportView.ReportSectionHeader.litTagName} title=${i18nString(UIStrings.entries)}>
        ${i18nString(UIStrings.entries)}</${ReportView.ReportView.ReportSectionHeader.litTagName}>
    `;
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-shared-storage-metadata-view', SharedStorageMetadataReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-shared-storage-metadata-view': SharedStorageMetadataReportView;
  }
}
