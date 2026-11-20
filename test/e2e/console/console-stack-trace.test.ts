// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  CONSOLE_MESSAGE_WRAPPER_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getStructuredConsoleMessages,
  navigateToConsoleTab,
  STACK_PREVIEW_CONTAINER,
} from '../helpers/console-helpers.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';

const CONSOLE_MESSAGE_WRAPPER = '.console-message-stack-trace-wrapper';
const SHOW_MORE_LINK = '.show-all-link .link';
const SHOW_LESS_LINK = '.show-less-link .link';

describe('The Console Tab', () => {
  it('shows messages with stack traces', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await inspectedPage.goToResource('console/stack-trace.html');

    await devToolsPage.waitFor(CONSOLE_MESSAGE_WRAPPER);
    await devToolsPage.click(CONSOLE_MESSAGE_WRAPPER);
    const stack = await devToolsPage.waitFor(STACK_PREVIEW_CONTAINER);

    const expected = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: true},
      {text: '\nPromise.then', visible: true},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: true},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: true},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: true},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: true},
      {text: '', visible: false},
      {text: '', visible: false},
    ];

    await devToolsPage.waitForFunction(async () => {
      const stackTraceRows = await devToolsPage.evaluate(stack => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack!);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expected);
    });
  });

  it('shows messages with stack traces containing ignore-listed frames', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern(devToolsPage, 'ignoreMe.js');

    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await inspectedPage.goToResource('console/stack-trace.html');

    await devToolsPage.waitFor(CONSOLE_MESSAGE_WRAPPER);
    await devToolsPage.click(CONSOLE_MESSAGE_WRAPPER);
    const stack = await devToolsPage.waitFor(STACK_PREVIEW_CONTAINER);

    const expected = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: false},
      {text: '\nPromise.then', visible: false},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: false},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: false},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: false},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: false},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: false},
      {text: '', visible: true},
      {text: '', visible: false},
    ];

    await devToolsPage.waitForFunction(async () => {
      const stackTraceRows = await devToolsPage.evaluate(stack => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack!);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expected);
    });

    // assert that hidden rows are not shown initially
    let showHidden = await stack.evaluate(x => x.classList.contains('show-hidden-rows'));
    assert.isFalse(showHidden);

    // assert that after clicking 'show all'-button, hidden rows are shown
    await devToolsPage.click(SHOW_MORE_LINK);
    await devToolsPage.waitFor(`${STACK_PREVIEW_CONTAINER}.show-hidden-rows`);
    showHidden = await stack.evaluate(x => x.classList.contains('show-hidden-rows'));
    assert.isTrue(showHidden);

    const expectedUnhidden = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: true},
      {text: '\nPromise.then', visible: true},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: true},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: true},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: true},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: true},
      {text: '', visible: false},
      {text: '', visible: true},
    ];

    await devToolsPage.waitForFunction(async () => {
      const stackTraceRows = await devToolsPage.evaluate(stack => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack!);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expectedUnhidden);
    });

    // assert that after clicking 'show less'-button, hidden rows are hidden again
    await devToolsPage.click(SHOW_LESS_LINK);
    await devToolsPage.waitFor(`${STACK_PREVIEW_CONTAINER}:not(.show-hidden-rows)`);
    showHidden = await stack.evaluate(x => x.classList.contains('show-hidden-rows'));
    assert.isFalse(showHidden);
  });

  it('shows stack traces for stack overflow exceptions', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await inspectedPage.evaluate(`
      // Both the call and the function entry may trigger stack overflow.
      // Intentionally keep both on the same line to avoid flaky test failures.
      window.overflow = function() { window.overflow(); }
      window.doOverflow = function() { setTimeout(window.overflow, 0); }
    `);

    await inspectedPage.evaluate(`window.doOverflow()`);

    // Wait for the console message to appear and have a stack trace.
    await devToolsPage.waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages(devToolsPage);
      return messages.length > 0 && messages.some(m => m.message?.includes('Maximum call stack size exceeded'));
    });

    const messages = await getStructuredConsoleMessages(devToolsPage);
    const overflowMessage = messages.find(m => m.message?.includes('Maximum call stack size exceeded'));

    assert.exists(overflowMessage);
    assert.exists(overflowMessage.stackPreview);
    assert.include(overflowMessage.stackPreview, 'overflow');
  });

  it('linkifies error stacks for sourceURLs, source maps, and valid stack traces', async ({
                                                                                     devToolsPage,
                                                                                     inspectedPage,
                                                                                   }) => {
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.goToResource('empty.html');

    const sourceMap = {
      version: 3,
      file: 'stack-with-sourceMap.js',
      sourceRoot: '',
      sources: ['stack-with-sourceMap.coffee'],
      names: [] as string[],
      mappings: ';AAAA;AAAA,MAAA;;EAAA,MAAM,CAAC,iBAAP,GAA2B,QAAA,CAAA,CAAA;WACvB,OAAO,CAAC,GAAR,' +
          'CAAY,CAAC,IAAI,KAAJ,CAAA,CAAD,CAAa,CAAC,KAA1B;EADuB;;EAG3B,MAAM,CAAC,iBAAiB,' +
          'CAAC,WAAzB,GAAuC;;EAEjC,UAAN,MAAA,QAAA;IACI,uBAAyB,CAAA,CAAA;aACrB,IAAA,CAAK,' +
          'qBAAL;IADqB;;EAD7B;;EAIA,MAAM,CAAC,OAAP,GAAiB,QAAA,CAAA,CAAA;AACb,QAAA;IAAA,' +
          'OAAA,GAAU,IAAI;IACd,OAAO,CAAC,uBAAuB,CAAC,WAAhC,GAA8C;WAC9C,OAAO,CAAC,uBAAR,' +
          'CAAA;EAHa;AATjB',
      sourcesContent: [
        'window.letsFailWithStack = ->\n    console.log((new Error()).stack)\n\n' +
            'window.letsFailWithStack.displayName = "letsFailWithStack(a:1:2)"\n\nclass Failure\n' +
            '    letsFailWithStackInEval: ->\n        eval("letsFailWithStack()");\n\n' +
            'window.failure = ->\n    failure = new Failure\n' +
            '    failure.letsFailWithStackInEval.displayName = "letsFailWithStackInEval(a)"\n' +
            '    failure.letsFailWithStackInEval()\n',
      ],
    };
    const sourceMapDataUrl = `data:application/json;base64,${btoa(JSON.stringify(sourceMap))}`;

    const stackWithSourceUrlScript = [
      'var c = "Some test"',
      '',
      'function namedFunction()',
      '{',
      '    console.log(new Error(c).stack);',
      '}',
      '',
      'namedFunction();',
      '',
      '//# sourceURL=foob.js',
    ].join('\n');

    const stackWithSourceMapScript = [
      '// Generated by CoffeeScript 2.4.1',
      '(function() {',
      '  var Failure;',
      '',
      '  window.letsFailWithStack = function() {',
      '    return console.log((new Error()).stack);',
      '  };',
      '',
      '  window.letsFailWithStack.displayName = "letsFailWithStack(a:1:2)";',
      '',
      '  Failure = class Failure {',
      '    letsFailWithStackInEval() {',
      '      return eval("letsFailWithStack()");',
      '    }',
      '',
      '  };',
      '',
      '  window.failure = function() {',
      '    var failure;',
      '    failure = new Failure;',
      '    failure.letsFailWithStackInEval.displayName = "letsFailWithStackInEval(a)";',
      '    return failure.letsFailWithStackInEval();',
      '  };',
      '',
      '}).call(this);',
      '',
      `//# sourceMappingURL=${sourceMapDataUrl}`,
    ].join('\n');

    const mainScript = [
      'function forStack() {',
      '  console.log(new Error("line\\nbreak").stack);',
      '}',
      '',
      'forStack();',
      '',
      'function stack1(errorConstructor, text) {',
      '  function stack2() {',
      '    console.log(new errorConstructor(text).stack);',
      '  }',
      '  stack2();',
      '}',
      '',
      'function domError() {',
      '  try {',
      '    document.body.removeChild(document.createElement("a"));',
      '  } catch (e) {',
      '    console.log(e.stack);',
      '  }',
      '}',
      '',
      'domError();',
      '',
      'function logError() {',
      '  try {',
      '    throw new Error("some error");',
      '  } catch (e) {',
      '    console.log(e);',
      '  }',
      '}',
      '',
      'logError();',
      '',
      'console.log("Error message without stacks http://www.chromium.org/");',
      '',
      'console.log("Error valid stack #2\\n    at http://www.chromium.org/boo.js:40:70\\n' +
          '    at foo (http://www.chromium.org/foo.js:10:50)");',
      'console.log("Error valid stack #3\\n    at http://www.chromium.org/foo.js:40");',
      'console.log("Error: MyError\\n    at throwError (http://www.chromium.org/foo.js:40)\\n' +
          '    at eval (eval at <anonymous> (http://www.chromium.org/foo.js:42:1), <anonymous>:1:1)\\n' +
          '    at http://www.chromium.org/foo.js:239");',
      '',
      'stack1(ReferenceError, "valid stack");',
      'stack1(EvalError, "valid stack");',
      'stack1(SyntaxError, "valid stack");',
      'stack1(RangeError, "valid stack");',
      'stack1(TypeError, "valid stack");',
      'stack1(URIError, "valid stack");',
      '',
      'console.log("Error broken stack\\n    at function_name(foob.js foob.js:30:1)\\n at foob.js:40:70");',
      'console.log("Error broken stack #2\\n    at function_name(foob.js:20:30");',
      'console.log("Error broken stack #3\\n    at function_name(foob:20.js:30   bla");',
      'console.log("Error broken stack #4\\n    at function_name)foob.js:20:30(");',
      'console.log("Error broken stack #5\\n    at function_name foob.js:20:30)");',
      'console.log("Error broken stack #6\\n    at foob.js foob.js:40:70");',
      '',
      'setTimeout(\'failure()\', 0);',
      '',
      '//# sourceURL=console-log-linkify-stack-in-errors.js',
    ].join('\n');

    await inspectedPage.evaluate(
        (s1, s2, s3) => {
          for (const code of [s1, s2, s3]) {
            const url = URL.createObjectURL(new Blob([code], {type: 'text/javascript'}));
            const script = document.createElement('script');
            script.async = false;
            script.src = url;
            script.onload = () => URL.revokeObjectURL(url);
            document.head.appendChild(script);
          }
        },
        stackWithSourceUrlScript,
        stackWithSourceMapScript,
        mainScript,
    );

    const messages = await devToolsPage.waitForFunction(async () => {
      const rendered = await devToolsPage.evaluate(selector => {
        return Array.from(document.querySelectorAll(selector)).map(wrapper => {
          const source = wrapper.querySelector('.console-message-anchor .devtools-link')?.textContent ?? '';
          const text = wrapper.querySelector('.console-message-text')?.deepTextContent()?.replace(/\u200b/g, '') ?? '';
          const links =
              Array.from(wrapper.querySelectorAll('.console-message-text .devtools-link'), el => el.textContent || '');
          return {source, text, links};
        });
      }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
      if (rendered.length !== 21) {
        return undefined;
      }
      const last = rendered[20];
      if (!last.source.startsWith('stack-with-sourceMap.coffee:') ||
          last.links.filter(link => link.startsWith('stack-with-sourceMap.coffee:')).length < 4) {
        return undefined;
      }
      if (rendered.some(item => item.source === '' || item.text === '')) {
        return undefined;
      }
      return rendered;
    });

    assert.deepEqual(messages, [
      {
        source: 'foob.js:5',
        text: 'Error: Some test\n    at namedFunction (foob.js:5:17)\n    at foob.js:8:1',
        links: ['foob.js:5:17', 'foob.js:8:1'],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:2',
        text: 'Error: line\nbreak\n    at forStack (console-log-linkify-\u2026k-in-errors.js:2:15)\n' +
            '    at console-log-linkify-\u2026ck-in-errors.js:5:1',
        links: ['console-log-linkify-\u2026k-in-errors.js:2:15', 'console-log-linkify-\u2026ck-in-errors.js:5:1'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:18',
        text: 'NotFoundError: Failed to execute \'removeChild\' on \'Node\': ' +
            'The node to be removed is not a child of this node.\n' +
            '    at domError (console-log-linkify-\u2026-in-errors.js:16:19)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:22:1',
        links: ['console-log-linkify-\u2026-in-errors.js:16:19', 'console-log-linkify-\u2026k-in-errors.js:22:1'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:28',
        text: 'Error: some error\n    at logError (console-log-linkify-\u2026-in-errors.js:26:11)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:32:1',
        links: ['console-log-linkify-\u2026-in-errors.js:26:11', 'console-log-linkify-\u2026k-in-errors.js:32:1'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:34',
        text: 'Error message without stacks http://www.chromium.org/',
        links: ['http://www.chromium.org/'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:36',
        text: 'Error valid stack #2\n    at www.chromium.org/boo.js:40:70\n    at foo (www.chromium.org/foo.js:10:50)',
        links: ['www.chromium.org/boo.js:40:70', 'www.chromium.org/foo.js:10:50'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:37',
        text: 'Error valid stack #3\n    at www.chromium.org/foo.js:40:0',
        links: ['www.chromium.org/foo.js:40:0'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:38',
        text: 'Error: MyError\n    at throwError (www.chromium.org/foo.js:40:0)\n' +
            '    at eval (eval at <anonymous> (www.chromium.org/foo.js:42:1), <anonymous>:1:1)\n' +
            '    at www.chromium.org/foo.js:239:0',
        links: [
          'www.chromium.org/foo.js:40:0',
          'www.chromium.org/foo.js:42:1',
          '<anonymous>:1:1',
          'www.chromium.org/foo.js:239:0',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'ReferenceError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:40:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:40:1',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'EvalError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:41:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:41:1',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'SyntaxError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:42:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:42:1',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'RangeError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:43:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:43:1',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'TypeError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:44:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:44:1',
        ],
      },
      {
        source: 'console-log-linkify-stack-in-errors.js:9',
        text: 'URIError: valid stack\n    at stack2 (console-log-linkify-\u2026k-in-errors.js:9:17)\n' +
            '    at stack1 (console-log-linkify-\u2026k-in-errors.js:11:3)\n' +
            '    at console-log-linkify-\u2026k-in-errors.js:45:1',
        links: [
          'console-log-linkify-\u2026k-in-errors.js:9:17',
          'console-log-linkify-\u2026k-in-errors.js:11:3',
          'console-log-linkify-\u2026k-in-errors.js:45:1',
        ],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:47',
        text: 'Error broken stack\n    at function_name(foob.js foob.js:30:1):0:0\n    at foob.js:40:70',
        links: ['function_name(foob.js foob.js:30:1):0:0', 'foob.js:40:70'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:48',
        text: 'Error broken stack #2\n    at function_name(foob.js:20:30',
        links: ['function_name(foob.js:20:30'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:49',
        text: 'Error broken stack #3\n    at function_name(foob:20.js:30   bla:0:0',
        links: ['function_name(foob:20.js:30   bla:0:0'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:50',
        text: 'Error broken stack #4\n    at function_name)foob.js:20:30(:0:0',
        links: ['function_name)foob.js:20:30(:0:0'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:51',
        text: 'Error broken stack #5\n    at function_name foob.js:20:30):0:0',
        links: ['function_name foob.js:20:30):0:0'],
      },
      {
        source: 'console-log-linkify-\u2026ack-in-errors.js:52',
        text: 'Error broken stack #6\n    at foob.js foob.js:40:70',
        links: ['foob.js foob.js:40:70'],
      },
      {
        source: 'stack-with-sourceMap.coffee:2',
        text: 'Error\n    at window.letsFailWithStack (stack-with-sourceMap.coffee:2:18)\n' +
            '    at eval (eval at letsFailWithStackInEval (stack-with-sourceMap.coffee:8:9), <anonymous>:1:1)\n' +
            '    at Failure.letsFailWithStackInEval (stack-with-sourceMap.coffee:8:9)\n' +
            '    at window.failure (stack-with-sourceMap.coffee:13:13)\n' +
            '    at <anonymous>:1:1',
        links: [
          'stack-with-sourceMap.coffee:2:18',
          'stack-with-sourceMap.coffee:8:9',
          '<anonymous>:1:1',
          'stack-with-sourceMap.coffee:8:9',
          'stack-with-sourceMap.coffee:13:13',
          '<anonymous>:1:1',
        ],
      },
    ]);
  });
});
