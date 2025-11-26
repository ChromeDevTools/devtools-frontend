// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Label for the link for SharedArrayBuffer Issues. The full text reads "Enabling `SharedArrayBuffer`"
   * and is the title of an article that describes how to enable a JavaScript feature called SharedArrayBuffer.
   */
  enablingSharedArrayBuffer: 'Enabling `SharedArrayBuffer`',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/SharedArrayBufferIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedArrayBufferIssue extends Issue<Protocol.Audits.SharedArrayBufferIssueDetails> {
  constructor(
      issueDetails: Protocol.Audits.SharedArrayBufferIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    const umaCode = [Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue, issueDetails.type].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue, umaCode}, issueDetails, issuesModel);
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'sharedArrayBuffer.md',
      links: [{
        link: 'https://developer.chrome.com/blog/enabling-shared-array-buffer/',
        linkTitle: i18nString(UIStrings.enablingSharedArrayBuffer),
      }],
    };
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  getKind(): IssueKind {
    if (this.details().isWarning) {
      return IssueKind.BREAKING_CHANGE;
    }
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): SharedArrayBufferIssue[] {
    const sabIssueDetails = inspectorIssue.details.sharedArrayBufferIssueDetails;
    if (!sabIssueDetails) {
      console.warn('SAB transfer issue without details received.');
      return [];
    }
    return [new SharedArrayBufferIssue(sabIssueDetails, issuesModel)];
  }
}
