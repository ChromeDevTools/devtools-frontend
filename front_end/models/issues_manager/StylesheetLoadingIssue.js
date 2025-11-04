// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Issue } from './Issue.js';
export const lateImportStylesheetLoadingCode = [
    "StylesheetLoadingIssue" /* Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue */,
    "LateImportRule" /* Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule */,
].join('::');
export class StylesheetLoadingIssue extends Issue {
    #issueDetails;
    constructor(issueDetails, issuesModel) {
        const code = `${"StylesheetLoadingIssue" /* Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue */}::${issueDetails.styleSheetLoadingIssueReason}`;
        super(code, issuesModel);
        this.#issueDetails = issueDetails;
    }
    sources() {
        return [this.#issueDetails.sourceCodeLocation];
    }
    requests() {
        if (!this.#issueDetails.failedRequestInfo) {
            return [];
        }
        const { url, requestId } = this.#issueDetails.failedRequestInfo;
        if (!requestId) {
            return [];
        }
        return [{ url, requestId }];
    }
    details() {
        return this.#issueDetails;
    }
    primaryKey() {
        return JSON.stringify(this.#issueDetails);
    }
    getDescription() {
        switch (this.#issueDetails.styleSheetLoadingIssueReason) {
            case "LateImportRule" /* Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule */:
                return {
                    file: 'stylesheetLateImport.md',
                    links: [],
                };
            case "RequestFailed" /* Protocol.Audits.StyleSheetLoadingIssueReason.RequestFailed */:
                return {
                    file: 'stylesheetRequestFailed.md',
                    links: [],
                };
        }
    }
    getCategory() {
        return "Other" /* IssueCategory.OTHER */;
    }
    getKind() {
        return "PageError" /* IssueKind.PAGE_ERROR */;
    }
    static fromInspectorIssue(issueModel, inspectorIssue) {
        const stylesheetLoadingDetails = inspectorIssue.details.stylesheetLoadingIssueDetails;
        if (!stylesheetLoadingDetails) {
            console.warn('Stylesheet loading issue without details received');
            return [];
        }
        return [new StylesheetLoadingIssue(stylesheetLoadingDetails, issueModel)];
    }
}
//# sourceMappingURL=StylesheetLoadingIssue.js.map