var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/elements/DOMChanges.ts
var DOMChanges_exports = {};
__export(DOMChanges_exports, {
  MAX_VALUE_LENGTH: () => MAX_VALUE_LENGTH,
  trackAttributeEdit: () => trackAttributeEdit,
  trackHTMLEdit: () => trackHTMLEdit,
  trackNodeDrop: () => trackNodeDrop,
  trackNodeDuplication: () => trackNodeDuplication,
  trackNodeMove: () => trackNodeMove,
  trackNodePaste: () => trackNodePaste,
  trackNodeRemoval: () => trackNodeRemoval,
  trackTagNameEdit: () => trackTagNameEdit,
  trackTextNodeEdit: () => trackTextNodeEdit,
  trackVisibilityToggle: () => trackVisibilityToggle
});
import * as Platform from "../../core/platform/platform.js";
var MAX_VALUE_LENGTH = 100;
function trimValue(value) {
  return Platform.StringUtilities.trimMiddle(value, MAX_VALUE_LENGTH);
}
function buildAnchor(node, selector = "element") {
  return {
    vePath: "Panel: elements > Tree: elements > TreeItem",
    textSignature: selector,
    node: {
      backendNodeId: node.backendNodeId(),
      targetId: node.domModel().target().id()
    }
  };
}
function parseAttributeText(text) {
  const trimmed = text.trim();
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) {
    return { name: trimmed, value: "" };
  }
  const name = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if (value.length >= 2 && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { name, value };
}
function describeAddAttribute(attributeName, value) {
  if (value !== void 0 && value !== "") {
    return `Added attribute ${trimValue(attributeName)}="${trimValue(value)}"`;
  }
  return `Added attribute "${trimValue(attributeName)}"`;
}
function describeRemoveAttribute(attributeName) {
  return `Removed attribute "${trimValue(attributeName)}"`;
}
function describeAttributeChange(oldAttributeName, oldValue, newAttributeName, newValue) {
  if (oldAttributeName !== newAttributeName) {
    if (oldValue !== void 0 && oldValue !== newValue) {
      return `Renamed attribute "${trimValue(oldAttributeName)}"="${trimValue(oldValue)}" to "${trimValue(newAttributeName)}"="${trimValue(newValue)}"`;
    }
    return `Renamed attribute "${trimValue(oldAttributeName)}" to "${trimValue(newAttributeName)}"`;
  }
  if (oldValue !== void 0) {
    return `Changed attribute "${trimValue(newAttributeName)}" from "${trimValue(oldValue)}" to "${trimValue(newValue)}"`;
  }
  return `Changed attribute "${trimValue(newAttributeName)}" to "${trimValue(newValue)}"`;
}
function describeAttributeEdit({ attributeName, oldText, newText }) {
  const parsedNew = parseAttributeText(newText);
  const parsedOld = oldText !== null ? parseAttributeText(oldText) : void 0;
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
    parsedNew.value
  );
}
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
  if (oldValue !== void 0 && newValue !== void 0) {
    return `Changed HTML from "${trimValue(oldValue)}" to "${trimValue(newValue)}"`;
  }
  if (newValue !== void 0) {
    return `Changed HTML to "${trimValue(newValue)}"`;
  }
  return "Edited HTML";
}
function describeVisibilityToggle(tagName, hidden) {
  return hidden ? `Hid element <${trimValue(tagName)}>` : `Unhid element <${trimValue(tagName)}>`;
}
function describeNodeDuplication(tagName) {
  return `Duplicated node <${trimValue(tagName)}>`;
}
function describeNodeMove(tagName, directionUp) {
  return `Moved node <${trimValue(tagName)}> ${directionUp ? "up" : "down"}`;
}
function describeNodeDrop(tagName) {
  return `Moved node <${trimValue(tagName)}> via drag and drop`;
}
function describeNodePaste(tagName, isCut) {
  return isCut ? `Pasted (moved) node <${trimValue(tagName)}>` : `Pasted node <${trimValue(tagName)}>`;
}
function trackAttributeEdit(tracker, node, selector, edit) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeAttributeEdit(edit), buildAnchor(node, selector));
}
function trackTagNameEdit(tracker, node, selector, oldTagName, newTagName) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeTagNameEdit(oldTagName, newTagName), buildAnchor(node, selector));
}
function trackTextNodeEdit(tracker, node, selector, oldText, newText) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeTextNodeEdit(oldText, newText), buildAnchor(node, selector));
}
function trackNodeRemoval(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeRemoval(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
function trackHTMLEdit(tracker, node, selector, oldValue, newValue) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeHTMLEdit(oldValue, newValue), buildAnchor(node, selector));
}
function trackVisibilityToggle(tracker, node, selector, hidden) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeVisibilityToggle(node.nodeName().toLowerCase(), hidden), buildAnchor(node, selector));
}
function trackNodeDuplication(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeDuplication(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
function trackNodeMove(tracker, node, selector, directionUp) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeMove(node.nodeName().toLowerCase(), directionUp), buildAnchor(node, selector));
}
function trackNodeDrop(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodeDrop(node.nodeName().toLowerCase()), buildAnchor(node, selector));
}
function trackNodePaste(tracker, node, selector, isCut) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeNodePaste(node.nodeName().toLowerCase(), isCut), buildAnchor(node, selector));
}

// ../../front_end/models/elements/ElementUpdateRecord.ts
var ElementUpdateRecord_exports = {};
__export(ElementUpdateRecord_exports, {
  ElementUpdateRecord: () => ElementUpdateRecord
});
var ElementUpdateRecord = class {
  modifiedAttributes;
  removedAttributes;
  #hasChangedChildren;
  #hasRemovedChildren;
  #charDataModified;
  attributeModified(attrName) {
    if (this.removedAttributes?.has(attrName)) {
      this.removedAttributes.delete(attrName);
    }
    if (!this.modifiedAttributes) {
      this.modifiedAttributes = /* @__PURE__ */ new Set();
    }
    this.modifiedAttributes.add(attrName);
  }
  attributeRemoved(attrName) {
    if (this.modifiedAttributes?.has(attrName)) {
      this.modifiedAttributes.delete(attrName);
    }
    if (!this.removedAttributes) {
      this.removedAttributes = /* @__PURE__ */ new Set();
    }
    this.removedAttributes.add(attrName);
  }
  nodeInserted(_node) {
    this.#hasChangedChildren = true;
  }
  nodeRemoved(_node) {
    this.#hasChangedChildren = true;
    this.#hasRemovedChildren = true;
  }
  charDataModified() {
    this.#charDataModified = true;
  }
  childrenModified() {
    this.#hasChangedChildren = true;
  }
  isAttributeModified(attributeName) {
    return this.modifiedAttributes?.has(attributeName) ?? false;
  }
  hasRemovedAttributes() {
    return this.removedAttributes !== null && this.removedAttributes !== void 0 && Boolean(this.removedAttributes.size);
  }
  isCharDataModified() {
    return Boolean(this.#charDataModified);
  }
  hasChangedChildren() {
    return Boolean(this.#hasChangedChildren);
  }
  hasRemovedChildren() {
    return Boolean(this.#hasRemovedChildren);
  }
};
export {
  DOMChanges_exports as DOMChanges,
  ElementUpdateRecord_exports as ElementUpdateRecord
};
//# sourceMappingURL=elements.js.map
