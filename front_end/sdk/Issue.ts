// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';

import type {IssuesModel} from './IssuesModel.js';

// eslint-disable-next-line rulesdir/const_enum
export enum IssueCategory {
  CrossOriginEmbedderPolicy = 'CrossOriginEmbedderPolicy',
  MixedContent = 'MixedContent',
  SameSiteCookie = 'SameSiteCookie',
  HeavyAd = 'HeavyAd',
  ContentSecurityPolicy = 'ContentSecurityPolicy',
  TrustedWebActivity = 'TrustedWebActivity',
  LowTextContrast = 'LowTextContrast',
  Cors = 'Cors',
  Other = 'Other',
}

// eslint-disable-next-line rulesdir/const_enum
export enum IssueKind {
  BreakingChange = 'BreakingChange',
  PageError = 'PageError',
  Improvement = 'Improvement',
}

/**
 * Union two issue kinds for issue aggregation. The idea is to show the most
 * important kind on aggregated issues that union issues of different kinds.
 */
export function unionIssueKind(a: IssueKind, b: IssueKind): IssueKind {
  if (a === IssueKind.PageError || b === IssueKind.PageError) {
    return IssueKind.PageError;
  }
  if (a === IssueKind.BreakingChange || b === IssueKind.BreakingChange) {
    return IssueKind.BreakingChange;
  }
  return IssueKind.Improvement;
}

export function getShowThirdPartyIssuesSetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('showThirdPartyIssues', false);
}

export function resolveLazyDescription(lazyDescription: LazyMarkdownIssueDescription|
                                       undefined): MarkdownIssueDescription|null {
  function linksMap(currentLink: {link: string, linkTitle: () => string}): {link: string, linkTitle: string} {
    return {link: currentLink.link, linkTitle: currentLink.linkTitle()};
  }

  const substitutionMap = new Map();
  lazyDescription?.substitutions?.forEach((value, key) => {
    substitutionMap.set(key, value());
  });

  const description =
      Object.assign([], lazyDescription, {links: lazyDescription?.links.map(linksMap), substitutions: substitutionMap});

  if (!description) {
    return null;
  }
  return description;
}

export interface MarkdownIssueDescription {
  file: string;
  substitutions: Map<string, string>|undefined;
  links: {link: string, linkTitle: string}[];
}

export interface LazyMarkdownIssueDescription {
  file: string;
  substitutions: Map<string, () => string>|undefined;
  links: {link: string, linkTitle: () => string}[];
}

export interface AffectedElement {
  backendNodeId: number;
  nodeName: string;
}

export abstract class Issue extends Common.ObjectWrapper.ObjectWrapper {
  private issueCode: string;
  private issuesModel: IssuesModel|null;

  constructor(code: string|{code: string, umaCode: string}, issuesModel: IssuesModel|null = null) {
    super();
    this.issueCode = typeof code === 'string' ? code : code.code;
    this.issuesModel = issuesModel;
    Host.userMetrics.issueCreated(typeof code === 'string' ? code : code.umaCode);
  }

  code(): string {
    return this.issueCode;
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

  elements(): Iterable<AffectedElement> {
    return [];
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return [];
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
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
  model(): IssuesModel|null {
    return this.issuesModel;
  }

  isCausedByThirdParty(): boolean {
    return false;
  }
}

export function toZeroBasedLocation(location: Protocol.Audits.SourceCodeLocation|undefined):
    {url: string, scriptId: string|undefined, lineNumber: number, columnNumber: number|undefined}|undefined {
  if (!location) {
    return undefined;
  }
  return {
    url: location.url,
    scriptId: location.scriptId,
    lineNumber: location.lineNumber,
    columnNumber: location.columnNumber === 0 ? undefined : location.columnNumber - 1,
  };
}
