// Copyright 2025 The Chromium Authors. All rights reserved.
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
   *@description Title for HTTP Message Signatures specification url
   */
  httpMessageSignatures: 'HTTP Message Signatures (RFC9421)',
  /**
   *@description Title for Signature-based Integrity specification url
   */
  signatureBasedIntegrity: 'Signature-based Integrity',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/SRIMessageSignatureIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const specLinks = [
  {
    link: 'https://www.rfc-editor.org/rfc/rfc9421.html',
    linkTitle: i18nLazyString(UIStrings.httpMessageSignatures),
  },
  {
    link: 'https://wicg.github.io/signature-based-sri/',
    linkTitle: i18nLazyString(UIStrings.signatureBasedIntegrity),
  }
];

export const enum IssueCode {
  MISSING_SIGNATURE_HEADER = 'SRIMessageSignatureIssue::MissingSignatureHeader',
  MISSING_SIGNATURE_INPUT_HEADER = 'SRIMessageSignatureIssue::MissingSignatureInputHeader',
  INVALID_SIGNATURE_HEADER = 'SRIMessageSignatureIssue::InvalidSignatureHeader',
  INVALID_SIGNATURE_INPUT_HEADER = 'SRIMessageSignatureIssue::InvalidSignatureInputHeader',
  SIGNATURE_HEADER_VALUE_IS_NOT_BYTE_SEQUENCE = 'SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence',
  SIGNATURE_HEADER_VALUE_IS_PARAMETERIZED = 'SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized',
  SIGNATURE_HEADER_VALUE_IS_INCORRECT_LENGTH = 'SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength',
  SIGNATURE_INPUT_HEADER_MISSING_LABEL = 'SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel',
  SIGNATURE_INPUT_HEADER_VALUE_NOT_INNER_LIST = 'SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList',
  SIGNATURE_INPUT_HEADER_VALUE_MISSING_COMPONENTS =
      'SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents',
  SIGNATURE_INPUT_HEADER_INVALID_COMPONENT_TYPE = 'SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType',
  SIGNATURE_INPUT_HEADER_INVALID_COMPONENT_NAME = 'SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName',
  SIGNATURE_INPUT_HEADER_INVALID_HEADER_COMPONENT_PARAMETER =
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter',
  SIGNATURE_INPUT_HEADER_INVALID_DERIVED_COMPONENT_PARAMETER =
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter',
  SIGNATURE_INPUT_HEADER_KEY_ID_LENGTH = 'SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength',
  SIGNATURE_INPUT_HEADER_INVALID_PARAMETER = 'SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter',
  SIGNATURE_INPUT_HEADER_MISSING_REQUIRED_PARAMETERS =
      'SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters',
  VALIDATION_FAILED_SIGNATURE_EXPIRED = 'SRIMessageSignatureIssue::ValidationFailedSignatureExpired',
  VALIDATION_FAILED_INVALID_LENGTH = 'SRIMessageSignatureIssue::ValidationFailedInvalidLength',
  VALIDATION_FAILED_SIGNATURE_MISMATCH = 'SRIMessageSignatureIssue::ValidationFailedSignatureMismatch',
}

function getIssueCode(details: Protocol.Audits.SRIMessageSignatureIssueDetails): IssueCode {
  switch (details.error) {
    case Protocol.Audits.SRIMessageSignatureError.MissingSignatureHeader:
      return IssueCode.MISSING_SIGNATURE_HEADER;
    case Protocol.Audits.SRIMessageSignatureError.MissingSignatureInputHeader:
      return IssueCode.MISSING_SIGNATURE_INPUT_HEADER;
    case Protocol.Audits.SRIMessageSignatureError.InvalidSignatureHeader:
      return IssueCode.INVALID_SIGNATURE_HEADER;
    case Protocol.Audits.SRIMessageSignatureError.InvalidSignatureInputHeader:
      return IssueCode.INVALID_SIGNATURE_INPUT_HEADER;
    case Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsNotByteSequence:
      return IssueCode.SIGNATURE_HEADER_VALUE_IS_NOT_BYTE_SEQUENCE;
    case Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsParameterized:
      return IssueCode.SIGNATURE_HEADER_VALUE_IS_PARAMETERIZED;
    case Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsIncorrectLength:
      return IssueCode.SIGNATURE_HEADER_VALUE_IS_INCORRECT_LENGTH;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingLabel:
      return IssueCode.SIGNATURE_INPUT_HEADER_MISSING_LABEL;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueNotInnerList:
      return IssueCode.SIGNATURE_INPUT_HEADER_VALUE_NOT_INNER_LIST;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueMissingComponents:
      return IssueCode.SIGNATURE_INPUT_HEADER_VALUE_MISSING_COMPONENTS;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentType:
      return IssueCode.SIGNATURE_INPUT_HEADER_INVALID_COMPONENT_TYPE;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentName:
      return IssueCode.SIGNATURE_INPUT_HEADER_INVALID_COMPONENT_NAME;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidHeaderComponentParameter:
      return IssueCode.SIGNATURE_INPUT_HEADER_INVALID_HEADER_COMPONENT_PARAMETER;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidDerivedComponentParameter:
      return IssueCode.SIGNATURE_INPUT_HEADER_INVALID_DERIVED_COMPONENT_PARAMETER;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderKeyIdLength:
      return IssueCode.SIGNATURE_INPUT_HEADER_KEY_ID_LENGTH;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidParameter:
      return IssueCode.SIGNATURE_INPUT_HEADER_INVALID_PARAMETER;
    case Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingRequiredParameters:
      return IssueCode.SIGNATURE_INPUT_HEADER_MISSING_REQUIRED_PARAMETERS;
    case Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureExpired:
      return IssueCode.VALIDATION_FAILED_SIGNATURE_EXPIRED;
    case Protocol.Audits.SRIMessageSignatureError.ValidationFailedInvalidLength:
      return IssueCode.VALIDATION_FAILED_INVALID_LENGTH;
    case Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureMismatch:
      return IssueCode.VALIDATION_FAILED_SIGNATURE_MISMATCH;
  }
}

export class SRIMessageSignatureIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.SRIMessageSignatureIssueDetails;

  constructor(issueDetails: Protocol.Audits.SRIMessageSignatureIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          // Append the signature base to the enum's code in order to prevent
          // distinct error details from coalescing in the issues panel.
          code: getIssueCode(issueDetails) + issueDetails.signatureBase,
          umaCode: [
            Protocol.Audits.InspectorIssueCode.SRIMessageSignatureIssue,
            issueDetails.error,
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

  details(): Protocol.Audits.SRIMessageSignatureIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.error);
    if (!description) {
      return null;
    }
    if (this.#issueDetails.signatureBase !== '') {
      description.substitutions = new Map([['PLACEHOLDER_signatureBase', () => this.#issueDetails.signatureBase]]);
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
      SRIMessageSignatureIssue[] {
    const details = inspectorIssue.details.sriMessageSignatureIssueDetails;
    if (!details) {
      console.warn('SRI Message Signature issue without details received.');
      return [];
    }
    return [new SRIMessageSignatureIssue(details, issuesModel)];
  }
}

const issueDescriptions = new Map<Protocol.Audits.SRIMessageSignatureError, LazyMarkdownIssueDescription>([
  [
    Protocol.Audits.SRIMessageSignatureError.MissingSignatureHeader,
    {
      file: 'sriMissingSignatureHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.MissingSignatureInputHeader,
    {
      file: 'sriMissingSignatureInputHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.InvalidSignatureHeader,
    {
      file: 'sriInvalidSignatureHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.InvalidSignatureInputHeader,
    {
      file: 'sriInvalidSignatureInputHeader.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsNotByteSequence,
    {
      file: 'sriSignatureHeaderValueIsNotByteSequence.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsParameterized,
    {
      file: 'sriSignatureHeaderValueIsParameterized.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureHeaderValueIsIncorrectLength,
    {
      file: 'sriSignatureHeaderValueIsIncorrectLength.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingLabel,
    {
      file: 'sriSignatureInputHeaderMissingLabel.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueNotInnerList,
    {
      file: 'sriSignatureInputHeaderValueNotInnerList.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderValueMissingComponents,
    {
      file: 'sriSignatureInputHeaderValueMissingComponents.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentType,
    {
      file: 'sriSignatureInputHeaderInvalidComponentType.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidComponentName,
    {
      file: 'sriSignatureInputHeaderInvalidComponentName.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidHeaderComponentParameter,
    {
      file: 'sriSignatureInputHeaderInvalidHeaderComponentParameter.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidDerivedComponentParameter,
    {
      file: 'sriSignatureInputHeaderInvalidDerivedComponentParameter.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderKeyIdLength,
    {
      file: 'sriSignatureInputHeaderKeyIdLength.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderInvalidParameter,
    {
      file: 'sriSignatureInputHeaderInvalidParameter.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.SignatureInputHeaderMissingRequiredParameters,
    {
      file: 'sriSignatureInputHeaderMissingRequiredParameters.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureExpired,
    {
      file: 'sriValidationFailedSignatureExpired.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.ValidationFailedInvalidLength,
    {
      file: 'sriValidationFailedInvalidLength.md',
      links: specLinks,
    },
  ],
  [
    Protocol.Audits.SRIMessageSignatureError.ValidationFailedSignatureMismatch,
    {
      file: 'sriValidationFailedSignatureMismatch.md',
      links: specLinks,
    },
  ],
]);
