// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTestFilesystem} from '../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as AiAssistanceModel from '../ai_assistance/ai_assistance.js';

describeWithEnvironment('AgentProject', () => {
  async function mockProject(
      files?: Array<{
        path: string,
        content: string,
      }>,
      options?: {
        maxFilesChanged: number,
        maxLinesChanged: number,
      }) {
    const {project, uiSourceCode} = createTestFilesystem('file:///path/to/project', files);
    return {project: new AiAssistanceModel.AgentProject(project, options), uiSourceCode};
  }

  it('can list files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.getFiles(), ['index.html']);
  });

  it('ignores node_modules', async () => {
    const {project} = await mockProject([
      {
        path: 'node_modules/test.js',
        content: 'content',
      },
      {
        path: 'test/another/node_modules/test2.js',
        content: 'content',
      }
    ]);

    assert.deepEqual(project.getFiles(), ['index.html']);
  });

  it('ignores package-lock.json', async () => {
    const {project} = await mockProject([
      {
        path: 'node_modules/test.js',
        content: 'content',
      },
      {
        path: 'package-lock.json',
        content: 'content',
      },
      {
        path: 'test/another/node_modules/test2.js',
        content: 'content',
      }
    ]);

    assert.deepEqual(project.getFiles(), ['index.html']);
  });

  describe('searchFiles', () => {
    it('can search files', async () => {
      const {project} = await mockProject();

      assert.deepEqual(await project.searchFiles('content'), [{
                         columnNumber: 0,
                         filepath: 'index.html',
                         lineNumber: 0,
                         matchLength: 7,
                       }]);
    });

    it('limits results per file', async () => {
      const {project} = await mockProject([
        {
          path: 'many-matches.js',
          content: Array(20).fill('find me').join('\n'),
        },
        {
          path: 'one-match.js',
          content: 'find me',
        }
      ]);

      const results = await project.searchFiles('find me');
      assert.lengthOf(results, 11);  // 10 from many-matches.js + 1 from one-match.js

      const manyMatchesResults = results.filter(r => r.filepath === 'many-matches.js');
      assert.lengthOf(manyMatchesResults, 10);
      // Check line numbers to confirm they are the first 10
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(manyMatchesResults[i].lineNumber, i);
        assert.strictEqual(manyMatchesResults[i].columnNumber, 0);
        assert.strictEqual(manyMatchesResults[i].matchLength, 7);
      }

      const oneMatchResult = results.find(r => r.filepath === 'one-match.js');
      assert.deepEqual(oneMatchResult, {
        filepath: 'one-match.js',
        lineNumber: 0,
        columnNumber: 0,
        matchLength: 7,
      });
    });
  });

  it('can read files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(await project.readFile('index.html'), 'content');
  });

  it('can report processed files', async () => {
    const {project} = await mockProject();
    assert.deepEqual(project.getProcessedFiles(), []);
    await project.readFile('index.html');
    assert.deepEqual(project.getProcessedFiles(), ['index.html']);
  });

  describe('write file', () => {
    describe('full', () => {
      it('can write files files', async () => {
        const {project} = await mockProject();
        await project.writeFile('index.html', 'updated');
        assert.deepEqual(await project.readFile('index.html'), 'updated');
      });
    });

    describe('unified', () => {
      it('can write files', async () => {
        const {project} = await mockProject();
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.html
+++ b/index.html
@@ -817,5 +817,5 @@
-content
+updated
\`\`\`\`\``;

        await project.writeFile('index.html', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.html'), 'updated');
      });

      it('can write files with multiple changes', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: `Line:1
Line:2
Line:3
Line:4
Line:5`,
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@
-Line:1
+LineUpdated:1
@@ -856,7 +857,7 @@
-Line:4
+LineUpdated:4
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), `LineUpdated:1
Line:2
Line:3
LineUpdated:4
Line:5`);
      });

      it('can write files with only addition', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: '',
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@
+Line:1
+Line:4
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), `Line:1
Line:4`);
      });

      it('can write files with multiple additions', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: `Line:1
Line:2
Line:3
Line:4
Line:5`,
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@
-Line:1
+LineUpdated:1
+LineUpdated:1.5
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), `LineUpdated:1
LineUpdated:1.5
Line:2
Line:3
Line:4
Line:5`);
      });

      it('can write files with only deletion', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: `Line:1
Line:2
Line:3
Line:4
Line:5`,
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@
 Line:1
-Line:2
 Line:3
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), `Line:1
Line:3
Line:4
Line:5`);
      });

      it('can write files with only deletion no search lines', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: 'Line:1',
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@
-Line:1
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), '');
      });

      it('can write files with first line next to @@', async () => {
        const {project} = await mockProject(
            [
              {
                path: 'index.css',
                content: `Line:1
Line:2
Line:3
Line:4
Line:5`,
              },
            ],
        );
        const unifiedDiff = `\`\`\`\`\`
diff
--- a/index.css
+++ b/index.css
@@ -817,1 +817,1 @@-Line:1
-Line:2
 Line:3
\`\`\`\`\``;

        await project.writeFile('index.css', unifiedDiff, AiAssistanceModel.ReplaceStrategy.UNIFIED_DIFF);
        assert.deepEqual(await project.readFile('index.css'), `Line:3
Line:4
Line:5`);
      });
    });
  });

  describe('limits', () => {
    it('cannot write more files than allowed', async () => {
      const {project} = await mockProject(
          [{
            path: 'example2.js',
            content: 'content',
          }],
          {
            maxFilesChanged: 1,
            maxLinesChanged: 10,
          });

      await project.writeFile('index.html', 'updated');
      try {
        await project.writeFile('example2.js', 'updated2');
        expect.fail('did not throw');
      } catch (err) {
        expect(err.message).to.eq('Too many files changed');
      }
      assert.deepEqual(await project.readFile('index.html'), 'updated');
      assert.deepEqual(await project.readFile('example2.js'), 'content');
    });

    it('cannot write same file multiple times', async () => {
      const {project} = await mockProject(undefined, {
        maxFilesChanged: 1,
        maxLinesChanged: 10,
      });

      await project.writeFile('index.html', 'updated');
      await project.writeFile('index.html', 'updated2');
      assert.deepEqual(await project.readFile('index.html'), 'updated2');
    });

    it('cannot write more lines than allowed', async () => {
      const {project} = await mockProject(
          [{
            path: 'example2.js',
            content: 'content',
          }],
          {
            maxFilesChanged: 1,
            maxLinesChanged: 1,
          });

      try {
        await project.writeFile('example2.js', 'updated2\nupdated3');
        expect.fail('did not throw');
      } catch (err) {
        expect(err.message).to.eq('Too many lines changed');
      }
      assert.deepEqual(await project.readFile('example2.js'), 'content');
    });
  });
});
