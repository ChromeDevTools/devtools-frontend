// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Sources from './sources.js';

describe('FilePathScoreFunction', () => {
  describe('score', () => {
    let filePathScoreFunction: Sources.FilePathScoreFunction.FilePathScoreFunction;

    beforeEach(() => {
      filePathScoreFunction = new Sources.FilePathScoreFunction.FilePathScoreFunction('App');
    });

    it('should prefer filename match over path match', () => {
      const fileMatchScore = filePathScoreFunction.calculateScore('/path/to/App.js', null);
      const pathMatchScore = filePathScoreFunction.calculateScore('/path/to/App/whatever', null);

      assert.isTrue(fileMatchScore > pathMatchScore);
    });

    it('should prefer longer partial match', () => {
      const longMatchScore = filePathScoreFunction.calculateScore('/path/to/App.js', null);
      const shortMatchScore = filePathScoreFunction.calculateScore('/path/to/Ap.js', null);

      assert.isTrue(shortMatchScore < longMatchScore);
    });

    it('should prefer consecutive match', () => {
      const consecutiveMatchScore = filePathScoreFunction.calculateScore('/path/to/App.js', null);
      const notConsecutiveMatchScore = filePathScoreFunction.calculateScore('path/to/A_p_p.js', null);

      assert.isTrue(consecutiveMatchScore > notConsecutiveMatchScore);
    });

    it('should prefer path match at start', () => {
      const pathStartScore = filePathScoreFunction.calculateScore('App/js/file.js', null);
      const midPathMatchScore = filePathScoreFunction.calculateScore('public/App/js/file.js', null);

      assert.isTrue(pathStartScore > midPathMatchScore);
    });

    it('should prefer match at word start', () => {
      const wordStartMatchScore = filePathScoreFunction.calculateScore('/js/App.js', null);
      const midWordMatchScore = filePathScoreFunction.calculateScore('/js/someApp.js', null);

      assert.isTrue(wordStartMatchScore > midWordMatchScore);
    });

    it('should prefer caps match', () => {
      const capsMatchScore = filePathScoreFunction.calculateScore('/js/App.js', null);
      const noCapsMatchScore = filePathScoreFunction.calculateScore('/js/app.js', null);

      assert.isTrue(capsMatchScore > noCapsMatchScore);
    });

    it('should prefer shorter path', () => {
      const shortPathScore = filePathScoreFunction.calculateScore('path/App.js', null);
      const longerPathScore = filePathScoreFunction.calculateScore('longer/path/App.js', null);

      assert.isTrue(shortPathScore > longerPathScore);
    });

    it('should highlight matching filename, but not path', () => {
      const highlightsFullMatch = new Array<number>();
      const highlightsCamelCase = new Array<number>();
      const highlightsDash = new Array<number>();
      const highlightsUnderscore = new Array<number>();
      const highlightsDot = new Array<number>();
      const highlightsWhitespace = new Array<number>();

      filePathScoreFunction.calculateScore('App/App.js', highlightsFullMatch);
      filePathScoreFunction.calculateScore('App/MyApp.js', highlightsCamelCase);
      filePathScoreFunction.calculateScore('App/My-App.js', highlightsDash);
      filePathScoreFunction.calculateScore('App/My_App.js', highlightsUnderscore);
      filePathScoreFunction.calculateScore('App/My.App.js', highlightsDot);
      filePathScoreFunction.calculateScore('App/My App.js', highlightsWhitespace);

      assert.deepEqual(highlightsFullMatch, [4, 5, 6]);
      assert.deepEqual(highlightsCamelCase, [6, 7, 8]);
      assert.deepEqual(highlightsDash, [7, 8, 9]);
      assert.deepEqual(highlightsUnderscore, [7, 8, 9]);
      assert.deepEqual(highlightsDot, [7, 8, 9]);
      assert.deepEqual(highlightsWhitespace, [7, 8, 9]);
    });

    it('should highlight path when not matching filename', () => {
      const highlightsConsecutive = new Array<number>();
      const highlightsNonConsecutive = new Array<number>();

      filePathScoreFunction.calculateScore('public/App/index.js', highlightsConsecutive);
      filePathScoreFunction.calculateScore('public/A/p/p/index.js', highlightsNonConsecutive);

      assert.deepEqual(highlightsConsecutive, [7, 8, 9]);
      assert.deepEqual(highlightsNonConsecutive, [7, 9, 11]);
    });

    it('should highlight non consecutive match correctly', () => {
      const highlights = new Array<number>();

      filePathScoreFunction.calculateScore('path/A-wesome-pp.js', highlights);

      assert.deepEqual(highlights, [5, 14, 15]);
    });

    it('should highlight full path match if filename only matches partially', () => {
      const highlights = new Array<number>();

      filePathScoreFunction.calculateScore('App/someapp.js', highlights);

      assert.deepEqual(highlights, [0, 1, 2]);
    });

    it('should match highlights and score', () => {
      // ported from third_party/blink/web_tests/http/tests/devtools/components/file-path-scoring.js
      const testQueries = [
        ['textepl', './Source/devtools/front_end/TextEditor.pl'],
        ['defted', './Source/devtools/front_end/DefaultTextEditor.pl'],
        ['CMTE', './Source/devtools/front_end/CodeMirrorTextEditor.pl'],
        ['frocmte', './Source/devtools/front_end/CodeMirrorTextEditor.pl'],
        ['cmtepl', './Source/devtools/front_end/CodeMirrorTextEditor.pl'],
        ['setscr', './Source/devtools/front_end/SettingsScreen.pl'],
        ['cssnfv', './Source/devtools/front_end/CSSNamedFlowView.pl'],
        ['jssf', './Source/devtools/front_end/JavaScriptSourceFrame.pl'],
        ['sofrapl', './Source/devtools/front_end/SourceFrame.pl'],
        ['inspeins', './Source/core/inspector/InspectorInstrumentation.z'],
        ['froscr', './Source/devtools/front_end/Script.pl'],
        ['adscon', './Source/devtools/front_end/AdvancedSearchController.pl'],
        ['execontext', 'execution_context/ExecutionContext.cpp'],
      ];

      const expectedResults = [
        [[28, 29, 30, 31, 32, 39, 40], 46551],
        [[28, 29, 30, 35, 39, 40], 34512],
        [[28, 32, 38, 42], 28109],
        [[18, 19, 20, 28, 32, 38, 42], 35533],
        [[28, 32, 38, 42, 49, 50], 31437],
        [[28, 29, 30, 36, 37, 38], 35283],
        [[28, 29, 30, 31, 36, 40], 37841],
        [[28, 32, 38, 44], 21964],
        [[28, 29, 34, 35, 36, 40, 41], 37846],
        [[24, 25, 26, 27, 28, 33, 34, 35], 52174],
        [[18, 19, 20, 28, 29, 30], 33755],
        [[28, 29, 36, 42, 43, 44], 33225],
        [[18, 19, 20, 21, 28, 29, 30, 31, 32, 33], 64986],
      ];

      for (let i = 0; i < testQueries.length; ++i) {
        const highlights = new Array<number>();
        const filePathScoreFunction = new Sources.FilePathScoreFunction.FilePathScoreFunction(testQueries[i][0]);
        const score = filePathScoreFunction.calculateScore(testQueries[i][1], highlights);
        assert.strictEqual(score, expectedResults[i][1]);
        assert.deepEqual(highlights, expectedResults[i][0]);
      }
    });

    it('should return correct scores', () => {
      // ported from third_party/blink/web_tests/http/tests/devtools/components/file-path-scoring.js
      const filePathScoreFunction = new Sources.FilePathScoreFunction.FilePathScoreFunction('execontext');
      const score = filePathScoreFunction.calculateScore('execution_context/ExecutionContext.cpp', null);

      const lowerScores = [
        filePathScoreFunction.calculateScore('testing/NullExecutionContext.cpp', null),
        filePathScoreFunction.calculateScore('svg/SVGTextRunRenderingContext.cpp', null),
      ];

      assert.isTrue(score > lowerScores[0]);
      assert.isTrue(score > lowerScores[1]);
    });
  });
});
