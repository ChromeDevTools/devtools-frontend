// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
const LINE_COMMENT_PATTERN = /^(?:\/\/|#)\s*/;
const BLOCK_COMMENT_START_PATTERN = /^\/\*+\s*/;
const BLOCK_COMMENT_END_PATTERN = /\s*\*+\/$/;
const BLOCK_COMMENT_LINE_PREFIX_PATTERN = /^\s*\*\s?/;
function findLastNonWhitespacePos(state, cursorPosition) {
    const line = state.doc.lineAt(cursorPosition);
    const textBefore = line.text.substring(0, cursorPosition - line.from);
    const effectiveEnd = line.from + textBefore.trimEnd().length;
    return effectiveEnd;
}
function resolveCommentNode(state, cursorPosition) {
    const tree = CodeMirror.syntaxTree(state);
    const lookupPos = findLastNonWhitespacePos(state, cursorPosition);
    // Find the innermost syntax node at the last non-whitespace character position.
    // The bias of -1 makes it check the character to the left of the position.
    const node = tree.resolveInner(lookupPos, -1);
    const nodeType = node.type.name;
    // Check if the node type is a comment AND the cursor is within the node's range.
    if (nodeType.includes('Comment') && cursorPosition >= node.to) {
        if (!nodeType.includes('BlockComment')) {
            return node;
        }
        // An unclosed block comment can result in the parser inserting an error.
        let hasInternalError = false;
        tree.iterate({
            from: node.from,
            to: node.to,
            enter: n => {
                if (n.type.isError) {
                    hasInternalError = true;
                    return false;
                }
                return true;
            },
        });
        return hasInternalError ? undefined : node;
    }
    return;
}
function extractBlockComment(rawText) {
    // Remove /* and */, whitespace, and common leading asterisks on new lines
    let cleaned = rawText.replace(BLOCK_COMMENT_START_PATTERN, '').replace(BLOCK_COMMENT_END_PATTERN, '');
    // Remove leading " * " from multi-line block comments
    cleaned = cleaned.split('\n').map(line => line.replace(BLOCK_COMMENT_LINE_PREFIX_PATTERN, '')).join('\n').trim();
    return cleaned;
}
function extractLineComment(rawText) {
    return rawText.replace(LINE_COMMENT_PATTERN, '').trim();
}
export class AiCodeGenerationParser {
    static extractCommentText(state, cursorPosition) {
        const node = resolveCommentNode(state, cursorPosition);
        if (!node) {
            return;
        }
        const nodeType = node.type.name;
        const rawText = state.doc.sliceString(node.from, node.to);
        if (nodeType.includes('LineComment')) {
            return extractLineComment(rawText);
        }
        if (nodeType.includes('BlockComment')) {
            return extractBlockComment(rawText);
        }
        return rawText;
    }
}
//# sourceMappingURL=AiCodeGenerationParser.js.map