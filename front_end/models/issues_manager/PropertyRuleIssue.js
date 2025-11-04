// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Issue } from './Issue.js';
export class PropertyRuleIssue extends Issue {
    #issueDetails;
    #primaryKey;
    constructor(issueDetails, issuesModel) {
        const code = JSON.stringify(issueDetails);
        super(code, issuesModel);
        this.#primaryKey = code;
        this.#issueDetails = issueDetails;
    }
    sources() {
        return [this.#issueDetails.sourceCodeLocation];
    }
    details() {
        return this.#issueDetails;
    }
    primaryKey() {
        return this.#primaryKey;
    }
    getPropertyName() {
        switch (this.#issueDetails.propertyRuleIssueReason) {
            case "InvalidInherits" /* Protocol.Audits.PropertyRuleIssueReason.InvalidInherits */:
                return 'inherits';
            case "InvalidInitialValue" /* Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue */:
                return 'initial-value';
            case "InvalidSyntax" /* Protocol.Audits.PropertyRuleIssueReason.InvalidSyntax */:
                return 'syntax';
        }
        return '';
    }
    getDescription() {
        if (this.#issueDetails.propertyRuleIssueReason === "InvalidName" /* Protocol.Audits.PropertyRuleIssueReason.InvalidName */) {
            return {
                file: 'propertyRuleInvalidNameIssue.md',
                links: [],
            };
        }
        const value = this.#issueDetails.propertyValue ? `: ${this.#issueDetails.propertyValue}` : '';
        const property = `${this.getPropertyName()}${value}`;
        return {
            file: 'propertyRuleIssue.md',
            substitutions: new Map([['PLACEHOLDER_property', property]]),
            links: [],
        };
    }
    getCategory() {
        return "Other" /* IssueCategory.OTHER */;
    }
    getKind() {
        return "PageError" /* IssueKind.PAGE_ERROR */;
    }
    static fromInspectorIssue(issueModel, inspectorIssue) {
        const propertyRuleIssueDetails = inspectorIssue.details.propertyRuleIssueDetails;
        if (!propertyRuleIssueDetails) {
            console.warn('Property rule issue without details received');
            return [];
        }
        return [new PropertyRuleIssue(propertyRuleIssueDetails, issueModel)];
    }
}
//# sourceMappingURL=PropertyRuleIssue.js.map