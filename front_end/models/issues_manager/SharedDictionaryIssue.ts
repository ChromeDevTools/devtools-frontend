// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Title for Compression Dictionary Transport specification url link
   */
  compressionDictionaryTransport: 'Compression Dictionary Transport',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/SharedDictionaryIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export const enum IssueCode {
  UseErrorCrossOriginNoCorsRequest = 'SharedDictionaryIssue::UseErrorCrossOriginNoCorsRequest',
  UseErrorDictionaryLoadFailure = 'SharedDictionaryIssue::UseErrorDictionaryLoadFailure',
  UseErrorMatchingDictionaryNotUsed = 'SharedDictionaryIssue::UseErrorMatchingDictionaryNotUsed',
  UseErrorUnexpectedContentDictionaryHeader = 'SharedDictionaryIssue::UseErrorUnexpectedContentDictionaryHeader',
  WriteErrorCossOriginNoCorsRequest = 'SharedDictionaryIssue::WriteErrorCossOriginNoCorsRequest',
  WriteErrorDisallowedBySettings = 'SharedDictionaryIssue::WriteErrorDisallowedBySettings',
  WriteErrorExpiredResponse = 'SharedDictionaryIssue::WriteErrorExpiredResponse',
  WriteErrorFeatureDisabled = 'SharedDictionaryIssue::WriteErrorFeatureDisabled',
  WriteErrorInsufficientResources = 'SharedDictionaryIssue::WriteErrorInsufficientResources',
  WriteErrorInvalidMatchField = 'SharedDictionaryIssue::WriteErrorInvalidMatchField',
  WriteErrorInvalidStructuredHeader = 'SharedDictionaryIssue::WriteErrorInvalidStructuredHeader',
  WriteErrorNavigationRequest = 'SharedDictionaryIssue::WriteErrorNavigationRequest',
  WriteErrorNoMatchField = 'SharedDictionaryIssue::WriteErrorNoMatchField',
  WriteErrorNonListMatchDestField = 'SharedDictionaryIssue::WriteErrorNonListMatchDestField',
  WriteErrorNonSecureContext = 'SharedDictionaryIssue::WriteErrorNonSecureContext',
  WriteErrorNonStringIdField = 'SharedDictionaryIssue::WriteErrorNonStringIdField',
  WriteErrorNonStringInMatchDestList = 'SharedDictionaryIssue::WriteErrorNonStringInMatchDestList',
  WriteErrorNonStringMatchField = 'SharedDictionaryIssue::WriteErrorNonStringMatchField',
  WriteErrorNonTokenTypeField = 'SharedDictionaryIssue::WriteErrorNonTokenTypeField',
  WriteErrorRequestAborted = 'SharedDictionaryIssue::WriteErrorRequestAborted',
  WriteErrorShuttingDown = 'SharedDictionaryIssue::WriteErrorShuttingDown',
  WriteErrorTooLongIdField = 'SharedDictionaryIssue::WriteErrorTooLongIdField',
  WriteErrorUnsupportedType = 'SharedDictionaryIssue::WriteErrorUnsupportedType',
  Unknown = 'SharedDictionaryIssue::WriteErrorUnknown',
}

function getIssueCode(details: Protocol.Audits.SharedDictionaryIssueDetails): IssueCode {
  switch (details.sharedDictionaryError) {
    case Protocol.Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest:
      return IssueCode.UseErrorCrossOriginNoCorsRequest;
    case Protocol.Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure:
      return IssueCode.UseErrorDictionaryLoadFailure;
    case Protocol.Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed:
      return IssueCode.UseErrorMatchingDictionaryNotUsed;
    case Protocol.Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader:
      return IssueCode.UseErrorUnexpectedContentDictionaryHeader;
    case Protocol.Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest:
      return IssueCode.WriteErrorCossOriginNoCorsRequest;
    case Protocol.Audits.SharedDictionaryError.WriteErrorDisallowedBySettings:
      return IssueCode.WriteErrorDisallowedBySettings;
    case Protocol.Audits.SharedDictionaryError.WriteErrorExpiredResponse:
      return IssueCode.WriteErrorExpiredResponse;
    case Protocol.Audits.SharedDictionaryError.WriteErrorFeatureDisabled:
      return IssueCode.WriteErrorFeatureDisabled;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInsufficientResources:
      return IssueCode.WriteErrorInsufficientResources;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInvalidMatchField:
      return IssueCode.WriteErrorInvalidMatchField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader:
      return IssueCode.WriteErrorInvalidStructuredHeader;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNavigationRequest:
      return IssueCode.WriteErrorNavigationRequest;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNoMatchField:
      return IssueCode.WriteErrorNoMatchField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonListMatchDestField:
      return IssueCode.WriteErrorNonListMatchDestField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonSecureContext:
      return IssueCode.WriteErrorNonSecureContext;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringIdField:
      return IssueCode.WriteErrorNonStringIdField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList:
      return IssueCode.WriteErrorNonStringInMatchDestList;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringMatchField:
      return IssueCode.WriteErrorNonStringMatchField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonTokenTypeField:
      return IssueCode.WriteErrorNonTokenTypeField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorRequestAborted:
      return IssueCode.WriteErrorRequestAborted;
    case Protocol.Audits.SharedDictionaryError.WriteErrorShuttingDown:
      return IssueCode.WriteErrorShuttingDown;
    case Protocol.Audits.SharedDictionaryError.WriteErrorTooLongIdField:
      return IssueCode.WriteErrorTooLongIdField;
    case Protocol.Audits.SharedDictionaryError.WriteErrorUnsupportedType:
      return IssueCode.WriteErrorUnsupportedType;
    default:
      return IssueCode.Unknown;
  }
}

export class SharedDictionaryIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.SharedDictionaryIssueDetails;

  constructor(issueDetails: Protocol.Audits.SharedDictionaryIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          code: getIssueCode(issueDetails),
          umaCode: [
            Protocol.Audits.InspectorIssueCode.SharedDictionaryIssue,
            issueDetails.sharedDictionaryError,
          ].join('::'),
        },
        issuesModel);
    this.#issueDetails = issueDetails;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    if (this.#issueDetails.request) {
      return [this.#issueDetails.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.SharedDictionaryIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.sharedDictionaryError);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      SharedDictionaryIssue[] {
    const details = inspectorIssue.details.sharedDictionaryIssueDetails;
    if (!details) {
      console.warn('Shared Dictionary issue without details received.');
      return [];
    }
    return [new SharedDictionaryIssue(details, issuesModel)];
  }
}
const specLinks = [{
  link: 'https://datatracker.ietf.org/doc/draft-ietf-httpbis-compression-dictionary/',
  linkTitle: i18nLazyString(UIStrings.compressionDictionaryTransport),
}];

const issueDescriptions: Map<Protocol.Audits.SharedDictionaryError, LazyMarkdownIssueDescription> = new Map([

  [
    Protocol.Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest,
    {
      file: 'sharedDictionaryUseErrorCrossOriginNoCorsRequest.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure,
    {
      file: 'sharedDictionaryUseErrorDictionaryLoadFailure.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed,
    {
      file: 'sharedDictionaryUseErrorMatchingDictionaryNotUsed.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader,
    {
      file: 'sharedDictionaryUseErrorUnexpectedContentDictionaryHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest,
    {
      file: 'sharedDictionaryWriteErrorCossOriginNoCorsRequest.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorDisallowedBySettings,
    {
      file: 'sharedDictionaryWriteErrorDisallowedBySettings.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorExpiredResponse,
    {
      file: 'sharedDictionaryWriteErrorExpiredResponse.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorFeatureDisabled,
    {
      file: 'sharedDictionaryWriteErrorFeatureDisabled.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorInsufficientResources,
    {
      file: 'sharedDictionaryWriteErrorInsufficientResources.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorInvalidMatchField,
    {
      file: 'sharedDictionaryWriteErrorInvalidMatchField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader,
    {
      file: 'sharedDictionaryWriteErrorInvalidStructuredHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNavigationRequest,
    {
      file: 'sharedDictionaryWriteErrorNavigationRequest.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNoMatchField,
    {
      file: 'sharedDictionaryWriteErrorNoMatchField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonListMatchDestField,
    {
      file: 'sharedDictionaryWriteErrorNonListMatchDestField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonSecureContext,
    {
      file: 'sharedDictionaryWriteErrorNonSecureContext.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonStringIdField,
    {
      file: 'sharedDictionaryWriteErrorNonStringIdField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList,
    {
      file: 'sharedDictionaryWriteErrorNonStringInMatchDestList.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonStringMatchField,
    {
      file: 'sharedDictionaryWriteErrorNonStringMatchField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorNonTokenTypeField,
    {
      file: 'sharedDictionaryWriteErrorNonTokenTypeField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorRequestAborted,
    {
      file: 'sharedDictionaryWriteErrorRequestAborted.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorShuttingDown,
    {
      file: 'sharedDictionaryWriteErrorShuttingDown.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorTooLongIdField,
    {
      file: 'sharedDictionaryWriteErrorTooLongIdField.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SharedDictionaryError.WriteErrorUnsupportedType,
    {
      file: 'sharedDictionaryWriteErrorUnsupportedType.md',
      links: specLinks,
    },
  ],
]);
