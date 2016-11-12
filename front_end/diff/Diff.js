// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Diff.Diff = {
  /**
   * @param {string} text1
   * @param {string} text2
   * @return {!Array.<!{0: number, 1: string}>}
   */
  charDiff: function(text1, text2) {
    var differ = new diff_match_patch();
    return differ.diff_main(text1, text2);
  },

  /**
   * @param {!Array.<string>} lines1
   * @param {!Array.<string>} lines2
   * @return {!Array.<!{0: number, 1: !Array.<string>}>}
   */
  lineDiff: function(lines1, lines2) {
    /** @type {!Common.CharacterIdMap<string>} */
    var idMap = new Common.CharacterIdMap();
    var text1 = lines1.map(line => idMap.toChar(line)).join('');
    var text2 = lines2.map(line => idMap.toChar(line)).join('');

    var diff = Diff.Diff.charDiff(text1, text2);
    var lineDiff = [];
    for (var i = 0; i < diff.length; i++) {
      var lines = [];
      for (var j = 0; j < diff[i][1].length; j++)
        lines.push(idMap.fromChar(diff[i][1][j]));

      lineDiff.push({0: diff[i][0], 1: lines});
    }
    return lineDiff;
  },

  /**
   * @param {!Array.<!{0: number, 1: !Array.<string>}>} diff
   * @return {!Array<!Array<number>>}
   */
  convertToEditDiff: function(diff) {
    var normalized = [];
    var added = 0;
    var removed = 0;
    for (var i = 0; i < diff.length; ++i) {
      var token = diff[i];
      if (token[0] === Diff.Diff.Operation.Equal) {
        flush();
        normalized.push([Diff.Diff.Operation.Equal, token[1].length]);
      } else if (token[0] === Diff.Diff.Operation.Delete) {
        removed += token[1].length;
      } else {
        added += token[1].length;
      }
    }
    flush();
    return normalized;

    function flush() {
      if (added && removed) {
        var min = Math.min(added, removed);
        normalized.push([Diff.Diff.Operation.Edit, min]);
        added -= min;
        removed -= min;
      }
      if (added || removed) {
        var balance = added - removed;
        var type = balance < 0 ? Diff.Diff.Operation.Delete : Diff.Diff.Operation.Insert;
        normalized.push([type, Math.abs(balance)]);
        added = 0;
        removed = 0;
      }
    }
  }

};

Diff.Diff.Operation = {
  Equal: 0,
  Insert: 1,
  Delete: -1,
  Edit: 2
};
