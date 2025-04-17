// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {html, render} from '../../lit/lit.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as ComponentHelpers from './helpers.js';

const TestElement = class extends HTMLElement {
  renderCount = 0;
  renderAsyncCount = 0;
  render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Render is not scheduled');
    }

    this.renderCount++;
  }
  renderAsync() {
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
          render(
              // clang-format off
              html`
              <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
               hello world
              </span>`,
              // clang-format on
              targetDiv, {host: this});
        }
        fakeComponentRender.call(targetDiv);
        assert.isNotEmpty(targetDiv.innerHTML);
        sinon.assert.callCount(callback, 1);
      });

      it('runs again when Lit re-renders', () => {
        const targetDiv = document.createElement('div');
        const callback = sinon.spy();
        function fakeComponentRender(this: HTMLDivElement, output: string) {
          render(
              // clang-format off
              html`
              <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
               ${output}
              </span>`,
              // clang-format on
              targetDiv, {host: this});
        }
        fakeComponentRender.call(targetDiv, 'render one');
        sinon.assert.callCount(callback, 1);
        fakeComponentRender.call(targetDiv, 'render two');
        sinon.assert.callCount(callback, 2);
      });
    });
  });

  describe('scheduleRender', () => {
    it('throws if renders are unscheduled', () => {
      const element = new TestElement();
      assert.throws(() => {
        element.render();
      }, 'Render is not scheduled');
    });

    it('only renders once if second render call is made before the first has been handled', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, element.render);
      void ComponentHelpers.ScheduledRender.scheduleRender(element, element.render);

      await RenderCoordinator.done();
      assert.strictEqual(element.renderCount, 1);
    });

    it('handles async callbacks', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, async () => {
        void ComponentHelpers.ScheduledRender.scheduleRender(element, element.renderAsync);

        await element.renderAsync();
      });

      await RenderCoordinator.done();
      assert.strictEqual(element.renderAsyncCount, 2);
    });

    it('re-renders if second render call is made during the first', async () => {
      const element = new TestElement();
      void ComponentHelpers.ScheduledRender.scheduleRender(element, () => {
        void ComponentHelpers.ScheduledRender.scheduleRender(element, element.render);

        element.render();
      });

      await RenderCoordinator.done();
      assert.strictEqual(element.renderCount, 2);
    });
  });
});
