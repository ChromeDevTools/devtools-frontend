// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Text to indicate something is not enabled
  */
  disabled: 'Disabled',
  /**
  *@description Tooltip text that appears when hovering over the 'Disabled' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifTrueThisElementCurrentlyCannot: 'If true, this element currently cannot be interacted with.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  invalidUserEntry: 'Invalid user entry',
  /**
  *@description Tooltip text that appears when hovering over the 'Invalid user entry' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifTrueThisElementsUserentered:
      'If true, this element\'s user-entered value does not conform to validation requirement.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  editable: 'Editable',
  /**
  *@description Tooltip text that appears when hovering over the 'Editable' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifAndHowThisElementCanBeEdited: 'If and how this element can be edited.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  focusable: 'Focusable',
  /**
  *@description Tooltip text that appears when hovering over the 'Focusable' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifTrueThisElementCanReceiveFocus: 'If true, this element can receive focus.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  focused: 'Focused',
  /**
  *@description Tooltip text that appears when hovering over the 'Focused' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifTrueThisElementCurrentlyHas: 'If true, this element currently has focus.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  canSetValue: 'Can set value',
  /**
  *@description Tooltip text that appears when hovering over the 'Can set value' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherTheValueOfThisElementCan: 'Whether the value of this element can be set.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  liveRegion: 'Live region',
  /**
  *@description Tooltip text that appears when hovering over the 'Live region' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherAndWhatPriorityOfLive: 'Whether and what priority of live updates may be expected for this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  atomicLiveRegions: 'Atomic (live regions)',
  /**
  *@description Tooltip text that appears when hovering over the 'Atomic (live regions)' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifThisElementMayReceiveLive:
      'If this element may receive live updates, whether the entire live region should be presented to the user on changes, or only changed nodes.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  relevantLiveRegions: 'Relevant (live regions)',
  /**
  *@description Tooltip text that appears when hovering over the 'Relevant (live regions)' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifThisElementMayReceiveLiveUpdates:
      'If this element may receive live updates, what type of updates should trigger a notification.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  busyLiveRegions: 'Busy (live regions)',
  /**
  *@description Tooltip text that appears when hovering over the 'Busy (live regions)' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisElementOrItsSubtree:
      'Whether this element or its subtree are currently being updated (and thus may be in an inconsistent state).',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  liveRegionRoot: 'Live region root',
  /**
  *@description Tooltip text that appears when hovering over the 'Live region root' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifThisElementMayReceiveLiveUpdatesThe:
      'If this element may receive live updates, the root element of the containing live region.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  hasAutocomplete: 'Has autocomplete',
  /**
  *@description Tooltip text that appears when hovering over the 'Has autocomplete' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherAndWhatTypeOfAutocomplete:
      'Whether and what type of autocomplete suggestions are currently provided by this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  hasPopup: 'Has popup',
  /**
  *@description Tooltip text that appears when hovering over the 'Has popup' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisElementHasCausedSome: 'Whether this element has caused some kind of pop-up (such as a menu) to appear.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  level: 'Level',
  /**
  *@description Tooltip text that appears when hovering over the 'Level' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theHierarchicalLevelOfThis: 'The hierarchical level of this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  multiselectable: 'Multi-selectable',
  /**
  *@description Tooltip text that appears when hovering over the 'Multi-selectable' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherAUserMaySelectMoreThanOne: 'Whether a user may select more than one option from this widget.',
  /**
  *@description Text for the orientation of something
  */
  orientation: 'Orientation',
  /**
  *@description Tooltip text that appears when hovering over the 'Orientation' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisLinearElements: 'Whether this linear element\'s orientation is horizontal or vertical.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  multiline: 'Multi-line',
  /**
  *@description Tooltip text that appears when hovering over the 'Multi-line' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisTextBoxMayHaveMore: 'Whether this text box may have more than one line.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  readonlyString: 'Read-only',
  /**
  *@description Tooltip text that appears when hovering over the 'Read-only' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ifTrueThisElementMayBeInteracted: 'If true, this element may be interacted with, but its value cannot be changed.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  requiredString: 'Required',
  /**
  *@description Tooltip text that appears when hovering over the 'Required' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisElementIsARequired: 'Whether this element is a required field in a form.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  minimumValue: 'Minimum value',
  /**
  *@description Tooltip text that appears when hovering over the 'Minimum value' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  forARangeWidgetTheMinimumAllowed: 'For a range widget, the minimum allowed value.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  maximumValue: 'Maximum value',
  /**
  *@description Tooltip text that appears when hovering over the 'Maximum value' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  forARangeWidgetTheMaximumAllowed: 'For a range widget, the maximum allowed value.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueDescription: 'Value description',
  /**
  *@description Tooltip text that appears when hovering over the 'Value description' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  aHumanreadableVersionOfTheValue: 'A human-readable version of the value of a range widget (where necessary).',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  checked: 'Checked',
  /**
  *@description Tooltip text that appears when hovering over the 'Checked' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisCheckboxRadioButtonOr:
      'Whether this checkbox, radio button or tree item is checked, unchecked, or mixed (e.g. has both checked and un-checked children).',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  expanded: 'Expanded',
  /**
  *@description Tooltip text that appears when hovering over the 'Expanded' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisElementOrAnother: 'Whether this element, or another grouping element it controls, is expanded.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  pressed: 'Pressed',
  /**
  *@description Tooltip text that appears when hovering over the 'Pressed' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherThisToggleButtonIs: 'Whether this toggle button is currently in a pressed state.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  selectedString: 'Selected',
  /**
  *@description Tooltip text that appears when hovering over the 'Selected' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  whetherTheOptionRepresentedBy: 'Whether the option represented by this element is currently selected.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  activeDescendant: 'Active descendant',
  /**
  *@description Tooltip text that appears when hovering over the 'Active descendant' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theDescendantOfThisElementWhich:
      'The descendant of this element which is active; i.e. the element to which focus should be delegated.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  flowsTo: 'Flows to',
  /**
  *@description Tooltip text that appears when hovering over the 'Flows to' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  elementToWhichTheUserMayChooseTo:
      'Element to which the user may choose to navigate after this one, instead of the next element in the DOM order.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  controls: 'Controls',
  /**
  *@description Tooltip text that appears when hovering over the 'Controls' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  elementOrElementsWhoseContentOr: 'Element or elements whose content or presence is/are controlled by this widget.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  describedBy: 'Described by',
  /**
  *@description Tooltip text that appears when hovering over the 'Described by' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  elementOrElementsWhichFormThe: 'Element or elements which form the description of this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  labeledBy: 'Labeled by',
  /**
  *@description Tooltip text that appears when hovering over the 'Labeled by' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  elementOrElementsWhichMayFormThe: 'Element or elements which may form the name of this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  ownsText: 'Owns',
  /**
  *@description Tooltip text that appears when hovering over the 'Owns' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  elementOrElementsWhichShouldBe:
      'Element or elements which should be considered descendants of this element, despite not being descendants in the DOM.',
  /**
  *@description Text for the name of something
  */
  nameString: 'Name',
  /**
  *@description Tooltip text that appears when hovering over the 'Name' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theComputedNameOfThisElement: 'The computed name of this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  role: 'Role',
  /**
  *@description Tooltip text that appears when hovering over the 'Role' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  indicatesThePurposeOfThisElement:
      'Indicates the purpose of this element, such as a user interface idiom for a widget, or structural role within a document.',
  /**
  *@description Text for the value of something
  */
  value: 'Value',
  /**
  *@description Tooltip text that appears when hovering over the 'Value' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theValueOfThisElementThisMayBe:
      'The value of this element; this may be user-provided or developer-provided, depending on the element.',
  /**
  *@description Text for the viewing the help options
  */
  help: 'Help',
  /**
  *@description Tooltip text that appears when hovering over the 'Help' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theComputedHelpTextForThis: 'The computed help text for this element.',
  /**
  *@description Text for the description of something
  */
  description: 'Description',
  /**
  *@description Tooltip text that appears when hovering over the 'Description' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  theAccessibleDescriptionForThis: 'The accessible description for this element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromAttribute: 'From attribute',
  /**
  *@description Tooltip text that appears when hovering over the 'From attribute' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromAttribute: 'Value from attribute.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  implicit: 'Implicit',
  /**
  *@description Tooltip text that appears when hovering over the 'Implicit' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  implicitValue: 'Implicit value.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromStyle: 'From style',
  /**
  *@description Tooltip text that appears when hovering over the 'From style' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromStyle: 'Value from style.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  contents: 'Contents',
  /**
  *@description Tooltip text that appears when hovering over the 'Contents' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromElementContents: 'Value from element contents.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromPlaceholderAttribute: 'From placeholder attribute',
  /**
  *@description Tooltip text that appears when hovering over the 'From placeholder attribute' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromPlaceholderAttribute: 'Value from placeholder attribute.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  relatedElement: 'Related element',
  /**
  *@description Tooltip text that appears when hovering over the 'Related element' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromRelatedElement: 'Value from related element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromCaption: 'From caption',
  /**
  *@description Tooltip text that appears when hovering over the 'From caption' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromFigcaptionElement: 'Value from figcaption element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromLabel: 'From label',
  /**
  *@description Tooltip text that appears when hovering over the 'From label' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromLabelElement: 'Value from label element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromLabelFor: 'From label (for)',
  /**
  *@description Tooltip text that appears when hovering over the 'From label (for)' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromLabelElementWithFor: 'Value from label element with for= attribute.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromLabelWrapped: 'From label (wrapped)',
  /**
  *@description Tooltip text that appears when hovering over the 'From label (wrapped)' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromLabelElementWrapped: 'Value from label element wrapped.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromLegend: 'From legend',
  /**
  *@description Tooltip text that appears when hovering over the 'From legend' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromLegendElement: 'Value from legend element.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromRubyAnnotation: 'From ruby annotation',
  /**
  *@description Tooltip text that appears when hovering over the 'From ruby annotation' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromNativeHtmlRuby: 'Value from native HTML ruby annotation.',
  /**
  *@description Tooltip text that appears when hovering over the 'From caption' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromTableCaption: 'Value from table caption.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromTitle: 'From title',
  /**
  *@description Tooltip text that appears when hovering over the 'From title' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromTitleAttribute: 'Value from title attribute.',
  /**
  *@description Accessibility attribute name that appears under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  fromNativeHtml: 'From native HTML',
  /**
  *@description Tooltip text that appears when hovering over the 'From native HTML' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane
  */
  valueFromNativeHtmlUnknownSource: 'Value from native HTML (unknown source).',
};
const str_ = i18n.i18n.registerUIStrings('accessibility/AccessibilityStrings.js', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export const AXAttributes = {
  'disabled': {
    name: i18nString(UIStrings.disabled),
    description: i18nString(UIStrings.ifTrueThisElementCurrentlyCannot),
    group: 'AXGlobalStates'
  },
  'invalid': {
    name: i18nString(UIStrings.invalidUserEntry),
    description: i18nString(UIStrings.ifTrueThisElementsUserentered),
    group: 'AXGlobalStates'
  },
  'editable': {name: i18nString(UIStrings.editable), description: i18nString(UIStrings.ifAndHowThisElementCanBeEdited)},
  'focusable':
      {name: i18nString(UIStrings.focusable), description: i18nString(UIStrings.ifTrueThisElementCanReceiveFocus)},
  'focused': {name: i18nString(UIStrings.focused), description: i18nString(UIStrings.ifTrueThisElementCurrentlyHas)},
  'settable':
      {name: i18nString(UIStrings.canSetValue), description: i18nString(UIStrings.whetherTheValueOfThisElementCan)},
  'live': {
    name: i18nString(UIStrings.liveRegion),
    description: i18nString(UIStrings.whetherAndWhatPriorityOfLive),
    group: 'AXLiveRegionAttributes'
  },
  'atomic': {
    name: i18nString(UIStrings.atomicLiveRegions),
    description: i18nString(UIStrings.ifThisElementMayReceiveLive),
    group: 'AXLiveRegionAttributes'
  },
  'relevant': {
    name: i18nString(UIStrings.relevantLiveRegions),
    description: i18nString(UIStrings.ifThisElementMayReceiveLiveUpdates),
    group: 'AXLiveRegionAttributes'
  },
  'busy': {
    name: i18nString(UIStrings.busyLiveRegions),
    description: i18nString(UIStrings.whetherThisElementOrItsSubtree),
    group: 'AXLiveRegionAttributes'
  },
  'root': {
    name: i18nString(UIStrings.liveRegionRoot),
    description: i18nString(UIStrings.ifThisElementMayReceiveLiveUpdatesThe),
    group: 'AXLiveRegionAttributes'
  },
  'autocomplete': {
    name: i18nString(UIStrings.hasAutocomplete),
    description: i18nString(UIStrings.whetherAndWhatTypeOfAutocomplete),
    group: 'AXWidgetAttributes'
  },
  'haspopup': {
    name: i18nString(UIStrings.hasPopup),
    description: i18nString(UIStrings.whetherThisElementHasCausedSome),
    group: 'AXWidgetAttributes'
  },
  'level': {
    name: i18nString(UIStrings.level),
    description: i18nString(UIStrings.theHierarchicalLevelOfThis),
    group: 'AXWidgetAttributes'
  },
  'multiselectable': {
    name: i18nString(UIStrings.multiselectable),
    description: i18nString(UIStrings.whetherAUserMaySelectMoreThanOne),
    group: 'AXWidgetAttributes'
  },
  'orientation': {
    name: i18nString(UIStrings.orientation),
    description: i18nString(UIStrings.whetherThisLinearElements),
    group: 'AXWidgetAttributes'
  },
  'multiline': {
    name: i18nString(UIStrings.multiline),
    description: i18nString(UIStrings.whetherThisTextBoxMayHaveMore),
    group: 'AXWidgetAttributes'
  },
  'readonly': {
    name: i18nString(UIStrings.readonlyString),
    description: i18nString(UIStrings.ifTrueThisElementMayBeInteracted),
    group: 'AXWidgetAttributes'
  },
  'required': {
    name: i18nString(UIStrings.requiredString),
    description: i18nString(UIStrings.whetherThisElementIsARequired),
    group: 'AXWidgetAttributes'
  },
  'valuemin': {
    name: i18nString(UIStrings.minimumValue),
    description: i18nString(UIStrings.forARangeWidgetTheMinimumAllowed),
    group: 'AXWidgetAttributes'
  },
  'valuemax': {
    name: i18nString(UIStrings.maximumValue),
    description: i18nString(UIStrings.forARangeWidgetTheMaximumAllowed),
    group: 'AXWidgetAttributes'
  },
  'valuetext': {
    name: i18nString(UIStrings.valueDescription),
    description: i18nString(UIStrings.aHumanreadableVersionOfTheValue),
    group: 'AXWidgetAttributes'
  },
  'checked': {
    name: i18nString(UIStrings.checked),
    description: i18nString(UIStrings.whetherThisCheckboxRadioButtonOr),
    group: 'AXWidgetStates'
  },
  'expanded': {
    name: i18nString(UIStrings.expanded),
    description: i18nString(UIStrings.whetherThisElementOrAnother),
    group: 'AXWidgetStates'
  },
  'pressed': {
    name: i18nString(UIStrings.pressed),
    description: i18nString(UIStrings.whetherThisToggleButtonIs),
    group: 'AXWidgetStates'
  },
  'selected': {
    name: i18nString(UIStrings.selectedString),
    description: i18nString(UIStrings.whetherTheOptionRepresentedBy),
    group: 'AXWidgetStates'
  },
  'activedescendant': {
    name: i18nString(UIStrings.activeDescendant),
    description: i18nString(UIStrings.theDescendantOfThisElementWhich),
    group: 'AXRelationshipAttributes'
  },
  'flowto': {
    name: i18nString(UIStrings.flowsTo),
    description: i18nString(UIStrings.elementToWhichTheUserMayChooseTo),
    group: 'AXRelationshipAttributes'
  },
  'controls': {
    name: i18nString(UIStrings.controls),
    description: i18nString(UIStrings.elementOrElementsWhoseContentOr),
    group: 'AXRelationshipAttributes'
  },
  'describedby': {
    name: i18nString(UIStrings.describedBy),
    description: i18nString(UIStrings.elementOrElementsWhichFormThe),
    group: 'AXRelationshipAttributes'
  },
  'labelledby': {
    name: i18nString(UIStrings.labeledBy),
    description: i18nString(UIStrings.elementOrElementsWhichMayFormThe),
    group: 'AXRelationshipAttributes'
  },
  'owns': {
    name: i18nString(UIStrings.ownsText),
    description: i18nString(UIStrings.elementOrElementsWhichShouldBe),
    group: 'AXRelationshipAttributes'
  },
  'name': {
    name: i18nString(UIStrings.nameString),
    description: i18nString(UIStrings.theComputedNameOfThisElement),
    group: 'Default'
  },
  'role': {
    name: i18nString(UIStrings.role),
    description: i18nString(UIStrings.indicatesThePurposeOfThisElement),
    group: 'Default'
  },
  'value': {
    name: i18nString(UIStrings.value),
    description: i18nString(UIStrings.theValueOfThisElementThisMayBe),
    group: 'Default'
  },
  'help': {
    name: i18nString(UIStrings.help),
    description: i18nString(UIStrings.theComputedHelpTextForThis),
    group: 'Default'
  },
  'description': {
    name: i18nString(UIStrings.description),
    description: i18nString(UIStrings.theAccessibleDescriptionForThis),
    group: 'Default'
  }
};

export const AXSourceTypes = {
  'attribute': {name: i18nString(UIStrings.fromAttribute), description: i18nString(UIStrings.valueFromAttribute)},
  'implicit': {
    name: i18nString(UIStrings.implicit),
    description: i18nString(UIStrings.implicitValue),
  },
  'style': {name: i18nString(UIStrings.fromStyle), description: i18nString(UIStrings.valueFromStyle)},
  'contents': {name: i18nString(UIStrings.contents), description: i18nString(UIStrings.valueFromElementContents)},
  'placeholder': {
    name: i18nString(UIStrings.fromPlaceholderAttribute),
    description: i18nString(UIStrings.valueFromPlaceholderAttribute)
  },
  'relatedElement':
      {name: i18nString(UIStrings.relatedElement), description: i18nString(UIStrings.valueFromRelatedElement)}
};

export const AXNativeSourceTypes = {
  'figcaption':
      {name: i18nString(UIStrings.fromCaption), description: i18nString(UIStrings.valueFromFigcaptionElement)},
  'label': {name: i18nString(UIStrings.fromLabel), description: i18nString(UIStrings.valueFromLabelElement)},
  'labelfor':
      {name: i18nString(UIStrings.fromLabelFor), description: i18nString(UIStrings.valueFromLabelElementWithFor)},
  'labelwrapped':
      {name: i18nString(UIStrings.fromLabelWrapped), description: i18nString(UIStrings.valueFromLabelElementWrapped)},
  'legend': {name: i18nString(UIStrings.fromLegend), description: i18nString(UIStrings.valueFromLegendElement)},
  'rubyannotation':
      {name: i18nString(UIStrings.fromRubyAnnotation), description: i18nString(UIStrings.valueFromNativeHtmlRuby)},
  'tablecaption': {name: i18nString(UIStrings.fromCaption), description: i18nString(UIStrings.valueFromTableCaption)},
  'title': {name: i18nString(UIStrings.fromTitle), description: i18nString(UIStrings.valueFromTitleAttribute)},
  'other':
      {name: i18nString(UIStrings.fromNativeHtml), description: i18nString(UIStrings.valueFromNativeHtmlUnknownSource)},
};
