// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  enableExperiment,
  getBrowserAndPages,
  step,
  typeText,
  waitFor,
  waitForFunction,
  waitForNone,
} from '../../shared/helper.js';
import {beforeEach, describe, it} from '../../shared/mocha-extensions.js';
import {elementContainsTextWithSelector} from '../helpers/network-helpers.js';
import {openGoToLineQuickOpen} from '../helpers/quick_open-helpers.js';
import {
  addBreakpointForLine,
  isPrettyPrinted,
  openSourceCodeEditorForFile,
  retrieveCodeMirrorEditorContent,
  retrieveTopCallFrameScriptLocation,
  waitForHighlightedLine,
} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';
const PRETTY_PRINTED_TOGGLE = 'devtools-text-editor.pretty-printed';

describe('The Sources Tab', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  if (this.timeout() > 0) {
    this.timeout(10000);
  }

  beforeEach(async () => {
    await enableExperiment('sourcesPrettyPrint');
  });

  it('can pretty-print a JavaScript file inline', async () => {
    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');

    await step('can pretty-print successfully', async () => {
      await click(PRETTY_PRINT_BUTTON);
      await waitFor(PRETTY_PRINTED_TOGGLE);

      const expectedLines = [
        '// Copyright 2020 The Chromium Authors. All rights reserved.',
        '// Use of this source code is governed by a BSD-style license that can be',
        '// found in the LICENSE file.',
        '// clang-format off',
        'const notFormatted = {',
        '    something: \'not-formatted\'',
        '};',
        'console.log(\'Test for correct line number\');',
        'function notFormattedFunction() {',
        '    console.log(\'second log\');',
        '    return {',
        '        field: 2 + 4',
        '    }',
        '}',
        ';notFormattedFunction();',
        '',
      ];

      const updatedTextContent = await retrieveCodeMirrorEditorContent();
      assert.strictEqual(updatedTextContent.join('\n'), expectedLines.join('\n'));
    });

    await step('can un-pretty-print successfully', async () => {
      await click(PRETTY_PRINT_BUTTON);
      await waitForNone(PRETTY_PRINTED_TOGGLE);

      const expectedLines = [
        '// Copyright 2020 The Chromium Authors. All rights reserved.',
        '// Use of this source code is governed by a BSD-style license that can be',
        '// found in the LICENSE file.',
        '// clang-format off',
        'const notFormatted = {something: \'not-formatted\'};console.log(\'Test for correct line number\'); function notFormattedFunction() {',
        'console.log(\'second log\'); return {field: 2+4}};',
        'notFormattedFunction();',
        '',
      ];

      const updatedTextContent = await retrieveCodeMirrorEditorContent();
      assert.strictEqual(updatedTextContent.join('\n'), expectedLines.join('\n'));
    });
  });

  it('can pretty print an inline json subtype file', async () => {
    await openSourceCodeEditorForFile('json-subtype-ld.rawresponse', '../network/json-subtype-ld.rawresponse');
    const editor = await waitFor('[aria-label="Code editor"]');

    await step('can pretty-print a json subtype', async () => {
      const expectedPrettyLines = [
        '{',
        '    "Keys": [',
        '        {',
        '            "Key1": "Value1",',
        '            "Key2": "Value2",',
        '            "Key3": true',
        '        },',
        '        {',
        '            "Key1": "Value1",',
        '            "Key2": "Value2",',
        '            "Key3": false',
        '        }',
        '    ]',
        '}',
      ];
      const actualPrettyText = await retrieveCodeMirrorEditorContent();
      assert.deepStrictEqual(expectedPrettyLines, actualPrettyText);
    });

    await step('can highlight the pretty-printed text', async () => {
      assert.isTrue(await isPrettyPrinted());
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });

    await step('can un-pretty-print a json subtype file', async () => {
      await click(PRETTY_PRINT_BUTTON);
      const expectedNotPrettyLines =
          '{"Keys": [{"Key1": "Value1","Key2": "Value2","Key3": true},{"Key1": "Value1","Key2": "Value2","Key3": false}]}';
      const actualNotPrettyText = await retrieveCodeMirrorEditorContent();
      assert.strictEqual(expectedNotPrettyLines, actualNotPrettyText.toString());
    });

    await step('can highlight the un-pretty-printed text', async () => {
      assert.isFalse(await isPrettyPrinted());
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });
  });

  it('can show error icons for pretty-printed file', async () => {
    await openSourceCodeEditorForFile('minified-errors.js', 'minified-errors.html');

    await step('shows 3 separate errors when pretty-printed', async () => {
      await click(PRETTY_PRINT_BUTTON);
      await waitFor(PRETTY_PRINTED_TOGGLE);

      await waitForFunction(async () => {
        const icons = await $$('devtools-icon.cm-messageIcon-error');
        return icons.length === 3;
      });
    });

    await step('shows 2 separate errors when un-pretty-printed', async () => {
      await click(PRETTY_PRINT_BUTTON);
      await waitForNone(PRETTY_PRINTED_TOGGLE);

      await waitForFunction(async () => {
        const icons = await $$('devtools-icon.cm-messageIcon-error');
        return icons.length === 2;
      });
    });
  });

  it('can add breakpoint for pretty-printed file', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await click(PRETTY_PRINT_BUTTON);
    await waitFor(PRETTY_PRINTED_TOGGLE);

    // Set a breakpoint in line 6 of the pretty-printed view (which is the
    // line with the label "6" not the 6th line from the top).
    await addBreakpointForLine(frontend, 6);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-sourcecode.js:6');
  });

  it('can add breakpoint on minified source and then break correctly on pretty-printed source', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await addBreakpointForLine(frontend, 6);
    await click(PRETTY_PRINT_BUTTON);
    await waitFor(PRETTY_PRINTED_TOGGLE);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('notFormattedFunction();', target);
    assert.deepEqual(scriptLocation, 'minified-sourcecode.js:6');
  });

  it('can go to line in a pretty-printed file', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('minified-sourcecode.js', 'minified-sourcecode.html');
    await click(PRETTY_PRINT_BUTTON);
    await waitFor(PRETTY_PRINTED_TOGGLE);

    await openGoToLineQuickOpen();
    await typeText('6');
    await frontend.keyboard.press('Enter');
    await waitForHighlightedLine(6);
  });

  it('does not automatically pretty-print authored code', async () => {
    await openSourceCodeEditorForFile('minified-sourcecode-1.js', 'minified-sourcecode-1.html');
    const lines = await retrieveCodeMirrorEditorContent();
    assert.strictEqual(lines.length, 2);
  });
});
