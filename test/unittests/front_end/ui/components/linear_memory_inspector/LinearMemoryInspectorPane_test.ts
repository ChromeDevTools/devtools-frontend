// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import type * as LinearMemoryInspectorModule from
    '../../../../../../front_end/ui/components/linear_memory_inspector/linear_memory_inspector.js';
import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import {assertElement} from '../../../helpers/DOMHelpers.js';

function createArray() {
  const array = [];
  for (let i = 0; i < 100; ++i) {
    array.push(i);
  }
  return new Uint8Array(array);
}

describeWithEnvironment('LinearMemoryInspectorPane', () => {
  let LinearMemoryInspector: typeof LinearMemoryInspectorModule;

  before(async () => {
    LinearMemoryInspector =
        await import('../../../../../../front_end/ui/components/linear_memory_inspector/linear_memory_inspector.js');
  });

  class Uint8Wrapper {
    private array: Uint8Array;

    constructor(array: Uint8Array) {
      this.array = array;
    }

    getRange(start: number, end: number): Promise<Uint8Array> {
      return Promise.resolve(this.array.slice(start, end));
    }
    length(): number {
      return this.array.length;
    }
  }

  it('can be created', () => {
    const instance = LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPaneImpl.instance();
    const arrayWrapper = new Uint8Wrapper(createArray());
    const scriptId = 'scriptId';
    const title = 'Test Title';
    instance.create(scriptId, title, arrayWrapper, 10);

    const tabbedPane = instance.contentElement.querySelector('.tabbed-pane');
    assertNotNullOrUndefined(tabbedPane);
    const inspector = tabbedPane.querySelector<LinearMemoryInspectorModule.LinearMemoryInspector.LinearMemoryInspector>(
        'devtools-linear-memory-inspector-inspector');
    assertElement(inspector, LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector);
  });

  it('triggers view.updateHighlightInfo() when resetHighlightInfo() called', () => {
    const instance = LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPaneImpl.instance();
    const arrayWrapper = new Uint8Wrapper(createArray());
    const tabId = 'tabId';
    const title = 'Test Title';

    const highlightInfo = {
      startAddress: 2,
      size: 10,
    };
    instance.create(tabId, title, arrayWrapper, 10, highlightInfo);
    const view = instance.getViewForTabId(tabId);
    const spy = sinon.spy(view, 'updateHighlightInfo');
    instance.resetHighlightInfo(tabId);
    assert.isTrue(spy.calledOnce);
  });

  it('triggers view.refreshData() when reveal() called with highlightInfo set', () => {
    const instance = LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPaneImpl.instance();
    const arrayWrapper = new Uint8Wrapper(createArray());
    const tabId = 'tabId';
    const title = 'Test Title';

    const oldHighlightInfo = {
      startAddress: 2,
      size: 10,
    };
    const newHighlightInfo = {
      startAddress: 4,
      size: 4,
    };

    instance.create(tabId, title, arrayWrapper, 10, oldHighlightInfo);
    const view = instance.getViewForTabId(tabId);
    const spy = sinon.spy(view, 'refreshData');
    instance.reveal(tabId, 4, newHighlightInfo);
    assert.isTrue(spy.calledOnce);
  });
});
