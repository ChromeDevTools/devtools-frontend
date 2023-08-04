// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as UI from '../../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description The origin of a URL (https://web.dev/same-site-same-origin/#origin).
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: 'Origin',
  /**
   *@description Site (https://web.dev/same-site-same-origin/#site) for the URL the user sees in the omnibox.
   */
  topLevelSite: 'Top-level site',
  /**
   *@description Text to show in the top-level site row, in case the value is opaque (https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  opaque: '(opaque)',
  /**
   *@description Whether the storage corresponds to an opaque key (similar to https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  isOpaque: 'Is opaque',
  /**
   *@description Whether the storage corresponds to a third-party origin (https://web.dev/learn/privacy/third-parties/).
   */
  isThirdParty: 'Is third-party',
  /**
   *@description Text indicating that the condition holds.
   */
  yes: 'Yes',
  /**
   *@description Text indicating that the condition does not hold.
   */
  no: 'No',
  /**
   *@description Text indicating that the storage corresponds to a third-party origin because top-level site is opaque.
   */
  yesBecauseTopLevelIsOpaque: 'Yes, because the top-level site is opaque',
  /**
   *@description Text indicating that the storage corresponds to a third-party origin because the storage key is opaque.
   */
  yesBecauseKeyIsOpaque: 'Yes, because the storage key is opaque',
  /**
   *@description Text indicating that the storage corresponds to a third-party origin because the origin doesn't match the top-level site.
   */
  yesBecauseOriginNotInTopLevelSite: 'Yes, because the origin is outside of the top-level site',
  /**
   *@description Text indicating that the storage corresponds to a third-party origin because the was a third-party origin in the ancestry chain.
   */
  yesBecauseAncestorChainHasCrossSite: 'Yes, because the ancestry chain contains a third-party origin',
  /**
   *@description Text when something is loading.
   */
  loading: 'Loading…',
  /**
   *@description The storage bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names)
   */
  bucketName: 'Bucket name',
  /**
   *@description The name of the default bucket (https://wicg.github.io/storage-buckets/explainer#the-default-bucket)
   *(This should not be a valid bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names))
   */
  defaultBucket: 'Default bucket',
  /**
   *@description Text indicating that the storage is persistent (https://wicg.github.io/storage-buckets/explainer#storage-policy-persistence)
   */
  persistent: 'Is persistent',
  /**
   *@description The storage durability policy (https://wicg.github.io/storage-buckets/explainer#storage-policy-durability)
   */
  durability: 'Durability',
  /**
   *@description The storage quota (https://wicg.github.io/storage-buckets/explainer#storage-policy-quota)
   */
  quota: 'Quota',
  /**
   *@description The storage expiration (https://wicg.github.io/storage-buckets/explainer#storage-policy-expiration)
   */
  expiration: 'Expiration',
  /**
   *@description Text indicating that no value is set
   */
  none: 'None',
  /**
   * @description Label of the button that triggers the Storage Bucket to be deleted.
   */
  deleteBucket: 'Delete bucket',
  /**
   *@description Text shown in the confirmation dialogue that displays before deleting the bucket.
   *@example {bucket} PH1
   */
  confirmBucketDeletion: 'Delete the "{PH1}" bucket?',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/StorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class StorageMetadataView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-storage-metadata-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #storageBucketsModel?: SDK.StorageBucketsModel.StorageBucketsModel;
  #storageKey: SDK.StorageKeyManager.StorageKey|null = null;
  #storageBucket: Protocol.Storage.StorageBucketInfo|null = null;

  getShadow(): ShadowRoot {
    return this.#shadow;
  }

  setStorageKey(storageKey: string): void {
    this.#storageKey = SDK.StorageKeyManager.parseStorageKey(storageKey);
    void this.render();
  }

  setStorageBucket(storageBucket: Protocol.Storage.StorageBucketInfo): void {
    this.#storageBucket = storageBucket;
    this.setStorageKey(storageBucket.bucket.storageKey);
  }

  enableStorageBucketControls(model: SDK.StorageBucketsModel.StorageBucketsModel): void {
    this.#storageBucketsModel = model;
    if (this.#storageKey) {
      void this.render();
    }
  }

  override render(): Promise<void> {
    return coordinator.write('StorageMetadataView render', async () => {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{reportTitle: this.getTitle() || i18nString(UIStrings.loading)} as ReportView.ReportView.ReportData}>
          ${await this.renderReportContent()}
        </${ReportView.ReportView.Report.litTagName}>`, this.#shadow, {host: this});
      // clang-format on
    });
  }

  getTitle(): string|undefined {
    if (!this.#storageKey) {
      return;
    }
    const origin = this.#storageKey.origin;
    const bucketName = this.#storageBucket?.bucket.name || i18nString(UIStrings.defaultBucket);
    return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
  }

  key(content: string|LitHtml.TemplateResult): LitHtml.TemplateResult {
    return LitHtml.html`<${ReportView.ReportView.ReportKey.litTagName}>${content}</${
        ReportView.ReportView.ReportKey.litTagName}>`;
  }

  value(content: string|LitHtml.TemplateResult): LitHtml.TemplateResult {
    return LitHtml.html`<${ReportView.ReportView.ReportValue.litTagName}>${content}</${
        ReportView.ReportView.ReportValue.litTagName}>`;
  }

  async renderReportContent(): Promise<LitHtml.LitTemplate> {
    if (!this.#storageKey) {
      return LitHtml.nothing;
    }
    const origin = this.#storageKey.origin;
    const ancestorChainHasCrossSite =
        Boolean(this.#storageKey.components.get(SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT));
    const hasNonce = Boolean(this.#storageKey.components.get(SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH));
    const topLevelSiteIsOpaque = Boolean(
        this.#storageKey.components.get(SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH));
    const topLevelSite = this.#storageKey.components.get(SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE);
    const thirdPartyReason = ancestorChainHasCrossSite ? i18nString(UIStrings.yesBecauseAncestorChainHasCrossSite) :
        hasNonce                                       ? i18nString(UIStrings.yesBecauseKeyIsOpaque) :
        topLevelSiteIsOpaque                           ? i18nString(UIStrings.yesBecauseTopLevelIsOpaque) :
        (topLevelSite && origin !== topLevelSite)      ? i18nString(UIStrings.yesBecauseOriginNotInTopLevelSite) :
                                                         null;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
        ${this.key(i18nString(UIStrings.origin))}
        ${this.value(LitHtml.html`<div class="text-ellipsis" title=${origin}>${origin}</div>`)}
        ${(topLevelSite || topLevelSiteIsOpaque) ? this.key(i18nString(UIStrings.topLevelSite)) : LitHtml.nothing}
        ${topLevelSite ? this.value(topLevelSite) : LitHtml.nothing}
        ${topLevelSiteIsOpaque ? this.value(i18nString(UIStrings.opaque)) : LitHtml.nothing}
        ${thirdPartyReason ? LitHtml.html`${this.key(i18nString(UIStrings.isThirdParty))}${this.value(thirdPartyReason)}` : LitHtml.nothing}
        ${hasNonce || topLevelSiteIsOpaque ?
        this.key(i18nString(UIStrings.isOpaque)) : LitHtml.nothing}
        ${hasNonce ? this.value(i18nString(UIStrings.yes)) : LitHtml.nothing}
        ${topLevelSiteIsOpaque ?
        this.value(i18nString(UIStrings.yesBecauseTopLevelIsOpaque)) : LitHtml.nothing}
        ${this.#storageBucket ? this.#renderStorageBucketInfo() : LitHtml.nothing}
        ${this.#storageBucketsModel ? this.#renderBucketControls() : LitHtml.nothing}`;
    // clang-format on
  }

  #renderStorageBucketInfo(): LitHtml.LitTemplate {
    if (!this.#storageBucket) {
      throw new Error('Should not call #renderStorageBucketInfo if #bucket is null.');
    }
    const {bucket: {name}, persistent, durability, quota} = this.#storageBucket;

    // clang-format off
    return LitHtml.html`
      ${this.key(i18nString(UIStrings.bucketName))}
      ${this.value(name || 'default')}
      ${this.key(i18nString(UIStrings.persistent))}
      ${this.value(persistent ? i18nString(UIStrings.yes) : i18nString(UIStrings.no))}
      ${this.key(i18nString(UIStrings.durability))}
      ${this.value(durability)}
      ${this.key(i18nString(UIStrings.quota))}
      ${this.value(Platform.NumberUtilities.bytesToString(quota))}
      ${this.key(i18nString(UIStrings.expiration))}
      ${this.value(this.#getExpirationString())}`;
  }

  #getExpirationString(): string {
    if (!this.#storageBucket) {
      throw new Error('Should not call #getExpirationString if #bucket is null.');
    }

    const {expiration} = this.#storageBucket;

    if (expiration === 0) {
      return i18nString(UIStrings.none);
    }

    return (new Date(expiration * 1000)).toLocaleString();
  }

  #renderBucketControls(): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <${ReportView.ReportView.ReportSection.litTagName}>
        <${Buttons.Button.Button.litTagName}
          aria-label=${i18nString(UIStrings.deleteBucket)}
          .variant=${Buttons.Button.Variant.PRIMARY}
          @click=${this.#deleteBucket}>
          ${i18nString(UIStrings.deleteBucket)}
        </${Buttons.Button.Button.litTagName}>
      </${ReportView.ReportView.ReportSection.litTagName}>`;
    // clang-format on
  }

  async #deleteBucket(): Promise<void> {
    if (!this.#storageBucketsModel || !this.#storageBucket) {
      throw new Error('Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.');
    }
    const ok = await UI.UIUtils.ConfirmDialog.show(
        i18nString(UIStrings.confirmBucketDeletion, {PH1: this.#storageBucket.bucket.name || ''}), this);
    if (ok) {
      this.#storageBucketsModel.deleteBucket(this.#storageBucket.bucket);
    }
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-storage-metadata-view', StorageMetadataView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-storage-metadata-view': StorageMetadataView;
  }
}
