// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  DeviceBoundSessionModelEvents,
  type DeviceBoundSessionsModel,
  type SessionAndEvents
} from './DeviceBoundSessionsModel.js';
import deviceBoundSessionsViewStyles from './deviceBoundSessionsView.css.js';
const {widgetConfig} = UI.Widget;

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
  /**
   *@description Label for an event that has created something.
   */
  creation: 'Creation',
  /**
   *@description Label for an event that has refreshed something.
   */
  refresh: 'Refresh',
  /**
   *@description Label for an event that has set a cryptographic string challenge.
   */
  challenge: 'Challenge',
  /**
   *@description Label for an event that has terminated something.
   */
  termination: 'Termination',
  /**
   *@description Label for an event whose type is not known.
   */
  unknown: 'Unknown',
  /**
   *@description Heading for a section that will display events that have occurred.
   */
  events: 'Events',
  /**
   *@description Section header for details about an event.
   */
  eventDetails: 'Event details',
  /**
   *@description Placeholder text when no row is selected in a table of events.
   */
  selectEventToViewDetails: 'Select an event row to view more details.',
  /**
   *@description Column heading for the type of event that has occurred.
   */
  type: 'Type',
  /**
   *@description Column heading for the date + time that an event occurred.
   */
  timestamp: 'Date',
  /**
   *@description Column heading for the result of an event (whether it succeeded or had an error).
   */
  result: 'Result',
  /**
   *@description Notes the result status of an event was that it succeeded.
   */
  success: 'Success',
  /**
   *@description Notes the result status of an event was that it had an error.
   */
  error: 'Error',
  /**
   *@description Default message when no events have appeared yet.
   */
  noEvents: 'No events have been logged yet.',
  /**
   *@description Text to preserve the log of events after refreshing.
   */
  preserveLog: 'Preserve log',
  /**
   *@description Tooltip text that appears on the preserve log setting when hovering over it.
   */
  doNotClearLogOnPageReload: 'Do not clear log on page reload/navigation.',
  /**
   *@description Label for the ID of a session.
   */
  sessionId: 'Session ID',
  /**
   *@description Label for the result of an event (whether it succeeded or had an error).
   */
  eventResult: 'Event result',
  /**
   *@description Label for the result of fetching new session information.
   */
  fetchResult: 'Fetch result',
  /**
   *@description Label for whether a session's basic configuration was updated. The corresponding value is yes or no.
   */
  updatedSessionConfig: 'Updated session config',
  /**
   *@description Label for the result of an attempted refresh.
   */
  refreshResult: 'Refresh result',
  /**
   *@description Label for whether a particular event caused any HTTP request to be deferred (i.e. paused and
   * later unpaused). The corresponding value is yes or no.
   */
  causedAnyRequestDeferrals: 'Caused any request deferrals',
  /**
   *@description Label for the result of attempting to set a cryptographic string challenge.
   */
  challengeResult: 'Challenge result',
  /**
   *@description Label for the reason why a session was deleted.
   */
  deletionReason: 'Deletion reason',
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key.
   */
  keyError: 'Key error',
  /**
   *@description Explanation for an event outcome. Signing refers to cryptographic signing.
   */
  signingError: 'Signing error',
  /**
   *@description Explanation for an event outcome.
   */
  serverRequestedTermination: 'Server requested termination',
  /**
   *@description Explanation for an event outcome.
   */
  invalidSessionId: 'Invalid session ID',
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  invalidChallenge: 'Invalid challenge',
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  tooManyChallenges: 'Too many challenges',
  /**
   *@description Explanation for an event outcome.
   */
  invalidFetcherUrl: 'Invalid fetcher URL',
  /**
   *@description Explanation for an event outcome.
   */
  invalidRefreshUrl: 'Invalid refresh URL',
  /**
   *@description Explanation for an event outcome.
   */
  transientHttpError: 'Transient HTTP error',
  /**
   *@description Explanation for an event outcome. This means there is a URL origin written into a session configuration's scope that is causing failures because it's for a different site.
   */
  scopeOriginSameSiteMismatch: 'Same-site mismatch scope origin',
  /**
   *@description Explanation for an event outcome. This means the session configuration's URL for refreshing is causing failures because it's for a different site.
   */
  refreshUrlSameSiteMismatch: 'Same-site mismatch refresh URL',
  /**
   *@description Explanation for an event outcome. This means the session configuration's session ID does not match the relevant session ID.
   */
  mismatchedSessionId: 'Mismatched session ID',
  /**
   *@description Explanation for an event outcome.
   */
  missingScope: 'Missing scope',
  /**
   *@description Explanation for an event outcome. This means the credentials field in the session configuration is missing.
   */
  noCredentials: 'No credentials',
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationWellKnownUnavailable: 'Subdomain registration .well-known unavailable',
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationUnauthorized: '.well-known did not authorize registration by subdomain',
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationWellKnownMalformed: 'Subdomain registration .well-known content malformed',
  /**
   *@description Explanation for an event outcome.
   */
  sessionProviderWellKnownUnavailable: 'Session provider .well-known unavailable',
  /**
   *@description Explanation for an event outcome.
   */
  relyingPartyWellKnownUnavailable: 'Relying party .well-known unavailable',
  /**
   *@description Explanation for an event outcome. This refers to a JSON Web Key thumbprint (https://www.rfc-editor.org/rfc/rfc7638). Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedKeyThumbprintMismatch: 'Federated key had incorrect thumbprint',
  /**
   *@description Explanation for an event outcome. Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionUrl: 'Federated provider URL not valid',
  /**
   *@description Explanation for an event outcome. Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedKey: 'Federated key invalid',
  /**
   *@description Explanation for an event outcome. Origin labels are described in https://w3c.github.io/webappsec-dbsc/.
   */
  tooManyRelyingOriginLabels: 'Too many relying origin labels in .well-known',
  /**
   *@description Explanation for an event outcome.
   */
  boundCookieSetForbidden: 'Registration in a context that cannot set bound cookies',
  /**
   *@description Explanation for an event outcome.
   */
  netError: 'Network error',
  /**
   *@description Explanation for an event outcome.
   */
  proxyError: 'Proxy error',
  /**
   *@description Explanation for an event outcome.
   */
  emptySessionConfig: 'Empty session configuration for registration',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsConfig: 'Invalid credentials configuration',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsType: 'Invalid credentials - empty or non-cookie type',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsEmptyName: 'Invalid credentials - empty name',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookie: 'Invalid credentials - cookie invalid',
  /**
   *@description Explanation for an event outcome.
   */
  persistentHttpError: 'Persistent HTTP error',
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  registrationAttemptedChallenge: 'Registration returned challenge error response code',
  /**
   *@description Explanation for an event outcome. This refers to a URL's origin.
   */
  invalidScopeOrigin: 'Invalid scope origin',
  /**
   *@description Explanation for an event outcome. This refers to an URL's path / origin.
   */
  scopeOriginContainsPath: 'Scope origin contains a path',
  /**
   *@description Explanation for an event outcome. This refers to an HTTP request's initiator.
   */
  refreshInitiatorNotString: 'Allowed refresh initiator is not a string',
  /**
   *@description Explanation for an event outcome. This refers to an HTTP request's initiator and a URL's host.
   */
  refreshInitiatorInvalidHostPattern: 'Allowed refresh initiator has invalid host pattern',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeSpecification: 'Invalid scope specification',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  missingScopeSpecificationType: 'Missing scope specification type',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  emptyScopeSpecificationDomain: 'Empty scope specification domain',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  emptyScopeSpecificationPath: 'Empty scope specification path',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeSpecificationType: 'Scope specification type is neiher include or exclude',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeIncludeSite: 'Invalid include_site in scope',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  missingScopeIncludeSite: 'Missing include_site in scope',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedNotAuthorizedByProvider: 'Federated session not authorized by provider .well-known',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedNotAuthorizedByRelyingParty: 'Federated session not authorized by relying party .well-known',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  sessionProviderWellKnownMalformed: 'Session provider .well-known content malformed',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  sessionProviderWellKnownHasProviderOrigin: 'Session provider .well-known content has provider_origin',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  relyingPartyWellKnownMalformed: 'Relying party .well-known content malformed',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  relyingPartyWellKnownHasRelyingOrigins: 'Relying party .well-known content has relying_origins',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionProviderSessionMissing: 'Federated session invalid due to provider session not found',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionWrongProviderOrigin: 'Federated session invalid due to provider origin mismatch',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieCreationTime: 'Invalid credentials - cookie creation time invalid',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieName: 'Invalid credentials - cookie name invalid',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieParsing: 'Invalid credentials - cookie parsing failed',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieUnpermittedAttribute: 'Invalid credentials - cookie attribute not permitted',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieInvalidDomain: 'Invalid credentials - cookie invalid domain',
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookiePrefix: 'Invalid credentials - cookie invalid prefix',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeRulePath: 'Invalid scope rule path',
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeRuleHostPattern: 'Invalid scope rule host pattern',
  /**
   *@description Explanation for an event outcome. A session can be scoped to just a specific URL origin. This error means that the session's origin does not match the provided URL host pattern.
   */
  scopeRuleOriginScopedHostPatternMismatch: 'Origin-scoped session has mismatch between host pattern and origin',
  /**
   *@description Explanation for an event outcome. A session can be scoped to an entire site. This error means that the session's site does not match the provided URL host pattern.
   */
  scopeRuleSiteScopedHostPatternMismatch: 'Site-scoped session has mismatch between host pattern and site',
  /**
   *@description Explanation for an event outcome. This refers to cryptographic signing.
   */
  signingQuotaExceeded: 'Signing quota exceeded',
  /**
   *@description Explanation for an event outcome.
   */
  invalidConfigJson: 'Invalid session configuration JSON',
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/. Key refers to a cryptographic key.
   */
  invalidFederatedSessionProviderFailedToRestoreKey:
      'Federated session invalid due to failure to restore session provider key',
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key.
   */
  failedToUnwrapKey: 'Failed to unwrap key',
  /**
   *@description Explanation for an event outcome.
   */
  sessionDeletedDuringRefresh: 'Session deleted during refresh',
  /**
   *@description Explanation for an event outcome.
   */
  refreshed: 'Refreshed',
  /**
   *@description Explanation for an event outcome.
   */
  initializedService: 'Service initialized',
  /**
   *@description Explanation for an event outcome.
   */
  unreachable: 'Endpoint unreachable',
  /**
   *@description Explanation for an event outcome.
   */
  serverError: 'Endpoint transient error',
  /**
   *@description Explanation for an event outcome.
   */
  refreshQuotaExceeded: 'Refresh quota exceeded',
  /**
   *@description Explanation for an event outcome.
   */
  fatalError: 'Fatal error',
  /**
   *@description Explanation for an event outcome.
   */
  noSessionId: 'No session ID',
  /**
   *@description Explanation for an event outcome.
   */
  noSessionMatch: 'No matching session ID',
  /**
   *@description Explanation for an event outcome.
   */
  cantSetBoundCookie: 'Not allowed to set bound cookie',
  /**
   *@description Explanation for an event outcome.
   */
  expired: 'Expired',
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key. This means there was an attempt to read a key from disk but it failed.
   */
  failedToRestoreKey: 'Failed to restore key from disk',
  /**
   *@description Explanation for an event outcome.
   */
  storagePartitionCleared: 'Removed from storage partition',
  /**
   *@description Explanation for an event outcome.
   */
  clearBrowsingData: 'User-initiated browser data removal',
  /**
   *@description Explanation for an event outcome.
   */
  invalidSessionParams: 'Invalid session parameters',
  /**
   *@description Explanation for an event outcome.
   */
  refreshFatalError: 'Fatal error during refresh',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/DeviceBoundSessionsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  sessionAndEvents?: SessionAndEvents;
  preserveLogSetting?: Common.Settings.Setting<boolean>;
  defaultTitle?: string;
  defaultDescription?: string;
  selectedEvent?: Protocol.Network.DeviceBoundSessionEventOccurredEvent;
  onEventRowSelected?(selectedEvent?: Protocol.Network.DeviceBoundSessionEventOccurredEvent|undefined): void;
}

type ViewOutput = object;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {sessionAndEvents, preserveLogSetting, defaultTitle, defaultDescription, selectedEvent, onEventRowSelected} =
      input;

  const toolbarHtml = preserveLogSetting ?
      html`
        <devtools-toolbar class="device-bound-sessions-toolbar">
        <devtools-checkbox title=${i18nString(UIStrings.doNotClearLogOnPageReload)} ${
          UI.UIUtils.bindToSetting(preserveLogSetting)}>${i18nString(UIStrings.preserveLog)}</devtools-checkbox>
        </devtools-toolbar>
  ` :
      nothing;

  if (!sessionAndEvents) {
    if (!defaultTitle || !defaultDescription) {
      render(nothing, target);
      return;
    }
    render(
        html`
      <style>${UI.inspectorCommonStyles}</style>
      <style>${deviceBoundSessionsViewStyles}</style>
      ${toolbarHtml}
      <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
          header: defaultTitle,
          text: defaultDescription
        })} jslog=${VisualLogging.pane('device-bound-sessions-empty')}></devtools-widget>
    `,
        target);
    return;
  }

  let sessionDetailsHtml: TemplateResult|undefined;
  if (sessionAndEvents.session) {
    const {key, inclusionRules, cookieCravings} = sessionAndEvents.session;
    sessionDetailsHtml = html`
        <devtools-report>
          <devtools-report-section-header>${i18nString(UIStrings.sessionConfig)}</devtools-report-section-header>
          <devtools-report-key>${i18nString(UIStrings.keySite)}</devtools-report-key>
          <devtools-report-value>${key.site}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.keyId)}</devtools-report-key>
          <devtools-report-value>${key.id}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.refreshUrl)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.refreshUrl}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.expiryDate)}</devtools-report-key>
          <devtools-report-value>${
        new Date(sessionAndEvents.session.expiryDate * 1000).toLocaleString()}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.cachedChallenge)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.cachedChallenge || ''}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.allowedRefreshInitiators)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.allowedRefreshInitiators.join(', ')}</devtools-report-value>
          <devtools-report-section-header>${i18nString(UIStrings.scope)}</devtools-report-section-header>
          <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
          <devtools-report-value>${inclusionRules.origin}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.includeSite)}</devtools-report-key>
          <devtools-report-value>${boolToString(inclusionRules.includeSite)}</devtools-report-value>
        </devtools-report>
        ${
        inclusionRules.urlRules.length > 0 ? html`
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
                  ${inclusionRules.urlRules.map(rule => html`
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
        ${
        cookieCravings.length > 0 ? html`
          <div class="device-bound-session-grid-wrapper">
            <devtools-data-grid class="device-bound-session-cookie-cravings-grid" striped inline>
              <table>
                <thead>
                  <tr>
                    <th id="name" weight="2" sortable>${i18nString(UIStrings.name)}</th>
                    <th id="domain" weight="2" sortable>${i18n.i18n.lockedString('Domain')}</th>
                    <th id="path" weight="2" sortable>${i18n.i18n.lockedString('Path')}</th>
                    <th id="secure" type="boolean" align="center" weight="1" sortable>${
                                        i18n.i18n.lockedString('Secure')}</th>
                    <th id="http-only" type="boolean" align="center" weight="1" sortable>${
                                        i18n.i18n.lockedString('HttpOnly')}</th>
                    <th id="same-site" weight="1" sortable>${i18n.i18n.lockedString('SameSite')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${cookieCravings.map(craving => html`
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
  }
  const events = [...sessionAndEvents.eventsById.values()];
  const eventsHtml = html`
      <devtools-report-section-header>${i18nString(UIStrings.events)}</devtools-report-section-header>
          ${
      events.length > 0 && onEventRowSelected ?
          html`
            <div class="device-bound-session-grid-wrapper">
                <devtools-data-grid class="device-bound-session-events-grid" striped inline ${
              Directives.ref((el?: Element) => {
                if (!el || !(el instanceof HTMLElement)) {
                  return;
                }
                const grid = el as HTMLElement & {deselectRow(): void};
                if (!selectedEvent) {
                  grid.deselectRow();
                }
              })}>
                <table>
                  <thead>
                    <tr>
                      <th id="type" weight="1" sortable>${i18nString(UIStrings.type)}</th>
                      <th id="timestamp" weight="2" sortable>${i18nString(UIStrings.timestamp)}</th>
                      <th id="details" weight="2" sortable>${i18nString(UIStrings.result)}</th>
                    </tr>
                  </thead>
                  <tbody>${events.map(({event, timestamp}) => html`
                      <tr @select=${(): void => onEventRowSelected(event)}>
                        <td>${getEventTypeString(event)}</td>
                        <td>${timestamp.toLocaleString()}</td>
                        <td>${succeededToString(event.succeeded)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </devtools-data-grid>
            </div>
          ` :
          html`<div class="device-bound-session-no-events-wrapper">${i18nString(UIStrings.noEvents)}</div>`}`;

  const creationEventDetails =
      selectedEvent?.creationEventDetails &&
      html`
          <devtools-report-key>${i18nString(UIStrings.fetchResult)}</devtools-report-key>
          <devtools-report-value>${
          fetchResultToString(selectedEvent.creationEventDetails.fetchResult)}</devtools-report-value>
            ${selectedEvent.creationEventDetails.newSession && html`
              <devtools-report-key>${i18nString(UIStrings.updatedSessionConfig)}</devtools-report-key>
              <devtools-report-value>${i18nString(UIStrings.yes)}</devtools-report-value>
            `}
          `;
  const refreshEventDetails =
      selectedEvent?.refreshEventDetails &&
      html`
          <devtools-report-key>${i18nString(UIStrings.refreshResult)}</devtools-report-key>
          <devtools-report-value>${
          refreshResultToString(selectedEvent.refreshEventDetails.refreshResult)}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.causedAnyRequestDeferrals)}</devtools-report-key>
          <devtools-report-value>${
          boolToString(!selectedEvent.refreshEventDetails.wasFullyProactiveRefresh)}</devtools-report-value>
            ${
          selectedEvent.refreshEventDetails.fetchResult &&
          html`
              <devtools-report-key>${i18nString(UIStrings.fetchResult)}</devtools-report-key>
              <devtools-report-value>${
              fetchResultToString(selectedEvent.refreshEventDetails.fetchResult)}</devtools-report-value>
            `}
            ${selectedEvent.refreshEventDetails.newSession && html`
              <devtools-report-key>${i18nString(UIStrings.updatedSessionConfig)}</devtools-report-key>
              <devtools-report-value>${i18nString(UIStrings.yes)}</devtools-report-value>
            `}
          `;
  const challengeEventDetails =
      selectedEvent?.challengeEventDetails &&
      html`
          <devtools-report-key>${i18nString(UIStrings.challengeResult)}</devtools-report-key>
          <devtools-report-value>${
          challengeResultToString(selectedEvent.challengeEventDetails.challengeResult)}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.challenge)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.challengeEventDetails.challenge}</devtools-report-value>
          `;
  const terminationEventDetails =
      selectedEvent?.terminationEventDetails &&
      html`
          <devtools-report-key>${i18nString(UIStrings.deletionReason)}</devtools-report-key>
          <devtools-report-value>${
          deletionReasonToString(selectedEvent.terminationEventDetails.deletionReason)}</devtools-report-value>
          `;
  const eventDetailsContentHtml = selectedEvent ?
      html`
        <devtools-report>
          <devtools-report-key>${i18nString(UIStrings.keySite)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.site}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.sessionId)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.sessionId}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.type)}</devtools-report-key>
          <devtools-report-value>${getEventTypeString(selectedEvent)}</devtools-report-value>
          <devtools-report-key>${i18nString(UIStrings.eventResult)}</devtools-report-key>
          <devtools-report-value>${succeededToString(selectedEvent.succeeded)}</devtools-report-value>
          ${creationEventDetails}
          ${refreshEventDetails}
          ${challengeEventDetails}
          ${terminationEventDetails}
        </devtools-report>
    ` :
      html`<div class="device-bound-session-no-event-details">${i18nString(UIStrings.selectEventToViewDetails)}</div>`;
  const eventDetailsHtml = html`
      <devtools-report-section-header>${i18nString(UIStrings.eventDetails)}</devtools-report-section-header>
      ${eventDetailsContentHtml}
  `;

  render(
      html`
        <style>${UI.inspectorCommonStyles}</style>
        <style>${deviceBoundSessionsViewStyles}</style>
        ${toolbarHtml}
        <devtools-split-view sidebar-position="second">
          <div slot="main" class="device-bound-session-view-wrapper">
            ${sessionDetailsHtml || nothing}
            ${eventsHtml}
          </div>
          <div slot="sidebar" class="device-bound-session-sidebar">
            ${eventDetailsHtml}
          </div>
        </devtools-split-view>`,
      target);
};

export class DeviceBoundSessionsView extends UI.Widget.VBox {
  #site?: string;
  #sessionId?: string;
  #model?: DeviceBoundSessionsModel;
  #view: typeof DEFAULT_VIEW;
  #defaultTitle?: string;
  #defaultDescription?: string;
  #selectedEvent?: Protocol.Network.DeviceBoundSessionEventOccurredEvent;

  constructor(view: typeof DEFAULT_VIEW = DEFAULT_VIEW) {
    super({jslog: `${VisualLogging.pane('device-bound-sessions')}`});
    this.#view = view;
  }

  showSession(model: DeviceBoundSessionsModel, site: string, sessionId?: string): void {
    this.#defaultTitle = undefined;
    this.#defaultDescription = undefined;
    this.#site = site;
    this.#sessionId = sessionId;
    this.#attachModel(model);
    this.performUpdate();
  }

  showDefault(model: DeviceBoundSessionsModel, defaultTitle: string, defaultDescription: string): void {
    this.#defaultTitle = defaultTitle;
    this.#defaultDescription = defaultDescription;
    this.#site = undefined;
    this.#sessionId = undefined;
    this.#attachModel(model);
    this.performUpdate();
  }

  #attachModel(model: DeviceBoundSessionsModel): void {
    if (this.#model) {
      this.#model.removeEventListener(DeviceBoundSessionModelEvents.EVENT_OCCURRED, this.performUpdate, this);
      this.#model.removeEventListener(DeviceBoundSessionModelEvents.CLEAR_EVENTS, this.performUpdate, this);
    }
    this.#model = model;
    this.#model.addEventListener(DeviceBoundSessionModelEvents.EVENT_OCCURRED, this.performUpdate, this);
    this.#model.addEventListener(DeviceBoundSessionModelEvents.CLEAR_EVENTS, this.performUpdate, this);
    if (this.#selectedEvent) {
      this.#selectedEvent = undefined;
    }
  }

  override performUpdate(): void {
    let sessionAndEvents: SessionAndEvents|undefined;
    let preserveLogSetting: Common.Settings.Setting<boolean>|undefined;

    if (this.#model) {
      preserveLogSetting = this.#model.getPreserveLogSetting();
      if (this.#site) {
        sessionAndEvents = this.#model.getSession(this.#site, this.#sessionId);
      }
    }

    this.#view(
        {
          sessionAndEvents,
          preserveLogSetting,
          defaultTitle: this.#defaultTitle,
          defaultDescription: this.#defaultDescription,
          selectedEvent: this.#selectedEvent,
          onEventRowSelected: this.#onEventRowSelected.bind(this),
        },
        {}, this.contentElement);
  }

  #onEventRowSelected(selectedEvent?: Protocol.Network.DeviceBoundSessionEventOccurredEvent): void {
    this.#selectedEvent = selectedEvent;
    this.performUpdate();
  }
}

function ruleTypeToString(ruleType: Protocol.Network.DeviceBoundSessionUrlRuleRuleType): string {
  switch (ruleType) {
    case Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Exclude:
      return i18nString(UIStrings.ruleTypeExclude);
    case Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Include:
      return i18nString(UIStrings.ruleTypeInclude);
    default:
      return ruleType;
  }
}
function getEventTypeString(event: Protocol.Network.DeviceBoundSessionEventOccurredEvent): string {
  if (event.creationEventDetails) {
    return i18nString(UIStrings.creation);
  }
  if (event.refreshEventDetails) {
    return i18nString(UIStrings.refresh);
  }
  if (event.challengeEventDetails) {
    return i18nString(UIStrings.challenge);
  }
  if (event.terminationEventDetails) {
    return i18nString(UIStrings.termination);
  }
  return i18nString(UIStrings.unknown);
}

function fetchResultToString(fetchResult: Protocol.Network.DeviceBoundSessionFetchResult): string {
  switch (fetchResult) {
    case Protocol.Network.DeviceBoundSessionFetchResult.Success:
      return i18nString(UIStrings.success);
    case Protocol.Network.DeviceBoundSessionFetchResult.KeyError:
      return i18nString(UIStrings.keyError);
    case Protocol.Network.DeviceBoundSessionFetchResult.SigningError:
      return i18nString(UIStrings.signingError);
    case Protocol.Network.DeviceBoundSessionFetchResult.ServerRequestedTermination:
      return i18nString(UIStrings.serverRequestedTermination);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidSessionId:
      return i18nString(UIStrings.invalidSessionId);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidChallenge:
      return i18nString(UIStrings.invalidChallenge);
    case Protocol.Network.DeviceBoundSessionFetchResult.TooManyChallenges:
      return i18nString(UIStrings.tooManyChallenges);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFetcherUrl:
      return i18nString(UIStrings.invalidFetcherUrl);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidRefreshUrl:
      return i18nString(UIStrings.invalidRefreshUrl);
    case Protocol.Network.DeviceBoundSessionFetchResult.TransientHttpError:
      return i18nString(UIStrings.transientHttpError);
    case Protocol.Network.DeviceBoundSessionFetchResult.ScopeOriginSameSiteMismatch:
      return i18nString(UIStrings.scopeOriginSameSiteMismatch);
    case Protocol.Network.DeviceBoundSessionFetchResult.RefreshUrlSameSiteMismatch:
      return i18nString(UIStrings.refreshUrlSameSiteMismatch);
    case Protocol.Network.DeviceBoundSessionFetchResult.MismatchedSessionId:
      return i18nString(UIStrings.mismatchedSessionId);
    case Protocol.Network.DeviceBoundSessionFetchResult.MissingScope:
      return i18nString(UIStrings.missingScope);
    case Protocol.Network.DeviceBoundSessionFetchResult.NoCredentials:
      return i18nString(UIStrings.noCredentials);
    case Protocol.Network.DeviceBoundSessionFetchResult.SubdomainRegistrationWellKnownUnavailable:
      return i18nString(UIStrings.subdomainRegistrationWellKnownUnavailable);
    case Protocol.Network.DeviceBoundSessionFetchResult.SubdomainRegistrationUnauthorized:
      return i18nString(UIStrings.subdomainRegistrationUnauthorized);
    case Protocol.Network.DeviceBoundSessionFetchResult.SubdomainRegistrationWellKnownMalformed:
      return i18nString(UIStrings.subdomainRegistrationWellKnownMalformed);
    case Protocol.Network.DeviceBoundSessionFetchResult.SessionProviderWellKnownUnavailable:
      return i18nString(UIStrings.sessionProviderWellKnownUnavailable);
    case Protocol.Network.DeviceBoundSessionFetchResult.RelyingPartyWellKnownUnavailable:
      return i18nString(UIStrings.relyingPartyWellKnownUnavailable);
    case Protocol.Network.DeviceBoundSessionFetchResult.FederatedKeyThumbprintMismatch:
      return i18nString(UIStrings.federatedKeyThumbprintMismatch);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFederatedSessionUrl:
      return i18nString(UIStrings.invalidFederatedSessionUrl);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFederatedKey:
      return i18nString(UIStrings.invalidFederatedKey);
    case Protocol.Network.DeviceBoundSessionFetchResult.TooManyRelyingOriginLabels:
      return i18nString(UIStrings.tooManyRelyingOriginLabels);
    case Protocol.Network.DeviceBoundSessionFetchResult.BoundCookieSetForbidden:
      return i18nString(UIStrings.boundCookieSetForbidden);
    case Protocol.Network.DeviceBoundSessionFetchResult.NetError:
      return i18nString(UIStrings.netError);
    case Protocol.Network.DeviceBoundSessionFetchResult.ProxyError:
      return i18nString(UIStrings.proxyError);
    case Protocol.Network.DeviceBoundSessionFetchResult.EmptySessionConfig:
      return i18nString(UIStrings.emptySessionConfig);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsConfig:
      return i18nString(UIStrings.invalidCredentialsConfig);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsType:
      return i18nString(UIStrings.invalidCredentialsType);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsEmptyName:
      return i18nString(UIStrings.invalidCredentialsEmptyName);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookie:
      return i18nString(UIStrings.invalidCredentialsCookie);
    case Protocol.Network.DeviceBoundSessionFetchResult.PersistentHttpError:
      return i18nString(UIStrings.persistentHttpError);
    case Protocol.Network.DeviceBoundSessionFetchResult.RegistrationAttemptedChallenge:
      return i18nString(UIStrings.registrationAttemptedChallenge);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeOrigin:
      return i18nString(UIStrings.invalidScopeOrigin);
    case Protocol.Network.DeviceBoundSessionFetchResult.ScopeOriginContainsPath:
      return i18nString(UIStrings.scopeOriginContainsPath);
    case Protocol.Network.DeviceBoundSessionFetchResult.RefreshInitiatorNotString:
      return i18nString(UIStrings.refreshInitiatorNotString);
    case Protocol.Network.DeviceBoundSessionFetchResult.RefreshInitiatorInvalidHostPattern:
      return i18nString(UIStrings.refreshInitiatorInvalidHostPattern);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeSpecification:
      return i18nString(UIStrings.invalidScopeSpecification);
    case Protocol.Network.DeviceBoundSessionFetchResult.MissingScopeSpecificationType:
      return i18nString(UIStrings.missingScopeSpecificationType);
    case Protocol.Network.DeviceBoundSessionFetchResult.EmptyScopeSpecificationDomain:
      return i18nString(UIStrings.emptyScopeSpecificationDomain);
    case Protocol.Network.DeviceBoundSessionFetchResult.EmptyScopeSpecificationPath:
      return i18nString(UIStrings.emptyScopeSpecificationPath);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeSpecificationType:
      return i18nString(UIStrings.invalidScopeSpecificationType);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeIncludeSite:
      return i18nString(UIStrings.invalidScopeIncludeSite);
    case Protocol.Network.DeviceBoundSessionFetchResult.MissingScopeIncludeSite:
      return i18nString(UIStrings.missingScopeIncludeSite);
    case Protocol.Network.DeviceBoundSessionFetchResult.FederatedNotAuthorizedByProvider:
      return i18nString(UIStrings.federatedNotAuthorizedByProvider);
    case Protocol.Network.DeviceBoundSessionFetchResult.FederatedNotAuthorizedByRelyingParty:
      return i18nString(UIStrings.federatedNotAuthorizedByRelyingParty);
    case Protocol.Network.DeviceBoundSessionFetchResult.SessionProviderWellKnownMalformed:
      return i18nString(UIStrings.sessionProviderWellKnownMalformed);
    case Protocol.Network.DeviceBoundSessionFetchResult.SessionProviderWellKnownHasProviderOrigin:
      return i18nString(UIStrings.sessionProviderWellKnownHasProviderOrigin);
    case Protocol.Network.DeviceBoundSessionFetchResult.RelyingPartyWellKnownMalformed:
      return i18nString(UIStrings.relyingPartyWellKnownMalformed);
    case Protocol.Network.DeviceBoundSessionFetchResult.RelyingPartyWellKnownHasRelyingOrigins:
      return i18nString(UIStrings.relyingPartyWellKnownHasRelyingOrigins);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFederatedSessionProviderSessionMissing:
      return i18nString(UIStrings.invalidFederatedSessionProviderSessionMissing);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFederatedSessionWrongProviderOrigin:
      return i18nString(UIStrings.invalidFederatedSessionWrongProviderOrigin);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookieCreationTime:
      return i18nString(UIStrings.invalidCredentialsCookieCreationTime);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookieName:
      return i18nString(UIStrings.invalidCredentialsCookieName);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookieParsing:
      return i18nString(UIStrings.invalidCredentialsCookieParsing);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookieUnpermittedAttribute:
      return i18nString(UIStrings.invalidCredentialsCookieUnpermittedAttribute);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookieInvalidDomain:
      return i18nString(UIStrings.invalidCredentialsCookieInvalidDomain);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidCredentialsCookiePrefix:
      return i18nString(UIStrings.invalidCredentialsCookiePrefix);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeRulePath:
      return i18nString(UIStrings.invalidScopeRulePath);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidScopeRuleHostPattern:
      return i18nString(UIStrings.invalidScopeRuleHostPattern);
    case Protocol.Network.DeviceBoundSessionFetchResult.ScopeRuleOriginScopedHostPatternMismatch:
      return i18nString(UIStrings.scopeRuleOriginScopedHostPatternMismatch);
    case Protocol.Network.DeviceBoundSessionFetchResult.ScopeRuleSiteScopedHostPatternMismatch:
      return i18nString(UIStrings.scopeRuleSiteScopedHostPatternMismatch);
    case Protocol.Network.DeviceBoundSessionFetchResult.SigningQuotaExceeded:
      return i18nString(UIStrings.signingQuotaExceeded);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidConfigJson:
      return i18nString(UIStrings.invalidConfigJson);
    case Protocol.Network.DeviceBoundSessionFetchResult.InvalidFederatedSessionProviderFailedToRestoreKey:
      return i18nString(UIStrings.invalidFederatedSessionProviderFailedToRestoreKey);
    case Protocol.Network.DeviceBoundSessionFetchResult.FailedToUnwrapKey:
      return i18nString(UIStrings.failedToUnwrapKey);
    case Protocol.Network.DeviceBoundSessionFetchResult.SessionDeletedDuringRefresh:
      return i18nString(UIStrings.sessionDeletedDuringRefresh);
    default:
      return fetchResult;
  }
}

function refreshResultToString(refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult): string {
  switch (refreshResult) {
    case Protocol.Network.RefreshEventDetailsRefreshResult.Refreshed:
      return i18nString(UIStrings.refreshed);
    case Protocol.Network.RefreshEventDetailsRefreshResult.InitializedService:
      return i18nString(UIStrings.initializedService);
    case Protocol.Network.RefreshEventDetailsRefreshResult.Unreachable:
      return i18nString(UIStrings.unreachable);
    case Protocol.Network.RefreshEventDetailsRefreshResult.ServerError:
      return i18nString(UIStrings.serverError);
    case Protocol.Network.RefreshEventDetailsRefreshResult.RefreshQuotaExceeded:
      return i18nString(UIStrings.refreshQuotaExceeded);
    case Protocol.Network.RefreshEventDetailsRefreshResult.FatalError:
      return i18nString(UIStrings.fatalError);
    case Protocol.Network.RefreshEventDetailsRefreshResult.SigningQuotaExceeded:
      return i18nString(UIStrings.signingQuotaExceeded);
    default:
      return refreshResult;
  }
}

function challengeResultToString(challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult): string {
  switch (challengeResult) {
    case Protocol.Network.ChallengeEventDetailsChallengeResult.Success:
      return i18nString(UIStrings.success);
    case Protocol.Network.ChallengeEventDetailsChallengeResult.NoSessionId:
      return i18nString(UIStrings.noSessionId);
    case Protocol.Network.ChallengeEventDetailsChallengeResult.NoSessionMatch:
      return i18nString(UIStrings.noSessionMatch);
    case Protocol.Network.ChallengeEventDetailsChallengeResult.CantSetBoundCookie:
      return i18nString(UIStrings.cantSetBoundCookie);
    default:
      return challengeResult;
  }
}

function deletionReasonToString(deletionReason: Protocol.Network.TerminationEventDetailsDeletionReason): string {
  switch (deletionReason) {
    case Protocol.Network.TerminationEventDetailsDeletionReason.Expired:
      return i18nString(UIStrings.expired);
    case Protocol.Network.TerminationEventDetailsDeletionReason.FailedToRestoreKey:
      return i18nString(UIStrings.failedToRestoreKey);
    case Protocol.Network.TerminationEventDetailsDeletionReason.FailedToUnwrapKey:
      return i18nString(UIStrings.failedToUnwrapKey);
    case Protocol.Network.TerminationEventDetailsDeletionReason.StoragePartitionCleared:
      return i18nString(UIStrings.storagePartitionCleared);
    case Protocol.Network.TerminationEventDetailsDeletionReason.ClearBrowsingData:
      return i18nString(UIStrings.clearBrowsingData);
    case Protocol.Network.TerminationEventDetailsDeletionReason.ServerRequested:
      return i18nString(UIStrings.serverRequestedTermination);
    case Protocol.Network.TerminationEventDetailsDeletionReason.InvalidSessionParams:
      return i18nString(UIStrings.invalidSessionParams);
    case Protocol.Network.TerminationEventDetailsDeletionReason.RefreshFatalError:
      return i18nString(UIStrings.refreshFatalError);
    default:
      return deletionReason;
  }
}

function boolToString(bool: boolean): string {
  return bool ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);
}

function succeededToString(succeeded: boolean): string {
  return succeeded ? i18nString(UIStrings.success) : i18nString(UIStrings.error);
}
