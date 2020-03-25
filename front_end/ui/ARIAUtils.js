// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let _id = 0;

/**
 * @param {string} prefix
 * @return {string}
 */
export function nextId(prefix) {
  return (prefix || '') + ++_id;
}

/**
 * @param {!Element} label
 * @param {!Element} control
 */
export function bindLabelToControl(label, control) {
  const controlId = nextId('labelledControl');
  control.id = controlId;
  label.setAttribute('for', controlId);
}

/**
 * @param {!Element} element
 */
export function markAsAlert(element) {
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
}

/**
 * @param {!Element} element
 */
export function markAsApplication(element) {
  element.setAttribute('role', 'application');
}

/**
 * @param {!Element} element
 */
export function markAsButton(element) {
  element.setAttribute('role', 'button');
}

/**
 * @param {!Element} element
 */
export function markAsCheckbox(element) {
  element.setAttribute('role', 'checkbox');
}

/**
 * @param {!Element} element
 */
export function markAsCombobox(element) {
  element.setAttribute('role', 'combobox');
}

/**
 * @param {!Element} element
 */
export function markAsModalDialog(element) {
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
}

/**
 * @param {!Element} element
 */
export function markAsGroup(element) {
  element.setAttribute('role', 'group');
}

/**
 * @param {!Element} element
 */
export function markAsLink(element) {
  element.setAttribute('role', 'link');
}

/**
 * @param {!Element} element
 */
export function markAsMenuButton(element) {
  markAsButton(element);
  element.setAttribute('aria-haspopup', true);
}

/**
 * @param {!Element} element
 * @param {number=} min
 * @param {number=} max
 */
export function markAsProgressBar(element, min = 0, max = 100) {
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-valuemin', min);
  element.setAttribute('aria-valuemax', max);
}

/**
 * @param {!Element} element
 */
export function markAsTab(element) {
  element.setAttribute('role', 'tab');
}

/**
 * @param {!Element} element
 */
export function markAsTablist(element) {
  element.setAttribute('role', 'tablist');
}

/**
 * @param {!Element} element
 */
export function markAsTabpanel(element) {
  element.setAttribute('role', 'tabpanel');
}

/**
 * @param {!Element} element
 */
export function markAsTree(element) {
  element.setAttribute('role', 'tree');
}

/**
 * @param {!Element} element
 */
export function markAsTreeitem(element) {
  element.setAttribute('role', 'treeitem');
}

/**
 * @param {!Element} element
 */
export function markAsTextBox(element) {
  element.setAttribute('role', 'textbox');
}

/**
 * @param {!Element} element
 */
export function markAsMenu(element) {
  element.setAttribute('role', 'menu');
}

/**
 * @param {!Element} element
 */
export function markAsMenuItem(element) {
  element.setAttribute('role', 'menuitem');
}

/**
 * @param {!Element} element
 */
export function markAsMenuItemSubMenu(element) {
  markAsMenuItem(element);
  element.setAttribute('aria-haspopup', true);
}

/**
 * @param {!Element} element
 */
export function markAsList(element) {
  element.setAttribute('role', 'list');
}

/**
 * @param {!Element} element
 */
export function markAsListitem(element) {
  element.setAttribute('role', 'listitem');
}

/**
 * Must contain children whose role is option.
 * @param {!Element} element
 */
export function markAsListBox(element) {
  element.setAttribute('role', 'listbox');
}

/**
 * @param {!Element} element
 */
export function markAsMultiSelectable(element) {
  element.setAttribute('aria-multiselectable', 'true');
}

/**
 * Must be contained in, or owned by, an element with the role listbox.
 * @param {!Element} element
 */
export function markAsOption(element) {
  element.setAttribute('role', 'option');
}

/**
 * @param {!Element} element
 */
export function markAsRadioGroup(element) {
  element.setAttribute('role', 'radiogroup');
}

/**
 * @param {!Element} element
 */
export function markAsHidden(element) {
  element.setAttribute('aria-hidden', 'true');
}

/**
 * @param {!Element} element
 * @param {number=} min
 * @param {number=} max
 */
export function markAsSlider(element, min = 0, max = 100) {
  element.setAttribute('role', 'slider');
  element.setAttribute('aria-valuemin', String(min));
  element.setAttribute('aria-valuemax', String(max));
}

/**
 * @param {!Element} element
 * @param {number} level
 */
export function markAsHeading(element, level) {
  element.setAttribute('role', 'heading');
  element.setAttribute('aria-level', level);
}

/**
 * @param {!Element} element
 * @param {boolean} isAtomic
 */
export function markAsPoliteLiveRegion(element, isAtomic) {
  element.setAttribute('aria-live', 'polite');
  if (isAtomic) {
    element.setAttribute('aria-atomic', 'true');
  }
}

/**
 * @param {!Element} element
 * @return {boolean}
 */
export function hasRole(element) {
  return element.hasAttribute('role');
}

/**
 * @param {!Element} element
 */
export function removeRole(element) {
  element.removeAttribute('role');
}

/**
 * @param {!Element} element
 * @param {?string} placeholder
 */
export function setPlaceholder(element, placeholder) {
  if (placeholder) {
    element.setAttribute('aria-placeholder', placeholder);
  } else {
    element.removeAttribute('aria-placeholder');
  }
}

/**
 * @param {!Element} element
 */
export function markAsPresentation(element) {
  element.setAttribute('role', 'presentation');
}

/**
 * @param {!Element} element
 */
export function markAsStatus(element) {
  element.setAttribute('role', 'status');
}

/**
 * @param {!Element} element
 */
export function ensureId(element) {
  if (!element.id) {
    element.id = nextId('ariaElement');
  }
}

/**
 * @param {!Element} element
 * @param {string} valueText
 */
export function setAriaValueText(element, valueText) {
  element.setAttribute('aria-valuetext', valueText);
}

/**
 * @param {!Element} element
 * @param {string} value
 */
export function setAriaValueNow(element, value) {
  element.setAttribute('aria-valuenow', value);
}


/**
 * @param {!Element} element
 * @param {string} min
 * @param {string} max
 */
export function setAriaValueMinMax(element, min, max) {
  element.setAttribute('aria-valuemin', min);
  element.setAttribute('aria-valuemax', max);
}

/**
 * @param {!Element} element
 * @param {?Element} controlledElement
 */
export function setControls(element, controlledElement) {
  if (!controlledElement) {
    element.removeAttribute('aria-controls');
    return;
  }

  ensureId(controlledElement);
  element.setAttribute('aria-controls', controlledElement.id);
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setChecked(element, value) {
  element.setAttribute('aria-checked', !!value);
}

/**
 * @param {!Element} element
 */
export function setCheckboxAsIndeterminate(element) {
  element.setAttribute('aria-checked', 'mixed');
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setDisabled(element, value) {
  element.setAttribute('aria-disabled', !!value);
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setExpanded(element, value) {
  element.setAttribute('aria-expanded', !!value);
}

/**
 * @param {!Element} element
 */
export function unsetExpandable(element) {
  element.removeAttribute('aria-expanded');
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setHidden(element, value) {
  element.setAttribute('aria-hidden', !!value);
}

/**
 * @enum {string}
 */
export const AutocompleteInteractionModel = {
  inline: 'inline',
  list: 'list',
  both: 'both',
  none: 'none',
};

/**
 * @param {!Element} element
 * @param {!AutocompleteInteractionModel=} interactionModel
 */
export function setAutocomplete(element, interactionModel = AutocompleteInteractionModel.none) {
  element.setAttribute('aria-autocomplete', interactionModel);
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setSelected(element, value) {
  // aria-selected behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-selected', !!value);
}

export function clearSelected(element) {
  element.removeAttribute('aria-selected');
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setInvalid(element, value) {
  if (value) {
    element.setAttribute('aria-invalid', value);
  } else {
    element.removeAttribute('aria-invalid');
  }
}

/**
 * @param {!Element} element
 * @param {boolean} value
 */
export function setPressed(element, value) {
  // aria-pressed behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-pressed', !!value);
}

/**
 * @param {!Element} element
 * @param {number} value
 */
export function setValueNow(element, value) {
  element.setAttribute('aria-valuenow', value);
}

export function setValueText(element, value) {
  element.setAttribute('aria-valuetext', value);
}

/**
 * @param {!Element} element
 * @param {number} valueNow
 * @param {string=} valueText
 */
export function setProgressBarValue(element, valueNow, valueText) {
  element.setAttribute('aria-valuenow', valueNow);

  if (valueText) {
    element.setAttribute('aria-valuetext', valueText);
  }
}

/**
 * @param {!Element} element
 * @param {string} name
 */
export function setAccessibleName(element, name) {
  element.setAttribute('aria-label', name);
}

/** @type {!WeakMap<!Element, !Element>} */
const _descriptionMap = new WeakMap();

/**
 * @param {!Element} element
 * @param {string} description
 */
export function setDescription(element, description) {
  // Nodes in the accessibility tree are made up of a core
  // triplet of "name", "value", "description"
  // The "description" field is taken from either
  // 1. The title html attribute
  // 2. The value of the aria-description attribute.
  // 3. The textContent of an element specified by aria-describedby
  //
  // The title attribute has the side effect of causing tooltips
  // to appear with the description when the element is hovered.
  // This is usually fine, except that DevTools has its own styled
  // tooltips which would interfere with the browser tooltips.
  //
  // In future, the aria-description attribute may be used once it
  // is unflagged.
  //
  // aria-describedby requires that an extra element exist in DOM
  // that this element can point to. Both elements also have to
  // be in the same shadow root. This is not trivial to manage.
  // The rest of DevTools shouldn't have to worry about this,
  // so there is some unfortunate code below.

  if (_descriptionMap.has(element)) {
    _descriptionMap.get(element).remove();
  }
  element.removeAttribute('data-aria-utils-animation-hack');

  if (!description) {
    _descriptionMap.delete(element);
    element.removeAttribute('aria-describedby');
    return;
  }

  // We make a hidden element that contains the decsription
  // and will be pointed to by aria-describedby.
  const descriptionElement = createElement('span');
  descriptionElement.textContent = description;
  descriptionElement.style.display = 'none';
  ensureId(descriptionElement);
  element.setAttribute('aria-describedby', descriptionElement.id);
  _descriptionMap.set(element, descriptionElement);

  // Now we have to actually put this description element
  // somewhere in the DOM so that we can point to it.
  // It would be nice to just put it in the body, but that
  // wouldn't work if the main element is in a shadow root.
  // So the cleanest approach is to add the description element
  // as a child of the main element. But wait! Some HTML elements
  // aren't supposed to have children. Blink won't search inside
  // these elements, and won't find our description element.
  const contentfulVoidTags = new Set(['INPUT', 'IMG']);
  if (!contentfulVoidTags.has(element.tagName)) {
    element.appendChild(descriptionElement);
    // If we made it here, someone setting .textContent
    // or removeChildren on the element will blow away
    // our description. At least we tried our best!
    return;
  }

  // We have some special element, like an <input>, where putting the
  // description element inside it doesn't work.
  // Lets try the next best thing, and just put the description element
  // next to it in the DOM.
  const inserted = element.insertAdjacentElement('afterend', descriptionElement);
  if (inserted) {
    return;
  }

  // Uh oh, the insertion didn't work! That means we aren't currently in the DOM.
  // How can we find out when the element enters the DOM?
  // See inspectorCommon.css
  element.setAttribute('data-aria-utils-animation-hack', 'sorry');
  element.addEventListener('animationend', () => {
    // Someone might have made a new description in the meantime.
    if (_descriptionMap.get(element) !== descriptionElement) {
      return;
    }
    element.removeAttribute('data-aria-utils-animation-hack');

    // Try it again. This time we are in the DOM, so it *should* work.
    element.insertAdjacentElement('afterend', descriptionElement);
  }, {once: true});
}

/**
 * @param {!Element} element
 * @param {?Element} activedescendant
 */
export function setActiveDescendant(element, activedescendant) {
  if (!activedescendant) {
    element.removeAttribute('aria-activedescendant');
    return;
  }

  console.assert(element.hasSameShadowRoot(activedescendant), 'elements are not in the same shadow dom');

  ensureId(activedescendant);
  element.setAttribute('aria-activedescendant', activedescendant.id);
}

/**
 * @param {!Element} element
 */
function hideFromLayout(element) {
  element.style.position = 'absolute';
  element.style.left = '-999em';
  element.style.width = '100em';
  element.style.overflow = 'hidden';
}

const AlertElementSymbol = Symbol('AlertElementSybmol');
const MessageElementSymbol = Symbol('MessageElementSymbol');

/**
 * This function is used to announce a message with the screen reader.
 * Setting the textContent would allow the SR to access the offscreen element via browse mode
 * Due to existing NVDA bugs (https://github.com/nvaccess/nvda/issues/10140), setting the
 * aria-label of the alert element results in the message being read twice.
 * The current workaround is to set the aria-describedby of the alert element
 * to a description element where the aria-label is set to the message.
 * @param {string} message
 * @param {!Element} element
 */
export function alert(message, element) {
  const document = element.ownerDocument;
  const messageElementId = 'ariaLiveMessageElement';
  if (!document[MessageElementSymbol]) {
    const messageElement = document.body.createChild('div');
    messageElement.id = messageElementId;
    hideFromLayout(messageElement);
    document[MessageElementSymbol] = messageElement;
  }
  if (!document[AlertElementSymbol]) {
    const alertElement = document.body.createChild('div');
    hideFromLayout(alertElement);
    alertElement.setAttribute('role', 'alert');
    alertElement.setAttribute('aria-atomic', 'true');
    alertElement.setAttribute('aria-describedby', messageElementId);
    document[AlertElementSymbol] = alertElement;
  }
  setAccessibleName(document[MessageElementSymbol], message.trimEndWithMaxLength(10000));
}
