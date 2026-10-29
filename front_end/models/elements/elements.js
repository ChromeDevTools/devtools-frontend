var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/elements/ChangeTrackingUtils.ts
var ChangeTrackingUtils_exports = {};
__export(ChangeTrackingUtils_exports, {
  MAX_VALUE_LENGTH: () => MAX_VALUE_LENGTH,
  buildAnchor: () => buildAnchor,
  trimValue: () => trimValue
});
import * as Platform from "../../core/platform/platform.js";
var MAX_VALUE_LENGTH = 100;
function trimValue(value) {
  return Platform.StringUtilities.trimMiddle(value.trim(), MAX_VALUE_LENGTH);
}
function buildAnchor(vePath, node, textSignature) {
  return {
    vePath,
    ...textSignature ? { textSignature } : {},
    ...node ? {
      node: {
        backendNodeId: node.backendNodeId(),
        targetId: node.domModel().target().id()
      }
    } : {}
  };
}

// ../../front_end/models/elements/DOMChanges.ts
var DOMChanges_exports = {};
__export(DOMChanges_exports, {
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
var DOM_TREE_VE_PATH = "Panel: elements > Tree: elements > TreeItem";
var ELEMENT_PLACEHOLDER_TEXT_SIGNATURE = "element";
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
  tracker.trackChange(
    describeAttributeEdit(edit),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackTagNameEdit(tracker, node, selector, oldTagName, newTagName) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeTagNameEdit(oldTagName, newTagName),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackTextNodeEdit(tracker, node, selector, oldText, newText) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeTextNodeEdit(oldText, newText),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackNodeRemoval(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeNodeRemoval(node.nodeName().toLowerCase()),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackHTMLEdit(tracker, node, selector, oldValue, newValue) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeHTMLEdit(oldValue, newValue),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackVisibilityToggle(tracker, node, selector, hidden) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeVisibilityToggle(node.nodeName().toLowerCase(), hidden),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackNodeDuplication(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeNodeDuplication(node.nodeName().toLowerCase()),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackNodeMove(tracker, node, selector, directionUp) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeNodeMove(node.nodeName().toLowerCase(), directionUp),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackNodeDrop(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeNodeDrop(node.nodeName().toLowerCase()),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
}
function trackNodePaste(tracker, node, selector, isCut) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(
    describeNodePaste(node.nodeName().toLowerCase(), isCut),
    buildAnchor(DOM_TREE_VE_PATH, node, selector ?? ELEMENT_PLACEHOLDER_TEXT_SIGNATURE)
  );
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

// ../../front_end/models/elements/StyleChanges.ts
var StyleChanges_exports = {};
__export(StyleChanges_exports, {
  trackKeyframeKeyChange: () => trackKeyframeKeyChange,
  trackPropertyRuleNameChange: () => trackPropertyRuleNameChange,
  trackStylePropertyEdit: () => trackStylePropertyEdit,
  trackStylePropertyToggle: () => trackStylePropertyToggle,
  trackStyleQueryChange: () => trackStyleQueryChange,
  trackStyleRuleAdded: () => trackStyleRuleAdded,
  trackStyleSelectorChange: () => trackStyleSelectorChange
});
import * as Platform2 from "../../core/platform/platform.js";
var STYLES_PANE_VE_PATH = "Panel: elements > Pane: styles";
function formatRuleSuffix(preposition, ruleHeader) {
  const trimmedRule = ruleHeader ? Platform2.StringUtilities.collapseWhitespace(ruleHeader.trim()) : "";
  return trimmedRule ? ` ${preposition} rule "${trimValue(trimmedRule)}"` : "";
}
function describeStylePropertyEdit({ ruleHeader, oldName, oldValue, newName, newValue }) {
  if (!newName) {
    return `Removed style property "${trimValue(oldName)}: ${trimValue(oldValue)}"${formatRuleSuffix("from", ruleHeader)}`;
  }
  if (!oldName) {
    return `Added style property "${trimValue(newName)}: ${trimValue(newValue)}"${formatRuleSuffix("to", ruleHeader)}`;
  }
  if (oldName !== newName) {
    return `Changed style property from "${trimValue(oldName)}: ${trimValue(oldValue)}" to "${trimValue(newName)}: ${trimValue(newValue)}"${formatRuleSuffix("in", ruleHeader)}`;
  }
  return `Changed style property "${trimValue(newName)}" from "${trimValue(oldValue)}" to "${trimValue(newValue)}"${formatRuleSuffix("in", ruleHeader)}`;
}
function describeStylePropertyToggle({ ruleHeader, name, value, disabled }) {
  const action = disabled ? "Disabled" : "Enabled";
  return `${action} style property "${trimValue(name)}: ${trimValue(value)}"${formatRuleSuffix("in", ruleHeader)}`;
}
function trackStylePropertyEdit(tracker, node, edit) {
  if (!tracker?.isTracking) {
    return;
  }
  const oldName = edit.oldName.trim();
  const oldValue = edit.oldValue.trim();
  const newName = edit.newName.trim();
  const newValue = edit.newValue.trim();
  if (oldName === newName && oldValue === newValue) {
    return;
  }
  tracker.trackChange(
    describeStylePropertyEdit({ ruleHeader: edit.ruleHeader, oldName, oldValue, newName, newValue }),
    buildAnchor(STYLES_PANE_VE_PATH, node)
  );
}
function trackStylePropertyToggle(tracker, node, toggle) {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeStylePropertyToggle(toggle), buildAnchor(STYLES_PANE_VE_PATH, node));
}
function trackStyleRuleAdded(tracker, node, selector) {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedSelector = Platform2.StringUtilities.collapseWhitespace(selector.trim());
  if (!trimmedSelector) {
    return;
  }
  tracker.trackChange(
    `Added style rule "${trimValue(trimmedSelector)}"`,
    buildAnchor(STYLES_PANE_VE_PATH, node)
  );
}
function trackRuleHeaderChange(tracker, node, headerDescription, oldText, newText) {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedOld = Platform2.StringUtilities.collapseWhitespace(oldText.trim());
  const trimmedNew = Platform2.StringUtilities.collapseWhitespace(newText.trim());
  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
    return;
  }
  tracker.trackChange(
    `Changed ${headerDescription} from "${trimValue(trimmedOld)}" to "${trimValue(trimmedNew)}"`,
    buildAnchor(STYLES_PANE_VE_PATH, node)
  );
}
function trackStyleSelectorChange(tracker, node, oldSelector, newSelector) {
  trackRuleHeaderChange(tracker, node, "style rule selector", oldSelector, newSelector);
}
function trackPropertyRuleNameChange(tracker, node, oldName, newName) {
  trackRuleHeaderChange(tracker, node, "@property rule name", oldName, newName);
}
function trackKeyframeKeyChange(tracker, node, oldKey, newKey) {
  trackRuleHeaderChange(tracker, node, "keyframe key", oldKey, newKey);
}
function describeStyleQueryChange(queryType, oldQuery, newQuery) {
  if (!newQuery) {
    return `Cleared ${queryType} query "${trimValue(oldQuery)}"`;
  }
  return `Changed ${queryType} query from "${trimValue(oldQuery)}" to "${trimValue(newQuery)}"`;
}
function trackStyleQueryChange(tracker, node, queryType, oldQuery, newQuery) {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedOld = Platform2.StringUtilities.collapseWhitespace(oldQuery.trim());
  const trimmedNew = Platform2.StringUtilities.collapseWhitespace(newQuery.trim());
  if (trimmedOld === trimmedNew) {
    return;
  }
  if (!trimmedOld) {
    return;
  }
  if (!trimmedNew && queryType !== "@media" && queryType !== "@scope") {
    return;
  }
  tracker.trackChange(
    describeStyleQueryChange(queryType, trimmedOld, trimmedNew),
    buildAnchor(STYLES_PANE_VE_PATH, node)
  );
}
export {
  ChangeTrackingUtils_exports as ChangeTrackingUtils,
  DOMChanges_exports as DOMChanges,
  ElementUpdateRecord_exports as ElementUpdateRecord,
  StyleChanges_exports as StyleChanges
};
//# sourceMappingURL=elements.js.map
