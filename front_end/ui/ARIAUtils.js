// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

UI.ARIAUtils = {};
UI.ARIAUtils._id = 0;

/**
 * @param {!Element} label
 * @param {!Element} control
 */
UI.ARIAUtils.bindLabelToControl = function(label, control) {
  const controlId = UI.ARIAUtils.nextId('labelledControl');
  control.id = controlId;
  label.setAttribute('for', controlId);
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsAlert = function(element) {
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsButton = function(element) {
  element.setAttribute('role', 'button');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsCheckbox = function(element) {
  element.setAttribute('role', 'checkbox');
};

/**
 * @param {!Element} element
 * @param {boolean=} modal
 */
UI.ARIAUtils.markAsDialog = function(element, modal) {
  element.setAttribute('role', 'dialog');
  if (modal)
    element.setAttribute('aria-modal', 'true');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsGroup = function(element) {
  element.setAttribute('role', 'group');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsLink = function(element) {
  element.setAttribute('role', 'link');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsMenuButton = function(element) {
  UI.ARIAUtils.markAsButton(element);
  element.setAttribute('aria-haspopup', true);
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsProgressBar = function(element) {
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-valuemin', 0);
  element.setAttribute('aria-valuemax', 100);
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTab = function(element) {
  element.setAttribute('role', 'tab');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTree = function(element) {
  element.setAttribute('role', 'tree');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTreeitem = function(element) {
  element.setAttribute('role', 'treeitem');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTextBox = function(element) {
  element.setAttribute('role', 'textbox');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsMenu = function(element) {
  element.setAttribute('role', 'menu');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsMenuItem = function(element) {
  element.setAttribute('role', 'menuitem');
};

/**
 * Must contain children whose role is option.
 * @param {!Element} element
 */
UI.ARIAUtils.markAsListBox = function(element) {
  element.setAttribute('role', 'listbox');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsMultiSelectable = function(element) {
  element.setAttribute('aria-multiselectable', 'true');
};

/**
 * Must be contained in, or owned by, an element with the role listbox.
 * @param {!Element} element
 */
UI.ARIAUtils.markAsOption = function(element) {
  element.setAttribute('role', 'option');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsRadioGroup = function(element) {
  element.setAttribute('role', 'radiogroup');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsHidden = function(element) {
  element.setAttribute('aria-hidden', 'true');
};

/**
 * @param {!Element} element
 * @param {number} level
 */
UI.ARIAUtils.markAsHeading = function(element, level) {
  element.setAttribute('role', 'heading');
  element.setAttribute('aria-level', level);
};

/**
 * @param {!Element} element
 * @param {?string} placeholder
 */
UI.ARIAUtils.setPlaceholder = function(element, placeholder) {
  if (placeholder)
    element.setAttribute('aria-placeholder', placeholder);
  else
    element.removeAttribute('aria-placeholder');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsPresentation = function(element) {
  element.setAttribute('role', 'presentation');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsStatus = function(element) {
  element.setAttribute('role', 'status');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.ensureId = function(element) {
  if (!element.id)
    element.id = UI.ARIAUtils.nextId('ariaElement');
};

/**
 * @param {string} prefix
 * @return {string}
 */
UI.ARIAUtils.nextId = function(prefix) {
  return (prefix || '') + ++UI.ARIAUtils._id;
};

/**
 * @param {!Element} element
 * @param {?Element} controlledElement
 */
UI.ARIAUtils.setControls = function(element, controlledElement) {
  if (!controlledElement) {
    element.removeAttribute('aria-controls');
    return;
  }

  UI.ARIAUtils.ensureId(controlledElement);
  element.setAttribute('aria-controls', controlledElement.id);
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setChecked = function(element, value) {
  element.setAttribute('aria-checked', !!value);
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setExpanded = function(element, value) {
  element.setAttribute('aria-expanded', !!value);
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.unsetExpanded = function(element) {
  element.removeAttribute('aria-expanded');
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setSelected = function(element, value) {
  // aria-selected behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-selected', !!value);
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setInvalid = function(element, value) {
  if (value)
    element.setAttribute('aria-invalid', value);
  else
    element.removeAttribute('aria-invalid');
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setPressed = function(element, value) {
  // aria-pressed behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-pressed', !!value);
};

/**
 * @param {!Element} element
 * @param {number} value
 */
UI.ARIAUtils.setProgressBarCurrentPercentage = function(element, value) {
  element.setAttribute('aria-valuenow', value);
};

/**
 * @param {!Element} element
 * @param {string} name
 */
UI.ARIAUtils.setAccessibleName = function(element, name) {
  element.setAttribute('aria-label', name);
};

/** @type {!WeakMap<!Element, !Element>} */
UI.ARIAUtils._descriptionMap = new WeakMap();

/**
 * @param {!Element} element
 * @param {string} description
 */
UI.ARIAUtils.setDescription = function(element, description) {
  // Nodes in the accesesibility tree are made up of a core
  // triplet of "name", "value", "description"
  // The "description" field is taken from either
  // 1. The title html attribute
  // 2. The value of the aria-help attribute
  // 3. The textContent of an element specified by aria-describedby
  //
  // The title attribute has the side effect of causing tooltips
  // to appear with the description when the element is hovered.
  // This is usually fine, except that DevTools has its own styled
  // tooltips which would interfere with the browser tooltips.
  //
  // aria-help does what we want with no side effects, but it
  // is deprecated and may be removed in a future version of Blink.
  // Current DevTools needs to be able to work in future browsers,
  // to support debugging old mobile devices. So we can't rely on
  // any APIs that might be removed. There is also no way to feature
  // detect this API.
  //
  // aria-describedby requires that an extra element exist in DOM
  // that this element can point to. Both elements also have to
  // be in the same shadow root. This is not trivial to manage.
  // The rest of DevTools shouldn't have to worry about this,
  // so there is some unfortunate code below.

  if (UI.ARIAUtils._descriptionMap.has(element))
    UI.ARIAUtils._descriptionMap.get(element).remove();
  element.removeAttribute('data-aria-utils-animation-hack');

  if (!description) {
    UI.ARIAUtils._descriptionMap.delete(element);
    element.removeAttribute('aria-describedby');
    return;
  }

  // We make a hidden element that contains the decsription
  // and will be pointed to by aria-describedby.
  const descriptionElement = createElement('span');
  descriptionElement.textContent = description;
  descriptionElement.style.display = 'none';
  UI.ARIAUtils.ensureId(descriptionElement);
  element.setAttribute('aria-describedby', descriptionElement.id);
  UI.ARIAUtils._descriptionMap.set(element, descriptionElement);

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
  if (inserted)
    return;

  // Uh oh, the insertion didn't work! That means we aren't currently in the DOM.
  // How can we find out when the element enters the DOM?
  // See inspectorCommon.css
  element.setAttribute('data-aria-utils-animation-hack', 'sorry');
  element.addEventListener('animationend', () => {
    // Someone might have made a new description in the meantime.
    if (UI.ARIAUtils._descriptionMap.get(element) !== descriptionElement)
      return;
    element.removeAttribute('data-aria-utils-animation-hack');

    // Try it again. This time we are in the DOM, so it *should* work.
    element.insertAdjacentElement('afterend', descriptionElement);
  }, {once: true});
};

/**
 * @param {!Element} element
 * @param {?Element} activedescendant
 */
UI.ARIAUtils.setActiveDescendant = function(element, activedescendant) {
  if (!activedescendant) {
    element.removeAttribute('aria-activedescendant');
    return;
  }

  console.assert(element.hasSameShadowRoot(activedescendant), 'elements are not in the same shadow dom');

  UI.ARIAUtils.ensureId(activedescendant);
  element.setAttribute('aria-activedescendant', activedescendant.id);
};

/**
 * @param {string} message
 * @param {!Element} element
 */
UI.ARIAUtils.alert = function(message, element) {
  const document = element.ownerDocument;
  if (!document[UI.ARIAUtils.AlertElementSymbol]) {
    const alertElement = document.body.createChild('div');
    alertElement.style.position = 'absolute';
    alertElement.style.left = '-999em';
    alertElement.style.width = '100em';
    alertElement.style.overflow = 'hidden';
    alertElement.setAttribute('role', 'alert');
    alertElement.setAttribute('aria-atomic', 'true');
    document[UI.ARIAUtils.AlertElementSymbol] = alertElement;
  }
  document[UI.ARIAUtils.AlertElementSymbol].textContent = message.trimEnd(10000);
};

UI.ARIAUtils.AlertElementSymbol = Symbol('AlertElementSybmol');
