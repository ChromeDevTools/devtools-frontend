// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as LinearMemoryInspectorModule from
    '../../../../../front_end/panels/linear_memory_inspector/linear_memory_inspector.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

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
        await import('../../../../../front_end/panels/linear_memory_inspector/linear_memory_inspector.js');
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
    const instance = LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane.instance();
    const arrayWrapper = new Uint8Wrapper(createArray());
    const scriptId = 'scriptId';
    const title = 'Test Title';
    instance.create(scriptId, title, arrayWrapper, 10);

    const tabbedPane = instance.contentElement.querySelector('.tabbed-pane');
    assertNotNullOrUndefined(tabbedPane);
    const inspector = tabbedPane.querySelector('devtools-linear-memory-inspector-inspector');
    assert.notInstanceOf(inspector, HTMLSpanElement);
  });
});
