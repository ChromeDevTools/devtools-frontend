// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

const {Widget} = UI.Widget;

describe('Widget', () => {
  it('monkey-patches `Element#appendChild()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(
        () => div.appendChild(widget.element), /Attempt to modify widget with native DOM method `appendChild`/);
  });

  it('monkey-patches `Element#insertBefore()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    const child = document.createElement('span');
    div.appendChild(child);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(
        () => div.insertBefore(widget.element, child),
        /Attempt to modify widget with native DOM method `insertBefore`/);
  });

  it('monkey-patches `Element#removeChild()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(
        () => div.removeChild(widget.element), /Attempt to modify widget with native DOM method `removeChild`/);
  });

  it('monkey-patches `Element#removeChildren()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChildren(), /Attempt to modify widget with native DOM method `removeChildren`/);
  });

  describe('constructor', () => {
    it('doesn\'t create a shadow DOM if `useShadowDom` is set to `false`', () => {
      const widget = new Widget({useShadowDom: false});

      assert.isNull(widget.element.shadowRoot);
      assert.strictEqual(widget.element, widget.contentElement);
    });

    it('doesn\'t create a shadow DOM if `useShadowDom` is unspecified', () => {
      const widget = new Widget();

      assert.isNull(widget.element.shadowRoot);
      assert.strictEqual(widget.element, widget.contentElement);
    });

    it('correctly sets the `jslog` attribute of the `contentElement`', () => {
      const widget = new Widget({jslog: 'Panel; context: foo'});

      assert.strictEqual(
          widget.contentElement.getAttribute('jslog'),
          'Panel; context: foo',
      );
    });

    it('correctly sets the `jslog` attribute of the `contentElement` in the presence of Shadow DOM', () => {
      const widget = new Widget({jslog: 'Section; context: bar', useShadowDom: true});

      assert.isNull(widget.element.getAttribute('jslog'));
      assert.strictEqual(
          widget.contentElement.getAttribute('jslog'),
          'Section; context: bar',
      );
    });
  });

  describe('detach', () => {
    it('cancels pending updates', async () => {
      const widget = new Widget();
      const performUpdate = sinon.spy(widget, 'performUpdate');
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));
      widget.requestUpdate();

      widget.detach();

      assert.isTrue(await widget.updateComplete);
      assert.strictEqual(performUpdate.callCount, 0, 'Expected no calls to `performUpdate`');
    });
  });

  describe('performUpdate', () => {
    it('can safely use the `RenderCoordinator` primitives', async () => {
      const widget = new (class extends Widget {
        override async performUpdate(): Promise<void> {
          const clientHeight = await RenderCoordinator.read(() => this.contentElement.clientHeight);
          const clientWidth = await RenderCoordinator.read(() => this.contentElement.clientWidth);
          await RenderCoordinator.write(() => {
            this.contentElement.style.width = `${clientWidth + 1}px`;
            this.contentElement.style.height = `${clientHeight + 1}px`;
          });
        }
      })();
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));

      widget.requestUpdate();

      assert.isTrue(await widget.updateComplete);
    });
  });

  describe('requestUpdate', () => {
    it('deduplicates subsequent update requests', async () => {
      const widget = new Widget();
      const performUpdate = sinon.stub(widget, 'performUpdate');

      widget.requestUpdate();
      widget.requestUpdate();
      await widget.updateComplete;

      assert.strictEqual(performUpdate.callCount, 1, 'Expected exactly one call to `performUpdate`');
    });
  });

  describe('updateComplete', () => {
    it('resolves to `true` when there\'s no pending update', async () => {
      const widget = new Widget();

      assert.isTrue(await widget.updateComplete);
    });

    it('resolves to `true` when update cycles ends without scheduling another update', async () => {
      const widget = new Widget();

      widget.requestUpdate();

      assert.isTrue(await widget.updateComplete);
    });

    it('resolves to `false` when another update is requested during an update cycle', async () => {
      const widget = new Widget();
      sinon.stub(widget, 'performUpdate').onFirstCall().callsFake(widget.requestUpdate.bind(widget));

      widget.requestUpdate();

      assert.isFalse(await widget.updateComplete);
      await widget.updateComplete;
    });

    it('yields the same promise for the same update cycle', async () => {
      const widget = new Widget();

      widget.requestUpdate();
      const updateComplete = widget.updateComplete;
      widget.requestUpdate();

      assert.strictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });

    it('yields a new promise for each update cycle', async () => {
      const widget = new Widget();

      widget.requestUpdate();
      const updateComplete = widget.updateComplete;
      await updateComplete;
      widget.requestUpdate();

      assert.notStrictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });
  });

  describe('WidgetElement', () => {
    it('renders WidgetElement into DOM without a root element', async () => {
      const widget = new UI.Widget.WidgetElement();
      class WidgetInstance extends UI.Widget.Widget {
        override performUpdate(): void {
          // no-op
        }
      }
      widget.widgetConfig = UI.Widget.widgetConfig(WidgetInstance);
      renderElementIntoDOM(widget);
    });
  });
});
