// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.CSSParserStates = {
    Initial: "Initial",
    Selector: "Selector",
    Style: "Style",
    PropertyName: "PropertyName",
    PropertyValue: "PropertyValue",
    AtRule: "AtRule"
};

/**
 * @param {string} text
 */
WebInspector.parseCSS = function(text)
{
    WebInspector._innerParseCSS(text, postMessage);
}

/**
 * @param {string} text
 * @param {function(*)} chunkCallback
 */
WebInspector._innerParseCSS = function(text, chunkCallback)
{
    var chunkSize = 100000; // characters per data chunk
    var lines = text.split("\n");
    var rules = [];
    var processedChunkCharacters = 0;

    var state = WebInspector.CSSParserStates.Initial;
    var rule;
    var property;
    var UndefTokenType = new Set();

    var disabledRules = [];
    function disabledRulesCallback(chunk)
    {
        disabledRules = disabledRules.concat(chunk.chunk);
    }

    /**
     * @param {string} tokenValue
     * @param {?string} tokenTypes
     * @param {number} column
     * @param {number} newColumn
     */
    function processToken(tokenValue, tokenTypes, column, newColumn)
    {
        var tokenType = tokenTypes ? new Set(tokenTypes.split(" ")) : UndefTokenType;
        switch (state) {
        case WebInspector.CSSParserStates.Initial:
            if (tokenType.has("qualifier") || tokenType.has("builtin") || tokenType.has("tag")) {
                rule = {
                    selectorText: tokenValue,
                    lineNumber: lineNumber,
                    columnNumber: column,
                    properties: [],
                };
                state = WebInspector.CSSParserStates.Selector;
            } else if (tokenType.has("def")) {
                rule = {
                    atRule: tokenValue,
                    lineNumber: lineNumber,
                    columnNumber: column,
                };
                state = WebInspector.CSSParserStates.AtRule;
            }
            break;
        case WebInspector.CSSParserStates.Selector:
            if (tokenValue === "{" && tokenType === UndefTokenType) {
                rule.selectorText = rule.selectorText.trim();
                rule.styleRange = createRange(lineNumber, newColumn);
                state = WebInspector.CSSParserStates.Style;
            } else {
                rule.selectorText += tokenValue;
            }
            break;
        case WebInspector.CSSParserStates.AtRule:
            if ((tokenValue === ";" || tokenValue === "{") && tokenType === UndefTokenType) {
                rule.atRule = rule.atRule.trim();
                rules.push(rule);
                state = WebInspector.CSSParserStates.Initial;
            } else {
                rule.atRule += tokenValue;
            }
            break;
        case WebInspector.CSSParserStates.Style:
            if (tokenType.has("meta") || tokenType.has("property")) {
                property = {
                    name: tokenValue,
                    value: "",
                    range: createRange(lineNumber, column),
                    nameRange: createRange(lineNumber, column)
                };
                state = WebInspector.CSSParserStates.PropertyName;
            } else if (tokenValue === "}" && tokenType === UndefTokenType) {
                rule.styleRange.endLine = lineNumber;
                rule.styleRange.endColumn = column;
                rules.push(rule);
                state = WebInspector.CSSParserStates.Initial;
            } else if (tokenType.has("comment")) {
                // The |processToken| is called per-line, so no token spans more than one line.
                // Support only a one-line comments.
                if (tokenValue.substring(0, 2) !== "/*" || tokenValue.substring(tokenValue.length - 2) !== "*/")
                    break;
                var uncommentedText = tokenValue.substring(2, tokenValue.length - 2);
                var fakeRule = "a{\n" + uncommentedText + "}";
                disabledRules = [];
                WebInspector._innerParseCSS(fakeRule, disabledRulesCallback);
                if (disabledRules.length === 1 && disabledRules[0].properties.length === 1) {
                    var disabledProperty = disabledRules[0].properties[0];
                    disabledProperty.disabled = true;
                    disabledProperty.range = createRange(lineNumber, column);
                    disabledProperty.range.endColumn = newColumn;
                    var lineOffset = lineNumber - 1;
                    var columnOffset = column + 2;
                    disabledProperty.nameRange.startLine += lineOffset;
                    disabledProperty.nameRange.startColumn += columnOffset;
                    disabledProperty.nameRange.endLine += lineOffset;
                    disabledProperty.nameRange.endColumn += columnOffset;
                    disabledProperty.valueRange.startLine += lineOffset;
                    disabledProperty.valueRange.startColumn += columnOffset;
                    disabledProperty.valueRange.endLine += lineOffset;
                    disabledProperty.valueRange.endColumn += columnOffset;
                    rule.properties.push(disabledProperty);
                }
            }
            break;
        case WebInspector.CSSParserStates.PropertyName:
            if (tokenValue === ":" && tokenType === UndefTokenType) {
                property.name = property.name;
                property.nameRange.endLine = lineNumber;
                property.nameRange.endColumn = column;
                property.valueRange = createRange(lineNumber, newColumn);
                state = WebInspector.CSSParserStates.PropertyValue;
            } else if (tokenType.has("property")) {
                property.name += tokenValue;
            }
            break;
        case WebInspector.CSSParserStates.PropertyValue:
            if ((tokenValue === ";" || tokenValue === "}") && tokenType === UndefTokenType) {
                property.value = property.value;
                property.valueRange.endLine = lineNumber;
                property.valueRange.endColumn = column;
                property.range.endLine = lineNumber;
                property.range.endColumn = tokenValue === ";" ? newColumn : column;
                rule.properties.push(property);
                if (tokenValue === "}") {
                    rule.styleRange.endLine = lineNumber;
                    rule.styleRange.endColumn = column;
                    rules.push(rule);
                    state = WebInspector.CSSParserStates.Initial;
                } else {
                    state = WebInspector.CSSParserStates.Style;
                }
            } else if (!tokenType.has("comment")) {
                property.value += tokenValue;
            }
            break;
        default:
            console.assert(false, "Unknown CSS parser state.");
        }
        processedChunkCharacters += newColumn - column;
        if (processedChunkCharacters > chunkSize) {
            chunkCallback({ chunk: rules, isLastChunk: false });
            rules = [];
            processedChunkCharacters = 0;
        }
    }
    var tokenizer = WebInspector.createTokenizer("text/css");
    var lineNumber;
    for (lineNumber = 0; lineNumber < lines.length; ++lineNumber) {
        var line = lines[lineNumber];
        tokenizer(line, processToken);
        processToken("\n", null, line.length, line.length + 1);
    }
    chunkCallback({ chunk: rules, isLastChunk: true });

    /**
     * @return {!{startLine: number, startColumn: number, endLine: number, endColumn: number}}
     */
    function createRange(lineNumber, columnNumber)
    {
        return {
            startLine: lineNumber,
            startColumn: columnNumber,
            endLine: lineNumber,
            endColumn: columnNumber
        };
    }
}
