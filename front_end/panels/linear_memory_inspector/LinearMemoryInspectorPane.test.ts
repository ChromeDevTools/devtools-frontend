// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import {doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
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

    it('throws when set or updated with an out-of-bounds address', () => {
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView();
      view.tabId = 'tab-id';
      view.memoryWrapper = arrayWrapper;
      assert.throws(() => {
        view.address = -1;
      }, 'Requested address is out of bounds.');
      assert.throws(() => {
        view.address = 100;
      }, 'Requested address is out of bounds.');

      assert.throws(() => view.updateAddress(-1), 'Requested address is out of bounds.');
      assert.throws(() => view.updateAddress(100), 'Requested address is out of bounds.');
    });

    it('loads memory on show and renders the inspector', async () => {
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView();
      view.tabId = 'tab-id';
      view.address = 10;
      view.memoryWrapper = arrayWrapper;
      renderElementIntoDOM(view);
      // doubleRaf is required because LinearMemoryInspectorView asynchronously fetches memory
      // in wasShown before scheduling a widget update.
      await doubleRaf();

      const viewer = view.contentElement.querySelector('.viewer-widget');
      assert.instanceOf(viewer, HTMLElement);
    });

    it('passes loaded memory and handles memory requests via view input', async () => {
      const view = createViewFunctionStub(
          LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
      );
      const arrayWrapper = new Uint8Wrapper(createArray());
      const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
          undefined,
          view,
      );
      inspectorView.tabId = 'tab-id';
      inspectorView.address = 10;
      inspectorView.memoryWrapper = arrayWrapper;
      renderElementIntoDOM(inspectorView);
      const input = await view.nextInput;
      assert.strictEqual(input.address, 10);
      assert.strictEqual(input.outerMemoryLength, 100);
      assert.exists(input.memory);

      input.onMemoryRequest({start: 20, end: 40, address: 25});
      const updatedInput = await view.nextInput;
      assert.strictEqual(updatedInput.offset, 20);
      assert.strictEqual(updatedInput.memory?.length, 80);
    });

    it('notifies onAddressChanged callback and updates view input when address changes', async () => {
      const view = createViewFunctionStub(
          LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
      );
      const arrayWrapper = new Uint8Wrapper(createArray());
      const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
          undefined,
          view,
      );
      inspectorView.tabId = 'tab-id';
      inspectorView.address = 10;
      inspectorView.memoryWrapper = arrayWrapper;
      const changedAddresses: Array<{tabId: string, address: number}> = [];
      inspectorView.onAddressChanged = (tabId, address) => changedAddresses.push({tabId, address});
      renderElementIntoDOM(inspectorView);
      const input = await view.nextInput;

      input.onAddressChanged(42);
      const updatedInput = await view.nextInput;
      assert.strictEqual(updatedInput.address, 42);
      assert.deepEqual(changedAddresses, [{tabId: 'tab-id', address: 42}]);
    });

    it('updates and saves settings via onSettingsChanged callback', async () => {
      const view = createViewFunctionStub(
          LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
      );
      const arrayWrapper = new Uint8Wrapper(createArray());
      const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
          undefined,
          view,
      );
      inspectorView.tabId = 'tab-id';
      inspectorView.address = 0;
      inspectorView.memoryWrapper = arrayWrapper;
      renderElementIntoDOM(inspectorView);
      const input = await view.nextInput;

      const settings = {
        valueTypes: new Set([
          LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
        ]),
        modes: new Map([
          [
            LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
            LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL,
          ],
        ]),
        endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG,
      };
      input.onSettingsChanged(settings);
      const updatedInput = await view.nextInput;
      assert.deepEqual(updatedInput.valueTypes, settings.valueTypes);
      assert.deepEqual(updatedInput.valueTypeModes, settings.modes);
      assert.strictEqual(updatedInput.endianness, settings.endianness);
      assert.deepEqual(controller.loadSettings(), settings);
    });

    it('passes highlight info to view input and removes it via onDeleteMemoryHighlight', async () => {
      const controller =
          LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
      const highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo = {
        startAddress: 8,
        size: 4,
        type: 'int32',
      };
      controller.setHighlightInfo('tab-id', highlightInfo);
      try {
        const view = createViewFunctionStub(
            LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
        );
        const arrayWrapper = new Uint8Wrapper(createArray());
        const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
            undefined,
            view,
        );
        inspectorView.tabId = 'tab-id';
        inspectorView.address = 8;
        inspectorView.memoryWrapper = arrayWrapper;
        renderElementIntoDOM(inspectorView);
        const input = await view.nextInput;
        assert.deepEqual(input.highlightInfo, highlightInfo);

        input.onDeleteMemoryHighlight(highlightInfo);
        const updatedInput = await view.nextInput;
        assert.isUndefined(updatedInput.highlightInfo);
        assert.isUndefined(controller.getHighlightInfo('tab-id'));
      } finally {
        controller.removeHighlight('tab-id', highlightInfo);
      }
    });

    it('throws when highlight info has out-of-bounds startAddress', () => {
      const controller =
          LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view = createViewFunctionStub(
          LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
      );
      const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
          undefined,
          view,
      );
      inspectorView.tabId = 'tab-id';
      inspectorView.address = 0;
      inspectorView.memoryWrapper = arrayWrapper;

      const outOfBoundsHighlight: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo = {
        startAddress: 200,
        size: 4,
        type: 'int32',
      };
      controller.setHighlightInfo('tab-id', outOfBoundsHighlight);
      try {
        assert.throws(
            () => inspectorView.performUpdate(),
            'HighlightInfo start address is out of bounds.',
        );
      } finally {
        controller.removeHighlight('tab-id', outOfBoundsHighlight);
      }
    });

    it('throws when highlight info has non-positive size', () => {
      const controller =
          LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
      const arrayWrapper = new Uint8Wrapper(createArray());
      const view = createViewFunctionStub(
          LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView,
      );
      const inspectorView = new LinearMemoryInspector.LinearMemoryInspectorView.LinearMemoryInspectorView(
          undefined,
          view,
      );
      inspectorView.tabId = 'tab-id';
      inspectorView.address = 0;
      inspectorView.memoryWrapper = arrayWrapper;

      const invalidSizeHighlight: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo = {
        startAddress: 0,
        size: 0,
        type: 'int32',
      };
      controller.setHighlightInfo('tab-id', invalidSizeHighlight);
      try {
        assert.throws(
            () => inspectorView.performUpdate(),
            'Highlight size must be a positive number.',
        );
      } finally {
        controller.removeHighlight('tab-id', invalidSizeHighlight);
      }
    });
  });
});
