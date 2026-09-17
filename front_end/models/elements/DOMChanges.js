// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
/**
 * Maximum number of characters of page controlled data (tag names, attribute names and values,
 * text node values and HTML) that a change description embeds. The inspected page fully controls
 * these strings and `Changed HTML from ... to ...` in particular can otherwise hold on to the
 * entire subtree of an element.
 */
export const MAX_VALUE_LENGTH = 100;
/** Shortens page controlled data so that both its start and its end stay recognizable. */
function trimValue(value) {
    return Platform.StringUtilities.trimMiddle(value, MAX_VALUE_LENGTH);
}
function buildAnchor(node, selector = 'element') {
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
function parseAttributeText(text) {
    const trimmed = text.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
        return { name: trimmed, value: '' };
    }
    const name = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))) {
        value = value.slice(1, -1);
    }
    return { name, value };
}
function describeAddAttribute(attributeName, value) {
    if (value !== undefined && value !== '') {
        return `Added attribute ${trimValue(attributeName)}="${trimValue(value)}"`;
    }
    return `Added attribute "${trimValue(attributeName)}"`;
}
function describeRemoveAttribute(attributeName) {
    return `Removed attribute "${trimValue(attributeName)}"`;
}
/**
 * Describes a modification of an existing attribute, which covers renaming the attribute, changing
 * its value, or both at once. `oldValue` is `undefined` if the previous value is unknown.
 */
function describeAttributeChange(oldAttributeName, oldValue, newAttributeName, newValue) {
    if (oldAttributeName !== newAttributeName) {
        if (oldValue !== undefined && oldValue !== newValue) {
            return `Renamed attribute "${trimValue(oldAttributeName)}"="${trimValue(oldValue)}" to "${trimValue(newAttributeName)}"="${trimValue(newValue)}"`;
        }
        return `Renamed attribute "${trimValue(oldAttributeName)}" to "${trimValue(newAttributeName)}"`;
    }
    if (oldValue !== undefined) {
        return `Changed attribute "${trimValue(newAttributeName)}" from "${trimValue(oldValue)}" to "${trimValue(newValue)}"`;
    }
    return `Changed attribute "${trimValue(newAttributeName)}" to "${trimValue(newValue)}"`;
}
function describeAttributeEdit({ attributeName, oldText, newText }) {
    const parsedNew = parseAttributeText(newText);
    const parsedOld = oldText !== null ? parseAttributeText(oldText) : undefined;
    if (!newText.trim()) {
        return describeRemoveAttribute(attributeName.trim());
    }
    if (!attributeName.trim()) {
        return describeAddAttribute(parsedNew.name, parsedNew.value);
    }
    return describeAttributeChange(attributeName.trim(), parsedOld?.value, parsedNew.name || attributeName.trim(), parsedNew.value);
}
/**
 * These strings are for the consumption by AI agents, they don't need to be translated.
 */
function describeTagNameEdit(oldTagName, newTagName) {
    return `Renamed tag from <${trimValue(oldTagName)}> to <${trimValue(newTagName)}>`;
}
function describeTextNodeEdit(oldText, newText) {
    return `Changed text from "${trimValue(oldText)}" to "${trimValue(newText)}"`;
}
function describeNodeRemoval(tagName) {
    return `Removed node <${trimValue(tagName)}>`;
}
function describeHTMLEdit(oldValue, newValue) {
    if (oldValue !== undefined && newValue !== undefined) {
        return `Changed HTML from "${trimValue(oldValue)}" to "${trimValue(newValue)}"`;
    }
    if (newValue !== undefined) {
        return `Changed HTML to "${trimValue(newValue)}"`;
    }
    return 'Edited HTML';
}
function describeVisibilityToggle(tagName, hidden) {
    return hidden ? `Hid element <${trimValue(tagName)}>` : `Unhid element <${trimValue(tagName)}>`;
}
function describeNodeDuplication(tagName) {
    return `Duplicated node <${trimValue(tagName)}>`;
}
function describeNodeMove(tagName, directionUp) {
    return `Moved node <${trimValue(tagName)}> ${directionUp ? 'up' : 'down'}`;
}
function describeNodeDrop(tagName) {
    return `Moved node <${trimValue(tagName)}> via drag and drop`;
}
function describeNodePaste(tagName, isCut) {
    return isCut ? `Pasted (moved) node <${trimValue(tagName)}>` : `Pasted node <${trimValue(tagName)}>`;
}
export function trackAttributeEdit(tracker, node, selector, edit) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeAttributeEdit(edit), buildAnchor(node, selector));
}
export function trackTagNameEdit(tracker, node, selector, oldTagName, newTagName) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeTagNameEdit(oldTagName, newTagName), buildAnchor(node, selector));
}
export function trackTextNodeEdit(tracker, node, selector, oldText, newText) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeTextNodeEdit(oldText, newText), buildAnchor(node, selector));
}
export function trackNodeRemoval(tracker, node, selector) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeNodeRemoval(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
export function trackHTMLEdit(tracker, node, selector, oldValue, newValue) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeHTMLEdit(oldValue, newValue), buildAnchor(node, selector));
}
export function trackVisibilityToggle(tracker, node, selector, hidden) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeVisibilityToggle(node.nodeName().toLowerCase(), hidden), buildAnchor(node, selector));
}
export function trackNodeDuplication(tracker, node, selector) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeNodeDuplication(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
export function trackNodeMove(tracker, node, selector, directionUp) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeNodeMove(node.nodeName().toLowerCase(), directionUp), buildAnchor(node, selector));
}
export function trackNodeDrop(tracker, node, selector) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeNodeDrop(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
export function trackNodePaste(tracker, node, selector, isCut) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeNodePaste(node.nodeName().toLowerCase(), isCut), buildAnchor(node, selector));
}
//# sourceMappingURL=DOMChanges.js.map