// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Protocol from '../../generated/protocol.js';
import type * as SDK from '../../core/sdk/sdk.js';
import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Label for the link in the description of Wasm cross-origin module sharing issues, that is, issues
   * that are related to the upcoming deprecation of cross-origin sharing of Wasm modules.
   */
  linkTitle: 'Restricting Wasm module sharing to same-origin',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/WasmCrossOriginModuleSharingIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WasmCrossOriginModuleSharingIssue extends
    Issue<Protocol.Audits.InspectorIssueCode.WasmCrossOriginModuleSharingIssue> {
  #issueDetails: Protocol.Audits.WasmCrossOriginModuleSharingIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.WasmCrossOriginModuleSharingIssueDetails,
      issuesModel: SDK.IssuesModel.IssuesModel) {
    super(Protocol.Audits.InspectorIssueCode.WasmCrossOriginModuleSharingIssue, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.WasmCrossOriginModuleSharingIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    return {
      file: 'wasmCrossOriginModuleSharing.md',
      links: [{
        link: 'https://developer.chrome.com/blog/wasm-module-sharing-restricted-to-same-origin/',
        linkTitle: i18nString(UIStrings.linkTitle),
      }],
    };
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return this.#issueDetails.isWarning ? IssueKind.BreakingChange : IssueKind.PageError;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      WasmCrossOriginModuleSharingIssue[] {
    const details = inspectorIssue.details.wasmCrossOriginModuleSharingIssue;
    if (!details) {
      console.warn('WasmCrossOriginModuleSharing issue without details received.');
      return [];
    }
    return [new WasmCrossOriginModuleSharingIssue(details, issuesModel)];
  }
}
