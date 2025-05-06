// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import type {DevToolsRecorder} from './injected/injected.js';
import type {Schema} from './models/models.js';

describe('Injected', () => {
  let iframe: HTMLIFrameElement|undefined;
  // TODO: use smaller test pages per test.
  const testPage = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Recording Client example</title>
    <style>
      html, body, * {
        margin: 0;
        padding: 0;
      }
      button {
        width: 100px;
        height: 20px;
      }
    </style>
  </head>
  <body>

    <button aria-role="button" aria-name="testButton" id="button"></button>
    <button id="buttonNoARIA"></button>
    <button id="buttonWithLength11">length a 11</button>
    <button id="buttonWithLength12">length aa 12</button>
    <button id="buttonWithLength32">length aaaaaaaaa aaaaaaaaa aa 32</button>
    <button id="buttonWithLength33">length aaaaaaaaa aaaaaaaaa aaa 33</button>
    <button id="buttonWithLength64">length aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaa 64</button>
    <button id="buttonWithLength65">length aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaa 65</button>
    <button id="buttonWithNewLines">
      with newlines
    </button>
    <input id="input"></input>

    <script>
      class ShadowCSSSelectorElement extends HTMLElement {
        constructor() {
          super();
          const shadow = this.attachShadow({mode: 'open'});
          shadow.innerHTML = \`
            <p>sss</p>
            <button id="insideShadowRoot">Login</button>
          \`;
        }
      }
      customElements.define('shadow-css-selector-element', ShadowCSSSelectorElement);

      class ShadowARIASelectorElement extends HTMLElement {
        constructor() {
          super();
          const shadow = this.attachShadow({mode: 'open'});
          shadow.innerHTML = \`
            <p>sss</p>
            <button aria-role="button" aria-name="login">Login</button>
          \`;
        }
      }
      customElements.define('shadow-aria-selector-element', ShadowARIASelectorElement);
    </script>
    <header>
      <shadow-css-selector-element></shadow-css-selector-element>
    </header>
    <main>
      <shadow-css-selector-element></shadow-css-selector-element>
    </main>

    <div aria-role="header">
      <shadow-aria-selector-element></shadow-aria-selector-element>
    </div>
    <div aria-role="main">
      <shadow-aria-selector-element></shadow-aria-selector-element>
    </div>

    <div aria-name="parent-name">
      <div id="no-aria-name-or-role" aria-name="" aria-role="">
    </div>

    <host-element id="slotted-host-element">
      <template shadowrootmode="open">
        <slot></slot>
      </template>
      text in slot
    </host-element>

    <button class="custom-selector-attribute" data-testid="unique">Custom selector</button>
    <button class="custom-selector-attribute" data-testid="123456789">Custom selector (invalid CSS id)</button>

    <host-element id="shadow-root-with-custom-selectors" data-qa="custom-id">
      <template shadowrootmode="open">
        <button data-testid="shadow button">Shadow button with testid</button>>
      </template>
    </host-element>

    <div id="notunique"></div>
    <div id="notunique"></div>
  </body>
</html>`;

  /**
   * Loads scripts injected by Recorder into a new iframe to make sure
   * they run in dedicated environment.
   */
  async function createSandbox(): Promise<Window> {
    const url = new URL('./injected/injected.generated.js', import.meta.url);
    // Some tests run this method twice, so ensure we tidy up any previous iframe.
    iframe?.remove();

    iframe = document.createElement('iframe');
    const {promise, resolve} = Promise.withResolvers();
    iframe.srcdoc = testPage;
    iframe.onload = resolve;
    renderElementIntoDOM(iframe);
    await promise;
    const iframeDocument = iframe.contentDocument!;
    {
      const {promise, resolve} = Promise.withResolvers();
      const script = iframeDocument.createElement('script');
      script.src = url.toString();
      script.onload = resolve;
      iframeDocument.body.append(script);
      await promise;
    }
    const iframeWindow = iframe.contentWindow!;
    {
      (iframeWindow.DevToolsRecorder as DevToolsRecorder)
          .startRecording(
              {
                // We don't have the access to the actual bindings here. Therefore, the test assumes
                // that the markup is explicitly annotated with the following attributes.
                getAccessibleName: (element: Node) => {
                  if (!('getAttribute' in element)) {
                    return '';
                  }
                  return (element as Element).getAttribute('aria-name') || '';
                },
                getAccessibleRole: (element: Node) => {
                  if (!('getAttribute' in element)) {
                    return 'generic';
                  }
                  return (element as Element).getAttribute('aria-role') || '';
                },
              },
              {
                debug: false,
                allowUntrustedEvents: true,
                selectorTypesToRecord: [
                  'xpath',
                  'css',
                  'text',
                  'aria',
                  'pierce',
                ] as Schema.SelectorType[],
              },
          );
    }

    return iframeWindow;
  }

  afterEach(() => {
    iframe?.remove();
  });

  it('should get selectors for an element', async () => {
    const window = await createSandbox();
    const selectors = window.DevToolsRecorder.recordingClientForTesting.getSelectors(
        window.document.querySelector('#buttonNoARIA')!,
    );
    assert.deepEqual(selectors, [
      [
        '#buttonNoARIA',
      ],
      [
        'xpath///*[@id="buttonNoARIA"]',
      ],
      [
        'pierce/#buttonNoARIA',
      ]
    ]);
  });

  it('should get selectors for elements with custom selector attributes', async () => {
    const window = await createSandbox();
    const targets = [
      ...window.document.querySelectorAll('.custom-selector-attribute'),
      window.document.querySelector('#shadow-root-with-custom-selectors')?.shadowRoot?.querySelector('button') as
          HTMLButtonElement,
    ];
    const selectors = targets.map(
        window.DevToolsRecorder.recordingClientForTesting.getSelectors,
    );
    assert.deepEqual(selectors, [
      [
        [
          '[data-testid=\'unique\']',
        ],
        [
          'xpath///*[@data-testid="unique"]',
        ],
        [
          'pierce/[data-testid=\'unique\']',
        ]
      ],
      [
        ['[data-testid=\'\\31 23456789\']'], ['xpath///*[@data-testid="123456789"]'],
        ['pierce/[data-testid=\'\\31 23456789\']'], ['text/Custom selector (invalid']
      ],
      [
        ['[data-qa=\'custom-id\']', '[data-testid=\'shadow\\ button\']'], ['pierce/[data-testid=\'shadow\\ button\']'],
        ['text/Shadow button']
      ]
    ]);
  });

  it('should get selectors for shadow root elements', async () => {
    const window = await createSandbox();
    const selectors = window.DevToolsRecorder.recordingClientForTesting.getSelectors(
        window.document.querySelector('main')
            ?.querySelector('shadow-css-selector-element')
            ?.shadowRoot?.querySelector('#insideShadowRoot')!,
    );
    assert.deepEqual(selectors, [
      ['main > shadow-css-selector-element', '#insideShadowRoot'],
      ['pierce/main > shadow-css-selector-element', 'pierce/#insideShadowRoot']
    ]);
  });

  it('should get an ARIA selector for shadow root elements', async () => {
    const window = await createSandbox();
    const selectors = window.DevToolsRecorder.recordingClientForTesting.getSelectors(
        window.document.querySelector('[aria-role="main"]')
            ?.querySelector('shadow-aria-selector-element')
            ?.shadowRoot?.querySelector('button')!,
    );
    assert.deepEqual(selectors, [
      ['aria/[role="main"]', 'aria/login'], ['div:nth-of-type(2) > shadow-aria-selector-element', 'button'],
      ['pierce/div:nth-of-type(2) > shadow-aria-selector-element', 'pierce/button']
    ]);
  });

  it('should not get an ARIA selector if the target element has no name or role', async () => {
    const window = await createSandbox();
    const selectors = window.DevToolsRecorder.recordingClientForTesting.getSelectors(
        window.document.querySelector('#no-aria-name-or-role')!);
    assert.deepEqual(
        selectors,
        [['#no-aria-name-or-role'], ['xpath///*[@id="no-aria-name-or-role"]'], ['pierce/#no-aria-name-or-role']]);
  });

  describe('CSS selectors', () => {
    it('should query CSS selectors', async () => {
      const window = await createSandbox();
      const results = [
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                ['[data-qa=custom-id]', '[data-testid=shadow\\ button]'],
                )
            .length,
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                ['[data-qa=custom-id]'],
                )
            .length,
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                '[data-qa=custom-id]',
                )
            .length,
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                '.doesnotexist',
                )
            .length,
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                ['[data-qa=custom-id]', '.doesnotexist'],
                )
            .length,
        window.DevToolsRecorder.recordingClientForTesting
            .queryCSSSelectorAllForTesting(
                ['#notunique'],
                )
            .length,
      ];
      assert.deepEqual(results, [1, 1, 1, 0, 0, 2]);
    });

    it('should return not-optimized CSS selectors for duplicate elements', async () => {
      const window = await createSandbox();
      const selectors =
          window.DevToolsRecorder.recordingClientForTesting.getSelectors(window.document.querySelector('#notunique')!);
      assert.deepEqual(selectors, [
        ['div:nth-of-type(3) > div:nth-of-type(2)'], ['xpath///*[@id="notunique"]'],
        ['pierce/div:nth-of-type(3) > div:nth-of-type(2)']
      ]);
    });
  });

  describe('Text selectors', () => {
    const getSelectorOfButtonWithLength = async (length: number) => {
      const window = await createSandbox();
      const selector = `#buttonWithLength${length}`;
      const target = window.document.querySelector(selector);
      if (!target) {
        throw new Error(`${selector} could not be found.`);
      }
      if (target.innerHTML.length !== length) {
        throw new Error(`${selector} is not of length ${length}`);
      }
      return window.DevToolsRecorder.recordingClientForTesting.getTextSelector(
          target,
      );
    };
    const MINIMUM_LENGTH = 12;
    const MAXIMUM_LENGTH = 64;
    const SAME_PREFIX_TEXT_LENGTH = 32;

    it('should return a text selector for elements < minimum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MINIMUM_LENGTH - 1);
      assert.deepEqual(selectors, ['text/length a 11']);
    });
    it('should return a text selector for elements == minimum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MINIMUM_LENGTH);
      assert.deepEqual(selectors, ['text/length aa 12']);
    });
    it('should return a text selector for elements == maximum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MAXIMUM_LENGTH);
      assert.deepEqual(selectors, ['text/length aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaaaaaaa aaaa 64']);
    });
    it('should not return a text selector for elements > maximum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MAXIMUM_LENGTH + 1);
      assert.isUndefined(selectors);
    });

    it('should return a text selector correctly with same prefix elements', async () => {
      let selectors = await getSelectorOfButtonWithLength(
          SAME_PREFIX_TEXT_LENGTH,
      );
      assert.deepEqual(selectors, ['text/length aaaaaaaaa aaaaaaaaa aa 32']);
      selectors = await getSelectorOfButtonWithLength(
          SAME_PREFIX_TEXT_LENGTH + 1,
      );
      assert.deepEqual(selectors, ['text/length aaaaaaaaa aaaaaaaaa aaa 33']);
    });
    it('should trim text selectors', async () => {
      const window = await createSandbox();
      assert.deepEqual(
          window.DevToolsRecorder.recordingClientForTesting.getTextSelector(
              window.document.querySelector('#buttonWithNewLines')!,
              ),
          ['text/with newlines']);
    });
  });
});
