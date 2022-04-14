// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';
import {resolveLazyDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
  *@description Title of issue raised when a deprecated feature is used
  */
  title: 'Deprecated Feature Used',

  // Store alphabetized messages per DeprecationIssueType in this block.

  /**
  *@description This message is shown when the example deprecated feature is used
  */
  deprecationExample: 'This is an example of a translated deprecation issue message.',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/DeprecationIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class DeprecationIssue extends Issue {
  #issueDetails: Protocol.Audits.DeprecationIssueDetails;

  constructor(issueDetails: Protocol.Audits.DeprecationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    let typeCode = String(issueDetails.type);
    // TODO(crbug.com/1264960): Remove legacy type when issues are translated.
    if (issueDetails.type === Protocol.Audits.DeprecationIssueType.Untranslated) {
      typeCode = String(issueDetails.deprecationType);
    }
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      typeCode,
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
    // Keep case statements alphabetized per DeprecationIssueType.
    switch (this.#issueDetails.type) {
      case Protocol.Audits.DeprecationIssueType.DeprecationExample:
        messageFunction = i18nLazyString(UIStrings.deprecationExample);
        break;
      // TODO(crbug.com/1264960): Remove legacy type when issues are translated.
      case Protocol.Audits.DeprecationIssueType.Untranslated:
        messageFunction = (): string => this.#issueDetails.message ?? '';
        break;
    }
    return resolveLazyDescription({
      file: 'deprecation.md',
      substitutions: new Map([
        ['PLACEHOLDER_title', i18nLazyString(UIStrings.title)],
        ['PLACEHOLDER_message', messageFunction],
      ]),
      links: [],
    });
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
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
    if (details.type !== Protocol.Audits.DeprecationIssueType.Untranslated &&
        (details.deprecationType || details.message)) {
      console.warn('Translated deprecation issue with malformed details received.');
      return [];
    }
    if (details.type === Protocol.Audits.DeprecationIssueType.Untranslated &&
        (!details.deprecationType || !details.message)) {
      console.warn('Untranslated deprecation issue with malformed details received.');
      return [];
    }
    return [new DeprecationIssue(details, issuesModel)];
  }
}
