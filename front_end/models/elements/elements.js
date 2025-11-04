var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/elements/ElementUpdateRecord.js
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
  ElementUpdateRecord_exports as ElementUpdateRecord
};
//# sourceMappingURL=elements.js.map
