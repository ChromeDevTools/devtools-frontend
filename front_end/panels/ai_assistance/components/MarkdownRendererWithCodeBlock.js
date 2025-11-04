// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
/**
 * The model returns multiline code blocks in an erroneous way with the language being in new line.
 * This renderer takes that into account and correctly updates the parsed multiline token with the language
 * correctly identified and stripped from the content.
 * Example:
 * ```
 * css <-- This should have been on the first line.
 * * {
 * color: red;
 * }
 * ```
 **/
export class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
    templateForToken(token) {
        if (token.type === 'code') {
            const lines = (token.text).split('\n');
            if (lines[0]?.trim() === 'css') {
                token.lang = 'css';
                token.text = lines.slice(1).join('\n');
            }
        }
        return super.templateForToken(token);
    }
}
//# sourceMappingURL=MarkdownRendererWithCodeBlock.js.map