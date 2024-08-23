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
  USE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST = 'SharedDictionaryIssue::UseErrorCrossOriginNoCorsRequest',
  USE_ERROR_DICTIONARY_LOAD_FAILURE = 'SharedDictionaryIssue::UseErrorDictionaryLoadFailure',
  USE_ERROR_MATCHING_DICTIONARY_NOT_USED = 'SharedDictionaryIssue::UseErrorMatchingDictionaryNotUsed',
  USE_ERROR_UNEXPECTED_CONTENT_DICTIONARY_HEADER = 'SharedDictionaryIssue::UseErrorUnexpectedContentDictionaryHeader',
  WRITE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST = 'SharedDictionaryIssue::WriteErrorCossOriginNoCorsRequest',
  WRITE_ERROR_DISALLOWED_BY_SETTINGS = 'SharedDictionaryIssue::WriteErrorDisallowedBySettings',
  WRITE_ERROR_EXPIRED_RESPONSE = 'SharedDictionaryIssue::WriteErrorExpiredResponse',
  WRITE_ERROR_FEATURE_DISABLED = 'SharedDictionaryIssue::WriteErrorFeatureDisabled',
  WRITE_ERROR_INSUFFICIENT_RESOURCES = 'SharedDictionaryIssue::WriteErrorInsufficientResources',
  WRITE_ERROR_INVALID_MATCH_FIELD = 'SharedDictionaryIssue::WriteErrorInvalidMatchField',
  WRITE_ERROR_INVALID_STRUCTURED_HEADER = 'SharedDictionaryIssue::WriteErrorInvalidStructuredHeader',
  WRITE_ERROR_NAVIGATION_REQUEST = 'SharedDictionaryIssue::WriteErrorNavigationRequest',
  WRITE_ERROR_NO_MATCH_FIELD = 'SharedDictionaryIssue::WriteErrorNoMatchField',
  WRITE_ERROR_NON_LIST_MATCH_DEST_FIELD = 'SharedDictionaryIssue::WriteErrorNonListMatchDestField',
  WRITE_ERROR_NON_SECURE_CONTEXT = 'SharedDictionaryIssue::WriteErrorNonSecureContext',
  WRITE_ERROR_NON_STRING_ID_FIELD = 'SharedDictionaryIssue::WriteErrorNonStringIdField',
  WRITE_ERROR_NON_STRING_IN_MATCH_DEST_LIST = 'SharedDictionaryIssue::WriteErrorNonStringInMatchDestList',
  WRITE_ERROR_NON_STRING_MATCH_FIELD = 'SharedDictionaryIssue::WriteErrorNonStringMatchField',
  WRITE_ERROR_NON_TOKEN_TYPE_FIELD = 'SharedDictionaryIssue::WriteErrorNonTokenTypeField',
  WRITE_ERROR_REQUEST_ABORTED = 'SharedDictionaryIssue::WriteErrorRequestAborted',
  WRITE_ERROR_SHUTTING_DOWN = 'SharedDictionaryIssue::WriteErrorShuttingDown',
  WRITE_ERROR_TOO_LONG_ID_FIELD = 'SharedDictionaryIssue::WriteErrorTooLongIdField',
  WRITE_ERROR_UNSUPPORTED_TYPE = 'SharedDictionaryIssue::WriteErrorUnsupportedType',
  UNKNOWN = 'SharedDictionaryIssue::WriteErrorUnknown',
}

function getIssueCode(details: Protocol.Audits.SharedDictionaryIssueDetails): IssueCode {
  switch (details.sharedDictionaryError) {
    case Protocol.Audits.SharedDictionaryError.UseErrorCrossOriginNoCorsRequest:
      return IssueCode.USE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST;
    case Protocol.Audits.SharedDictionaryError.UseErrorDictionaryLoadFailure:
      return IssueCode.USE_ERROR_DICTIONARY_LOAD_FAILURE;
    case Protocol.Audits.SharedDictionaryError.UseErrorMatchingDictionaryNotUsed:
      return IssueCode.USE_ERROR_MATCHING_DICTIONARY_NOT_USED;
    case Protocol.Audits.SharedDictionaryError.UseErrorUnexpectedContentDictionaryHeader:
      return IssueCode.USE_ERROR_UNEXPECTED_CONTENT_DICTIONARY_HEADER;
    case Protocol.Audits.SharedDictionaryError.WriteErrorCossOriginNoCorsRequest:
      return IssueCode.WRITE_ERROR_CROSS_ORIGIN_NO_CORS_REQUEST;
    case Protocol.Audits.SharedDictionaryError.WriteErrorDisallowedBySettings:
      return IssueCode.WRITE_ERROR_DISALLOWED_BY_SETTINGS;
    case Protocol.Audits.SharedDictionaryError.WriteErrorExpiredResponse:
      return IssueCode.WRITE_ERROR_EXPIRED_RESPONSE;
    case Protocol.Audits.SharedDictionaryError.WriteErrorFeatureDisabled:
      return IssueCode.WRITE_ERROR_FEATURE_DISABLED;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInsufficientResources:
      return IssueCode.WRITE_ERROR_INSUFFICIENT_RESOURCES;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInvalidMatchField:
      return IssueCode.WRITE_ERROR_INVALID_MATCH_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorInvalidStructuredHeader:
      return IssueCode.WRITE_ERROR_INVALID_STRUCTURED_HEADER;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNavigationRequest:
      return IssueCode.WRITE_ERROR_NAVIGATION_REQUEST;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNoMatchField:
      return IssueCode.WRITE_ERROR_NO_MATCH_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonListMatchDestField:
      return IssueCode.WRITE_ERROR_NON_LIST_MATCH_DEST_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonSecureContext:
      return IssueCode.WRITE_ERROR_NON_SECURE_CONTEXT;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringIdField:
      return IssueCode.WRITE_ERROR_NON_STRING_ID_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringInMatchDestList:
      return IssueCode.WRITE_ERROR_NON_STRING_IN_MATCH_DEST_LIST;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonStringMatchField:
      return IssueCode.WRITE_ERROR_NON_STRING_MATCH_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorNonTokenTypeField:
      return IssueCode.WRITE_ERROR_NON_TOKEN_TYPE_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorRequestAborted:
      return IssueCode.WRITE_ERROR_REQUEST_ABORTED;
    case Protocol.Audits.SharedDictionaryError.WriteErrorShuttingDown:
      return IssueCode.WRITE_ERROR_SHUTTING_DOWN;
    case Protocol.Audits.SharedDictionaryError.WriteErrorTooLongIdField:
      return IssueCode.WRITE_ERROR_TOO_LONG_ID_FIELD;
    case Protocol.Audits.SharedDictionaryError.WriteErrorUnsupportedType:
      return IssueCode.WRITE_ERROR_UNSUPPORTED_TYPE;
    default:
      return IssueCode.UNKNOWN;
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
    return IssueCategory.OTHER;
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
    return IssueKind.PAGE_ERROR;
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
