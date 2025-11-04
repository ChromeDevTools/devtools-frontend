// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class ElementUpdateRecord {
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
            this.modifiedAttributes = (new Set());
        }
        this.modifiedAttributes.add(attrName);
    }
    attributeRemoved(attrName) {
        if (this.modifiedAttributes?.has(attrName)) {
            this.modifiedAttributes.delete(attrName);
        }
        if (!this.removedAttributes) {
            this.removedAttributes = (new Set());
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
        return this.removedAttributes !== null && this.removedAttributes !== undefined &&
            Boolean(this.removedAttributes.size);
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
}
//# sourceMappingURL=ElementUpdateRecord.js.map