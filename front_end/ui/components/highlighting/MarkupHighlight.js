// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../../models/text_utils/text_utils.js';
export const highlightedSearchResultClassName = 'highlighted-search-result';
export const highlightedCurrentSearchResultClassName = 'current-search-result';
export function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes) {
    changes = changes || [];
    const highlightNodes = [];
    const textNodes = element.childTextNodes();
    const lineText = textNodes
        .map(function (node) {
        return node.textContent;
    })
        .join('');
    const ownerDocument = element.ownerDocument;
    if (textNodes.length === 0) {
        return highlightNodes;
    }
    const nodeRanges = [];
    let rangeEndOffset = 0;
    for (const textNode of textNodes) {
        const range = new TextUtils.TextRange.SourceRange(rangeEndOffset, textNode.textContent ? textNode.textContent.length : 0);
        rangeEndOffset = range.offset + range.length;
        nodeRanges.push(range);
    }
    let startIndex = 0;
    for (let i = 0; i < resultRanges.length; ++i) {
        const startOffset = resultRanges[i].offset;
        const endOffset = startOffset + resultRanges[i].length;
        while (startIndex < textNodes.length &&
            nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset) {
            startIndex++;
        }
        let endIndex = startIndex;
        while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset) {
            endIndex++;
        }
        if (endIndex === textNodes.length) {
            break;
        }
        const highlightNode = ownerDocument.createElement('span');
        highlightNode.className = styleClass;
        highlightNode.textContent = lineText.substring(startOffset, endOffset);
        const lastTextNode = textNodes[endIndex];
        const lastText = lastTextNode.textContent || '';
        lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
        changes.push({
            node: lastTextNode,
            type: 'changed',
            oldText: lastText,
            newText: lastTextNode.textContent,
            nextSibling: undefined,
            parent: undefined,
        });
        if (startIndex === endIndex && lastTextNode.parentElement) {
            lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
            changes.push({
                node: highlightNode,
                type: 'added',
                nextSibling: lastTextNode,
                parent: lastTextNode.parentElement,
                oldText: undefined,
                newText: undefined,
            });
            highlightNodes.push(highlightNode);
            const prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
            lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
            changes.push({
                node: prefixNode,
                type: 'added',
                nextSibling: highlightNode,
                parent: lastTextNode.parentElement,
                oldText: undefined,
                newText: undefined,
            });
        }
        else {
            const firstTextNode = textNodes[startIndex];
            const firstText = firstTextNode.textContent || '';
            const anchorElement = firstTextNode.nextSibling;
            if (firstTextNode.parentElement) {
                firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
                changes.push({
                    node: highlightNode,
                    type: 'added',
                    nextSibling: anchorElement || undefined,
                    parent: firstTextNode.parentElement,
                    oldText: undefined,
                    newText: undefined,
                });
                highlightNodes.push(highlightNode);
            }
            firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
            changes.push({
                node: firstTextNode,
                type: 'changed',
                oldText: firstText,
                newText: firstTextNode.textContent,
                nextSibling: undefined,
                parent: undefined,
            });
            for (let j = startIndex + 1; j < endIndex; j++) {
                const textNode = textNodes[j];
                const text = textNode.textContent;
                textNode.textContent = '';
                changes.push({
                    node: textNode,
                    type: 'changed',
                    oldText: text || undefined,
                    newText: textNode.textContent,
                    nextSibling: undefined,
                    parent: undefined,
                });
            }
        }
        startIndex = endIndex;
        nodeRanges[startIndex].offset = endOffset;
        nodeRanges[startIndex].length = lastTextNode.textContent.length;
    }
    return highlightNodes;
}
export function revertDomChanges(domChanges) {
    for (let i = domChanges.length - 1; i >= 0; --i) {
        const entry = domChanges[i];
        switch (entry.type) {
            case 'added':
                entry.node.remove();
                break;
            case 'changed':
                entry.node.textContent = entry.oldText ?? null;
                break;
        }
    }
}
//# sourceMappingURL=MarkupHighlight.js.map