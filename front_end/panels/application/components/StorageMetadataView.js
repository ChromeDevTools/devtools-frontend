// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import storageMetadataViewStyle from './storageMetadataView.css.js';
export { storageMetadataViewStyle };
const UIStrings = {
    /**
     * @description Label for the frame origin row in the storage metadata view of the Application panel.
     */
    origin: 'Frame origin',
    /**
     * @description Label for the top-level site row in the storage metadata view of the Application panel.
     */
    topLevelSite: 'Top-level site',
    /**
     * @description Text shown in the top-level site row when the value is opaque in the storage metadata view of the Application panel.
     */
    opaque: '(opaque)',
    /**
     * @description Label for the row indicating whether the storage key is opaque in the storage metadata view of the Application panel.
     */
    isOpaque: 'Is opaque',
    /**
     * @description Label for the row indicating whether the storage corresponds to a third-party origin in the storage metadata view of the Application panel.
     */
    isThirdParty: 'Is third-party',
    /**
     * @description Text indicating that the condition holds in the storage metadata view of the Application panel.
     */
    yes: 'Yes',
    /**
     * @description Text indicating that the condition does not hold in the storage metadata view of the Application panel.
     */
    no: 'No',
    /**
     * @description Explanation that the storage corresponds to a third-party origin because the top-level site is opaque in the storage metadata view of the Application panel.
     */
    yesBecauseTopLevelIsOpaque: 'Yes, because the top-level site is opaque',
    /**
     * @description Explanation that the storage corresponds to a third-party origin because the storage key is opaque in the storage metadata view of the Application panel.
     */
    yesBecauseKeyIsOpaque: 'Yes, because the storage key is opaque',
    /**
     * @description Explanation that the storage corresponds to a third-party origin because the origin is outside of the top-level site in the storage metadata view of the Application panel.
     */
    yesBecauseOriginNotInTopLevelSite: 'Yes, because the origin is outside of the top-level site',
    /**
     * @description Explanation that the storage corresponds to a third-party origin because the ancestry chain contains a third-party origin in the storage metadata view of the Application panel.
     */
    yesBecauseAncestorChainHasCrossSite: 'Yes, because the ancestry chain contains a third-party origin',
    /**
     * @description Status text while metadata is loading in the storage metadata view of the Application panel.
     */
    loading: 'Loading…',
    /**
     * @description Label for the bucket name row in the storage metadata view of the Application panel.
     */
    bucketName: 'Bucket name',
    /**
     * @description Label for the default bucket in the storage metadata view of the Application panel.
     */
    defaultBucket: 'Default bucket',
    /**
     * @description Label for the row indicating whether the bucket is persistent in the storage metadata view of the Application panel.
     */
    persistent: 'Is persistent',
    /**
     * @description Label for the durability row in the storage metadata view of the Application panel.
     */
    durability: 'Durability',
    /**
     * @description Label for the quota row in the storage metadata view of the Application panel.
     */
    quota: 'Quota',
    /**
     * @description Label for the expiration row in the storage metadata view of the Application panel.
     */
    expiration: 'Expiration',
    /**
     * @description Text indicating that no value is set in the storage metadata view of the Application panel.
     */
    none: 'None',
    /**
     * @description Button text to delete the storage bucket in the storage metadata view of the Application panel.
     */
    deleteBucket: 'Delete bucket',
    /**
     * @description Title of the confirmation dialog before deleting a storage bucket in the storage metadata view of the Application panel.
     * @example {bucket} PH1
     */
    confirmBucketDeletion: 'Delete the "{PH1}" bucket?',
    /**
     * @description Explanation shown in the confirmation dialog before deleting a storage bucket in the storage metadata view of the Application panel.
     */
    bucketWillBeRemoved: 'The selected storage bucket and contained data will be removed',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/StorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StorageBucketRevealInfo {
    bucketInfo;
    constructor(bucketInfo) {
        this.bucketInfo = bucketInfo;
    }
}
function key(content) {
    return html `<devtools-report-key>${content}</devtools-report-key>`;
}
function value(content) {
    return html `<devtools-report-value>${content}</devtools-report-value>`;
}
function getExpirationString(storageBucket) {
    const { expiration } = storageBucket;
    if (expiration === 0) {
        return i18nString(UIStrings.none);
    }
    return (new Date(expiration * 1000)).toLocaleString();
}
function renderStorageBucketInfo(storageBucket, showOnlyBucket) {
    const { bucket: { name }, persistent, durability, quota } = storageBucket;
    const isDefault = !name;
    const renderBucketName = () => {
        if (isDefault) {
            return html `<span class="default-bucket">${i18nString(UIStrings.defaultBucket)}</span>`;
        }
        if (!showOnlyBucket) {
            return html `${name}`;
        }
        const revealBucket = (e) => {
            e.preventDefault();
            void Common.Revealer.reveal(new StorageBucketRevealInfo(storageBucket));
        };
        return html `<devtools-link
      @click=${revealBucket}
      title=${name}
      jslog=${VisualLogging.action('storage-bucket').track({
            click: true,
        })}
    >${name}</devtools-link>`;
    };
    if (showOnlyBucket) {
        return html `
      ${key(i18nString(UIStrings.bucketName))}
      ${value(renderBucketName())}`;
    }
    // If quota is 0, it means no custom quota limit has been set on the bucket.
    // We do not render it here to avoid confusing the user (who might interpret
    // a 0 quota as a full bucket/0 capacity rather than sharing the default origin limit).
    // clang-format off
    return html `
    ${key(i18nString(UIStrings.bucketName))}
    ${value(renderBucketName())}
    ${key(i18nString(UIStrings.persistent))}
    ${value(persistent ? i18nString(UIStrings.yes) : i18nString(UIStrings.no))}
    ${key(i18nString(UIStrings.durability))}
    ${value(durability)}
    ${quota !== 0 ? html `
      ${key(i18nString(UIStrings.quota))}
      ${value(i18n.ByteUtilities.bytesToString(quota))}
    ` : nothing}
    ${key(i18nString(UIStrings.expiration))}
    ${value(getExpirationString(storageBucket))}`;
    // clang-format on
}
export function renderStorageMetadataReportContent(storageKey, storageBucket, showOnlyBucket = false) {
    if (!storageKey) {
        return nothing;
    }
    const origin = storageKey.origin;
    const ancestorChainHasCrossSite = Boolean(storageKey.components.get("3" /* SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT */));
    const hasNonce = Boolean(storageKey.components.get("1" /* SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH */));
    const topLevelSiteIsOpaque = Boolean(storageKey.components.get("4" /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH */));
    const topLevelSite = storageKey.components.get("0" /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE */);
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
        html `${key(i18nString(UIStrings.origin))}
        ${value(html `<div class="text-ellipsis" title=${origin}>${origin}</div>`)}`
        : nothing}
    ${(topLevelSite || topLevelSiteIsOpaque) ?
        key(i18nString(UIStrings.topLevelSite)) : nothing}
    ${topLevelSite ? value(topLevelSite) : nothing}
    ${topLevelSiteIsOpaque ? value(i18nString(UIStrings.opaque)) : nothing}
    ${thirdPartyReason ? html `
      ${key(i18nString(UIStrings.isThirdParty))}${value(thirdPartyReason)}` : nothing}
    ${hasNonce || topLevelSiteIsOpaque ?
        key(i18nString(UIStrings.isOpaque)) : nothing}
    ${hasNonce ? value(i18nString(UIStrings.yes)) : nothing}
    ${topLevelSiteIsOpaque ?
        value(i18nString(UIStrings.yesBecauseTopLevelIsOpaque)) : nothing}
    ${storageBucket ? renderStorageBucketInfo(storageBucket, showOnlyBucket) : nothing}`;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const renderOptions = { container: { classes: ['storage-metadata-view'] } };
    if (!input.storageKey) {
        render(nothing, target, renderOptions);
        return;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${storageMetadataViewStyle}</style>
    <devtools-report .data=${{ reportTitle: input.title }}>
      ${renderStorageMetadataReportContent(input.storageKey, input.storageBucket, input.showOnlyBucket)}
      ${input.showBucketControls ? html `
        <devtools-report-divider></devtools-report-divider>
        <devtools-report-section>
          <devtools-button aria-label=${i18nString(UIStrings.deleteBucket)}
                           .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                           @click=${input.onDeleteBucket}>
            ${i18nString(UIStrings.deleteBucket)}
          </devtools-button>
        </devtools-report-section>` : nothing}
    </devtools-report>`, target, renderOptions);
    // clang-format on
};
export class StorageMetadataView extends UI.Widget.Widget {
    #storageBucketsModel;
    #storageKey = null;
    #storageBucket = null;
    #showOnlyBucket = false;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: 'pure' });
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    get shadowRoot() {
        return this.element.shadowRoot;
    }
    set storageKey(storageKey) {
        if (storageKey === undefined) {
            return;
        }
        const parsedStorageKey = SDK.StorageKeyManager.parseStorageKey(storageKey);
        if (this.#storageKey && this.#storageKey.origin === parsedStorageKey.origin &&
            this.#storageKey.components.size === parsedStorageKey.components.size &&
            Array.from(this.#storageKey.components.entries())
                .every(([key, value]) => parsedStorageKey.components.get(key) === value)) {
            return;
        }
        this.#storageKey = parsedStorageKey;
        this.requestUpdate();
    }
    set storageBucket(storageBucket) {
        const newBucket = storageBucket ?? null;
        if (this.#storageBucket === newBucket) {
            return;
        }
        this.#storageBucket = newBucket;
        if (newBucket) {
            this.storageKey = newBucket.bucket.storageKey;
        }
        this.requestUpdate();
    }
    set showOnlyBucket(show) {
        if (this.#showOnlyBucket === show) {
            return;
        }
        this.#showOnlyBucket = show;
        this.requestUpdate();
    }
    enableStorageBucketControls(model) {
        if (this.#storageBucketsModel === model) {
            return;
        }
        this.#storageBucketsModel = model;
        if (this.#storageKey) {
            this.requestUpdate();
        }
    }
    performUpdate() {
        this.#view({
            title: this.getTitle() ?? i18nString(UIStrings.loading),
            storageKey: this.#storageKey,
            storageBucket: this.#storageBucket,
            showOnlyBucket: this.#showOnlyBucket,
            showBucketControls: Boolean(this.#storageKey && this.#storageBucketsModel),
            onDeleteBucket: () => {
                void this.#deleteBucket();
            },
        }, undefined, this.contentElement);
    }
    getTitle() {
        if (!this.#storageKey) {
            return;
        }
        const origin = this.#storageKey.origin;
        const bucketName = this.#storageBucket?.bucket.name || i18nString(UIStrings.defaultBucket);
        return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
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
//# sourceMappingURL=StorageMetadataView.js.map