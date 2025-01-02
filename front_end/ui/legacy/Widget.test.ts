// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

const {Widget} = UI.Widget;

class UpdateWidget extends Widget {
  override doUpdate(): Promise<void>|void {
    return super.doUpdate();
  }
}

describe('Widget', () => {
  it('monkey-patches `Element#appendChild()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(() => div.appendChild(widget.element));
  });

  it('monkey-patches `Element#insertBefore()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    const child = document.createElement('span');
    div.appendChild(child);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(() => div.insertBefore(widget.element, child));
  });

  it('monkey-patches `Element#removeChild()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChild(widget.element));
  });

  it('monkey-patches `Element#removeChildren()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChildren());
  });

  describe('detach', () => {
    it('cancels pending updates', async () => {
      const widget = new UpdateWidget();
      const doUpdate = sinon.spy(widget, 'doUpdate');
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));
      widget.update();

      widget.detach();

      assert.isTrue(await widget.updateComplete);
      assert.strictEqual(doUpdate.callCount, 0, 'Expected no calls to `doUpdate`');
    });
  });

  describe('doUpdate', () => {
    it('can safely use the `RenderCoordinator` primitives', async () => {
      const widget = new (class extends UpdateWidget {
        override async doUpdate(): Promise<void> {
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

      widget.update();

      assert.isTrue(await widget.updateComplete);
    });
  });

  describe('update', () => {
    it('deduplicates subsequent update requests', async () => {
      const widget = new UpdateWidget();
      const doUpdate = sinon.stub(widget, 'doUpdate');

      widget.update();
      widget.update();
      await widget.updateComplete;

      assert.strictEqual(doUpdate.callCount, 1, 'Expected exactly one call to `doUpdate`');
    });
  });

  describe('updateComplete', () => {
    it('resolves to `true` when there\'s no pending update', async () => {
      const widget = new Widget();

      assert.isTrue(await widget.updateComplete);
    });

    it('resolves to `true` when update cycles ends without scheduling another update', async () => {
      const widget = new Widget();

      widget.update();

      assert.isTrue(await widget.updateComplete);
    });

    it('resolves to `false` when another update is schedule during an update cycle', async () => {
      const widget = new UpdateWidget();
      sinon.stub(widget, 'doUpdate').onFirstCall().callsFake(widget.update.bind(widget));

      widget.update();

      assert.isFalse(await widget.updateComplete);
      await widget.updateComplete;
    });

    it('yields the same promise for the same update cycle', async () => {
      const widget = new Widget();

      widget.update();
      const updateComplete = widget.updateComplete;
      widget.update();

      assert.strictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });

    it('yields a new promise for each update cycle', async () => {
      const widget = new Widget();

      widget.update();
      const updateComplete = widget.updateComplete;
      await updateComplete;
      widget.update();

      assert.notStrictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });
  });
});
