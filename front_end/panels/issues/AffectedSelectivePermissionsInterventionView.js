// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import { AffectedResourcesView } from './AffectedResourcesView.js';
const UIStrings = {
    /**
     * @description Label for number of affected resources indication in issue view
     */
    nViolations: '{n, plural, =1 {# violation} other {# violations}}',
    /**
     * @description Title for the API column in the Selective Permissions Intervention affected resources list
     */
    api: 'API',
    /**
     * @description Title for the Script column in the Selective Permissions Intervention affected resources list
     */
    script: 'Script',
    /**
     * @description Title for the Ad Ancestry column in the Selective Permissions Intervention affected resources list
     */
    adAncestry: 'Ad Ancestry',
    /**
     * @description Text for unknown value
     */
    unknown: 'unknown',
    /**
     * @description Text for loading state
     */
    loading: 'loading…',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedSelectivePermissionsInterventionView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedSelectivePermissionsInterventionView extends AffectedResourcesView {
    #linkifier = new Components.Linkifier.Linkifier();
    getResourceNameWithCount(count) {
        return i18nString(UIStrings.nViolations, { n: count });
    }
    #render() {
        const issues = Array.from(this.issue.getSelectivePermissionsInterventionIssues());
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(html `
      <tr>
        <td class="affected-resource-header">${i18nString(UIStrings.api)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.script)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.adAncestry)}</td>
      </tr>
      ${issues.map(issue => this.#renderDetail(issue))}
    `, this.affectedResources, { host: this });
        this.updateAffectedResourceCount(issues.length);
    }
    #renderDetail(issue) {
        const details = issue.details();
        const issuesModel = issue.model();
        const stackTracePromise = (details.stackTrace && issuesModel) ?
            this.#resolveStackTrace(details.stackTrace, issuesModel) :
            Promise.resolve(html `<span>${i18nString(UIStrings.unknown)}</span>`);
        const target = issuesModel ? issuesModel.target() : null;
        return html `
      <tr class="affected-resource-directive">
        <td>${details.apiName}</td>
        <td>${Directives.until(stackTracePromise, html `<span>${i18nString(UIStrings.loading)}</span>`)}</td>
        <td class="affected-resource-cell">
          <div class="ad-ancestry-list">
            ${(details.adAncestry?.adAncestryChain || []).map(script => {
            const link = this.#linkifier.linkifyScriptLocation(target, script.scriptId, script.name, 0);
            return html `<div>${link}</div>`;
        })}
            ${details.adAncestry?.rootScriptFilterlistRule ?
            html `<div>Rule: ${details.adAncestry.rootScriptFilterlistRule}</div>` :
            nothing}
          </div>
        </td>
      </tr>
    `;
    }
    async #resolveStackTrace(stackTrace, issuesModel) {
        const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
        const stackTraceTranslated = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(stackTrace, issuesModel.target());
        return html `
      <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(Components.JSPresentationUtils.StackTracePreviewContent, {
            stackTrace: stackTraceTranslated,
            options: { expandable: true },
        })}>
      </devtools-widget>
    `;
    }
    update() {
        this.requestResolver.clear();
        this.#linkifier.reset();
        this.#render();
    }
}
//# sourceMappingURL=AffectedSelectivePermissionsInterventionView.js.map