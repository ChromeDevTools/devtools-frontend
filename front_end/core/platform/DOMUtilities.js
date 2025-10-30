// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * `document.activeElement` will not enter shadow roots to find the element
 * that has focus; use this method if you need to traverse through any shadow
 * roots to find the actual, specific focused element.
 */
export function deepActiveElement(doc) {
    let activeElement = doc.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
        activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
}
export function getEnclosingShadowRootForNode(node) {
    let parentNode = node.parentNodeOrShadowHost();
    while (parentNode) {
        if (parentNode instanceof ShadowRoot) {
            return parentNode;
        }
        parentNode = parentNode.parentNodeOrShadowHost();
    }
    return null;
}
export function rangeOfWord(rootNode, offset, stopCharacters, stayWithinNode, direction) {
    let startNode;
    let startOffset = 0;
    let endNode;
    let endOffset = 0;
    if (!stayWithinNode) {
        stayWithinNode = rootNode;
    }
    if (!direction || direction === 'backward' || direction === 'both') {
        let node = rootNode;
        while (node) {
            if (node === stayWithinNode) {
                if (!startNode) {
                    startNode = stayWithinNode;
                }
                break;
            }
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue !== null) {
                const start = (node === rootNode ? (offset - 1) : (node.nodeValue.length - 1));
                for (let i = start; i >= 0; --i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        startNode = node;
                        startOffset = i + 1;
                        break;
                    }
                }
            }
            if (startNode) {
                break;
            }
            node = node.traversePreviousNode(stayWithinNode);
        }
        if (!startNode) {
            startNode = stayWithinNode;
            startOffset = 0;
        }
    }
    else {
        startNode = rootNode;
        startOffset = offset;
    }
    if (!direction || direction === 'forward' || direction === 'both') {
        let node = rootNode;
        while (node) {
            if (node === stayWithinNode) {
                if (!endNode) {
                    endNode = stayWithinNode;
                }
                break;
            }
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue !== null) {
                const start = (node === rootNode ? offset : 0);
                for (let i = start; i < node.nodeValue.length; ++i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        endNode = node;
                        endOffset = i;
                        break;
                    }
                }
            }
            if (endNode) {
                break;
            }
            node = node.traverseNextNode(stayWithinNode);
        }
        if (!endNode) {
            endNode = stayWithinNode;
            endOffset = stayWithinNode.nodeType === Node.TEXT_NODE ? stayWithinNode.nodeValue?.length || 0 :
                stayWithinNode.childNodes.length;
        }
    }
    else {
        endNode = rootNode;
        endOffset = offset;
    }
    if (!rootNode.ownerDocument) {
        throw new Error('No `ownerDocument` found for rootNode');
    }
    const result = rootNode.ownerDocument.createRange();
    result.setStart(startNode, startOffset);
    result.setEnd(endNode, endOffset);
    return result;
}
/**
 * Appends the list of `styles` as individual `<style>` elements to the
 * given `node`.
 *
 * @param node the `Node` to append the `<style>` elements to.
 * @param styles an optional list of styles to append to the `node`.
 */
export function appendStyle(node, ...styles) {
    for (const cssText of styles) {
        const style = (node.ownerDocument ?? document).createElement('style');
        style.textContent = cssText;
        node.appendChild(style);
    }
}
//# sourceMappingURL=DOMUtilities.js.map