// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {type AffectedElement, Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Title for autofill documentation page.
   */
  howDoesAutofillWorkPageTitle: 'How does autofill work?',

  /**
   * @description Title for label form elements usage example page.
   */
  labelFormlementsPageTitle: 'The label elements',

  /**
   * @description Title for input form elements usage example page.
   */
  inputFormElementPageTitle: 'The form input element',

  /**
   * @description Title for autocomplete attribute documentation page.
   */
  autocompleteAttributePageTitle: 'HTML attribute: autocomplete',

  /**
   * @description Title for CORB explainer.
   */
  corbExplainerPageTitle: 'CORB explainer',

  /**
   * @description Title for history intervention documentation page.
   */
  historyManipulationInterventionPageTitle: 'History manipulation intervention explainer',

  /**
   * @description Title for back-to-ad intervention documentation page.
   */
  backToAdInterventionPageTitle: 'Back-to-ad intervention explainer',
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

  override elements(): Iterable<AffectedElement> {
    const details = this.details();
    if (details.violatingNodeId) {
      return [{
        backendNodeId: details.violatingNodeId,
        nodeName: '',
        target: this.model()?.target() ?? null,
      }];
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

export const genericFormLabelForNameError: LazyMarkdownIssueDescription = {
  file: 'genericFormLabelForNameError.md',
  links: [{
    link: 'https://html.spec.whatwg.org/multipage/forms.html#attr-label-for',
    // Since the link points to a page with the same title, the 'HTML Standard'
    // string doesn't need to be translated.
    linkTitle: i18n.i18n.lockedLazyString('HTML Standard'),
  }],
};

export const genericFormInputWithNoLabelError: LazyMarkdownIssueDescription = {
  file: 'genericFormInputWithNoLabelError.md',
  links: [],
};

export const genericFormAutocompleteAttributeEmptyError: LazyMarkdownIssueDescription = {
  file: 'genericFormAutocompleteAttributeEmptyError.md',
  links: [],
};

export const genericFormDuplicateIdForInputError: LazyMarkdownIssueDescription = {
  file: 'genericFormDuplicateIdForInputError.md',
  links: [{
    link: 'https://web.dev/learn/forms/autofill/#how-does-autofill-work',
    linkTitle: i18nLazyString(UIStrings.howDoesAutofillWorkPageTitle),
  }],
};

export const genericFormAriaLabelledByToNonExistingIdError: LazyMarkdownIssueDescription = {
  file: 'genericFormAriaLabelledByToNonExistingIdError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericFormEmptyIdAndNameAttributesForInputError: LazyMarkdownIssueDescription = {
  file: 'genericFormEmptyIdAndNameAttributesForInputError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input',
    linkTitle: i18nLazyString(UIStrings.inputFormElementPageTitle),
  }],
};

export const genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError: LazyMarkdownIssueDescription = {
  file: 'genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values',
    linkTitle: i18nLazyString(UIStrings.autocompleteAttributePageTitle),
  }],
};

export const genericFormInputHasWrongButWellIntendedAutocompleteValue: LazyMarkdownIssueDescription = {
  file: 'genericFormInputHasWrongButWellIntendedAutocompleteValueError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values',
    linkTitle: i18nLazyString(UIStrings.autocompleteAttributePageTitle),
  }],
};

export const genericFormLabelForMatchesNonExistingIdError: LazyMarkdownIssueDescription = {
  file: 'genericFormLabelForMatchesNonExistingIdError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericFormLabelHasNeitherForNorNestedInputError: LazyMarkdownIssueDescription = {
  file: 'genericFormLabelHasNeitherForNorNestedInputError.md',
  links: [{
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label',
    linkTitle: i18nLazyString(UIStrings.labelFormlementsPageTitle),
  }],
};

export const genericResponseWasBlockedbyORB: LazyMarkdownIssueDescription = {
  file: 'genericResponseWasBlockedByORB.md',
  links: [{
    link: 'https://www.chromium.org/Home/chromium-security/corb-for-developers/',
    linkTitle: i18nLazyString(UIStrings.corbExplainerPageTitle),
  }],
};

export const genericNavigationEntryMarkedSkippable: LazyMarkdownIssueDescription = {
  file: 'genericNavigationEntryMarkedSkippable.md',
  links: [{
    link: 'https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md',
    linkTitle: i18nLazyString(UIStrings.historyManipulationInterventionPageTitle),
  }],
};

export const genericBackUINavigationWouldSkipAd: LazyMarkdownIssueDescription = {
  file: 'genericBackUINavigationWouldSkipAd.md',
  links: [{
    link: 'https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md',
    linkTitle: i18nLazyString(UIStrings.backToAdInterventionPageTitle),
  }],
};

export const genericFormModelContextMissingToolName: LazyMarkdownIssueDescription = {
  file: 'genericFormModelContextMissingToolName.md',
  links: [],
};

export const genericFormModelContextMissingToolDescription: LazyMarkdownIssueDescription = {
  file: 'genericFormModelContextMissingToolDescription.md',
  links: [],
};

export const genericFormModelContextParameterMissingTitleAndDescription: LazyMarkdownIssueDescription = {
  file: 'genericFormModelContextParameterMissingTitleAndDescription.md',
  links: [],
};

export const genericFormModelContextRequiredParameterMissingName: LazyMarkdownIssueDescription = {
  file: 'genericFormModelContextRequiredParameterMissingName.md',
  links: [],
};

export const genericFormModelContextParameterMissingName: LazyMarkdownIssueDescription = {
  file: 'genericFormModelContextParameterMissingName.md',
  links: [],
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
    genericFormAriaLabelledByToNonExistingIdError,
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
  [
    Protocol.Audits.GenericIssueErrorType.BackUINavigationWouldSkipAd,
    genericBackUINavigationWouldSkipAd,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormModelContextMissingToolName,
    genericFormModelContextMissingToolName,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormModelContextMissingToolDescription,
    genericFormModelContextMissingToolDescription,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormModelContextParameterMissingTitleAndDescription,
    genericFormModelContextParameterMissingTitleAndDescription,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormModelContextRequiredParameterMissingName,
    genericFormModelContextRequiredParameterMissingName,
  ],
  [
    Protocol.Audits.GenericIssueErrorType.FormModelContextParameterMissingName,
    genericFormModelContextParameterMissingName,
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
  [Protocol.Audits.GenericIssueErrorType.FormModelContextMissingToolName, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormModelContextMissingToolDescription, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormModelContextParameterMissingTitleAndDescription, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormModelContextRequiredParameterMissingName, IssueKind.PAGE_ERROR],
  [Protocol.Audits.GenericIssueErrorType.FormModelContextParameterMissingName, IssueKind.PAGE_ERROR],
]);
