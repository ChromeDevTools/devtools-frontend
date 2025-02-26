// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import {Dialog} from './Dialog.js';

let id = 0;

export function nextId(prefix: string): string {
  return (prefix || '') + ++id;
}

export function bindLabelToControl(label: Element, control: Element): void {
  const controlId = nextId('labelledControl');
  control.id = controlId;
  label.setAttribute('for', controlId);
}

export function markAsAlert(element: Element): void {
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
}

export function markAsApplication(element: Element): void {
  element.setAttribute('role', 'application');
}

export function markAsButton(element: Element): void {
  element.setAttribute('role', 'button');
}

export function markAsCheckbox(element: Element): void {
  element.setAttribute('role', 'checkbox');
}

export function markAsCombobox(element: Element): void {
  element.setAttribute('role', 'combobox');
}

export function markAsModalDialog(element: Element): void {
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
}

export function markAsGroup(element: Element): void {
  element.setAttribute('role', 'group');
}

export function markAsLink(element: Element): void {
  element.setAttribute('role', 'link');
}

export function markAsMenuButton(element: Element): void {
  markAsButton(element);
  element.setAttribute('aria-haspopup', 'true');
}

export function markAsProgressBar(element: Element, min: number|undefined = 0, max: number|undefined = 100): void {
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-valuemin', min.toString());
  element.setAttribute('aria-valuemax', max.toString());
}

export function markAsTab(element: Element): void {
  element.setAttribute('role', 'tab');
}

export function markAsTablist(element: Element): void {
  element.setAttribute('role', 'tablist');
}

export function markAsTabpanel(element: Element): void {
  element.setAttribute('role', 'tabpanel');
}

export function markAsTree(element: Element): void {
  element.setAttribute('role', 'tree');
}

export function markAsTreeitem(element: Element): void {
  element.setAttribute('role', 'treeitem');
}

export function markAsTextBox(element: Element): void {
  element.setAttribute('role', 'textbox');
}

export function markAsMenu(element: Element): void {
  element.setAttribute('role', 'menu');
}

export function markAsMenuItem(element: Element): void {
  element.setAttribute('role', 'menuitem');
}

export function markAsMenuItemCheckBox(element: Element): void {
  element.setAttribute('role', 'menuitemcheckbox');
}

export function markAsMenuItemSubMenu(element: Element): void {
  markAsMenuItem(element);
  element.setAttribute('aria-haspopup', 'true');
}

export function markAsList(element: Element): void {
  element.setAttribute('role', 'list');
}

export function markAsListitem(element: Element): void {
  element.setAttribute('role', 'listitem');
}

export function markAsMain(element: Element): void {
  element.setAttribute('role', 'main');
}

export function markAsComplementary(element: Element): void {
  element.setAttribute('role', 'complementary');
}

export function markAsNavigation(element: Element): void {
  element.setAttribute('role', 'navigation');
}

/**
 * Must contain children whose role is option.
 */
export function markAsListBox(element: Element): void {
  element.setAttribute('role', 'listbox');
}

export function markAsMultiSelectable(element: Element): void {
  element.setAttribute('aria-multiselectable', 'true');
}

/**
 * Must be contained in, or owned by, an element with the role listbox.
 */
export function markAsOption(element: Element): void {
  element.setAttribute('role', 'option');
}

export function markAsRadioGroup(element: Element): void {
  element.setAttribute('role', 'radiogroup');
}

export function markAsSlider(element: Element, min: number|undefined = 0, max: number|undefined = 100): void {
  element.setAttribute('role', 'slider');
  element.setAttribute('aria-valuemin', String(min));
  element.setAttribute('aria-valuemax', String(max));
}

export function markAsHeading(element: Element, level: number): void {
  element.setAttribute('role', 'heading');
  element.setAttribute('aria-level', level.toString());
}

export function markAsPoliteLiveRegion(element: Element, isAtomic: boolean): void {
  element.setAttribute('aria-live', 'polite');
  if (isAtomic) {
    element.setAttribute('aria-atomic', 'true');
  }
}

export function hasRole(element: Element): boolean {
  return element.hasAttribute('role');
}

export function removeRole(element: Element): void {
  element.removeAttribute('role');
}

export function setPlaceholder(element: Element, placeholder: string|null): void {
  if (placeholder) {
    element.setAttribute('aria-placeholder', placeholder);
  } else {
    element.removeAttribute('aria-placeholder');
  }
}

export function markAsPresentation(element: Element): void {
  element.setAttribute('role', 'presentation');
}

export function markAsStatus(element: Element): void {
  element.setAttribute('role', 'status');
}

export function ensureId(element: Element): void {
  if (!element.id) {
    element.id = nextId('ariaElement');
  }
}

export function setAriaValueText(element: Element, valueText: string): void {
  element.setAttribute('aria-valuetext', valueText);
}

export function setAriaValueNow(element: Element, value: string): void {
  element.setAttribute('aria-valuenow', value);
}

export function setAriaValueMinMax(element: Element, min: string, max: string): void {
  element.setAttribute('aria-valuemin', min);
  element.setAttribute('aria-valuemax', max);
}

export function setControls(element: Element, controlledElement: Element|null): void {
  if (!controlledElement) {
    element.removeAttribute('aria-controls');
    return;
  }

  ensureId(controlledElement);
  element.setAttribute('aria-controls', controlledElement.id);
}

export function setChecked(element: Element, value: boolean): void {
  element.setAttribute('aria-checked', (Boolean(value)).toString());
}

export function setCheckboxAsIndeterminate(element: Element): void {
  element.setAttribute('aria-checked', 'mixed');
}

export function setDisabled(element: Element, value: boolean): void {
  element.setAttribute('aria-disabled', (Boolean(value)).toString());
}

export function setExpanded(element: Element, value: boolean): void {
  element.setAttribute('aria-expanded', (Boolean(value)).toString());
}

export function unsetExpandable(element: Element): void {
  element.removeAttribute('aria-expanded');
}

export function setHidden(element: Element, value: boolean): void {
  element.setAttribute('aria-hidden', value.toString());
}

export function setLevel(element: Element, level: number): void {
  element.setAttribute('aria-level', level.toString());
}

export const enum AutocompleteInteractionModel {
  INLINE = 'inline',
  LIST = 'list',
  BOTH = 'both',
  NONE = 'none',
}

export function setAutocomplete(
    element: Element, interactionModel: AutocompleteInteractionModel = AutocompleteInteractionModel.NONE): void {
  element.setAttribute('aria-autocomplete', interactionModel);
}

export function clearAutocomplete(element: Element): void {
  element.removeAttribute('aria-autocomplete');
}

export const enum PopupRole {
  FALSE = 'false',       // (default) Indicates the element does not have a popup.
  TRUE = 'true',         // Indicates the popup is a menu.
  MENU = 'menu',         // Indicates the popup is a menu.
  LIST_BOX = 'listbox',  // Indicates the popup is a listbox.
  TREE = 'tree',         // Indicates the popup is a tree.
  GRID = 'grid',         // Indicates the popup is a grid.
  DIALOG = 'dialog',     // Indicates the popup is a dialog.
}

export function setHasPopup(element: Element, value: PopupRole = PopupRole.FALSE): void {
  if (value !== PopupRole.FALSE) {
    element.setAttribute('aria-haspopup', value);
  } else {
    element.removeAttribute('aria-haspopup');
  }
}

export function setSelected(element: Element, value: boolean): void {
  // aria-selected behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-selected', (Boolean(value)).toString());
}

export function clearSelected(element: Element): void {
  element.removeAttribute('aria-selected');
}

export function setInvalid(element: Element, value: boolean): void {
  if (value) {
    element.setAttribute('aria-invalid', value.toString());
  } else {
    element.removeAttribute('aria-invalid');
  }
}

export function setPressed(element: Element, value: boolean): void {
  // aria-pressed behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-pressed', (Boolean(value)).toString());
}

export function setValueNow(element: Element, value: number): void {
  element.setAttribute('aria-valuenow', value.toString());
}

export function setValueText(element: Element, value: number): void {
  element.setAttribute('aria-valuetext', value.toString());
}

export function setProgressBarValue(element: Element, valueNow: number, valueText?: string): void {
  element.setAttribute('aria-valuenow', valueNow.toString());

  if (valueText) {
    element.setAttribute('aria-valuetext', valueText);
  }
}

export function setLabel(element: Element, name: string): void {
  element.setAttribute('aria-label', name);
}

export function setDescription(element: Element, description: string): void {
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

export function setActiveDescendant(element: Element, activedescendant: Element|null): void {
  if (!activedescendant) {
    element.removeAttribute('aria-activedescendant');
    return;
  }

  if (activedescendant.isConnected && element.isConnected) {
    console.assert(
        Platform.DOMUtilities.getEnclosingShadowRootForNode(activedescendant) ===
            Platform.DOMUtilities.getEnclosingShadowRootForNode(element),
        'elements are not in the same shadow dom');
  }

  ensureId(activedescendant);
  element.setAttribute('aria-activedescendant', activedescendant.id);
}

export function setSetSize(element: Element, size: number): void {
  element.setAttribute('aria-setsize', size.toString());
}

export function setPositionInSet(element: Element, position: number): void {
  element.setAttribute('aria-posinset', position.toString());
}

function hideFromLayout(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.left = '-999em';
  element.style.width = '100em';
  element.style.overflow = 'hidden';
}

interface AlertState {
  one: HTMLDivElement;
  two: HTMLDivElement;
  alertToggle: boolean;
}
const alertElements = new WeakMap<HTMLElement, AlertState>();

function createAlertElement(container: HTMLElement): HTMLDivElement {
  const element = container.createChild('div');
  hideFromLayout(element);
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-atomic', 'true');
  return element;
}

export function getOrCreateAlertElements(container: HTMLElement = document.body): AlertState {
  let state = alertElements.get(container);
  if (!state) {
    state = {
      one: createAlertElement(container),
      two: createAlertElement(container),
      alertToggle: false,
    };
    alertElements.set(container, state);
  }
  return state;
}

/**
 * This function instantiates and switches off returning one of two offscreen alert elements.
 * We utilize two alert elements to ensure that alerts with the same string are still registered
 * as changes and trigger screen reader announcement.
 */
export function alertElementInstance(container = document.body): HTMLElement {
  const state = getOrCreateAlertElements(container);
  state.alertToggle = !state.alertToggle;
  if (state.alertToggle) {
    state.two.textContent = '';
    return state.one;
  }
  state.one.textContent = '';
  return state.two;
}

/**
 * This function is used to announce a message with the screen reader.
 * Setting the textContent would allow the SR to access the offscreen element via browse mode
 */
export function alert(message: string): void {
  const dialog = Dialog.getInstance();
  const element = alertElementInstance(dialog?.isShowing() ? dialog.contentElement : undefined);
  element.textContent = Platform.StringUtilities.trimEndWithMaxLength(message, 10000);
}
