// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import {doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as LinearMemoryInspectorComponents from './components/components.js';
import * as LinearMemoryInspector from './linear_memory_inspector.js';

function createArray(): Uint8Array<ArrayBuffer> {
  const array = [];
  for (let i = 0; i < 100; ++i) {
    array.push(i);
  }
  return new Uint8Array(array);
}

class Uint8Wrapper implements LinearMemoryInspector.LinearMemoryInspectorController.LazyUint8Array {
  readonly #array: Uint8Array<ArrayBuffer>;

  constructor(array: Uint8Array<ArrayBuffer>) {
    this.#array = array;
  }

  getRange(start: number, end: number): Promise<Uint8Array<ArrayBuffer>> {
    return Promise.resolve(this.#array.slice(start, end));
  }

  length(): number {
    return this.#array.length;
  }
}

describeWithEnvironment('LinearMemoryInspectorPane', () => {
  it('creates placeholder element for empty state', () => {
    const instance = new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane();
    const placeholder = instance.createPlaceholder();

    const header = placeholder.querySelector('.empty-state-header');
    assert.instanceOf(header, HTMLElement);
    assert.strictEqual(header.textContent, 'No open inspections');

    const description = placeholder.querySelector('.empty-state-description > span');
    assert.instanceOf(description, HTMLElement);
    assert.strictEqual(description.textContent, 'On this page you can inspect binary data');
  });

  it('creates and renders a tab', async () => {
    const instance = new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane();
    renderElementIntoDOM(instance);

    const arrayWrapper = new Uint8Wrapper(createArray());
    instance.create('script-id', 'Test Title', arrayWrapper, 10);
    await UI.Widget.Widget.allUpdatesComplete;

    const tabbedPane = instance.contentElement.querySelector('.tabbed-pane');
    assert.exists(tabbedPane);
    const viewer = tabbedPane.querySelector('.viewer-widget');
    assert.instanceOf(viewer, HTMLElement);
  });

  it('reveals and refreshes an existing tab', async () => {
    const instance = new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane();
    renderElementIntoDOM(instance);

    const arrayWrapper = new Uint8Wrapper(createArray());
    const tabId = 'script-id';
    instance.create(tabId, 'Test Title', arrayWrapper, 10);
    await UI.Widget.Widget.allUpdatesComplete;

    instance.reveal(tabId, 20);
    instance.refreshView(tabId);
    await UI.Widget.Widget.allUpdatesComplete;

    const viewer = instance.contentElement.querySelector('.viewer-widget');
    assert.instanceOf(viewer, HTMLElement);
  });

  it('closes a tab and dispatches ViewClosed event', async () => {
    const instance = new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane();
    renderElementIntoDOM(instance);

    const arrayWrapper = new Uint8Wrapper(createArray());
    const tabId = 'script-id';
    instance.create(tabId, 'Test Title', arrayWrapper, 10);
    await UI.Widget.Widget.allUpdatesComplete;

    const closedPromise = instance.once(LinearMemoryInspector.LinearMemoryInspectorPane.Events.VIEW_CLOSED);
    instance.close(tabId);
    const closedTabId = await closedPromise;
    assert.strictEqual(closedTabId, tabId);
  });

  it('throws when creating or revealing a tab with an out-of-bounds address', () => {
    const instance = new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane();
    const arrayWrapper = new Uint8Wrapper(createArray());

    assert.throws(() => instance.create('tab-id', 'Test Title', arrayWrapper, -1),
                  'Requested address is out of bounds.');
    assert.throws(() => instance.create('tab-id', 'Test Title', arrayWrapper, 100),
                  'Requested address is out of bounds.');

    instance.create('tab-id', 'Test Title', arrayWrapper, 10);
    assert.throws(() => instance.reveal('tab-id', -1), 'Requested address is out of bounds.');
    assert.throws(() => instance.reveal('tab-id', 100), 'Requested address is out of bounds.');
  });

  describe('LinearMemoryInspectorView', () => {
    let controller: LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController;
    let originalSettings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings;

    beforeEach(() => {
      controller = LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
      originalSettings = controller.loadSettings();
    });

    afterEach(() => {
      controller.saveSettings(originalSettings);
    });

    it('throws when constructed or updated with an out-of-bounds address', () => {
      const arrayWrapper = new Uint8Wrapper(createArray());
      assert.throws(() => new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView(arrayWrapper,
                                                                                                        -1, 'tab-id'),
                    'Requested address is out of bounds.');
      assert.throws(() => new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView(arrayWrapper,
                                                                                                        100, 'tab-id'),
                    'Requested address is out of bounds.');

      const view =
          new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView(arrayWrapper, 0, 'tab-id');
      assert.throws(() => view.updateAddress(-1), 'Requested address is out of bounds.');
      assert.throws(() => view.updateAddress(100), 'Requested address is out of bounds.');
    });

    it('loads memory on show and renders the inspector', async () => {
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view =
          new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView(arrayWrapper, 10, 'tab-id');
      renderElementIntoDOM(view);
      // doubleRaf is required because LinearMemoryInspectorView asynchronously fetches memory
      // in wasShown before scheduling a widget update.
      await doubleRaf();

      const viewer = view.contentElement.querySelector('.viewer-widget');
      assert.instanceOf(viewer, HTMLElement);
    });

    it('saves settings via controller', () => {
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view =
          new LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView(arrayWrapper, 0, 'tab-id');
      const settings = {
        valueTypes: new Set([LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8]),
        modes: new Map([
          [
            LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
            LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL,
          ],
        ]),
        endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG,
      };
      view.saveSettings(settings);
      assert.deepEqual(controller.loadSettings(), settings);
    });
  });
});
