// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Issue } from './Issue.js';
import { resolveLazyDescription, } from './MarkdownIssueDescription.js';
export class UserReidentificationIssue extends Issue {
    #issueDetails;
    constructor(issueDetails, issuesModel) {
        super('UserReidentificationIssue', issuesModel);
        this.#issueDetails = issueDetails;
    }
    primaryKey() {
        const requestId = this.#issueDetails.request ? this.#issueDetails.request.requestId : 'no-request';
        return `${this.code()}-(${requestId})`;
    }
    requests() {
        return this.#issueDetails.request ? [this.#issueDetails.request] : [];
    }
    getCategory() {
        return "Other" /* IssueCategory.OTHER */;
    }
    getDescription() {
        const description = issueDescriptions.get(this.code());
        if (!description) {
            return null;
        }
        return resolveLazyDescription(description);
    }
    getKind() {
        return "Improvement" /* IssueKind.IMPROVEMENT */;
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const userReidentificationIssueDetails = inspectorIssue.details.userReidentificationIssueDetails;
        if (!userReidentificationIssueDetails) {
            console.warn('User Reidentification issue without details received.');
            return [];
        }
        return [new UserReidentificationIssue(userReidentificationIssueDetails, issuesModel)];
    }
}
// Add new issue types to this map (with a unique code per type).
const issueDescriptions = new Map([
    [
        'UserReidentificationIssue',
        {
            file: 'userReidentificationBlocked.md',
            // TODO(https://g-issues.chromium.org/issues/409596758): Add
            // internationalized learn more link text.
            links: [],
        },
    ],
]);
//# sourceMappingURL=UserReidentificationIssue.js.map