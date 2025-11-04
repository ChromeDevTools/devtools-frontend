// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { Issue } from './Issue.js';
const UIStrings = {
    /**
     * @description Title for Partitioning BlobURL explainer url link.
     */
    partitioningBlobURL: 'Partitioning BlobURL',
    /**
     * @description Title for Chrome Status Entry url link.
     */
    chromeStatusEntry: 'Chrome Status Entry'
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/PartitioningBlobURLIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PartitioningBlobURLIssue extends Issue {
    #issueDetails;
    constructor(issueDetails, issuesModel) {
        super("PartitioningBlobURLIssue" /* Protocol.Audits.InspectorIssueCode.PartitioningBlobURLIssue */, issuesModel);
        this.#issueDetails = issueDetails;
    }
    getCategory() {
        return "Other" /* IssueCategory.OTHER */;
    }
    getDescription() {
        const fileName = this.#issueDetails.partitioningBlobURLInfo ===
            "BlockedCrossPartitionFetching" /* Protocol.Audits.PartitioningBlobURLInfo.BlockedCrossPartitionFetching */ ?
            'fetchingPartitionedBlobURL.md' :
            'navigatingPartitionedBlobURL.md';
        return {
            file: fileName,
            links: [
                {
                    link: 'https://developers.google.com/privacy-sandbox/cookies/storage-partitioning',
                    linkTitle: i18nString(UIStrings.partitioningBlobURL),
                },
                {
                    link: 'https://chromestatus.com/feature/5130361898795008',
                    linkTitle: i18nString(UIStrings.chromeStatusEntry),
                },
            ],
        };
    }
    details() {
        return this.#issueDetails;
    }
    getKind() {
        return "BreakingChange" /* IssueKind.BREAKING_CHANGE */;
    }
    primaryKey() {
        return JSON.stringify(this.#issueDetails);
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const details = inspectorIssue.details.partitioningBlobURLIssueDetails;
        if (!details) {
            console.warn('Partitioning BlobURL issue without details received.');
            return [];
        }
        return [new PartitioningBlobURLIssue(details, issuesModel)];
    }
}
//# sourceMappingURL=PartitioningBlobURLIssue.js.map