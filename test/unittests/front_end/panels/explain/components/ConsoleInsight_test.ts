// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Explain from '../../../../../../front_end/panels/explain/explain.js';
import type * as Marked from '../../../../../../front_end/third_party/marked/marked.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithLocale('ConsoleInsight', () => {
  describe('Markdown renderer', () => {
    it('renders link as an x-link', () => {
      const renderer = new Explain.MarkdownRenderer();
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'exampleLink'} as Marked.Marked.Token);
      assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
    });
    it('renders images as an x-link', () => {
      const renderer = new Explain.MarkdownRenderer();
      const result =
          renderer.renderToken({type: 'image', text: 'learn more', href: 'exampleLink'} as Marked.Marked.Token);
      assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
    });
    it('renders headers as a strong element', () => {
      const renderer = new Explain.MarkdownRenderer();
      const result = renderer.renderToken({type: 'heading', text: 'learn more'} as Marked.Marked.Token);
      assert(result.strings.join('').includes('<strong>'));
    });
    it('renders unsupported tokens', () => {
      const renderer = new Explain.MarkdownRenderer();
      const result = renderer.renderToken({type: 'html', raw: '<!DOCTYPE html>'} as Marked.Marked.Token);
      assert(result.values.join('').includes('<!DOCTYPE html>'));
    });
  });

  describe('ConsoleInsight', () => {
    function getTestInsightProvider() {
      return {
        async getInsights() {
          return 'test';
        },
      };
    }

    function getTestPromptBuilder() {
      return {
        async buildPrompt() {
          return {
            prompt: '',
            sources: [
              {
                type: Explain.SourceType.MESSAGE,
                value: 'error message',
              },
            ],
          };
        },
      };
    }

    async function drainMicroTasks() {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    it('shows the consent flow for signed-in users', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestInsightProvider(), '', {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      // Consent button is present.
      assert(component.shadowRoot!.querySelector('.consent-button'));
    });

    it('consent can be accepted', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestInsightProvider(), '', {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.consent-button')!, {
        bubbles: true,
        composed: true,
      });
      // Expected to be rendered in the next task.
      await new Promise(resolve => setTimeout(resolve, 0));
      // Rating buttons are shown.
      assert(component.shadowRoot!.querySelector('.rating'));
    });

    it('report if the user is not logged in', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestInsightProvider(), '', {
        isSyncActive: false,
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
      assert.strictEqual(
          content, 'This feature is only available if you are signed into Chrome with your Google account.');
    });

    it('report if the sync is not enabled', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestInsightProvider(), '', {
        isSyncActive: false,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
      assert.strictEqual(content, 'This feature is only available if you have Chrome sync turned on.');
    });

    it('report if the navigator is offline', async () => {
      const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')!;
      Object.defineProperty(globalThis, 'navigator', {
        get() {
          return {onLine: false};
        },
      });

      try {
        const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestInsightProvider(), '', {
          isSyncActive: false,
          accountEmail: 'some-email',
        });
        renderElementIntoDOM(component);
        await drainMicroTasks();
        const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
        assert.strictEqual(content, 'Internet connection is currently not available.');
      } finally {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      }
    });
  });
});
