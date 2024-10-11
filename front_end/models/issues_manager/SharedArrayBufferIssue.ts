// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Label for the link for SharedArrayBuffer Issues. The full text reads "Enabling `SharedArrayBuffer`"
   * and is the title of an article that describes how to enable a JavaScript feature called SharedArrayBuffer.
   */
  enablingSharedArrayBuffer: 'Enabling `SharedArrayBuffer`',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/SharedArrayBufferIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedArrayBufferIssue extends Issue {
  #issueDetails: Protocol.Audits.SharedArrayBufferIssueDetails;

  constructor(issueDetails: Protocol.Audits.SharedArrayBufferIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const umaCode = [Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue, issueDetails.type].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue, umaCode}, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  details(): Protocol.Audits.SharedArrayBufferIssueDetails {
    return this.#issueDetails;
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
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    if (this.#issueDetails.isWarning) {
      return IssueKind.BREAKING_CHANGE;
    }
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      SharedArrayBufferIssue[] {
    const sabIssueDetails = inspectorIssue.details.sharedArrayBufferIssueDetails;
    if (!sabIssueDetails) {
      console.warn('SAB transfer issue without details received.');
      return [];
    }
    return [new SharedArrayBufferIssue(sabIssueDetails, issuesModel)];
  }
}
