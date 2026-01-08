// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  DeviceBoundSessionModelEvents,
  type DeviceBoundSessionsModel,
  type SessionAndEvents
} from './DeviceBoundSessionsModel.js';
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/DeviceBoundSessionsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  sessionAndEvents?: SessionAndEvents;
}

type ViewOutput = object;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {sessionAndEvents} = input;

  if (!sessionAndEvents) {
    render(nothing, target);
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
          <devtools-report-value>${
        inclusionRules.includeSite ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}</devtools-report-value>
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
      events.length > 0 ?
          html`
            <div class="device-bound-session-grid-wrapper">
              <devtools-data-grid class="device-bound-session-events-grid" striped inline>
                <table>
                  <thead>
                    <tr>
                      <th id="type" weight="1" sortable>${i18nString(UIStrings.type)}</th>
                      <th id="timestamp" weight="2" sortable>${i18nString(UIStrings.timestamp)}</th>
                      <th id="details" weight="2" sortable>${i18nString(UIStrings.result)}</th>
                    </tr>
                  </thead>
                  <tbody>${events.map(({event, timestamp}) => html`
                      <tr>
                        <td>${getEventTypeString(event)}</td>
                        <td>${timestamp.toLocaleString()}</td>
                        <td>${event.succeeded ? i18nString(UIStrings.success) : i18nString(UIStrings.error)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </devtools-data-grid>
            </div>
          ` :
          html`<div class="device-bound-session-no-events-wrapper">${i18nString(UIStrings.noEvents)}</div>`}`;
  render(
      html`
        <style>${UI.inspectorCommonStyles}</style>
        <style>${deviceBoundSessionsViewStyles}</style>
        <div class="device-bound-session-view-wrapper">
          ${sessionDetailsHtml || nothing}
          ${eventsHtml}
        </div>`,
      target);
};

export class DeviceBoundSessionsView extends UI.Widget.VBox {
  #site?: string;
  #sessionId?: string;
  #model?: DeviceBoundSessionsModel;
  #view: typeof DEFAULT_VIEW;

  constructor(view: typeof DEFAULT_VIEW = DEFAULT_VIEW) {
    super({jslog: `${VisualLogging.pane('device-bound-sessions')}`});
    this.#view = view;
  }

  showSession(model: DeviceBoundSessionsModel, site: string, sessionId?: string): void {
    this.#site = site;
    this.#sessionId = sessionId;
    if (this.#model) {
      this.#model.removeEventListener(DeviceBoundSessionModelEvents.EVENT_OCCURRED, this.performUpdate, this);
    }
    this.#model = model;
    this.#model.addEventListener(DeviceBoundSessionModelEvents.EVENT_OCCURRED, this.performUpdate, this);
    this.performUpdate();
  }

  override performUpdate(): void {
    let sessionAndEvents: SessionAndEvents|undefined;
    if (this.#site && this.#model) {
      sessionAndEvents = this.#model.getSession(this.#site, this.#sessionId);
    }
    this.#view({sessionAndEvents}, {}, this.contentElement);
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
