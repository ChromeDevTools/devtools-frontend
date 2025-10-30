// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { createTokenizer } from './FormatterWorker.js';
const cssTrimEnd = (tokenValue) => {
    // https://drafts.csswg.org/css-syntax/#whitespace
    const re = /(?:\r?\n|[\t\f\r ])+$/g;
    return tokenValue.replace(re, '');
};
export class CSSFormatter {
    #builder;
    #toOffset;
    #fromOffset;
    #lineEndings;
    #lastLine;
    #state;
    constructor(builder) {
        this.#builder = builder;
        this.#lastLine = -1;
        this.#state = {
            eatWhitespace: undefined,
            seenProperty: undefined,
            inPropertyValue: undefined,
            afterClosingBrace: undefined,
        };
    }
    format(text, lineEndings, fromOffset, toOffset) {
        this.#lineEndings = lineEndings;
        this.#fromOffset = fromOffset;
        this.#toOffset = toOffset;
        this.#state = {
            eatWhitespace: undefined,
            seenProperty: undefined,
            inPropertyValue: undefined,
            afterClosingBrace: undefined,
        };
        this.#lastLine = -1;
        const tokenize = createTokenizer('text/css');
        const oldEnforce = this.#builder.setEnforceSpaceBetweenWords(false);
        tokenize(text.substring(this.#fromOffset, this.#toOffset), this.#tokenCallback.bind(this));
        this.#builder.setEnforceSpaceBetweenWords(oldEnforce);
    }
    #tokenCallback(token, type, startPosition) {
        startPosition += this.#fromOffset;
        const startLine = Platform.ArrayUtilities.lowerBound(this.#lineEndings, startPosition, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
        if (startLine !== this.#lastLine) {
            this.#state.eatWhitespace = true;
        }
        if (type && (/^property/.test(type) || /^variable-2/.test(type)) && !this.#state.inPropertyValue) {
            this.#state.seenProperty = true;
        }
        this.#lastLine = startLine;
        // https://drafts.csswg.org/css-syntax/#whitespace
        const isWhitespace = /^(?:\r?\n|[\t\f\r ])+$/.test(token);
        if (isWhitespace) {
            if (!this.#state.eatWhitespace) {
                this.#builder.addSoftSpace();
            }
            return;
        }
        this.#state.eatWhitespace = false;
        if (token === '\n') {
            return;
        }
        if (token !== '}') {
            if (this.#state.afterClosingBrace) {
                this.#builder.addNewLine(true);
            }
            this.#state.afterClosingBrace = false;
        }
        if (token === '}') {
            if (this.#state.inPropertyValue) {
                this.#builder.addNewLine();
            }
            this.#builder.decreaseNestingLevel();
            this.#state.afterClosingBrace = true;
            this.#state.inPropertyValue = false;
        }
        else if (token === ':' && !this.#state.inPropertyValue && this.#state.seenProperty) {
            this.#builder.addToken(token, startPosition);
            this.#builder.addSoftSpace();
            this.#state.eatWhitespace = true;
            this.#state.inPropertyValue = true;
            this.#state.seenProperty = false;
            return;
        }
        else if (token === '{') {
            this.#builder.addSoftSpace();
            this.#builder.addToken(token, startPosition);
            this.#builder.addNewLine();
            this.#builder.increaseNestingLevel();
            return;
        }
        this.#builder.addToken(cssTrimEnd(token), startPosition);
        if (type === 'comment' && !this.#state.inPropertyValue && !this.#state.seenProperty) {
            this.#builder.addNewLine();
        }
        if (token === ';' && this.#state.inPropertyValue) {
            this.#state.inPropertyValue = false;
            this.#builder.addNewLine();
        }
        else if (token === '}') {
            this.#builder.addNewLine();
        }
    }
}
//# sourceMappingURL=CSSFormatter.js.map