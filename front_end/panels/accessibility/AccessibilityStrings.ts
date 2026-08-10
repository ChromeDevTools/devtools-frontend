// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
  /**
   * @description Text to indicate something is not enabled.
   */
  disabled: 'Disabled',
  /**
   * @description Tooltip text that appears when hovering over the 'Disabled' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifTrueThisElementCurrentlyCannot: 'If `true`, this element currently can’t be interacted with',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  invalidUserEntry: 'Invalid user entry',
  /**
   * @description Tooltip text that appears when hovering over the 'Invalid user entry' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifTrueThisElementsUserentered:
      'If `true`, this element’s user-entered value doesn’t conform to validation requirement',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  editable: 'Editable',
  /**
   * @description Tooltip text that appears when hovering over the 'Editable' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifAndHowThisElementCanBeEdited: 'If and how this element can be edited',
  /**
   * @description Adjective. Describes whether the currently selected HTML element of the page can receive focus at all (e.g. can the selected element receive user keyboard input).
   *             Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  focusable: 'Focusable',
  /**
   * @description Tooltip text that appears when hovering over the 'Focusable' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifTrueThisElementCanReceiveFocus: 'If `true`, this element can receive focus',
  /**
   * @description Adjective. Describes whether the currently selected HTML element of the page is focused (e.g. the selected element receives user keyboard input).
   *             Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  focused: 'Focused',
  /**
   * @description Tooltip text that appears when hovering over the 'Focused' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifTrueThisElementCurrentlyHas: 'If `true`, this element currently has focus',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  canSetValue: 'Can set value',
  /**
   * @description Tooltip text that appears when hovering over the 'Can set value' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherTheValueOfThisElementCan: 'Whether the value of this element can be set',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. A live region is an area of the webpage which is
   * dynamic and changes frequently.
   */
  liveRegion: 'Live region',
  /**
   * @description Tooltip text that appears when hovering over the 'Live region' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherAndWhatPriorityOfLive: 'Whether and what priority of live updates may be expected for this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel when inspecting an element with aria-relevant set.
   */
  atomicLiveRegions: 'Atomic (live regions)',
  /**
   * @description Tooltip text that appears when hovering over the 'Atomic (live regions)' attribute
   * name under the computed properties section in the Accessibility tab of the Elements panel. When
   * a node within a live region changes, the entire live region can be presented to the user, or
   * just the nodes within the region that actually changed.
   */
  ifThisElementMayReceiveLive:
      'If this element may receive live updates, whether the entire live region should be presented to the user on changes, or only changed nodes',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel when inspecting an element with aria-relevant set.
   */
  relevantLiveRegions: 'Relevant (live regions)',
  /**
   * @description Tooltip text that appears when hovering over the 'Relevant (live regions)' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifThisElementMayReceiveLiveUpdates:
      'If this element may receive live updates, what type of updates should trigger a notification',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that the aria-busy attribute is set for
   * the element, which means the element is being modified and assistive technologies like screen
   * readers may want to wait until the area is no longer live/busy before exposing it to the user.
   */
  busyLiveRegions: '`Busy` (live regions)',
  /**
   * @description Tooltip text that appears when hovering over the 'Busy (live regions)' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisElementOrItsSubtree:
      'Whether this element or its subtree are currently being updated (and thus may be in an inconsistent state)',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. A live region is a section of the DOM graph which
   * is dynamic in nature and will change regularly. The live region root is the node in the graph
   * which is a parent of all nodes in the live region.
   * https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
   */
  liveRegionRoot: 'Live region root',
  /**
   * @description Tooltip text that appears when hovering over the 'Live region root' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifThisElementMayReceiveLiveUpdatesThe:
      'If this element may receive live updates, the root element of the containing live region',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  hasAutocomplete: 'Has autocomplete',
  /**
   * @description Tooltip text that appears when hovering over the 'Has autocomplete' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherAndWhatTypeOfAutocomplete:
      'Whether and what type of autocomplete suggestions are currently provided by this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  hasPopup: 'Has popup',
  /**
   * @description Tooltip text that appears when hovering over the 'Has popup' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisElementHasCausedSome: 'Whether this element has caused some kind of pop-up (such as a menu) to appear',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  level: 'Level',
  /**
   * @description Tooltip text that appears when hovering over the 'Level' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theHierarchicalLevelOfThis: 'The hierarchical level of this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  multiselectable: 'Multi-selectable',
  /**
   * @description Tooltip text that appears when hovering over the 'Multi-selectable' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherAUserMaySelectMoreThanOne: 'Whether a user may select more than one option from this widget',
  /**
   * @description Text for the orientation of something.
   */
  orientation: 'Orientation',
  /**
   * @description Tooltip text that appears when hovering over the 'Orientation' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisLinearElements: 'Whether this linear element’s orientation is horizontal or vertical',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  multiline: 'Multi-line',
  /**
   * @description Tooltip text that appears when hovering over the 'Multi-line' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisTextBoxMayHaveMore: 'Whether this text box may have more than one line',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  readonlyString: 'Read-only',
  /**
   * @description Tooltip text that appears when hovering over the 'Read-only' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  ifTrueThisElementMayBeInteracted: 'If `true`, this element may be interacted with, but its value can’t be changed',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  requiredString: 'Required',
  /**
   * @description Tooltip text that appears when hovering over the 'Required' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisElementIsARequired: 'Whether this element is a required field in a form',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  minimumValue: 'Minimum value',
  /**
   * @description Tooltip text that appears when hovering over the 'Minimum value' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  forARangeWidgetTheMinimumAllowed: 'For a range widget, the minimum allowed value',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  maximumValue: 'Maximum value',
  /**
   * @description Tooltip text that appears when hovering over the 'Maximum value' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  forARangeWidgetTheMaximumAllowed: 'For a range widget, the maximum allowed value',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueDescription: 'Value description',
  /**
   * @description Tooltip text that appears when hovering over the 'Value description' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  aHumanreadableVersionOfTheValue: 'A human-readable version of the value of a range widget (where necessary)',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  checked: 'Checked',
  /**
   * @description Tooltip text that appears when hovering over the 'Checked' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisCheckboxRadioButtonOr:
      'Whether this checkbox, radio button or tree item is checked, unchecked, or mixed (for example, has both checked and unchecked children)',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  expanded: 'Expanded',
  /**
   * @description Tooltip text that appears when hovering over the 'Expanded' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisElementOrAnother: 'Whether this element, or another grouping element it controls, is expanded',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  pressed: 'Pressed',
  /**
   * @description Tooltip text that appears when hovering over the 'Pressed' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherThisToggleButtonIs: 'Whether this toggle button is currently in a pressed state',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  selectedString: 'Selected',
  /**
   * @description Tooltip text that appears when hovering over the 'Selected' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  whetherTheOptionRepresentedBy: 'Whether the option represented by this element is currently selected',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  activeDescendant: 'Active descendant',
  /**
   * @description Tooltip text that appears when hovering over the 'Active descendant' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theDescendantOfThisElementWhich:
      'The descendant of this element that is active; that is, the element to which focus should be delegated',
  /**
   * @description Tooltip text that appears when hovering over the 'Flows to' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  elementToWhichTheUserMayChooseTo:
      'Element to which the user may choose to navigate after this one, instead of the next element in the DOM order',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  controls: 'Controls',
  /**
   * @description Tooltip text that appears when hovering over the 'Controls' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  elementOrElementsWhoseContentOr: 'Element or elements whose content or presence is controlled by this widget',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  describedBy: 'Described by',
  /**
   * @description Tooltip text that appears when hovering over the 'Described by' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  elementOrElementsWhichFormThe: 'Element or elements that form the description of this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  labeledBy: 'Labeled by',
  /**
   * @description Tooltip text that appears when hovering over the 'Labeled by' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  elementOrElementsWhichMayFormThe: 'Element or elements that may form the name of this element',
  /**
   * @description Tooltip text that appears when hovering over the 'Owns' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  elementOrElementsWhichShouldBe:
      'Element or elements that should be considered descendants of this element, despite not being descendants in the DOM',
  /**
   * @description Tooltip text that appears when hovering over the 'Name' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theComputedNameOfThisElement: 'The computed name of this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  role: 'Role',
  /**
   * @description Tooltip text that appears when hovering over the 'Role' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  indicatesThePurposeOfThisElement:
      'Indicates the purpose of this element, such as a user interface idiom for a widget, or structural role within a document',
  /**
   * @description Text for the value of something.
   */
  value: 'Value',
  /**
   * @description Tooltip text that appears when hovering over the 'Value' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theValueOfThisElementThisMayBe:
      'The value of this element; this may be user-provided or developer-provided, depending on the element',
  /**
   * @description Text for viewing the help options.
   */
  help: 'Help',
  /**
   * @description Tooltip text that appears when hovering over the 'Help' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theComputedHelpTextForThis: 'The computed help text for this element',
  /**
   * @description Text for the description of something.
   */
  description: 'Description',
  /**
   * @description Tooltip text that appears when hovering over the 'Description' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  theAccessibleDescriptionForThis: 'The accessible description for this element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  fromAttribute: 'From attribute',
  /**
   * @description Tooltip text that appears when hovering over the 'From attribute' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromAttribute: 'Value from attribute',
  /**
   * @description The source of an accessibility attribute that appears under the computed properties
   * section in the Accessibility tab of the Elements panel. If the source is implicit, that means
   * it was never specified by the user but instead is present because it is the default value.
   */
  implicit: 'Implicit',
  /**
   * @description Tooltip text that appears when hovering over the 'Implicit' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  implicitValue: 'Implicit value',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  fromStyle: 'From style',
  /**
   * @description Tooltip text that appears when hovering over the 'From style' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromStyle: 'Value from style',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  contents: 'Contents',
  /**
   * @description Tooltip text that appears when hovering over the 'Contents' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromElementContents: 'Value from element contents',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  fromPlaceholderAttribute: 'From placeholder attribute',
  /**
   * @description Tooltip text that appears when hovering over the 'From placeholder attribute' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromPlaceholderAttribute: 'Value from placeholder attribute',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  relatedElement: 'Related element',
  /**
   * @description Tooltip text that appears when hovering over the 'Related element' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromRelatedElement: 'Value from related element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related caption, hence it received it from the caption. 'caption'
   * is part of the ARIA API and should not be translated.
   */
  fromCaption: 'From `caption`',
  /**
   * @description Tooltip text that appears when hovering over the 'From caption' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromFigcaptionElement: 'Value from `figcaption` element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related description, hence it received it from the description.
   * 'description' is part of the ARIA API and should not be translated.
   */
  fromDescription: 'From `description`',
  /**
   * @description Tooltip text that appears when hovering over the 'From description' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromDescriptionElement: 'Value from `description` element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related label, hence it received it from the label. 'label'
   * is part of the ARIA API and should not be translated.
   */
  fromLabel: 'From `label`',
  /**
   * @description Tooltip text that appears when hovering over the 'From label' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromLabelElement: 'Value from `label` element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related label, hence it received it from the label. 'label (for)'
   * is part of the ARIA API and should not be translated. label (for) is just a different type of
   * label.
   */
  fromLabelFor: 'From `label` (`for=` attribute)',
  /**
   * @description Tooltip text that appears when hovering over the 'From label (for)' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromLabelElementWithFor: 'Value from `label` element with `for=` attribute',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related label which wraps (encompasses, surrounds) this element,
   * hence it received it from the label. 'wrapped' is not part of the ARIA API, and should be
   * translated.
   */
  fromLabelWrapped: 'From `label` (wrapped)',
  /**
   * @description Tooltip text that appears when hovering over the 'From label (wrapped)' attribute
   * name under the computed properties section in the Accessibility tab of the Elements panel.
   * Indicates that there is a label element wrapping (surrounding) this element.
   */
  valueFromLabelElementWrapped: 'Value from a wrapping `label` element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel. Indicates that this element got assigned this
   * attribute because there is a related legend, hence it received it from the legend. 'legend' is
   * part of the ARIA API and should not be translated.
   */
  fromLegend: 'From `legend`',
  /**
   * @description Tooltip text that appears when hovering over the 'From legend' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromLegendElement: 'Value from `legend` element',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  fromRubyAnnotation: 'From ruby annotation',
  /**
   * @description Tooltip text that appears when hovering over the 'From ruby annotation' attribute name under the computed properties section in the Accessibility tab of the Elements panel. Indicates that the value was taken from a plain HTML ruby tag (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby).
   */
  valueFromNativeHtmlRuby: 'Value from plain HTML ruby annotation',
  /**
   * @description Tooltip text that appears when hovering over the 'From caption' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromTableCaption: 'Value from `table` `caption`',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in
   * the Accessibility tab of the Elements panel.
   */
  fromTitle: 'From title',
  /**
   * @description Tooltip text that appears when hovering over the 'From title' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromTitleAttribute: 'Value from title attribute',
  /**
   * @description Accessibility attribute name that appears under the computed properties section in the Accessibility tab of the Elements panel.
   */
  fromNativeHtml: 'From native HTML',
  /**
   * @description Tooltip text that appears when hovering over the 'From native HTML' attribute name under the computed properties section in the Accessibility tab of the Elements panel.
   */
  valueFromNativeHtmlUnknownSource: 'Value from native HTML (unknown source)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityStrings.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export const AXAttributes = {
  disabled: {
    name: i18nLazyString(UIStrings.disabled),
    description: i18nLazyString(UIStrings.ifTrueThisElementCurrentlyCannot),
    group: 'AXGlobalStates',
  },
  invalid: {
    name: i18nLazyString(UIStrings.invalidUserEntry),
    description: i18nLazyString(UIStrings.ifTrueThisElementsUserentered),
    group: 'AXGlobalStates',
  },
  editable:
      {name: i18nLazyString(UIStrings.editable), description: i18nLazyString(UIStrings.ifAndHowThisElementCanBeEdited)},
  focusable: {
    name: i18nLazyString(UIStrings.focusable),
    description: i18nLazyString(UIStrings.ifTrueThisElementCanReceiveFocus),
  },
  focused:
      {name: i18nLazyString(UIStrings.focused), description: i18nLazyString(UIStrings.ifTrueThisElementCurrentlyHas)},
  settable: {
    name: i18nLazyString(UIStrings.canSetValue),
    description: i18nLazyString(UIStrings.whetherTheValueOfThisElementCan),
  },
  live: {
    name: i18nLazyString(UIStrings.liveRegion),
    description: i18nLazyString(UIStrings.whetherAndWhatPriorityOfLive),
    group: 'AXLiveRegionAttributes',
  },
  atomic: {
    name: i18nLazyString(UIStrings.atomicLiveRegions),
    description: i18nLazyString(UIStrings.ifThisElementMayReceiveLive),
    group: 'AXLiveRegionAttributes',
  },
  relevant: {
    name: i18nLazyString(UIStrings.relevantLiveRegions),
    description: i18nLazyString(UIStrings.ifThisElementMayReceiveLiveUpdates),
    group: 'AXLiveRegionAttributes',
  },
  busy: {
    name: i18nLazyString(UIStrings.busyLiveRegions),
    description: i18nLazyString(UIStrings.whetherThisElementOrItsSubtree),
    group: 'AXLiveRegionAttributes',
  },
  root: {
    name: i18nLazyString(UIStrings.liveRegionRoot),
    description: i18nLazyString(UIStrings.ifThisElementMayReceiveLiveUpdatesThe),
    group: 'AXLiveRegionAttributes',
  },
  autocomplete: {
    name: i18nLazyString(UIStrings.hasAutocomplete),
    description: i18nLazyString(UIStrings.whetherAndWhatTypeOfAutocomplete),
    group: 'AXWidgetAttributes',
  },
  haspopup: {
    name: i18nLazyString(UIStrings.hasPopup),
    description: i18nLazyString(UIStrings.whetherThisElementHasCausedSome),
    group: 'AXWidgetAttributes',
  },
  level: {
    name: i18nLazyString(UIStrings.level),
    description: i18nLazyString(UIStrings.theHierarchicalLevelOfThis),
    group: 'AXWidgetAttributes',
  },
  multiselectable: {
    name: i18nLazyString(UIStrings.multiselectable),
    description: i18nLazyString(UIStrings.whetherAUserMaySelectMoreThanOne),
    group: 'AXWidgetAttributes',
  },
  orientation: {
    name: i18nLazyString(UIStrings.orientation),
    description: i18nLazyString(UIStrings.whetherThisLinearElements),
    group: 'AXWidgetAttributes',
  },
  multiline: {
    name: i18nLazyString(UIStrings.multiline),
    description: i18nLazyString(UIStrings.whetherThisTextBoxMayHaveMore),
    group: 'AXWidgetAttributes',
  },
  readonly: {
    name: i18nLazyString(UIStrings.readonlyString),
    description: i18nLazyString(UIStrings.ifTrueThisElementMayBeInteracted),
    group: 'AXWidgetAttributes',
  },
  required: {
    name: i18nLazyString(UIStrings.requiredString),
    description: i18nLazyString(UIStrings.whetherThisElementIsARequired),
    group: 'AXWidgetAttributes',
  },
  valuemin: {
    name: i18nLazyString(UIStrings.minimumValue),
    description: i18nLazyString(UIStrings.forARangeWidgetTheMinimumAllowed),
    group: 'AXWidgetAttributes',
  },
  valuemax: {
    name: i18nLazyString(UIStrings.maximumValue),
    description: i18nLazyString(UIStrings.forARangeWidgetTheMaximumAllowed),
    group: 'AXWidgetAttributes',
  },
  valuetext: {
    name: i18nLazyString(UIStrings.valueDescription),
    description: i18nLazyString(UIStrings.aHumanreadableVersionOfTheValue),
    group: 'AXWidgetAttributes',
  },
  checked: {
    name: i18nLazyString(UIStrings.checked),
    description: i18nLazyString(UIStrings.whetherThisCheckboxRadioButtonOr),
    group: 'AXWidgetStates',
  },
  expanded: {
    name: i18nLazyString(UIStrings.expanded),
    description: i18nLazyString(UIStrings.whetherThisElementOrAnother),
    group: 'AXWidgetStates',
  },
  pressed: {
    name: i18nLazyString(UIStrings.pressed),
    description: i18nLazyString(UIStrings.whetherThisToggleButtonIs),
    group: 'AXWidgetStates',
  },
  selected: {
    name: i18nLazyString(UIStrings.selectedString),
    description: i18nLazyString(UIStrings.whetherTheOptionRepresentedBy),
    group: 'AXWidgetStates',
  },
  activedescendant: {
    name: i18nLazyString(UIStrings.activeDescendant),
    description: i18nLazyString(UIStrings.theDescendantOfThisElementWhich),
    group: 'AXRelationshipAttributes',
  },
  flowto: {
    name: i18n.i18n.lockedLazyString('Flows to'),
    description: i18nLazyString(UIStrings.elementToWhichTheUserMayChooseTo),
    group: 'AXRelationshipAttributes',
  },
  controls: {
    name: i18nLazyString(UIStrings.controls),
    description: i18nLazyString(UIStrings.elementOrElementsWhoseContentOr),
    group: 'AXRelationshipAttributes',
  },
  describedby: {
    name: i18nLazyString(UIStrings.describedBy),
    description: i18nLazyString(UIStrings.elementOrElementsWhichFormThe),
    group: 'AXRelationshipAttributes',
  },
  labelledby: {
    name: i18nLazyString(UIStrings.labeledBy),
    description: i18nLazyString(UIStrings.elementOrElementsWhichMayFormThe),
    group: 'AXRelationshipAttributes',
  },
  owns: {
    name: i18n.i18n.lockedLazyString('Owns'),
    description: i18nLazyString(UIStrings.elementOrElementsWhichShouldBe),
    group: 'AXRelationshipAttributes',
  },
  name: {
    name: i18n.i18n.lockedLazyString('Name'),
    description: i18nLazyString(UIStrings.theComputedNameOfThisElement),
    group: 'Default',
  },
  role: {
    name: i18nLazyString(UIStrings.role),
    description: i18nLazyString(UIStrings.indicatesThePurposeOfThisElement),
    group: 'Default',
  },
  value: {
    name: i18nLazyString(UIStrings.value),
    description: i18nLazyString(UIStrings.theValueOfThisElementThisMayBe),
    group: 'Default',
  },
  help: {
    name: i18nLazyString(UIStrings.help),
    description: i18nLazyString(UIStrings.theComputedHelpTextForThis),
    group: 'Default',
  },
  description: {
    name: i18nLazyString(UIStrings.description),
    description: i18nLazyString(UIStrings.theAccessibleDescriptionForThis),
    group: 'Default',
  },
};

export const AXSourceTypes = {
  attribute: {name: i18nLazyString(UIStrings.fromAttribute), description: i18nLazyString(UIStrings.valueFromAttribute)},
  implicit: {
    name: i18nLazyString(UIStrings.implicit),
    description: i18nLazyString(UIStrings.implicitValue),
  },
  style: {name: i18nLazyString(UIStrings.fromStyle), description: i18nLazyString(UIStrings.valueFromStyle)},
  contents: {name: i18nLazyString(UIStrings.contents), description: i18nLazyString(UIStrings.valueFromElementContents)},
  placeholder: {
    name: i18nLazyString(UIStrings.fromPlaceholderAttribute),
    description: i18nLazyString(UIStrings.valueFromPlaceholderAttribute),
  },
  relatedElement:
      {name: i18nLazyString(UIStrings.relatedElement), description: i18nLazyString(UIStrings.valueFromRelatedElement)},
};

export const AXNativeSourceTypes = {
  description: {
    name: i18nLazyString(UIStrings.fromDescription),
    description: i18nLazyString(UIStrings.valueFromDescriptionElement),
  },
  figcaption:
      {name: i18nLazyString(UIStrings.fromCaption), description: i18nLazyString(UIStrings.valueFromFigcaptionElement)},
  label: {name: i18nLazyString(UIStrings.fromLabel), description: i18nLazyString(UIStrings.valueFromLabelElement)},
  labelfor: {
    name: i18nLazyString(UIStrings.fromLabelFor),
    description: i18nLazyString(UIStrings.valueFromLabelElementWithFor),
  },
  labelwrapped: {
    name: i18nLazyString(UIStrings.fromLabelWrapped),
    description: i18nLazyString(UIStrings.valueFromLabelElementWrapped),
  },
  legend: {name: i18nLazyString(UIStrings.fromLegend), description: i18nLazyString(UIStrings.valueFromLegendElement)},
  rubyannotation: {
    name: i18nLazyString(UIStrings.fromRubyAnnotation),
    description: i18nLazyString(UIStrings.valueFromNativeHtmlRuby),
  },
  tablecaption:
      {name: i18nLazyString(UIStrings.fromCaption), description: i18nLazyString(UIStrings.valueFromTableCaption)},
  title: {name: i18nLazyString(UIStrings.fromTitle), description: i18nLazyString(UIStrings.valueFromTitleAttribute)},
  other: {
    name: i18nLazyString(UIStrings.fromNativeHtml),
    description: i18nLazyString(UIStrings.valueFromNativeHtmlUnknownSource),
  },
};
