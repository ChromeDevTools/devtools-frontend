"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grabWordInDirection = exports.getPositionContextInDocument = void 0;
/**
 * Returns information about the position in a document.
 * @param document
 * @param offset
 */
function getPositionContextInDocument(document, offset) {
    var text = document.virtualDocument.text;
    var stopChar = /[/=<>\s"${}():]/;
    var leftWord = grabWordInDirection({
        direction: "left",
        startOffset: offset,
        stopChar: stopChar,
        text: text
    });
    var rightWord = grabWordInDirection({
        direction: "right",
        startOffset: offset,
        stopChar: stopChar,
        text: text
    });
    var word = leftWord + rightWord;
    var beforeWord = text[Math.max(0, offset - leftWord.length - 1)];
    var afterWord = text[Math.min(text.length - 1, offset + rightWord.length)];
    return {
        offset: offset,
        text: text,
        word: word,
        leftWord: leftWord,
        rightWord: rightWord,
        beforeWord: beforeWord,
        afterWord: afterWord
    };
}
exports.getPositionContextInDocument = getPositionContextInDocument;
/**
 * Reads a word in a specific direction.
 * Stops if "stopChar" is encountered.
 * @param startPosition
 * @param stopChar
 * @param direction
 * @param text
 */
function grabWordInDirection(_a) {
    var startOffset = _a.startOffset, stopChar = _a.stopChar, direction = _a.direction, text = _a.text;
    var dir = direction === "left" ? -1 : 1;
    var curPosition = startOffset - (dir < 0 ? 1 : 0);
    while (curPosition > 0 && curPosition < text.length) {
        if (text[curPosition].match(stopChar))
            break;
        curPosition += dir;
        if (curPosition > text.length || curPosition < 0)
            return "";
    }
    var a = curPosition;
    var b = startOffset;
    return text.substring(Math.min(a, b) + (dir < 0 ? 1 : 0), Math.max(a, b));
}
exports.grabWordInDirection = grabWordInDirection;
