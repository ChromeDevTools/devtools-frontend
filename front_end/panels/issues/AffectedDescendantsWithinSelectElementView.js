// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import { AffectedElementsView } from './AffectedElementsView.js';
const UIStrings = {
    /**
     * @description Noun for singular or plural number of affected descendant nodes indication in issue view.
     */
    nDescendants: '{n, plural, =1 { descendant} other { descendants}}',
    /**
     * @description Label for the disallowed node link in the issue view.
     */
    disallowedNode: 'Disallowed descendant',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedDescendantsWithinSelectElementView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedDescendantsWithinSelectElementView extends AffectedElementsView {
    #runningUpdatePromise = Promise.resolve();
    update() {
        // Ensure that doUpdate is invoked atomically by serializing the update calls
        // because it's not re-entrace safe.
        this.#runningUpdatePromise = this.#runningUpdatePromise.then(this.#doUpdate.bind(this));
    }
    getResourceName(count) {
        return i18nString(UIStrings.nDescendants, { n: count });
    }
    async #doUpdate() {
        this.clear();
        await this.#appendDisallowedSelectDescendants(this.issue.getElementAccessibilityIssues());
    }
    async #appendDisallowedSelectDescendant(issue) {
        const row = document.createElement('tr');
        row.classList.add('affected-resource-select-element-descendant');
        const details = issue.details();
        const target = issue.model()?.target() || null;
        row.appendChild(await this.createElementCell({ nodeName: i18nString(UIStrings.disallowedNode), backendNodeId: details.nodeId, target }, issue.getCategory()));
        this.affectedResources.appendChild(row);
    }
    async #appendDisallowedSelectDescendants(issues) {
        let count = 0;
        for (const issue of issues) {
            count++;
            await this.#appendDisallowedSelectDescendant(issue);
        }
        this.updateAffectedResourceCount(count);
    }
}
//# sourceMappingURL=AffectedDescendantsWithinSelectElementView.js.map