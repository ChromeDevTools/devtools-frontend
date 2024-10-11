// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  improvements: 'Improvements',
  /**
   *@description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  pageErrors: 'Page Errors',
  /**
   *@description The kind of an issue (plural) (Issues are categorized into kinds).
   */
  breakingChanges: 'Breaking Changes',
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  pageErrorIssue: 'A page error issue: the page is not working correctly',
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  breakingChangeIssue: 'A breaking change issue: the page may stop working in an upcoming version of Chrome',
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  improvementIssue: 'An improvement issue: there is an opportunity to improve the page',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/Issue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum IssueCategory {
  CROSS_ORIGIN_EMBEDDER_POLICY = 'CrossOriginEmbedderPolicy',
  GENERIC = 'Generic',
  MIXED_CONTENT = 'MixedContent',
  COOKIE = 'Cookie',
  HEAVY_AD = 'HeavyAd',
  CONTENT_SECURITY_POLICY = 'ContentSecurityPolicy',
  LOW_TEXT_CONTRAST = 'LowTextContrast',
  CORS = 'Cors',
  ATTRIBUTION_REPORTING = 'AttributionReporting',
  QUIRKS_MODE = 'QuirksMode',
  OTHER = 'Other',
}

export const enum IssueKind {
  /**
   * Something is not working in the page right now. Issues of this kind need
   * usually be fixed right away. They usually indicate that a Web API is being
   * used in a wrong way, or that a network request was misconfigured.
   */
  PAGE_ERROR = 'PageError',
  /**
   * The page is using a Web API or relying on browser behavior that is going
   * to change in the future. If possible, the message associated with issues
   * of this kind should include a time when the behavior is going to change.
   */
  BREAKING_CHANGE = 'BreakingChange',
  /**
   * Anything that can be improved about the page, but isn't urgent and doesn't
   * impair functionality in a major way.
   */
  IMPROVEMENT = 'Improvement',
}

export function getIssueKindName(issueKind: IssueKind): Common.UIString.LocalizedString {
  switch (issueKind) {
    case IssueKind.BREAKING_CHANGE:
      return i18nString(UIStrings.breakingChanges);
    case IssueKind.IMPROVEMENT:
      return i18nString(UIStrings.improvements);
    case IssueKind.PAGE_ERROR:
      return i18nString(UIStrings.pageErrors);
  }
}

export function getIssueKindDescription(issueKind: IssueKind): Common.UIString.LocalizedString {
  switch (issueKind) {
    case IssueKind.PAGE_ERROR:
      return i18nString(UIStrings.pageErrorIssue);
    case IssueKind.BREAKING_CHANGE:
      return i18nString(UIStrings.breakingChangeIssue);
    case IssueKind.IMPROVEMENT:
      return i18nString(UIStrings.improvementIssue);
  }
}

/**
 * Union two issue kinds for issue aggregation. The idea is to show the most
 * important kind on aggregated issues that union issues of different kinds.
 */
export function unionIssueKind(a: IssueKind, b: IssueKind): IssueKind {
  if (a === IssueKind.PAGE_ERROR || b === IssueKind.PAGE_ERROR) {
    return IssueKind.PAGE_ERROR;
  }
  if (a === IssueKind.BREAKING_CHANGE || b === IssueKind.BREAKING_CHANGE) {
    return IssueKind.BREAKING_CHANGE;
  }
  return IssueKind.IMPROVEMENT;
}

export function getShowThirdPartyIssuesSetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('show-third-party-issues', true);
}

export interface AffectedElement {
  backendNodeId: Protocol.DOM.BackendNodeId;
  nodeName: string;
  target: SDK.Target.Target|null;
}

export abstract class Issue<IssueCode extends string = string> {
  #issueCode: IssueCode;
  #issuesModel: SDK.IssuesModel.IssuesModel|null;
  protected issueId: Protocol.Audits.IssueId|undefined = undefined;
  #hidden: boolean;

  constructor(
      code: IssueCode|{code: IssueCode, umaCode: string}, issuesModel: SDK.IssuesModel.IssuesModel|null = null,
      issueId?: Protocol.Audits.IssueId) {
    this.#issueCode = typeof code === 'object' ? code.code : code;
    this.#issuesModel = issuesModel;
    this.issueId = issueId;
    Host.userMetrics.issueCreated(typeof code === 'string' ? code : code.umaCode);
    this.#hidden = false;
  }

  code(): IssueCode {
    return this.#issueCode;
  }

  abstract primaryKey(): string;
  abstract getDescription(): MarkdownIssueDescription|null;
  abstract getCategory(): IssueCategory;
  abstract getKind(): IssueKind;

  getBlockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return [];
  }

  cookies(): Iterable<Protocol.Audits.AffectedCookie> {
    return [];
  }

  rawCookieLines(): Iterable<string> {
    return [];
  }

  elements(): Iterable<AffectedElement> {
    return [];
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return [];
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    return [];
  }

  trackingSites(): Iterable<string> {
    return [];
  }

  isAssociatedWithRequestId(requestId: string): boolean {
    for (const request of this.requests()) {
      if (request.requestId === requestId) {
        return true;
      }
    }
    return false;
  }

  /**
   * The model might be unavailable or belong to a target that has already been disposed.
   */
  model(): SDK.IssuesModel.IssuesModel|null {
    return this.#issuesModel;
  }

  isCausedByThirdParty(): boolean {
    return false;
  }

  getIssueId(): Protocol.Audits.IssueId|undefined {
    return this.issueId;
  }

  isHidden(): boolean {
    return this.#hidden;
  }

  setHidden(hidden: boolean): void {
    this.#hidden = hidden;
  }

  maybeCreateConsoleMessage(): SDK.ConsoleModel.ConsoleMessage|undefined {
    return;
  }
}

export function toZeroBasedLocation(location: Protocol.Audits.SourceCodeLocation|undefined): {
  url: Platform.DevToolsPath.UrlString,
  scriptId: Protocol.Runtime.ScriptId|undefined,
  lineNumber: number,
  columnNumber: number|undefined,
}|undefined {
  if (!location) {
    return undefined;
  }
  return {
    url: location.url as Platform.DevToolsPath.UrlString,
    scriptId: location.scriptId,
    lineNumber: location.lineNumber,
    columnNumber: location.columnNumber === 0 ? undefined : location.columnNumber - 1,
  };
}
