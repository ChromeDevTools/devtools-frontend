// Copyright 2021 The Chromium Authors
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
   * @description title for autofill documentation page
   */
  howDoesAutofillWorkPageTitle: 'How does autofill work?',

  /**
   * @description title for label form elements usage example page
   */
  labelFormlementsPageTitle: 'The label elements',

  /**
   * @description title for input form elements usage example page
   */
  inputFormElementPageTitle: 'The form input element',

  /**
   * @description title for autocomplete attribute documentation page.
   */
  autocompleteAttributePageTitle: 'HTML attribute: autocomplete',

  /**
   * @description title for CORB explainer.
   */
  corbExplainerPageTitle: 'CORB explainer',

  /**
   * @description title for history intervention documentation page.
   */
  historyManipulationInterventionPageTitle: 'History manipulation intervention explainer'
} as const;

const str_ = i18n.i18n.registerUIStrings('models/issues_manager/GenericIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class GenericIssue extends Issue<Protocol.Audits.GenericIssueDetails> {
  constructor(
      issueDetails: Protocol.Audits.GenericIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null,
      issueId?: Protocol.Audits.IssueId) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.GenericIssue,
      issueDetails.errorType,
    ].join('::');
    super(issueCode, issueDetails, issuesModel, issueId);
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.GENERIC;
  }

  primaryKey(): string {
    const details = this.details();
    const requestId = details.request ? details.request.requestId : 'no-request';
    return `${this.code()}-(${details.frameId})-(${details.violatingNodeId})-(${details.violatingNodeAttribute})-(${
        requestId})`;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.details().errorType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  getKind(): IssueKind {
    return issueTypes.get(this.details().errorType) || IssueKind.IMPROVEMENT;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null, inspectorIssue: Protocol.Audits.InspectorIssue): GenericIssue[] {
    const genericDetails = inspectorIssue.details.genericIssueDetails;
    if (!genericDetails) {
      console.warn('Generic issue without details received.');
      return [];
    }
    return [new GenericIssue(genericDetails, issuesModel, inspectorIssue.issueId)];
  }
}

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

export const genericFormAriaLabelledByToNonExistingIdError = {
  file: 'genericFormAriaLabelledByToNonExistingIdError.md',
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

export const genericFormLabelHasNeitherForNorNestedInputError = {
  file: 'genericFormLabelHasNeitherForNorNestedInputError.md',
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

export const genericNavigationEntryMarkedSkippable = {
  file: 'genericNavigationEntryMarkedSkippable.md',
  links: [{
    link: 'https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md',
    linkTitle: i18nLazyString(UIStrings.historyManipulationInterventionPageTitle),
  }],
};

const issueDescriptions = new Map<Protocol.Audits.GenericIssueErrorType, LazyMarkdownIssueDescription>([
  [Protocol.Audits.GenericIssueErrorType.FormLabelForNameError, genericFormLabelForNameError],
  [Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError, genericFormInputWithNoLabelError],
  [
    Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError,
    genericFormAutocompleteAttributeEmptyError,
  ],
  [Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError, genericFormDuplicateIdForInputError],
  [
    Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingIdError,
    genericFormAriaLabelledByToNonExistingIdError
  ],
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
    Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInputError,
    genericFormLabelHasNeitherForNorNestedInputError,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError,
    genericFormInputHasWrongButWellIntendedAutocompleteValue,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.ResponseWasBlockedByORB,
    genericResponseWasBlockedbyORB,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.NavigationEntryMarkedSkippable,
    genericNavigationEntryMarkedSkippable,
  ],
]);

const issueTypes = new Map<Protocol.Audits.GenericIssueErrorType, IssueKind>([
  [Protocol.Audits.GenericIssueErrorType.FormLabelForNameError, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError, IssueKind.IMPROVEMENT],
  [Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingIdError, IssueKind.IMPROVEMENT],
  [Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError, IssueKind.IMPROVEMENT],
  [
    Protocol.Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError,
    IssueKind.IMPROVEMENT,
  ],
  [Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInputError, IssueKind.IMPROVEMENT],
  [Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError, IssueKind.IMPROVEMENT],

]);
