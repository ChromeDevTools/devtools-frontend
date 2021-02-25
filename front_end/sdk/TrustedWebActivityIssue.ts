// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, LazyMarkdownIssueDescription, MarkdownIssueDescription, resolveLazyDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
export const UIStrings = {
  /**
  *@description Label for the link for Trusted Web Activity issue
  */
  changesToQualityCriteriaForPwas: 'Changes to quality criteria for PWAs using Trusted Web Activity',
};
const str_ = i18n.i18n.registerUIStrings('sdk/TrustedWebActivityIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class TrustedWebActivityIssue extends Issue {
  private issueDetails: Protocol.Audits.TrustedWebActivityIssueDetails;

  constructor(issueDetails: Protocol.Audits.TrustedWebActivityIssueDetails) {
    const issueCode =
        [Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue, issueDetails.violationType].join('::');
    super(issueCode);
    this.issueDetails = issueDetails;
  }

  details(): Protocol.Audits.TrustedWebActivityIssueDetails {
    return this.issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    const description = resolveLazyDescription(issueDescriptions.get(this.issueDetails.violationType));
    if (description) {
      return description;
    }
    throw new Error('Incorrect violationType');
  }

  getCategory(): IssueCategory {
    return IssueCategory.TrustedWebActivity;
  }

  primaryKey(): string {
    return `${Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue}-${JSON.stringify(this.issueDetails)}`;
  }
}

const twaDigitalAssetLinksFailed = {
  file: 'issues/descriptions/TwaDigitalAssetLinksFailed.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://blog.chromium.org/2020/06/changes-to-quality-criteria-for-pwas.html',
    linkTitle: i18nLazyString(UIStrings.changesToQualityCriteriaForPwas),
  }],
};

const twaHttpError = {
  file: 'issues/descriptions/TwaHttpError.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://blog.chromium.org/2020/06/changes-to-quality-criteria-for-pwas.html',
    linkTitle: i18nLazyString(UIStrings.changesToQualityCriteriaForPwas),
  }],
};

const twaPageUnavailableOffline = {
  file: 'issues/descriptions/TwaPageUnavailableOffline.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://blog.chromium.org/2020/06/changes-to-quality-criteria-for-pwas.html',
    linkTitle: i18nLazyString(UIStrings.changesToQualityCriteriaForPwas),
  }],
};

export const httpViolationCode: string = [
  Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue,
  Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError,
].join('::');

export const offlineViolationCode: string = [
  Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue,
  Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline,
].join('::');

export const assetlinkViolationCode: string = [
  Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue,
  Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks,
].join('::');


const issueDescriptions: Map<Protocol.Audits.TwaQualityEnforcementViolationType, LazyMarkdownIssueDescription> =
    new Map([
      [Protocol.Audits.TwaQualityEnforcementViolationType.KHttpError, twaHttpError],
      [Protocol.Audits.TwaQualityEnforcementViolationType.KUnavailableOffline, twaPageUnavailableOffline],
      [Protocol.Audits.TwaQualityEnforcementViolationType.KDigitalAssetLinks, twaDigitalAssetLinksFailed],
    ]);
