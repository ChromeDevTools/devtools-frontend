// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export class PropertyRuleIssue extends Issue<Protocol.Audits.PropertyRuleIssueDetails> {
  readonly #primaryKey: string;
  constructor(issueDetails: Protocol.Audits.PropertyRuleIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    const code = JSON.stringify(issueDetails);
    super(code, issueDetails, issuesModel);
    this.#primaryKey = code;
  }

  override sources(): Protocol.Audits.SourceCodeLocation[] {
    return [this.details().sourceCodeLocation];
  }

  primaryKey(): string {
    return this.#primaryKey;
  }

  getPropertyName(): string {
    switch (this.details().propertyRuleIssueReason) {
      case Protocol.Audits.PropertyRuleIssueReason.InvalidInherits:
        return 'inherits';
      case Protocol.Audits.PropertyRuleIssueReason.InvalidInitialValue:
        return 'initial-value';
      case Protocol.Audits.PropertyRuleIssueReason.InvalidSyntax:
        return 'syntax';
    }
    return '';
  }

  getDescription(): MarkdownIssueDescription {
    if (this.details().propertyRuleIssueReason === Protocol.Audits.PropertyRuleIssueReason.InvalidName) {
      return {
        file: 'propertyRuleInvalidNameIssue.md',
        links: [],
      };
    }
    const value = this.details().propertyValue ? `: ${this.details().propertyValue}` : '';
    const property = `${this.getPropertyName()}${value}`;
    return {
      file: 'propertyRuleIssue.md',
      substitutions: new Map([['PLACEHOLDER_property', property]]),
      links: [],
    };
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(
      issueModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): PropertyRuleIssue[] {
    const propertyRuleIssueDetails = inspectorIssue.details.propertyRuleIssueDetails;
    if (!propertyRuleIssueDetails) {
      console.warn('Property rule issue without details received');
      return [];
    }
    return [new PropertyRuleIssue(propertyRuleIssueDetails, issueModel)];
  }
}
