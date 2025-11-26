// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/report_view/report_view.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import storageMetadataViewStyle from './storageMetadataView.css.js';
const UIStrings = {
    /**
     * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin).
     *(for a lot of languages this does not need to be translated, please translate only where necessary)
     */
    origin: 'Frame origin',
    /**
     * @description Site (https://web.dev/same-site-same-origin/#site) for the URL the user sees in the omnibox.
     */
    topLevelSite: 'Top-level site',
    /**
     * @description Text to show in the top-level site row, in case the value is opaque (https://html.spec.whatwg.org/#concept-origin-opaque).
     */
    opaque: '(opaque)',
    /**
     * @description Whether the storage corresponds to an opaque key (similar to https://html.spec.whatwg.org/#concept-origin-opaque).
     */
    isOpaque: 'Is opaque',
    /**
     * @description Whether the storage corresponds to a third-party origin (https://web.dev/learn/privacy/third-parties/).
     */
    isThirdParty: 'Is third-party',
    /**
     * @description Text indicating that the condition holds.
     */
    yes: 'Yes',
    /**
     * @description Text indicating that the condition does not hold.
     */
    no: 'No',
    /**
     * @description Text indicating that the storage corresponds to a third-party origin because top-level site is opaque.
     */
    yesBecauseTopLevelIsOpaque: 'Yes, because the top-level site is opaque',
    /**
     * @description Text indicating that the storage corresponds to a third-party origin because the storage key is opaque.
     */
    yesBecauseKeyIsOpaque: 'Yes, because the storage key is opaque',
    /**
     * @description Text indicating that the storage corresponds to a third-party origin because the origin doesn't match the top-level site.
     */
    yesBecauseOriginNotInTopLevelSite: 'Yes, because the origin is outside of the top-level site',
    /**
     * @description Text indicating that the storage corresponds to a third-party origin because the was a third-party origin in the ancestry chain.
     */
    yesBecauseAncestorChainHasCrossSite: 'Yes, because the ancestry chain contains a third-party origin',
    /**
     * @description Text when something is loading.
     */
    loading: 'Loading…',
    /**
     * @description The storage bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names)
     */
    bucketName: 'Bucket name',
    /**
     * @description The name of the default bucket (https://wicg.github.io/storage-buckets/explainer#the-default-bucket)
     *(This should not be a valid bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names))
     */
    defaultBucket: 'Default bucket',
    /**
     * @description Text indicating that the storage is persistent (https://wicg.github.io/storage-buckets/explainer#storage-policy-persistence)
     */
    persistent: 'Is persistent',
    /**
     * @description The storage durability policy (https://wicg.github.io/storage-buckets/explainer#storage-policy-durability)
     */
    durability: 'Durability',
    /**
     * @description The storage quota (https://wicg.github.io/storage-buckets/explainer#storage-policy-quota)
     */
    quota: 'Quota',
    /**
     * @description The storage expiration (https://wicg.github.io/storage-buckets/explainer#storage-policy-expiration)
     */
    expiration: 'Expiration',
    /**
     * @description Text indicating that no value is set
     */
    none: 'None',
    /**
     * @description Label of the button that triggers the Storage Bucket to be deleted.
     */
    deleteBucket: 'Delete bucket',
    /**
     * @description Text shown in the confirmation dialogue that displays before deleting the bucket.
     * @example {bucket} PH1
     */
    confirmBucketDeletion: 'Delete the "{PH1}" bucket?',
    /**
     * @description Explanation text shown in the confirmation dialogue that displays before deleting the bucket.
     */
    bucketWillBeRemoved: 'The selected storage bucket and contained data will be removed.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/StorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StorageMetadataView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #storageBucketsModel;
    #storageKey = null;
    #storageBucket = null;
    #showOnlyBucket = true;
    setStorageKey(storageKey) {
        this.#storageKey = SDK.StorageKeyManager.parseStorageKey(storageKey);
        void this.render();
    }
    setStorageBucket(storageBucket) {
        this.#storageBucket = storageBucket;
        this.setStorageKey(storageBucket.bucket.storageKey);
    }
    setShowOnlyBucket(show) {
        this.#showOnlyBucket = show;
    }
    enableStorageBucketControls(model) {
        this.#storageBucketsModel = model;
        if (this.#storageKey) {
            void this.render();
        }
    }
    render() {
        return RenderCoordinator.write('StorageMetadataView render', async () => {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            render(html `
        <style>${storageMetadataViewStyle}</style>
        <devtools-report .data=${{ reportTitle: this.getTitle() ?? i18nString(UIStrings.loading) }}>
          ${await this.renderReportContent()}
        </devtools-report>`, this.#shadow, { host: this });
            // clang-format on
        });
    }
    getTitle() {
        if (!this.#storageKey) {
            return;
        }
        const origin = this.#storageKey.origin;
        const bucketName = this.#storageBucket?.bucket.name || i18nString(UIStrings.defaultBucket);
        return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
    }
    key(content) {
        return html `<devtools-report-key>${content}</devtools-report-key>`;
    }
    value(content) {
        return html `<devtools-report-value>${content}</devtools-report-value>`;
    }
    async renderReportContent() {
        if (!this.#storageKey) {
            return nothing;
        }
        const origin = this.#storageKey.origin;
        const ancestorChainHasCrossSite = Boolean(this.#storageKey.components.get("3" /* SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT */));
        const hasNonce = Boolean(this.#storageKey.components.get("1" /* SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH */));
        const topLevelSiteIsOpaque = Boolean(this.#storageKey.components.get("4" /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH */));
        const topLevelSite = this.#storageKey.components.get("0" /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE */);
        const thirdPartyReason = ancestorChainHasCrossSite ? i18nString(UIStrings.yesBecauseAncestorChainHasCrossSite) :
            hasNonce ? i18nString(UIStrings.yesBecauseKeyIsOpaque) :
                topLevelSiteIsOpaque ? i18nString(UIStrings.yesBecauseTopLevelIsOpaque) :
                    (topLevelSite && origin !== topLevelSite) ? i18nString(UIStrings.yesBecauseOriginNotInTopLevelSite) :
                        null;
        const isIframeOrEmbedded = topLevelSite && origin !== topLevelSite;
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
        ${(isIframeOrEmbedded) ?
            html `${this.key(i18nString(UIStrings.origin))}
            ${this.value(html `<div class="text-ellipsis" title=${origin}>${origin}</div>`)}`
            : nothing}
        ${(topLevelSite || topLevelSiteIsOpaque) ?
            this.key(i18nString(UIStrings.topLevelSite)) : nothing}
        ${topLevelSite ? this.value(topLevelSite) : nothing}
        ${topLevelSiteIsOpaque ? this.value(i18nString(UIStrings.opaque)) : nothing}
        ${thirdPartyReason ? html `
          ${this.key(i18nString(UIStrings.isThirdParty))}${this.value(thirdPartyReason)}` : nothing}
        ${hasNonce || topLevelSiteIsOpaque ?
            this.key(i18nString(UIStrings.isOpaque)) : nothing}
        ${hasNonce ? this.value(i18nString(UIStrings.yes)) : nothing}
        ${topLevelSiteIsOpaque ?
            this.value(i18nString(UIStrings.yesBecauseTopLevelIsOpaque)) : nothing}
        ${this.#storageBucket ? this.#renderStorageBucketInfo() : nothing}
        ${this.#storageBucketsModel ? this.#renderBucketControls() : nothing}`;
        // clang-format on
    }
    #renderStorageBucketInfo() {
        if (!this.#storageBucket) {
            throw new Error('Should not call #renderStorageBucketInfo if #bucket is null.');
        }
        const { bucket: { name }, persistent, durability, quota } = this.#storageBucket;
        const isDefault = !name;
        if (!this.#showOnlyBucket) {
            if (isDefault) {
                return html `
          ${this.key(i18nString(UIStrings.bucketName))}
          ${this.value(html `<span class="default-bucket">default</span>`)}`;
            }
            return html `
        ${this.key(i18nString(UIStrings.bucketName))}
        ${this.value(name)}`;
        }
        // clang-format off
        return html `
      ${this.key(i18nString(UIStrings.bucketName))}
      ${this.value(name || html `<span class="default-bucket">default</span>`)}
      ${this.key(i18nString(UIStrings.persistent))}
      ${this.value(persistent ? i18nString(UIStrings.yes) : i18nString(UIStrings.no))}
      ${this.key(i18nString(UIStrings.durability))}
      ${this.value(durability)}
      ${this.key(i18nString(UIStrings.quota))}
      ${this.value(i18n.ByteUtilities.bytesToString(quota))}
      ${this.key(i18nString(UIStrings.expiration))}
      ${this.value(this.#getExpirationString())}`;
    }
    #getExpirationString() {
        if (!this.#storageBucket) {
            throw new Error('Should not call #getExpirationString if #bucket is null.');
        }
        const { expiration } = this.#storageBucket;
        if (expiration === 0) {
            return i18nString(UIStrings.none);
        }
        return (new Date(expiration * 1000)).toLocaleString();
    }
    #renderBucketControls() {
        // clang-format off
        return html `
    <devtools-report-divider></devtools-report-divider>
    <devtools-report-section>
      <devtools-button aria-label=${i18nString(UIStrings.deleteBucket)}
                       .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                       @click=${this.#deleteBucket}>
        ${i18nString(UIStrings.deleteBucket)}
      </devtools-button>
    </devtools-report-section>`;
        // clang-format on
    }
    async #deleteBucket() {
        if (!this.#storageBucketsModel || !this.#storageBucket) {
            throw new Error('Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.');
        }
        const ok = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.bucketWillBeRemoved), i18nString(UIStrings.confirmBucketDeletion, { PH1: this.#storageBucket.bucket.name || '' }), this, { jslogContext: 'delete-bucket-confirmation' });
        if (ok) {
            this.#storageBucketsModel.deleteBucket(this.#storageBucket.bucket);
        }
    }
}
customElements.define('devtools-storage-metadata-view', StorageMetadataView);
//# sourceMappingURL=StorageMetadataView.js.map