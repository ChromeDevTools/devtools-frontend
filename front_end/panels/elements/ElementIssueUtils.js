// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
const UIStrings = {
    /**
     * @description Tooltip text shown in the Elements panel when a label element has an incorrect for attribute.
     */
    formLabelForNameError: 'Incorrect use of <label for=FORM_ELEMENT>',
    /**
     * @description Tooltip text shown in the Elements panel when a form field has a duplicate ID.
     */
    formDuplicateIdForInputError: 'Duplicate form field ID in the same form',
    /**
     * @description Tooltip text shown in the Elements panel when a form field has no label or aria-labelledby attribute.
     */
    formInputWithNoLabelError: 'Form field without valid aria-labelledby attribute or associated label',
    /**
     * @description Tooltip text shown in the Elements panel when an autocomplete attribute is empty or incorrect.
     */
    formAutocompleteAttributeEmptyError: 'Incorrect use of autocomplete attribute',
    /**
     * @description Tooltip text shown in the Elements panel when a form field lacks both ID and name attributes.
     */
    formEmptyIdAndNameAttributesForInputError: 'A form field element should have an ID or name attribute',
    /**
     * @description Tooltip text shown in the Elements panel when an aria-labelledby attribute references a non-existent element ID.
     */
    formAriaLabelledByToNonExistingId: 'An aria-labelledby attribute doesn’t match any element ID',
    /**
     * @description Tooltip text shown in the Elements panel when an element lacks an autocomplete attribute.
     */
    formInputAssignedAutocompleteValueToIdOrNameAttributeError: 'An element doesn’t have an autocomplete attribute',
    /**
     * @description Tooltip text shown in the Elements panel when a label is not associated with any form field.
     */
    formLabelHasNeitherForNorNestedInput: 'No label associated with a form field',
    /**
     * @description Tooltip text shown in the Elements panel when a label's for attribute references a non-existent element ID.
     */
    formLabelForMatchesNonExistingIdError: 'Incorrect use of <label for=FORM_ELEMENT>',
    /**
     * @description Tooltip text shown in the Elements panel when a form field uses a non-standard autocomplete value.
     */
    formInputHasWrongButWellIntendedAutocompleteValueError: 'Non-standard autocomplete attribute value',
    /**
     * @description Tooltip text shown in the Elements panel when an invalid element or text node is inside a select element.
     */
    disallowedSelectChild: 'Invalid element or text node within <select>',
    /**
     * @description Tooltip text shown in the Elements panel when an invalid element or text node is inside an optgroup element.
     */
    disallowedOptGroupChild: 'Invalid element or text node within <optgroup>',
    /**
     * @description Tooltip text shown in the Elements panel when non-phrasing content is used inside an option element.
     */
    nonPhrasingContentOptionChild: 'Non-phrasing content used within an <option> element',
    /**
     * @description Tooltip text shown in the Elements panel when an interactive element is inside an option element.
     */
    interactiveContentOptionChild: 'Interactive element inside of an <option> element',
    /**
     * @description Tooltip text shown in the Elements panel when an interactive element is inside a legend element.
     */
    interactiveContentLegendChild: 'Interactive element inside of a <legend> element',
    /**
     * @description Tooltip text shown in the Elements panel when an element with invalid attributes is inside a select element.
     */
    interactiveContentAttributesSelectDescendant: 'Element with invalid attributes within a <select> element',
    /**
     * @description Tooltip text shown in the Elements panel when an interactive element is inside a summary element.
     */
    interactiveContentSummaryDescendant: 'Interactive element inside of a <summary> element',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementIssueUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function getElementIssueDetails(issue) {
    if (issue instanceof IssuesManager.GenericIssue.GenericIssue) {
        const issueDetails = issue.details();
        return {
            tooltip: getTooltipFromGenericIssue(issueDetails.errorType),
            nodeId: issueDetails.violatingNodeId,
            attribute: issueDetails.violatingNodeAttribute,
        };
    }
    if (issue instanceof IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue) {
        const issueDetails = issue.details();
        if (issue.isInteractiveContentAttributesSelectDescendantIssue()) {
            return {
                tooltip: i18nString(UIStrings.interactiveContentAttributesSelectDescendant),
                nodeId: issueDetails.nodeId,
            };
        }
        return {
            tooltip: getTooltipFromElementAccessibilityIssue(issueDetails.elementAccessibilityIssueReason),
            nodeId: issueDetails.nodeId,
        };
    }
    return undefined;
}
function getTooltipFromGenericIssue(errorType) {
    switch (errorType) {
        case "FormLabelForNameError" /* Protocol.Audits.GenericIssueErrorType.FormLabelForNameError */:
            return i18nString(UIStrings.formLabelForNameError);
        case "FormDuplicateIdForInputError" /* Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError */:
            return i18nString(UIStrings.formDuplicateIdForInputError);
        case "FormInputWithNoLabelError" /* Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError */:
            return i18nString(UIStrings.formInputWithNoLabelError);
        case "FormAutocompleteAttributeEmptyError" /* Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError */:
            return i18nString(UIStrings.formAutocompleteAttributeEmptyError);
        case "FormEmptyIdAndNameAttributesForInputError" /* Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError */:
            return i18nString(UIStrings.formEmptyIdAndNameAttributesForInputError);
        case "FormAriaLabelledByToNonExistingIdError" /* Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingIdError */:
            return i18nString(UIStrings.formAriaLabelledByToNonExistingId);
        case "FormInputAssignedAutocompleteValueToIdOrNameAttributeError" /* Protocol.Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError */:
            return i18nString(UIStrings.formInputAssignedAutocompleteValueToIdOrNameAttributeError);
        case "FormLabelHasNeitherForNorNestedInputError" /* Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInputError */:
            return i18nString(UIStrings.formLabelHasNeitherForNorNestedInput);
        case "FormLabelForMatchesNonExistingIdError" /* Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError */:
            return i18nString(UIStrings.formLabelForMatchesNonExistingIdError);
        case "FormInputHasWrongButWellIntendedAutocompleteValueError" /* Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError */:
            return i18nString(UIStrings.formInputHasWrongButWellIntendedAutocompleteValueError);
        default:
            return '';
    }
}
function getTooltipFromElementAccessibilityIssue(reason) {
    switch (reason) {
        case "DisallowedSelectChild" /* Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild */:
            return i18nString(UIStrings.disallowedSelectChild);
        case "DisallowedOptGroupChild" /* Protocol.Audits.ElementAccessibilityIssueReason.DisallowedOptGroupChild */:
            return i18nString(UIStrings.disallowedOptGroupChild);
        case "NonPhrasingContentOptionChild" /* Protocol.Audits.ElementAccessibilityIssueReason.NonPhrasingContentOptionChild */:
            return i18nString(UIStrings.nonPhrasingContentOptionChild);
        case "InteractiveContentOptionChild" /* Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild */:
            return i18nString(UIStrings.interactiveContentOptionChild);
        case "InteractiveContentLegendChild" /* Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentLegendChild */:
            return i18nString(UIStrings.interactiveContentLegendChild);
        case "InteractiveContentSummaryDescendant" /* Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant */:
            return i18nString(UIStrings.interactiveContentSummaryDescendant);
        default:
            return '';
    }
}
//# sourceMappingURL=ElementIssueUtils.js.map