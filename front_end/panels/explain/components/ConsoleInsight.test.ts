// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {dispatchClickEvent, renderElementIntoDOM} from '../../../../test/unittests/front_end/helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Host from '../../../core/host/host.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Explain from '../explain.js';

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
    function getTestAidaClient() {
      return {
        async *
            fetch() {
              yield {explanation: 'test', metadata: {}};
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
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      // Consent button is present.
      assert(component.shadowRoot!.querySelector('.consent-button'));
    });

    it('consent can be accepted', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
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

    const reportsRating = (positive: boolean) => async () => {
      const openInNewTab = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');
      const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
      const registerAidaClientEvent =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'registerAidaClientEvent');

      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
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
      dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
        bubbles: true,
        composed: true,
      });

      assert(openInNewTab.calledOnce);
      assert.include(openInNewTab.firstCall.firstArg, positive ? 'Positive' : 'Negative');
      assert(registerAidaClientEvent.calledOnce);
      assert.include(registerAidaClientEvent.firstCall.firstArg, positive ? 'POSITIVE' : 'NEGATIVE');
      assert(actionTaken.calledWith(
          positive ? Host.UserMetrics.Action.InsightRatedPositive : Host.UserMetrics.Action.InsightRatedNegative));
    };

    it('reports positive rating', reportsRating(true));
    it('reports negative rating', reportsRating(false));

    it('report if the user is not logged in', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
        isSyncActive: false,
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
      assert.strictEqual(content, 'This feature is only available when you sign into Chrome with your Google account.');
    });

    it('report if the sync is not enabled', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
        isSyncActive: false,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
      assert.strictEqual(content, 'This feature requires you to turn on Chrome sync.');
    });

    it('report if the navigator is offline', async () => {
      const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')!;
      Object.defineProperty(globalThis, 'navigator', {
        get() {
          return {onLine: false};
        },
      });

      try {
        const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), '', {
          isSyncActive: false,
          accountEmail: 'some-email',
        });
        renderElementIntoDOM(component);
        await drainMicroTasks();
        const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
        assert.strictEqual(content, 'Check your internet connection and try again.');
      } finally {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      }
    });
  });
});
