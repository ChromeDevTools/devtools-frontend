// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { Dialog } from './Dialog.js';
import { getEnclosingShadowRootForNode } from './DOMUtilities.js';
let id = 0;
export function nextId(prefix) {
    return (prefix || '') + ++id;
}
export function bindLabelToControl(label, control) {
    const controlId = nextId('labelledControl');
    control.id = controlId;
    label.setAttribute('for', controlId);
}
export function markAsAlert(element) {
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
}
export function markAsApplication(element) {
    element.setAttribute('role', 'application');
}
export function markAsButton(element) {
    element.setAttribute('role', 'button');
}
export function markAsCheckbox(element) {
    element.setAttribute('role', 'checkbox');
}
export function markAsCombobox(element) {
    element.setAttribute('role', 'combobox');
}
export function markAsModalDialog(element) {
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
}
export function markAsGroup(element) {
    element.setAttribute('role', 'group');
}
export function markAsLink(element) {
    element.setAttribute('role', 'link');
}
export function markAsMenuButton(element) {
    markAsButton(element);
    element.setAttribute('aria-haspopup', 'true');
}
export function markAsProgressBar(element, min = 0, max = 100) {
    element.setAttribute('role', 'progressbar');
    element.setAttribute('aria-valuemin', min.toString());
    element.setAttribute('aria-valuemax', max.toString());
}
export function markAsTab(element) {
    element.setAttribute('role', 'tab');
}
export function markAsTablist(element) {
    element.setAttribute('role', 'tablist');
}
export function markAsTabpanel(element) {
    element.setAttribute('role', 'tabpanel');
}
export function markAsTree(element) {
    element.setAttribute('role', 'tree');
}
export function markAsTreeitem(element) {
    element.setAttribute('role', 'treeitem');
}
export function markAsTextBox(element) {
    element.setAttribute('role', 'textbox');
}
export function markAsMenu(element) {
    element.setAttribute('role', 'menu');
}
export function markAsMenuItem(element) {
    element.setAttribute('role', 'menuitem');
}
export function markAsMenuItemCheckBox(element) {
    element.setAttribute('role', 'menuitemcheckbox');
}
export function markAsMenuItemSubMenu(element) {
    markAsMenuItem(element);
    element.setAttribute('aria-haspopup', 'true');
}
export function markAsList(element) {
    element.setAttribute('role', 'list');
}
export function markAsListitem(element) {
    element.setAttribute('role', 'listitem');
}
export function markAsMain(element) {
    element.setAttribute('role', 'main');
}
export function markAsComplementary(element) {
    element.setAttribute('role', 'complementary');
}
export function markAsNavigation(element) {
    element.setAttribute('role', 'navigation');
}
/**
 * Must contain children whose role is option.
 */
export function markAsListBox(element) {
    element.setAttribute('role', 'listbox');
}
export function markAsMultiSelectable(element) {
    element.setAttribute('aria-multiselectable', 'true');
}
/**
 * Must be contained in, or owned by, an element with the role listbox.
 */
export function markAsOption(element) {
    element.setAttribute('role', 'option');
}
export function markAsRadioGroup(element) {
    element.setAttribute('role', 'radiogroup');
}
export function markAsSlider(element, min = 0, max = 100) {
    element.setAttribute('role', 'slider');
    element.setAttribute('aria-valuemin', String(min));
    element.setAttribute('aria-valuemax', String(max));
}
export function markAsHeading(element, level) {
    element.setAttribute('role', 'heading');
    element.setAttribute('aria-level', level.toString());
}
export function markAsPoliteLiveRegion(element, isAtomic) {
    element.setAttribute('aria-live', 'polite');
    if (isAtomic) {
        element.setAttribute('aria-atomic', 'true');
    }
}
export function hasRole(element) {
    return element.hasAttribute('role');
}
export function removeRole(element) {
    element.removeAttribute('role');
}
export function setPlaceholder(element, placeholder) {
    if (placeholder) {
        element.setAttribute('aria-placeholder', placeholder);
    }
    else {
        element.removeAttribute('aria-placeholder');
    }
}
export function markAsPresentation(element) {
    element.setAttribute('role', 'presentation');
}
export function markAsStatus(element) {
    element.setAttribute('role', 'status');
}
export function ensureId(element) {
    if (!element.id) {
        element.id = nextId('ariaElement');
    }
}
export function setAriaValueText(element, valueText) {
    element.setAttribute('aria-valuetext', valueText);
}
export function setAriaValueNow(element, value) {
    element.setAttribute('aria-valuenow', value);
}
export function setAriaValueMinMax(element, min, max) {
    element.setAttribute('aria-valuemin', min);
    element.setAttribute('aria-valuemax', max);
}
export function setControls(element, controlledElement) {
    if (!controlledElement) {
        element.removeAttribute('aria-controls');
        return;
    }
    ensureId(controlledElement);
    element.setAttribute('aria-controls', controlledElement.id);
}
export function setChecked(element, value) {
    element.setAttribute('aria-checked', (Boolean(value)).toString());
}
export function setCheckboxAsIndeterminate(element) {
    element.setAttribute('aria-checked', 'mixed');
}
export function setDisabled(element, value) {
    element.setAttribute('aria-disabled', (Boolean(value)).toString());
}
export function setExpanded(element, value) {
    element.setAttribute('aria-expanded', (Boolean(value)).toString());
}
export function unsetExpandable(element) {
    element.removeAttribute('aria-expanded');
}
export function setHidden(element, value) {
    element.setAttribute('aria-hidden', value.toString());
}
export function setLevel(element, level) {
    element.setAttribute('aria-level', level.toString());
}
export function setAutocomplete(element, interactionModel = "none" /* AutocompleteInteractionModel.NONE */) {
    element.setAttribute('aria-autocomplete', interactionModel);
}
export function clearAutocomplete(element) {
    element.removeAttribute('aria-autocomplete');
}
export function setHasPopup(element, value = "false" /* PopupRole.FALSE */) {
    if (value !== "false" /* PopupRole.FALSE */) {
        element.setAttribute('aria-haspopup', value);
    }
    else {
        element.removeAttribute('aria-haspopup');
    }
}
export function setSelected(element, value) {
    // aria-selected behaves differently for false and undefined.
    // Often times undefined values are unintentionally typed as booleans.
    // Use !! to make sure this is true or false.
    element.setAttribute('aria-selected', (Boolean(value)).toString());
}
export function clearSelected(element) {
    element.removeAttribute('aria-selected');
}
export function setInvalid(element, value) {
    if (value) {
        element.setAttribute('aria-invalid', value.toString());
    }
    else {
        element.removeAttribute('aria-invalid');
    }
}
export function setPressed(element, value) {
    // aria-pressed behaves differently for false and undefined.
    // Often times undefined values are unintentionally typed as booleans.
    // Use !! to make sure this is true or false.
    element.setAttribute('aria-pressed', (Boolean(value)).toString());
}
export function setValueNow(element, value) {
    element.setAttribute('aria-valuenow', value.toString());
}
export function setValueText(element, value) {
    element.setAttribute('aria-valuetext', value.toString());
}
export function setProgressBarValue(element, valueNow, valueText) {
    element.setAttribute('aria-valuenow', valueNow.toString());
    if (valueText) {
        element.setAttribute('aria-valuetext', valueText);
    }
}
export function setLabel(element, name) {
    element.setAttribute('aria-label', name);
}
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
    element.setAttribute('aria-description', description);
}
export function setActiveDescendant(element, activedescendant) {
    if (!activedescendant) {
        element.removeAttribute('aria-activedescendant');
        return;
    }
    if (activedescendant.isConnected && element.isConnected) {
        console.assert(getEnclosingShadowRootForNode(activedescendant) === getEnclosingShadowRootForNode(element), 'elements are not in the same shadow dom');
    }
    ensureId(activedescendant);
    element.setAttribute('aria-activedescendant', activedescendant.id);
}
export function setSetSize(element, size) {
    element.setAttribute('aria-setsize', size.toString());
}
export function setPositionInSet(element, position) {
    element.setAttribute('aria-posinset', position.toString());
}
export class LiveAnnouncer {
    static #announcerElementsByRole = {
        ["alert" /* AnnouncerRole.ALERT */]: new WeakMap(),
        ["status" /* AnnouncerRole.STATUS */]: new WeakMap(),
    };
    static #hideFromLayout(element) {
        element.style.position = 'absolute';
        element.style.left = '-999em';
        element.style.width = '100em';
        element.style.overflow = 'hidden';
    }
    static #createAnnouncerElement(container, role) {
        const element = container.createChild('div');
        LiveAnnouncer.#hideFromLayout(element);
        element.setAttribute('role', role);
        element.setAttribute('aria-atomic', 'true');
        return element;
    }
    static #removeAnnouncerElement(container, role) {
        const element = LiveAnnouncer.#announcerElementsByRole[role].get(container);
        if (element) {
            element.remove();
            LiveAnnouncer.#announcerElementsByRole[role].delete(container);
        }
    }
    /**
     * Announces the provided message using a dedicated ARIA alert element (`role="alert"`).
     * Ensures messages are announced even if identical to the previous message by appending
     * a non-breaking space ('\u00A0') when necessary. This works around screen reader
     * optimizations that might otherwise silence repeated identical alerts. The element's
     * `aria-atomic="true"` attribute ensures the entire message is announced upon change.
     *
     * The alert element is associated with the currently active dialog's content element
     * if a dialog is showing, otherwise defaults to an element associated with the document body.
     * Messages longer than 10000 characters will be trimmed.
     *
     * @param message The message to be announced.
     */
    static #announce(message, role) {
        const dialog = Dialog.getInstance();
        const element = LiveAnnouncer.getOrCreateAnnouncerElement(dialog?.isShowing() ? dialog.contentElement : undefined, role);
        const announcedMessage = element.textContent === message ? `${message}\u00A0` : message;
        element.textContent = Platform.StringUtilities.trimEndWithMaxLength(announcedMessage, 10000);
    }
    static getOrCreateAnnouncerElement(container = document.body, role, opts) {
        const existingAnnouncerElement = LiveAnnouncer.#announcerElementsByRole[role].get(container);
        if (existingAnnouncerElement && existingAnnouncerElement.isConnected && !opts?.force) {
            return existingAnnouncerElement;
        }
        const newAnnouncerElement = LiveAnnouncer.#createAnnouncerElement(container, role);
        LiveAnnouncer.#announcerElementsByRole[role].set(container, newAnnouncerElement);
        return newAnnouncerElement;
    }
    static initializeAnnouncerElements(container = document.body) {
        LiveAnnouncer.getOrCreateAnnouncerElement(container, "alert" /* AnnouncerRole.ALERT */);
        LiveAnnouncer.getOrCreateAnnouncerElement(container, "status" /* AnnouncerRole.STATUS */);
    }
    static removeAnnouncerElements(container = document.body) {
        LiveAnnouncer.#removeAnnouncerElement(container, "alert" /* AnnouncerRole.ALERT */);
        LiveAnnouncer.#removeAnnouncerElement(container, "status" /* AnnouncerRole.STATUS */);
    }
    static alert(message) {
        LiveAnnouncer.#announce(message, "alert" /* AnnouncerRole.ALERT */);
    }
    static status(message) {
        LiveAnnouncer.#announce(message, "status" /* AnnouncerRole.STATUS */);
    }
}
//# sourceMappingURL=ARIAUtils.js.map