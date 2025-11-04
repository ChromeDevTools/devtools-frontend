// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import { AffectedResourcesView } from './AffectedResourcesView.js';
const UIStrings = {
    /**
     * @description Description for Partitioning BlobURL issue when PartitioningBlobURLInfo is BlockedCrossPartitionFetching.
     * @example {blob:https://web-platform.test:8444/example} url
     */
    blockedCrossPartitionFetching: 'Access to the Blob URL {url} was blocked because it was performed from a cross-partition context.',
    /**
     * @description Description for Partitioning BlobURL issue when PartitioningBlobURLInfo is EnforceNoopenerForNavigation.
     * @example {blob:https://web-platform.test:8444/example} url
     */
    enforceNoopenerForNavigation: 'Blob URL {url} top-level navigation had \'noopener\' set because the Blob URL origin was cross-site with the top-level site of the context that initiated the navigation.',
    /**
     * @description Blob URL issue count
     * @example {1} count
     */
    blobURLCount: 'Blob URL issues count: {count}',
    /**
     * @description Message shown when no Blob URL is available for a Partitioning Blob URL issue.
     */
    noBlobURLAvailable: 'No Blob URL available for this issue.',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedPartitioningBlobURLView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedPartitioningBlobURLView extends AffectedResourcesView {
    getResourceNameWithCount(count) {
        return i18nString(UIStrings.blobURLCount, { count });
    }
    update() {
        this.clear();
        let count = 0;
        const partitioningBlobURLIssues = this.issue.getPartitioningBlobURLIssues();
        for (const issue of partitioningBlobURLIssues) {
            const blobURL = issue.details().url;
            const partitioningBlobURLInfo = issue.details().partitioningBlobURLInfo;
            if (blobURL) {
                let description;
                switch (partitioningBlobURLInfo) {
                    case "BlockedCrossPartitionFetching" /* Protocol.Audits.PartitioningBlobURLInfo.BlockedCrossPartitionFetching */:
                        description = i18nString(UIStrings.blockedCrossPartitionFetching, { url: blobURL });
                        break;
                    case "EnforceNoopenerForNavigation" /* Protocol.Audits.PartitioningBlobURLInfo.EnforceNoopenerForNavigation */:
                        description = i18nString(UIStrings.enforceNoopenerForNavigation, { url: blobURL });
                        break;
                }
                const descriptionElement = document.createElement('div');
                descriptionElement.textContent = description;
                this.affectedResources.appendChild(descriptionElement);
                count++;
            }
            else {
                const noURLMessage = document.createElement('div');
                noURLMessage.textContent = i18nString(UIStrings.noBlobURLAvailable);
                this.affectedResources.appendChild(noURLMessage);
            }
        }
        this.updateAffectedResourceCount(count);
    }
}
//# sourceMappingURL=AffectedPartitioningBlobURLView.js.map