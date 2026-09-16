// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as ChangeTracker from '../change_tracker/change_tracker.js';
import type * as CommentManager from '../comment_manager/comment_manager.js';

type Tracker = ChangeTracker.ChangeTracker.ChangeTracker|undefined;

/**
 * Maximum number of characters of page controlled data (tag names, attribute names and values,
 * text node values and HTML) that a change description embeds. The inspected page fully controls
 * these strings and `Changed HTML from ... to ...` in particular can otherwise hold on to the
 * entire subtree of an element.
 */
export const MAX_VALUE_LENGTH = 100;

/** Shortens page controlled data so that both its start and its end stay recognizable. */
function trimValue(value: string): string {
  return Platform.StringUtilities.trimMiddle(value, MAX_VALUE_LENGTH);
}

function buildAnchor(node: SDK.DOMModel.DOMNode,
                     selector = 'element'): CommentManager.CommentManager.CommentAnchorSignature {
  return {
    vePath: 'Panel: elements > Tree: elements > TreeItem',
    textSignature: selector,
    node: {
      backendNodeId: node.backendNodeId(),
      targetId: node.domModel().target().id(),
    },
  };
}

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

export function trackAttributeEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string|undefined,
                                   edit: AttributeEdit): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeAttributeEdit(edit), buildAnchor(node, selector));
}
