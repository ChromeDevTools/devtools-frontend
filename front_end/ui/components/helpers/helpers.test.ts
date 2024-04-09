// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as ComponentHelpers from './helpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const TestElement = class extends HTMLElement {
  renderCount = 0;
  renderAsyncCount = 0;
  readonly renderBound = this.#render.bind(this);
  readonly renderAsyncBound = this.#renderAsync.bind(this);
  #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Render is not scheduled');
    }

    this.renderCount++;
  }
  #renderAsync() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Render is not scheduled');
    }

    return new Promise<void>(resolve => {
      setTimeout(() => {
        this.renderAsyncCount++;
        resolve();
      }, 40);
    });
  }
};
customElements.define('x-devtools-test-element', TestElement);

describe('ComponentHelpers', () => {
  describe('Directives', () => {
    describe('nodeRenderedCallback', () => {
      it('runs when any node is rendered', () => {
        const targetDiv = document.createElement('div');
        const callback = sinon.spy();
        function fakeComponentRender(this: HTMLDivElement) {
          // clang-format off
          const html = LitHtml.html`
          <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
           hello world
          </span>`;
          // clang-format on
          LitHtml.render(html, targetDiv, {host: this});
        }
        fakeComponentRender.call(targetDiv);
        assert.isNotEmpty(targetDiv.innerHTML);
        assert.strictEqual(callback.callCount, 1);
      });

      it('runs again when Lit re-renders', () => {
        const targetDiv = document.createElement('div');
        const callback = sinon.spy();
        function fakeComponentRender(this: HTMLDivElement, output: string) {
          // clang-format off
          const html = LitHtml.html`
          <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
           ${output}
          </span>`;
          // clang-format on
          LitHtml.render(html, targetDiv, {host: this});
        }
        fakeComponentRender.call(targetDiv, 'render one');
        assert.strictEqual(callback.callCount, 1);
        fakeComponentRender.call(targetDiv, 'render two');
        assert.strictEqual(callback.callCount, 2);
      });
    });
  });

  describe('scheduleRender', () => {
    it('throws if renders are unscheduled', () => {
      const element = new TestElement();
      assert.throws(() => {
        element.renderBound();
      }, 'Render is not scheduled');
    });

    it('only renders once if second render call is made before the first has been handled', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, element.renderBound);
      void ComponentHelpers.ScheduledRender.scheduleRender(element, element.renderBound);

      await coordinator.done();
      assert.strictEqual(element.renderCount, 1);
    });

    it('handles async callbacks', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, async () => {
        void ComponentHelpers.ScheduledRender.scheduleRender(element, element.renderAsyncBound);

        await element.renderAsyncBound();
      });

      await coordinator.done();
      assert.strictEqual(element.renderAsyncCount, 2);
    });

    it('re-renders if second render call is made during the first', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, () => {
        void ComponentHelpers.ScheduledRender.scheduleRender(element, element.renderBound);

        element.renderBound();
      });

      await coordinator.done();
      assert.strictEqual(element.renderCount, 2);
    });
  });
});
