// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import deviceBoundSessionsViewStyles from './deviceBoundSessionsView.css.js';
const UIStrings = {
    /**
     *@description Label for a site, e.g. https://example.com/.
     */
    keySite: 'Site',
    /**
     *@description Label for the ID of a session.
     */
    keyId: 'ID',
    /**
     *@description Label that shows the URL that can be used to refresh a session.
     */
    refreshUrl: 'Refresh URL',
    /**
     *@description Section header for how a session's scope is defined.
     */
    scope: 'Scope',
    /**
     *@description Section header for HTTP cookies.
     */
    cookieCravings: 'Cookies',
    /**
     *@description Label for the name of an HTTP cookie.
     */
    name: 'Name',
    /**
     *@description Label for an expiration date.
     */
    expiryDate: 'Expiry date',
    /**
     *@description Label for a cryptographic string challenge that has been cached for a session.
     */
    cachedChallenge: 'Cached challenge',
    /**
     *@description Label for the HTTP initiator that is allowed to trigger a refresh of a session.
     */
    allowedRefreshInitiators: 'Allowed refresh initiators',
    /**
     *@description Section header for a session's basic configuration.
     */
    sessionConfig: 'Session config',
    /**
     *@description Label for an HTTP origin.
     */
    origin: 'Origin',
    /**
     *@description Text for whether a site is included.
     */
    includeSite: 'Include site',
    /**
     *@description Value for a label that indicates that a site is included.
     */
    yes: 'Yes',
    /**
     *@description Value for a label that indicates that a site is not included.
     */
    no: 'No',
    /**
     *@description Label the host pattern of a URL, e.g. *.example.com
     */
    ruleHostPattern: 'Host pattern',
    /**
     *@description Label for the path prefix of a URL, e.g. /path/1/2/3
     */
    rulePathPrefix: 'Path prefix',
    /**
     *@description The type of a rule. The possible types are "exclude" or "include".
     */
    ruleType: 'Rule type',
    /**
     *@description Text describing that a rule excludes something.
     */
    ruleTypeExclude: 'Exclude',
    /**
     *@description Text describing that a rule includes something.
     */
    ruleTypeInclude: 'Include',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/DeviceBoundSessionsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function ruleTypeToString(ruleType) {
    switch (ruleType) {
        case "Exclude" /* Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Exclude */:
            return i18nString(UIStrings.ruleTypeExclude);
        case "Include" /* Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Include */:
            return i18nString(UIStrings.ruleTypeInclude);
        default:
            return ruleType;
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const { sessionAndEvents } = input;
    if (!sessionAndEvents?.session) {
        render(nothing, target);
        return;
    }
    const { key, inclusionRules, cookieCravings } = sessionAndEvents.session;
    const sessionDetails = html `
      <devtools-report>
        <devtools-report-section-header>${i18nString(UIStrings.sessionConfig)}</devtools-report-section-header>
        <devtools-report-key>${i18nString(UIStrings.keySite)}</devtools-report-key>
        <devtools-report-value>${key.site}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.keyId)}</devtools-report-key>
        <devtools-report-value>${key.id}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.refreshUrl)}</devtools-report-key>
        <devtools-report-value>${sessionAndEvents.session.refreshUrl}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.expiryDate)}</devtools-report-key>
        <devtools-report-value>${new Date(sessionAndEvents.session.expiryDate * 1000).toLocaleString()}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.cachedChallenge)}</devtools-report-key>
        <devtools-report-value>${sessionAndEvents.session.cachedChallenge || ''}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.allowedRefreshInitiators)}</devtools-report-key>
        <devtools-report-value>${sessionAndEvents.session.allowedRefreshInitiators.join(', ')}</devtools-report-value>
        <devtools-report-section-header>${i18nString(UIStrings.scope)}</devtools-report-section-header>
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>${inclusionRules.origin}</devtools-report-value>
        <devtools-report-key>${i18nString(UIStrings.includeSite)}</devtools-report-key>
        <devtools-report-value>${inclusionRules.includeSite ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}</devtools-report-value>
      </devtools-report>
      ${inclusionRules.urlRules.length > 0 ? html `
        <div class="device-bound-session-grid-wrapper">
          <devtools-data-grid class="device-bound-session-url-rules-grid" striped inline>
            <table>
              <thead>
                <tr>
                  <th id="should-include" weight="1" sortable>${i18nString(UIStrings.ruleType)}</th>
                  <th id="host-pattern" weight="2" sortable>${i18nString(UIStrings.ruleHostPattern)}</th>
                  <th id="path-prefix" weight="2" sortable>${i18nString(UIStrings.rulePathPrefix)}</th>
                </tr>
              </thead>
              <tbody>
                ${inclusionRules.urlRules.map(rule => html `
                  <tr>
                    <td>${ruleTypeToString(rule.ruleType)}</td>
                    <td>${rule.hostPattern}</td>
                    <td>${rule.pathPrefix}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </devtools-data-grid>
        </div>
      ` :
        nothing}
      <devtools-report-section-header>${i18nString(UIStrings.cookieCravings)}</devtools-report-section-header>
      ${cookieCravings.length > 0 ? html `
        <div class="device-bound-session-grid-wrapper">
          <devtools-data-grid class="device-bound-session-cookie-cravings-grid" striped inline>
            <table>
              <thead>
                <tr>
                  <th id="name" weight="2" sortable>${i18nString(UIStrings.name)}</th>
                  <th id="domain" weight="2" sortable>${i18n.i18n.lockedString('Domain')}</th>
                  <th id="path" weight="2" sortable>${i18n.i18n.lockedString('Path')}</th>
                  <th id="secure" type="boolean" align="center" weight="1" sortable>${i18n.i18n.lockedString('Secure')}</th>
                  <th id="http-only" type="boolean" align="center" weight="1" sortable>${i18n.i18n.lockedString('HttpOnly')}</th>
                  <th id="same-site" weight="1" sortable>${i18n.i18n.lockedString('SameSite')}</th>
                </tr>
              </thead>
              <tbody>
                ${cookieCravings.map(craving => html `
                  <tr>
                    <td>${craving.name}</td>
                    <td>${craving.domain}</td>
                    <td>${craving.path}</td>
                    <td>${craving.secure}</td>
                    <td>${craving.httpOnly}</td>
                    <td>${craving.sameSite}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </devtools-data-grid>
        </div>
      ` :
        nothing}`;
    render(html `
        <style>${UI.inspectorCommonStyles}</style>
        <style>${deviceBoundSessionsViewStyles}</style>
        <div class="device-bound-session-view-wrapper">
          ${sessionDetails}
        </div>`, target);
};
export class DeviceBoundSessionsView extends UI.Widget.VBox {
    #site;
    #sessionId;
    #model;
    #view;
    constructor(view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('device-bound-sessions')}` });
        this.#view = view;
    }
    showSession(model, site, sessionId) {
        this.#site = site;
        this.#sessionId = sessionId;
        if (this.#model) {
            this.#model.removeEventListener("EVENT_OCCURRED" /* DeviceBoundSessionModelEvents.EVENT_OCCURRED */, this.performUpdate, this);
        }
        this.#model = model;
        this.#model.addEventListener("EVENT_OCCURRED" /* DeviceBoundSessionModelEvents.EVENT_OCCURRED */, this.performUpdate, this);
        this.performUpdate();
    }
    performUpdate() {
        let sessionAndEvents;
        if (this.#site && this.#model) {
            sessionAndEvents = this.#model.getSession(this.#site, this.#sessionId);
        }
        this.#view({ sessionAndEvents }, {}, this.contentElement);
    }
}
//# sourceMappingURL=DeviceBoundSessionsView.js.map