// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as ChangeTracker from '../change_tracker/change_tracker.js';

import {buildAnchor, trimValue} from './ChangeTrackingUtils.js';

type Tracker = ChangeTracker.ChangeTracker.ChangeTracker|undefined;

const DOM_TREE_VE_PATH = 'Panel: elements > Tree: elements > TreeItem';
const ELEMENT_PLACEHOLDER_TEXT_SIGNATURE = 'element';

/**
 * Parses a raw attribute string (e.g. 'class="btn"', 'data-id=123', or 'disabled')
 * into its attribute name and unquoted value for single-attribute inline edits.
 */
function parseAttributeText(text: string): {name: string, value: string} {
  const trimmed = text.trim();
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) {
    return {name: trimmed, value: ''};
  }
  const name = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if (value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))) {
    value = value.slice(1, -1);
  }
  return {name, value};
}

function describeAddAttribute(attributeName: string, value?: string): string {
  if (value !== undefined && value !== '') {
    return `Added attribute ${trimValue(attributeName)}="${trimValue(value)}"`;
  }
  return `Added attribute "${trimValue(attributeName)}"`;
}

function describeRemoveAttribute(attributeName: string): string {
  return `Removed attribute "${trimValue(attributeName)}"`;
}

/**
 * Describes a modification of an existing attribute, which covers renaming the attribute, changing
 * its value, or both at once. `oldValue` is `undefined` if the previous value is unknown.
 */
function describeAttributeChange(
    oldAttributeName: string,
    oldValue: string|undefined,
    newAttributeName: string,
    newValue: string,
    ): string {
  if (oldAttributeName !== newAttributeName) {
    if (oldValue !== undefined && oldValue !== newValue) {
      return `Renamed attribute "${trimValue(oldAttributeName)}"="${trimValue(oldValue)}" to "${
          trimValue(newAttributeName)}"="${trimValue(newValue)}"`;
    }
    return `Renamed attribute "${trimValue(oldAttributeName)}" to "${trimValue(newAttributeName)}"`;
  }
  if (oldValue !== undefined) {
    return `Changed attribute "${trimValue(newAttributeName)}" from "${trimValue(oldValue)}" to "${
        trimValue(newValue)}"`;
  }
  return `Changed attribute "${trimValue(newAttributeName)}" to "${trimValue(newValue)}"`;
}

export interface AttributeEdit {
  /** Name of the edited attribute, or an empty string when a new attribute is added. */
  attributeName: string;
  /** Raw attribute text before the edit, if there was any. */
  oldText: string|null;
  /** Raw attribute text the user committed. Empty when the attribute is removed. */
  newText: string;
}

function describeAttributeEdit({attributeName, oldText, newText}: AttributeEdit): string {
  const parsedNew = parseAttributeText(newText);
  const parsedOld = oldText !== null ? parseAttributeText(oldText) : undefined;

  if (!newText.trim()) {
    return describeRemoveAttribute(attributeName.trim());
  }
  if (!attributeName.trim()) {
    return describeAddAttribute(parsedNew.name, parsedNew.value);
  }
  return describeAttributeChange(
      attributeName.trim(),
      parsedOld?.value,
      parsedNew.name || attributeName.trim(),
      parsedNew.value,
  );
}

/**
 * These strings are for the consumption by AI agents, they don't need to be translated.
 */
function describeTagNameEdit(oldTagName: string, newTagName: string): string {
  return `Renamed tag from <${trimValue(oldTagName)}> to <${trimValue(newTagName)}>`;
}

function describeTextNodeEdit(oldText: string, newText: string): string {
  return `Changed text from "${trimValue(oldText)}" to "${trimValue(newText)}"`;
}

function describeNodeRemoval(tagName: string): string {
  return `Removed node <${trimValue(tagName)}>`;
}

function describeHTMLEdit(oldValue?: string, newValue?: string): string {
  if (oldValue !== undefined && newValue !== undefined) {
    return `Changed HTML from "${trimValue(oldValue)}" to "${trimValue(newValue)}"`;
  }
  if (newValue !== undefined) {
    return `Changed HTML to "${trimValue(newValue)}"`;
  }
  return 'Edited HTML';
}

function describeVisibilityToggle(tagName: string, hidden: boolean): string {
  return hidden ? `Hid element <${trimValue(tagName)}>` : `Unhid element <${trimValue(tagName)}>`;
}

function describeNodeDuplication(tagName: string): string {
  return `Duplicated node <${trimValue(tagName)}>`;
}

function describeNodeMove(tagName: string, directionUp: boolean): string {
  return `Moved node <${trimValue(tagName)}> ${directionUp ? 'up' : 'down'}`;
}

function describeNodeDrop(tagName: string): string {
  return `Moved node <${trimValue(tagName)}> via drag and drop`;
}

function describeNodePaste(tagName: string, isCut: boolean): string {
  return isCut ? `Pasted (moved) node <${trimValue(tagName)}>` : `Pasted node <${trimValue(tagName)}>`;
}

export function trackAttributeEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                                   edit: AttributeEdit): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeAttributeEdit(edit),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackTagNameEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                                 oldTagName: string, newTagName: string): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeTagNameEdit(oldTagName, newTagName),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackTextNodeEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                                  oldText: string, newText: string): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeTextNodeEdit(oldText, newText),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackNodeRemoval(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeRemoval(node.nodeName().toLowerCase()),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackHTMLEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                              oldValue: string, newValue: string): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeHTMLEdit(oldValue, newValue),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackVisibilityToggle(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                                      hidden: boolean): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeVisibilityToggle(node.nodeName().toLowerCase(), hidden),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackNodeDuplication(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeDuplication(node.nodeName().toLowerCase()),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackNodeMove(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                              directionUp: boolean): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeMove(node.nodeName().toLowerCase(), directionUp),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackNodeDrop(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeDrop(node.nodeName().toLowerCase()),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}

export function trackNodePaste(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                               isCut: boolean): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodePaste(node.nodeName().toLowerCase(), isCut),
                      buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE));
}
