// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import { AffectedResourcesView } from './AffectedResourcesView.js';
const UIStrings = {
    /**
     * @description Label for number of rows in the issue details table.
     */
    nViolations: '{n, plural, =1 {# violation} other {# violations}}',
    /**
     * @description Noun, label for the column showing the associated HTML element in the issue details table.
     */
    element: 'Element',
    /**
     * @description Noun, label for the column showing the invalid header value in the issue details table.
     */
    invalidHeaderValue: 'Invalid Header Value',
    /**
     * @description Noun, label for the column showing the associated network request in the issue details table.
     */
    request: 'Request',
    /**
     * @description Label for the column showing the invalid URL used in an HTML anchor element ("a link").
     * A origin is (roughly said) the front part of a URL.
     */
    untrustworthyOrigin: 'Untrustworthy origin',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AttributionReportingIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AttributionReportingIssueDetailsView extends AffectedResourcesView {
    getResourceNameWithCount(count) {
        return i18nString(UIStrings.nViolations, { n: count });
    }
    update() {
        this.clear();
        const issues = this.issue.getAttributionReportingIssues();
        const issue = issues.values().next();
        if (issue.done) {
            this.updateAffectedResourceCount(0);
        }
        else {
            this.#appendDetails(issue.value.code(), issues);
        }
    }
    #appendDetails(issueCode, issues) {
        const header = document.createElement('tr');
        switch (issueCode) {
            case "AttributionReportingIssue::InvalidRegisterSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_SOURCE_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_TRIGGER_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterOsSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterOsTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER */:
            case "AttributionReportingIssue::OsSourceIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.OS_SOURCE_IGNORED */:
            case "AttributionReportingIssue::OsTriggerIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.OS_TRIGGER_IGNORED */:
            case "AttributionReportingIssue::SourceIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.SOURCE_IGNORED */:
            case "AttributionReportingIssue::TriggerIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.TRIGGER_IGNORED */:
            case "AttributionReportingIssue::InvalidInfoHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_INFO_HEADER */:
            case "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet" /* IssuesManager.AttributionReportingIssue.IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET */:
                this.appendColumnTitle(header, i18nString(UIStrings.request));
                this.appendColumnTitle(header, i18nString(UIStrings.invalidHeaderValue));
                break;
            case "AttributionReportingIssue::InsecureContext" /* IssuesManager.AttributionReportingIssue.IssueCode.INSECURE_CONTEXT */:
            case "AttributionReportingIssue::UntrustworthyReportingOrigin" /* IssuesManager.AttributionReportingIssue.IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN */:
                this.appendColumnTitle(header, i18nString(UIStrings.element));
                this.appendColumnTitle(header, i18nString(UIStrings.request));
                this.appendColumnTitle(header, i18nString(UIStrings.untrustworthyOrigin));
                break;
            case "AttributionReportingIssue::PermissionPolicyDisabled" /* IssuesManager.AttributionReportingIssue.IssueCode.PERMISSION_POLICY_DISABLED */:
                this.appendColumnTitle(header, i18nString(UIStrings.element));
                this.appendColumnTitle(header, i18nString(UIStrings.request));
                break;
            case "AttributionReportingIssue::SourceAndTriggerHeaders" /* IssuesManager.AttributionReportingIssue.IssueCode.SOURCE_AND_TRIGGER_HEADERS */:
            case "AttributionReportingIssue::WebAndOsHeaders" /* IssuesManager.AttributionReportingIssue.IssueCode.WEB_AND_OS_HEADERS */:
            case "AttributionReportingIssue::NoWebOrOsSupport" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_WEB_OR_OS_SUPPORT */:
            case "AttributionReportingIssue::NoRegisterSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_SOURCE_HEADER */:
            case "AttributionReportingIssue::NoRegisterTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_TRIGGER_HEADER */:
            case "AttributionReportingIssue::NoRegisterOsSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_OS_SOURCE_HEADER */:
            case "AttributionReportingIssue::NoRegisterOsTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_OS_TRIGGER_HEADER */:
                this.appendColumnTitle(header, i18nString(UIStrings.request));
                break;
            case "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation" /* IssuesManager.AttributionReportingIssue.IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION */:
                this.appendColumnTitle(header, i18nString(UIStrings.element));
                break;
        }
        this.affectedResources.appendChild(header);
        let count = 0;
        for (const issue of issues) {
            count++;
            void this.#appendDetail(issueCode, issue);
        }
        this.updateAffectedResourceCount(count);
    }
    async #appendDetail(issueCode, issue) {
        const element = document.createElement('tr');
        element.classList.add('affected-resource-directive');
        const details = issue.details();
        switch (issueCode) {
            case "AttributionReportingIssue::InvalidRegisterSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_SOURCE_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_TRIGGER_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterOsSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER */:
            case "AttributionReportingIssue::InvalidRegisterOsTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER */:
            case "AttributionReportingIssue::OsSourceIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.OS_SOURCE_IGNORED */:
            case "AttributionReportingIssue::OsTriggerIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.OS_TRIGGER_IGNORED */:
            case "AttributionReportingIssue::SourceIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.SOURCE_IGNORED */:
            case "AttributionReportingIssue::TriggerIgnored" /* IssuesManager.AttributionReportingIssue.IssueCode.TRIGGER_IGNORED */:
            case "AttributionReportingIssue::InvalidInfoHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.INVALID_INFO_HEADER */:
            case "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet" /* IssuesManager.AttributionReportingIssue.IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET */:
                this.#appendRequestOrEmptyCell(element, details.request);
                this.appendIssueDetailCell(element, details.invalidParameter || '');
                break;
            case "AttributionReportingIssue::InsecureContext" /* IssuesManager.AttributionReportingIssue.IssueCode.INSECURE_CONTEXT */:
            case "AttributionReportingIssue::UntrustworthyReportingOrigin" /* IssuesManager.AttributionReportingIssue.IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN */:
                await this.#appendElementOrEmptyCell(element, issue);
                this.#appendRequestOrEmptyCell(element, details.request);
                this.appendIssueDetailCell(element, details.invalidParameter || '');
                break;
            case "AttributionReportingIssue::PermissionPolicyDisabled" /* IssuesManager.AttributionReportingIssue.IssueCode.PERMISSION_POLICY_DISABLED */:
                await this.#appendElementOrEmptyCell(element, issue);
                this.#appendRequestOrEmptyCell(element, details.request);
                break;
            case "AttributionReportingIssue::SourceAndTriggerHeaders" /* IssuesManager.AttributionReportingIssue.IssueCode.SOURCE_AND_TRIGGER_HEADERS */:
            case "AttributionReportingIssue::WebAndOsHeaders" /* IssuesManager.AttributionReportingIssue.IssueCode.WEB_AND_OS_HEADERS */:
            case "AttributionReportingIssue::NoWebOrOsSupport" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_WEB_OR_OS_SUPPORT */:
            case "AttributionReportingIssue::NoRegisterSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_SOURCE_HEADER */:
            case "AttributionReportingIssue::NoRegisterTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_TRIGGER_HEADER */:
            case "AttributionReportingIssue::NoRegisterOsSourceHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_OS_SOURCE_HEADER */:
            case "AttributionReportingIssue::NoRegisterOsTriggerHeader" /* IssuesManager.AttributionReportingIssue.IssueCode.NO_REGISTER_OS_TRIGGER_HEADER */:
                this.#appendRequestOrEmptyCell(element, details.request);
                break;
            case "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation" /* IssuesManager.AttributionReportingIssue.IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION */:
                await this.#appendElementOrEmptyCell(element, issue);
                break;
        }
        this.affectedResources.appendChild(element);
    }
    async #appendElementOrEmptyCell(parent, issue) {
        const details = issue.details();
        if (details.violatingNodeId !== undefined) {
            const target = issue.model()?.target() || null;
            parent.appendChild(await this.createElementCell({ backendNodeId: details.violatingNodeId, target, nodeName: 'Attribution source element' }, issue.getCategory()));
        }
        else {
            this.appendIssueDetailCell(parent, '');
        }
    }
    #appendRequestOrEmptyCell(parent, request) {
        if (!request) {
            this.appendIssueDetailCell(parent, '');
            return;
        }
        const opts = {
            additionalOnClickAction() {
                Host.userMetrics.issuesPanelResourceOpened("AttributionReporting" /* IssuesManager.Issue.IssueCategory.ATTRIBUTION_REPORTING */, "Request" /* AffectedItem.REQUEST */);
            },
        };
        parent.appendChild(this.createRequestCell(request, opts));
    }
}
//# sourceMappingURL=AttributionReportingIssueDetailsView.js.map