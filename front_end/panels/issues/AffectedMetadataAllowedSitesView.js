// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { AffectedResourcesView } from './AffectedResourcesView.js';
const UIStrings = {
    /**
     * @description Label for the the number of affected `Allowed Sites` associated with a
     *DevTools issue. In this context, `Allowed` refers to permission to access cookies
     *via the third-party cookie deprecation global metadata, and `Site` is equivalent
     *to eTLD+1.
     *See https://developer.mozilla.org/en-US/docs/Glossary/eTLD.
     */
    nAllowedSites: '{n, plural, =1 {1 website allowed to access cookies} other {# websites allowed to access cookies}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedMetadataAllowedSitesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedMetadataAllowedSitesView extends AffectedResourcesView {
    getResourceNameWithCount(count) {
        return i18nString(UIStrings.nAllowedSites, { n: count });
    }
    update() {
        this.clear();
        const issues = this.issue.getCookieDeprecationMetadataIssues();
        let count = 0;
        for (const issueData of issues) {
            const row = document.createElement('tr');
            row.classList.add('affected-resource-directive');
            const textContentElement = document.createElement('div');
            const textElement = document.createElement('span');
            textElement.textContent = issueData.details().allowedSites.join(', ');
            textContentElement.appendChild(textElement);
            if (!issueData.details().isOptOutTopLevel && issueData.details().optOutPercentage > 0) {
                const optOutTextElement = document.createElement('span');
                optOutTextElement.textContent = ' (opt-out: ' + issueData.details().optOutPercentage + '% - ';
                textContentElement.appendChild(optOutTextElement);
                const linkElement = UI.XLink.XLink.create('https://developers.google.com/privacy-sandbox/blog/grace-period-opt-out', 'learn more');
                textContentElement.appendChild(linkElement);
                const endTextElement = document.createElement('span');
                endTextElement.textContent = ')';
                textContentElement.appendChild(endTextElement);
            }
            this.appendIssueDetailCell(row, textContentElement);
            this.affectedResources.appendChild(row);
            count++;
        }
        this.updateAffectedResourceCount(count);
    }
}
//# sourceMappingURL=AffectedMetadataAllowedSitesView.js.map