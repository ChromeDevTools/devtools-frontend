// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const AXAttributes = {
  'disabled': {
    name: ls`Disabled`,
    description: ls`If true, this element currently cannot be interacted with.`,
    group: 'AXGlobalStates'
  },
  'invalid': {
    name: ls`Invalid user entry`,
    description: ls`If true, this element's user-entered value does not conform to validation requirement.`,
    group: 'AXGlobalStates'
  },
  'editable': {name: ls`Editable`, description: ls`If and how this element can be edited.`},
  'focusable': {name: ls`Focusable`, description: ls`If true, this element can receive focus.`},
  'focused': {name: ls`Focused`, description: ls`If true, this element currently has focus.`},
  'settable': {name: ls`Can set value`, description: ls`Whether the value of this element can be set.`},
  'live': {
    name: ls`Live region`,
    description: ls`Whether and what priority of live updates may be expected for this element.`,
    group: 'AXLiveRegionAttributes'
  },
  'atomic': {name: ls`Atomic (live regions)`, description: ls
    `If this element may receive live updates, whether the entire live region should be presented to the user on changes, or only changed nodes.`,
    group: 'AXLiveRegionAttributes'
  },
  'relevant': {
    name: ls`Relevant (live regions)`,
    description: ls`If this element may receive live updates, what type of updates should trigger a notification.`,
    group: 'AXLiveRegionAttributes'
  },
  'busy': {
    name: ls`Busy (live regions)`,
    description: ls
    `Whether this element or its subtree are currently being updated (and thus may be in an inconsistent state).`,
    group: 'AXLiveRegionAttributes'
  },
  'root': {
    name: ls`Live region root`,
    description: ls`If this element may receive live updates, the root element of the containing live region.`,
    group: 'AXLiveRegionAttributes'
  },
  'autocomplete': {
    name: ls`Has autocomplete`,
    description: ls`Whether and what type of autocomplete suggestions are currently provided by this element.`,
    group: 'AXWidgetAttributes'
  },
  'haspopup': {
    name: ls`Has popup`,
    description: ls`Whether this element has caused some kind of pop-up (such as a menu) to appear.`,
    group: 'AXWidgetAttributes'
  },
  'level': {name: ls`Level`, description: ls`The hierarchical level of this element.`, group: 'AXWidgetAttributes'},
  'multiselectable': {
    name: ls`Multi-selectable`,
    description: ls`Whether a user may select more than one option from this widget.`,
    group: 'AXWidgetAttributes'
  },
  'orientation': {
    name: ls`Orientation`,
    description: ls`Whether this linear element's orientation is horizontal or vertical.`,
    group: 'AXWidgetAttributes'
  },
  'multiline': {
    name: ls`Multi-line`,
    description: ls`Whether this text box may have more than one line.`,
    group: 'AXWidgetAttributes'
  },
  'readonly': {
    name: ls`Read-only`,
    description: ls`If true, this element may be interacted with, but its value cannot be changed.`,
    group: 'AXWidgetAttributes'
  },
  'required': {
    name: ls`Required`,
    description: ls`Whether this element is a required field in a form.`,
    group: 'AXWidgetAttributes'
  },
  'valuemin': {
    name: ls`Minimum value`,
    description: ls`For a range widget, the minimum allowed value.`,
    group: 'AXWidgetAttributes'
  },
  'valuemax': {
    name: ls`Maximum value`,
    description: ls`For a range widget, the maximum allowed value.`,
    group: 'AXWidgetAttributes'
  },
  'valuetext': {
    name: ls`Value description`,
    description: ls`A human-readable version of the value of a range widget (where necessary).`,
    group: 'AXWidgetAttributes'
  },
  'checked': {
    name: ls`Checked`,
    description: ls
    `Whether this checkbox, radio button or tree item is checked, unchecked, or mixed (e.g. has both checked and un-checked children).`,
    group: 'AXWidgetStates'
  },
  'expanded': {
    name: ls`Expanded`,
    description: ls`Whether this element, or another grouping element it controls, is expanded.`,
    group: 'AXWidgetStates'
  },
  'pressed': {
    name: ls`Pressed`,
    description: ls`Whether this toggle button is currently in a pressed state.`,
    group: 'AXWidgetStates'
  },
  'selected': {
    name: ls`Selected`,
    description: ls`Whether the option represented by this element is currently selected.`,
    group: 'AXWidgetStates'
  },
  'activedescendant': {
    name: ls`Active descendant`,
    description: ls
    `The descendant of this element which is active; i.e. the element to which focus should be delegated.`,
    group: 'AXRelationshipAttributes'
  },
  'flowto': {
    name: ls`Flows to`,
    description: ls
    `Element to which the user may choose to navigate after this one, instead of the next element in the DOM order.`,
    group: 'AXRelationshipAttributes'
  },
  'controls': {
    name: ls`Controls`,
    description: ls`Element or elements whose content or presence is/are controlled by this widget.`,
    group: 'AXRelationshipAttributes'
  },
  'describedby': {
    name: ls`Described by`,
    description: ls`Element or elements which form the description of this element.`,
    group: 'AXRelationshipAttributes'
  },
  'labelledby': {
    name: ls`Labeled by`,
    description: ls`Element or elements which may form the name of this element.`,
    group: 'AXRelationshipAttributes'
  },
  'owns': {
    name: ls`Owns`,
    description: ls
    `Element or elements which should be considered descendants of this element, despite not being descendants in the DOM.`,
    group: 'AXRelationshipAttributes'
  },
  'name': {name: ls`Name`, description: ls`The computed name of this element.`, group: 'Default'},
  'role': {
    name: ls`Role`,
    description: ls
    `Indicates the purpose of this element, such as a user interface idiom for a widget, or structural role within a document.`,
    group: 'Default'
  },
  'value': {
    name: ls`Value`,
    description: ls
    `The value of this element; this may be user-provided or developer-provided, depending on the element.`,
    group: 'Default'
  },
  'help': {name: ls`Help`, description: ls`The computed help text for this element.`, group: 'Default'},
  'description':
      {name: ls`Description`, description: ls`The accessible description for this element.`, group: 'Default'}
};

    export const AXSourceTypes = {
      'attribute': {name: ls`From attribute`, description: ls`Value from attribute.`},
      'implicit': {
        name: ls`Implicit`,
        description: ls`Implicit value.`,
      },
      'style': {name: ls`From style`, description: ls`Value from style.`},
      'contents': {name: ls`Contents`, description: ls`Value from element contents.`},
      'placeholder': {name: ls`From placeholder attribute`, description: ls`Value from placeholder attribute.`},
      'relatedElement': {name: ls`Related element`, description: ls`Value from related element.`}
    };

    export const AXNativeSourceTypes = {
      'figcaption': {name: ls`From caption`, description: ls`Value from figcaption element.`},
      'label': {name: ls`From label`, description: ls`Value from label element.`},
      'labelfor': {name: ls`From label (for)`, description: ls`Value from label element with for= attribute.`},
      'labelwrapped': {name: ls`From label (wrapped)`, description: ls`Value from label element wrapped.`},
      'tablecaption': {name: ls`From caption`, description: ls`Value from table caption.`},
      'title': {name: ls`From title`, description: ls`Value from title attribute.`},
      'other': {name: ls`From native HTML`, description: ls`Value from native HTML (unknown source).`},
    };
