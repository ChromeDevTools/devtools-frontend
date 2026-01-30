// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestDeviceBoundSessionsViewStyles from './requestDeviceBoundSessionsView.css.js';
const UIStrings = {
    /**
     * @description Heading for the ID of a session.
     */
    sessionId: 'Session ID',
    /**
     * @description Heading for the decision on whether an HTTP request was deferred. (i.e. paused and
     * later unpaused).
     */
    deferralDecision: 'Deferral decision',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was deferred (i.e. paused and later unpaused). The reasoning for the deferral
     * is that there was a refresh.
     */
    deferred: 'Deferred (Refresh)',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was not deferred (i.e. not paused and later unpaused). The reasoning for it
     * not being deferred is that there was a refresh attempted proactively.
     */
    proactiveRefreshAttempted: 'Not deferred (Proactive refresh attempted)',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was not deferred (i.e. not paused and later unpaused). The reasoning for it
     * not being deferred is that while the HTTP request is in scope of a session, it was
     * not possible to trigger a refresh proactively.
     */
    proactiveRefreshNotPossible: 'Not deferred (Request is in scope of session but proactive refresh is not possible)',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was not deferred (i.e. not paused and later unpaused). The reasoning for it
     * not being deferred is that while the HTTP request is in scope of a session, the HTTP
     * request's initiator is not allowed to trigger a refresh.
     */
    inScopeRefreshNotAllowed: 'Not deferred (Request is in scope of session but initiator is not allowed to trigger refresh)',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was not deferred (i.e. not paused and later unpaused). The reasoning for it
     * not being deferred is that while the HTTP request is in scope of a session, the
     * session's cookies are still present, so there is no need to trigger a refresh yet.
     */
    inScopeRefreshNotYetNeeded: 'Not deferred (Request is in scope of session but cookies are still present)',
    /**
     * @description One of the HTTP request deferral decisions. This one notes that the
     * request was not deferred (i.e. not paused and later unpaused). The reasoning for it
     * not being deferred is that the HTTP request is not in scope of a session.
     */
    notInScope: 'Not deferred (Request is not in scope of session)',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestDeviceBoundSessionsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const { deviceBoundSessionUsages } = input;
    render(html `
      <style>${UI.inspectorCommonStyles}</style>
      <style>${requestDeviceBoundSessionsViewStyles}</style>
      <div class="request-device-bound-sessions-view">
        ${deviceBoundSessionUsages.length > 0 ? html `
            <div class="device-bound-session-grid-wrapper">
              <devtools-data-grid striped inline>
                <table>
                  <thead>
                    <tr>
                      <th id="session-id" sortable>${i18nString(UIStrings.sessionId)}</th>
                      <th id="deferral-decision" sortable>${i18nString(UIStrings.deferralDecision)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${deviceBoundSessionUsages.map(session => html `
                      <tr>
                        <td>${session.sessionKey.id}</td>
                        <td>${getDeferralDecision(session.usage)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </devtools-data-grid>
            </div>
          ` :
        nothing}
      </div>
    `, target);
};
export class RequestDeviceBoundSessionsView extends UI.Widget.VBox {
    #request;
    #view;
    constructor(request, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('device-bound-sessions-request')}` });
        this.#request = request;
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.#request.addEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.performUpdate, this);
        this.performUpdate();
    }
    willHide() {
        super.willHide();
        this.#request.removeEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.performUpdate, this);
    }
    performUpdate() {
        if (!this.isShowing()) {
            return;
        }
        this.#view({ deviceBoundSessionUsages: this.#request.getDeviceBoundSessionUsages() }, {}, this.contentElement);
    }
}
function getDeferralDecision(usage) {
    switch (usage) {
        case "NotInScope" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.NotInScope */:
            return i18nString(UIStrings.notInScope);
        case "InScopeRefreshNotYetNeeded" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.InScopeRefreshNotYetNeeded */:
            return i18nString(UIStrings.inScopeRefreshNotYetNeeded);
        case "InScopeRefreshNotAllowed" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.InScopeRefreshNotAllowed */:
            return i18nString(UIStrings.inScopeRefreshNotAllowed);
        case "ProactiveRefreshNotPossible" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.ProactiveRefreshNotPossible */:
            return i18nString(UIStrings.proactiveRefreshNotPossible);
        case "ProactiveRefreshAttempted" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.ProactiveRefreshAttempted */:
            return i18nString(UIStrings.proactiveRefreshAttempted);
        case "Deferred" /* Protocol.Network.DeviceBoundSessionWithUsageUsage.Deferred */:
            return i18nString(UIStrings.deferred);
        default:
            return usage;
    }
}
//# sourceMappingURL=RequestDeviceBoundSessionsView.js.map