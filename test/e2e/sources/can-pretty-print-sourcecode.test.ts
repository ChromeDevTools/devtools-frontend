// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {step} from '../../shared/helper.js';
import {elementContainsTextWithSelector} from '../helpers/network-helpers.js';
import {openGoToLineQuickOpen} from '../helpers/quick_open-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  isPrettyPrinted,
  openFileInSourcesPanel,
  openSourceCodeEditorForFile,
  RESUME_BUTTON,
  retrieveCodeMirrorEditorContent,
  retrieveTopCallFrameScriptLocation,
  waitForHighlightedLine,
} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';
const PRETTY_PRINTED_TOGGLE = 'devtools-text-editor.pretty-printed';

describe('The Sources Tab', function() {
  it('can pretty-print a JavaScript file inline', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'minified-sourcecode.js', 'minified-sourcecode.html', devToolsPage, inspectedPage);

    await step('can pretty-print successfully', async () => {
      await devToolsPage.click(PRETTY_PRINT_BUTTON);
      await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

      const expectedLines = [
        '// Copyright 2020 The Chromium Authors',
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

      const updatedTextContent = await retrieveCodeMirrorEditorContent(devToolsPage);
      assert.strictEqual(updatedTextContent.join('\n'), expectedLines.join('\n'));
    });

    await step('can un-pretty-print successfully', async () => {
      await devToolsPage.click(PRETTY_PRINT_BUTTON);
      await devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE);

      const expectedLines = [
        '// Copyright 2020 The Chromium Authors',
        '// Use of this source code is governed by a BSD-style license that can be',
        '// found in the LICENSE file.',
        '// clang-format off',
        'const notFormatted = {something: \'not-formatted\'};console.log(\'Test for correct line number\'); function notFormattedFunction() {',
        'console.log(\'second log\'); return {field: 2+4}};',
        'notFormattedFunction();',
        '',
      ];

      const updatedTextContent = await retrieveCodeMirrorEditorContent(devToolsPage);
      assert.strictEqual(updatedTextContent.join('\n'), expectedLines.join('\n'));
    });
  });

  it('can toggle pretty print on a small non-minified JSON file', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'small-json.rawresponse', '../network/small-json.rawresponse', devToolsPage, inspectedPage);

    // Small files (< 80 chars avg line length) are not auto-formatted
    await devToolsPage.waitForFunction(async () => !(await isPrettyPrinted(devToolsPage)));
    const content = await retrieveCodeMirrorEditorContent(devToolsPage);
    // Should be original compact format on one line
    assert.strictEqual(content.join(''), '{"a":{"b":{"c":1}}}');

    // Pretty-print small JSON by clicking toggle
    await devToolsPage.click(PRETTY_PRINT_BUTTON);
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

    const expectedPrettyLines = [
      '{',
      '    "a": {',
      '        "b": {',
      '            "c": 1',
      '        }',
      '    }',
      '}',
    ];
    const actualContent = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.deepEqual(actualContent, expectedPrettyLines);

    // Un-pretty-print by clicking toggle again
    await devToolsPage.click(PRETTY_PRINT_BUTTON);
    await devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE);

    const contentAfterUnpretty = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.strictEqual(contentAfterUnpretty.join(''), '{"a":{"b":{"c":1}}}');
  });

  it('can pretty print an inline json subtype file', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'json-subtype-ld.rawresponse', '../network/json-subtype-ld.rawresponse', devToolsPage, inspectedPage);
    const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');

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
      const actualPrettyText = await retrieveCodeMirrorEditorContent(devToolsPage);
      assert.deepEqual(expectedPrettyLines, actualPrettyText);
    });

    await step('can highlight the pretty-printed text', async () => {
      await devToolsPage.waitForFunction(() => isPrettyPrinted(devToolsPage));
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });

    await step('can un-pretty-print a json subtype file', async () => {
      await devToolsPage.click(PRETTY_PRINT_BUTTON);
      const expectedNotPrettyLines =
          '{"Keys": [{"Key1": "Value1","Key2": "Value2","Key3": true},{"Key1": "Value1","Key2": "Value2","Key3": false}]},';
      const actualNotPrettyText = await retrieveCodeMirrorEditorContent(devToolsPage);
      assert.strictEqual(expectedNotPrettyLines, actualNotPrettyText.toString());
    });

    await step('can highlight the un-pretty-printed text', async () => {
      await devToolsPage.waitForFunction(async () => !(await isPrettyPrinted(devToolsPage)));
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });
  });

  it('can show error icons for pretty-printed file', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('minified-errors.js', 'minified-errors.html', devToolsPage, inspectedPage);

    await step('shows 3 separate errors when pretty-printed', async () => {
      await devToolsPage.click(PRETTY_PRINT_BUTTON);
      await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

      await devToolsPage.waitForFunction(async () => {
        const icons = await devToolsPage.$$('devtools-icon.cm-messageIcon-error');
        return icons.length === 3;
      });
    });

    await step('shows 2 separate errors when un-pretty-printed', async () => {
      await devToolsPage.click(PRETTY_PRINT_BUTTON);
      await devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE);

      await devToolsPage.waitForFunction(async () => {
        const icons = await devToolsPage.$$('devtools-icon.cm-messageIcon-error');
        return icons.length === 2;
      });
    });
  });

  it('can add breakpoint for pretty-printed file', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'minified-sourcecode.js', 'minified-sourcecode.html', devToolsPage, inspectedPage);
    await devToolsPage.click(PRETTY_PRINT_BUTTON);
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

    // Set a breakpoint in line 6 of the pretty-printed view (which is the
    // line with the label "6" not the 6th line from the top).
    await addBreakpointForLine(6, devToolsPage);

    const scriptLocation =
        await retrieveTopCallFrameScriptLocation('notFormattedFunction();', inspectedPage.page, devToolsPage);
    assert.deepEqual(scriptLocation, 'minified-sourcecode.js:6');
  });

  it('can add breakpoint on minified source and then break correctly on pretty-printed source',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'minified-sourcecode.js', 'minified-sourcecode.html', devToolsPage, inspectedPage);
       await addBreakpointForLine(6, devToolsPage);
       await devToolsPage.click(PRETTY_PRINT_BUTTON);
       await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

       const scriptLocation =
           await retrieveTopCallFrameScriptLocation('notFormattedFunction();', inspectedPage.page, devToolsPage);
       assert.deepEqual(scriptLocation, 'minified-sourcecode.js:6');
     });

  it('can go to line in a pretty-printed file', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'minified-sourcecode.js', 'minified-sourcecode.html', devToolsPage, inspectedPage);
    await devToolsPage.click(PRETTY_PRINT_BUTTON);
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);

    await openGoToLineQuickOpen(devToolsPage);
    await devToolsPage.typeText('6');
    await devToolsPage.page.keyboard.press('Enter');
    await waitForHighlightedLine(6, devToolsPage);
  });

  it('automatically pretty-prints minified code (by default)', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'minified-sourcecode-1.min.js', 'minified-sourcecode-1.html', devToolsPage, inspectedPage);
    const lines = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.lengthOf(lines, 23);
  });

  it('does not automatically pretty-print minified code (when disabled via settings)',
     async ({devToolsPage, inspectedPage}) => {
       await togglePreferenceInSettingsTab('Automatically pretty print minified sources', false, devToolsPage);

       await openSourceCodeEditorForFile(
           'minified-sourcecode-1.min.js', 'minified-sourcecode-1.html', devToolsPage, inspectedPage);
       const lines = await retrieveCodeMirrorEditorContent(devToolsPage);
       assert.lengthOf(lines, 3);
     });

  it('does not automatically pretty-print authored code', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'minified-sourcecode-1.js', 'minified-sourcecode-1.html', devToolsPage, inspectedPage);
    const lines = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.lengthOf(lines, 2);
  });

  it('shows execution position and inline variables in large pretty-printed minified code',
     async ({devToolsPage, inspectedPage}) => {
       await openFileInSourcesPanel('minified-sourcecode-2.html', devToolsPage, inspectedPage);

       // Emulate the button click and wait for the script to open in the Sources panel.
       const evalPromise = inspectedPage.evaluate('handleClick();');
       await devToolsPage.waitFor('[aria-label="minified-sourcecode-2.min.js"][aria-selected="true"]');

       // At some point execution position highlights and variable decorations should appear.
       const [executionLine, executionToken, variableValues] = await Promise.all([
         devToolsPage.waitFor('.cm-executionLine').then(el => el.evaluate(n => n.textContent)),
         devToolsPage.waitFor('.cm-executionToken').then(el => el.evaluate(n => n.textContent)),
         devToolsPage.waitFor('.cm-variableValues').then(el => el.evaluate(n => n.textContent)),
       ]);
       assert.strictEqual(executionLine, '    debugger ;');
       assert.strictEqual(executionToken, 'debugger');
       assert.strictEqual(variableValues, 'y = 40999');

       await Promise.all([
         devToolsPage.click(RESUME_BUTTON),
         evalPromise,
       ]);
     });
});
