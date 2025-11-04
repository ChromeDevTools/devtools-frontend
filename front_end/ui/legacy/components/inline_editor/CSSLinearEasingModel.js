// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
const cssParser = CodeMirror.css.cssLanguage.parser;
const numberFormatter = new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
});
function findNextDefinedInputIndex(points, currentIndex) {
    for (let i = currentIndex; i < points.length; i++) {
        if (!isNaN(points[i].input)) {
            return i;
        }
    }
    return -1;
}
function consumeLinearStop(cursor, referenceText) {
    const tokens = [];
    while (cursor.type.name !== ',' && cursor.type.name !== ')') {
        const token = referenceText.substring(cursor.from, cursor.to);
        if (cursor.type.name !== 'NumberLiteral') {
            // There is something that is not a number inside the argument.
            return null;
        }
        tokens.push(token);
        cursor.next(false);
    }
    // Invalid syntax `linear(0 50% 60% 40%, 1)`.
    if (tokens.length > 3) {
        return null;
    }
    const percentages = tokens.filter(token => token.includes('%'));
    // There can't be more than 2 percentages.
    if (percentages.length > 2) {
        return null;
    }
    const numbers = tokens.filter(token => !token.includes('%'));
    // There must only be 1 number.
    if (numbers.length !== 1) {
        return null;
    }
    return {
        number: Number(numbers[0]),
        lengthA: percentages[0] ? Number(percentages[0].substring(0, percentages[0].length - 1)) : undefined,
        lengthB: percentages[1] ? Number(percentages[1].substring(0, percentages[1].length - 1)) : undefined,
    };
}
function consumeLinearFunction(text) {
    const textToParse = `*{--a: ${text}}`;
    const parsed = cssParser.parse(textToParse);
    // Take the cursor from declaration
    const cursor = parsed.cursorAt(textToParse.indexOf(':') + 1);
    // Move until the `ArgList`
    while (cursor.name !== 'ArgList' && cursor.next(true)) {
        // If the callee is not the `linear` function, return null
        if (cursor.name === 'Callee' && textToParse.substring(cursor.from, cursor.to) !== 'linear') {
            return null;
        }
    }
    if (cursor.name !== 'ArgList') {
        return null;
    }
    // We're on the `ArgList`, enter into it
    cursor.firstChild();
    const stops = [];
    while (cursor.type.name !== ')' && cursor.next(false)) {
        const linearStop = consumeLinearStop(cursor, textToParse);
        if (!linearStop) {
            // Parsing a `linearStop` was invalid; abort.
            return null;
        }
        stops.push(linearStop);
    }
    return stops;
}
const KeywordToValue = {
    linear: 'linear(0 0%, 1 100%)',
};
export class CSSLinearEasingModel {
    #points;
    constructor(points) {
        this.#points = points;
    }
    // https://w3c.github.io/csswg-drafts/css-easing/#linear-easing-function-parsing
    static parse(text) {
        // Parse `linear` keyword as `linear(0 0%, 1 100%)` function.
        if (KeywordToValue[text]) {
            return CSSLinearEasingModel.parse(KeywordToValue[text]);
        }
        const stops = consumeLinearFunction(text);
        // 1. Let function be a new linear easing function.
        // 2. Let largestInput be negative infinity.
        // 3. If there are less than two items in stopList, then return failure.
        if (!stops || stops.length < 2) {
            return null;
        }
        // 4. For each stop in stopList:
        let largestInput = -Infinity;
        const points = [];
        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            // 4.1. Let point be a new linear easing point with its output set
            // to stop’s <number> as a number.
            const point = { input: NaN, output: stop.number };
            // 4.2. Append point to function’s points.
            points.push(point);
            // 4.3. If stop has a <linear-stop-length>, then:
            if (stop.lengthA !== undefined) {
                // 4.3.1. Set point’s input to whichever is greater:
                // stop’s <linear-stop-length>'s first <percentage> as a number,
                // or largestInput.
                point.input = Math.max(stop.lengthA, largestInput);
                // 4.3.2. Set largestInput to point’s input.
                largestInput = point.input;
                // 4.3.3. If stop’s <linear-stop-length> has a second <percentage>, then:
                if (stop.lengthB !== undefined) {
                    // 4.3.3.1. Let extraPoint be a new linear easing point with its output
                    // set to stop’s <number> as a number.
                    const extraPoint = { input: NaN, output: point.output };
                    // 4.3.3.2. Append extraPoint to function’s points.
                    points.push(extraPoint);
                    // 4.3.3.3. Set extraPoint’s input to whichever is greater:
                    // stop’s <linear-stop-length>'s second <percentage>
                    // as a number, or largestInput.
                    extraPoint.input = Math.max(stop.lengthB, largestInput);
                    // 4.3.3.4. Set largestInput to extraPoint’s input.
                    largestInput = extraPoint.input;
                }
                // 4.4. Otherwise, if stop is the first item in stopList, then:
            }
            else if (i === 0) {
                // 4.4.1. Set point’s input to 0.
                point.input = 0;
                // 4.4.2. Set largestInput to 0.
                largestInput = 0;
                // 4.5. Otherwise, if stop is the last item in stopList,
                // then set point’s input to whichever is greater: 1 or largestInput.
            }
            else if (i === stops.length - 1) {
                point.input = Math.max(100, largestInput);
            }
        }
        // 5. For runs of items in function’s points that have a null input, assign a
        // number to the input by linearly interpolating between the closest previous
        // and next points that have a non-null input.
        let upperIndex = 0;
        for (let i = 1; i < points.length; i++) {
            if (isNaN(points[i].input)) {
                if (i > upperIndex) {
                    // Since the last point's input is always defined
                    // we know that `upperIndex` cannot be `-1`.
                    upperIndex = findNextDefinedInputIndex(points, i);
                }
                points[i].input =
                    points[i - 1].input + (points[upperIndex].input - points[i - 1].input) / (upperIndex - (i - 1));
            }
        }
        return new CSSLinearEasingModel(points);
    }
    addPoint(point, index) {
        if (index !== undefined) {
            this.#points.splice(index, 0, point);
            return;
        }
        this.#points.push(point);
    }
    removePoint(index) {
        this.#points.splice(index, 1);
    }
    setPoint(index, point) {
        this.#points[index] = point;
    }
    points() {
        return this.#points;
    }
    asCSSText() {
        const args = this.#points.map(point => `${numberFormatter.format(point.output)} ${numberFormatter.format(point.input)}%`)
            .join(', ');
        const text = `linear(${args})`;
        // If a keyword matches to this function, return the keyword value of it.
        for (const [keyword, value] of Object.entries(KeywordToValue)) {
            if (value === text) {
                return keyword;
            }
        }
        return text;
    }
}
//# sourceMappingURL=CSSLinearEasingModel.js.map