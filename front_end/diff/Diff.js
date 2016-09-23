// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.Diff = {
    /**
     * @param {string} text1
     * @param {string} text2
     * @return {!Array.<!{0: number, 1: string}>}
     */
    charDiff: function(text1, text2)
    {
        var differ = new diff_match_patch();
        return differ.diff_main(text1, text2);
    },

    /**
     * @param {!Array.<string>} lines1
     * @param {!Array.<string>} lines2
     * @return {!Array.<!{0: number, 1: !Array.<string>}>}
     */
    lineDiff: function(lines1, lines2)
    {
        /** @type {!Map.<string, string>} */
        var lineToChar = new Map();
        /** @type {!Map.<string, string>} */
        var charToLine = new Map();
        var charCode = 33;
        var text1 = encode(lines1);
        var text2 = encode(lines2);

        var diff = WebInspector.Diff.charDiff(text1, text2);
        var lineDiff = [];
        for (var i = 0; i < diff.length; i++) {
            var lines = [];
            for (var j = 0; j < diff[i][1].length; j++)
                lines.push(charToLine.get(diff[i][1][j]));

            lineDiff.push({
                0: diff[i][0],
                1: lines
            });
        }
        return lineDiff;

        /**
         * @param {!Array.<string>} lines
         * @return {string}
         */
        function encode(lines)
        {
            var text = "";
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                var character = lineToChar.get(line);
                if (!character) {
                    character = String.fromCharCode(charCode++);
                    lineToChar.set(line, character);
                    charToLine.set(character, line);
                }
                text += character;
            }
            return text;
        }
    },

    /**
     * @param {!Array.<!{0: number, 1: !Array.<string>}>} diff
     * @return {!Array<!Array<number>>}
     */
    convertToEditDiff: function(diff)
    {
        var normalized = [];
        var added = 0;
        var removed = 0;
        for (var i = 0; i < diff.length; ++i) {
            var token = diff[i];
            if (token[0] === WebInspector.Diff.Operation.Equal) {
                flush();
                normalized.push([WebInspector.Diff.Operation.Equal, token[1].length]);
            } else if (token[0] === WebInspector.Diff.Operation.Delete) {
                removed += token[1].length;
            } else {
                added += token[1].length;
            }
        }
        flush();
        return normalized;

        function flush()
        {
            if (added && removed) {
                var min = Math.min(added, removed);
                normalized.push([WebInspector.Diff.Operation.Edit, min]);
                added -= min;
                removed -= min;
            }
            if (added || removed) {
                var balance = added - removed;
                var type = balance < 0 ? WebInspector.Diff.Operation.Delete : WebInspector.Diff.Operation.Insert;
                normalized.push([type, Math.abs(balance)]);
                added = 0;
                removed = 0;
            }
        }
    }

}

WebInspector.Diff.Operation = {
    Equal: 0,
    Insert: 1,
    Delete: -1,
    Edit: 2
}
