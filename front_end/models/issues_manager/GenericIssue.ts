// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Title for cross-origin portal post message error
   */
  crossOriginPortalPostMessage: 'Portals - Same-origin communication channels',

  /**
   *@description title for autofill documentation page
   */
  howDoesAutofillWorkPageTitle: 'How does autofill work?',

  /**
   *@description title for label form elements usage example page
   */
  labelFormlementsPageTitle: 'The label elements',

  /**
   *@description title for input form elements usage example page
   */
  inputFormElementPageTitle: 'The form input element',

  /**
   *@description title for autocomplete attribute documentation page.
   */
  autocompleteAttributePageTitle: 'HTML attribute: autocomplete',

  /**
   * @description title for CORB explainer.
   */
  corbExplainerPageTitle: 'CORB explainer',
};

const str_ = i18n.i18n.registerUIStrings('models/issues_manager/GenericIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class GenericIssue extends Issue {
  #issueDetails: Protocol.Audits.GenericIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.GenericIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel,
      issueId?: Protocol.Audits.IssueId) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.GenericIssue,
      issueDetails.errorType,
    ].join('::');
    super(issueCode, issuesModel, issueId);
    this.#issueDetails = issueDetails;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    if (this.#issueDetails.request) {
      return [this.#issueDetails.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.Generic;
  }

  primaryKey(): string {
    const requestId = this.#issueDetails.request ? this.#issueDetails.request.requestId : 'no-request';
    return `${this.code()}-(${this.#issueDetails.frameId})-(${this.#issueDetails.violatingNodeId})-(${
        this.#issueDetails.violatingNodeAttribute})-(${requestId})`;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.errorType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  details(): Protocol.Audits.GenericIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    return issueTypes.get(this.#issueDetails.errorType) || IssueKind.Improvement;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      GenericIssue[] {
    const genericDetails = inspectorIssue.details.genericIssueDetails;
    if (!genericDetails) {
      console.warn('Generic issue without details received.');
      return [];
    }
    return [new GenericIssue(genericDetails, issuesModel, inspectorIssue.issueId)];
  }
}

export const genericCrossOriginPortalPostMessageError = {
  file: 'genericCrossOriginPortalPostMessageError.md',
  links: [{
    link: 'https://github.com/WICG/portals#same-origin-communication-channels',
    linkTitle: i18nLazyString(UIStrings.crossOriginPortalPostMessage),
  }],
};

export const genericFormLabelForNameError = {
  file: 'genericFormLabelForNameError.md',
  links: [{
    link: 'https://html.spec.whatwg.org/multipage/forms.html#attr-label-for',
    // Since the link points to a page with the same title, the 'HTML Standard'
    // string doesn't need to be translated.
    linkTitle: i18n.i18n.lockedLazyString('HTML Standard'),
  }],
};

export const genericFormInputWithNoLabelError = {
  file: 'genericFormInputWithNoLabelError.md',
  links: [],
};

export const genericFormAutocompleteAttributeEmptyError = {
  file: 'genericFormAutocompleteAttributeEmptyError.md',
  links: [],
};

export const genericFormDuplicateIdForInputError = {
  file: 'genericFormDuplicateIdForInputError.md',
  links: [{
    link: 'https://web.dev/learn/forms/autofill/#how-does-autofill-work',
    linkTitle: i18nLazyString(UIStrings.howDoesAutofillWorkPageTitle),
  }],
};

export const genericFormAriaLabelledByToNonExistingId = {
  file: 'genericFormAriaLabelledByToNonExistingId.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericFormEmptyIdAndNameAttributesForInputError = {
  file: 'genericFormEmptyIdAndNameAttributesForInputError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input',
    linkTitle: i18nLazyString(UIStrings.inputFormElementPageTitle),
  }],
};

export const genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError = {
  file: 'genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values',
    linkTitle: i18nLazyString(UIStrings.autocompleteAttributePageTitle),
  }],
};

export const genericFormInputHasWrongButWellIntendedAutocompleteValue = {
  file: 'genericFormInputHasWrongButWellIntendedAutocompleteValueError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values',
    linkTitle: i18nLazyString(UIStrings.autocompleteAttributePageTitle),
  }],
};

export const genericFormLabelForMatchesNonExistingIdError = {
  file: 'genericFormLabelForMatchesNonExistingIdError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericFormLabelHasNeitherForNorNestedInput = {
  file: 'genericFormLabelHasNeitherForNorNestedInput.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericResponseWasBlockedbyORB = {
  file: 'genericResponseWasBlockedByORB.md',
  links: [{
    link: 'https://www.chromium.org/Home/chromium-security/corb-for-developers/',
    linkTitle: i18nLazyString(UIStrings.corbExplainerPageTitle),
  }],
};

const issueDescriptions: Map<Protocol.Audits.GenericIssueErrorType, LazyMarkdownIssueDescription> = new Map([
  [Protocol.Audits.GenericIssueErrorType.CrossOriginPortalPostMessageError, genericCrossOriginPortalPostMessageError],
  [Protocol.Audits.GenericIssueErrorType.FormLabelForNameError, genericFormLabelForNameError],
  [Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError, genericFormInputWithNoLabelError],
  [
    Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError,
    genericFormAutocompleteAttributeEmptyError,
  ],
  [Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError, genericFormDuplicateIdForInputError],
  [Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingId, genericFormAriaLabelledByToNonExistingId],
  [
    Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError,
    genericFormEmptyIdAndNameAttributesForInputError,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError,
    genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError,
    genericFormLabelForMatchesNonExistingIdError,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInput,
    genericFormLabelHasNeitherForNorNestedInput,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError,
    genericFormInputHasWrongButWellIntendedAutocompleteValue,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.ResponseWasBlockedByORB,
    genericResponseWasBlockedbyORB,
  ],
]);

const issueTypes: Map<Protocol.Audits.GenericIssueErrorType, IssueKind> = new Map([
  [Protocol.Audits.GenericIssueErrorType.CrossOriginPortalPostMessageError, IssueKind.Improvement],
  [Protocol.Audits.GenericIssueErrorType.FormLabelForNameError, IssueKind.PageError],
  [Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError, IssueKind.Improvement],
  [Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError, IssueKind.PageError],
  [Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError, IssueKind.PageError],
  [Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingId, IssueKind.Improvement],
  [Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError, IssueKind.Improvement],
  [
    Protocol.Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError,
    IssueKind.Improvement,
  ],
  [Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError, IssueKind.PageError],
  [Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInput, IssueKind.Improvement],
  [Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError, IssueKind.Improvement],

]);
