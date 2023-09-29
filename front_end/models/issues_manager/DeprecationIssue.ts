// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Deprecation from '../../generated/Deprecation.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {resolveLazyDescription, type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description This links to the chrome feature status page when one exists.
   */
  feature: 'Check the feature status page for more details.',
  /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: 'This change will go into effect with milestone {milestone}.',
  /**
   * @description Title of issue raised when a deprecated feature is used
   */
  title: 'Deprecated feature used',
};

const str_ = i18n.i18n.registerUIStrings('models/issues_manager/DeprecationIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

// eslint-disable-next-line rulesdir/l10n_filename_matches
const strDeprecation = i18n.i18n.registerUIStrings('generated/Deprecation.ts', Deprecation.UIStrings);
const i18nLazyDeprecationString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, strDeprecation);

export class DeprecationIssue extends Issue {
  #issueDetails: Protocol.Audits.DeprecationIssueDetails;

  constructor(issueDetails: Protocol.Audits.DeprecationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      issueDetails.type,
    ].join('::');
    super({code: issueCode, umaCode: 'DeprecationIssue'}, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.DeprecationIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    let messageFunction = (): string => '';
    const maybeEnglishMessage = (Deprecation.UIStrings as Record<string, string>)[this.#issueDetails.type];
    if (maybeEnglishMessage) {
      messageFunction = i18nLazyDeprecationString(maybeEnglishMessage);
    }

    const links = [];
    const deprecationMeta = Deprecation.DEPRECATIONS_METADATA[this.#issueDetails.type];
    const feature = deprecationMeta?.chromeStatusFeature ?? 0;
    if (feature !== 0) {
      links.push({
        link: `https://chromestatus.com/feature/${feature}`,
        linkTitle: i18nLazyString(UIStrings.feature),
      });
    }
    const milestone = deprecationMeta?.milestone ?? 0;
    if (milestone !== 0) {
      links.push({
        link: 'https://chromiumdash.appspot.com/schedule',
        linkTitle: i18nLazyString(UIStrings.milestone, {milestone}),
      });
    }
    return resolveLazyDescription({
      file: 'deprecation.md',
      substitutions: new Map([
        ['PLACEHOLDER_title', i18nLazyString(UIStrings.title)],
        ['PLACEHOLDER_message', messageFunction],
      ]),
      links,
    });
  }

  override sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    if (this.#issueDetails.sourceCodeLocation) {
      return [this.#issueDetails.sourceCodeLocation];
    }
    return [];
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.BreakingChange;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      DeprecationIssue[] {
    const details = inspectorIssue.details.deprecationIssueDetails;
    if (!details) {
      console.warn('Deprecation issue without details received.');
      return [];
    }
    return [new DeprecationIssue(details, issuesModel)];
  }
}
