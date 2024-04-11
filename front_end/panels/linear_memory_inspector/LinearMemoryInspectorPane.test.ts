// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as LinearMemoryInspector from './linear_memory_inspector.js';

function createArray() {
  const array = [];
  for (let i = 0; i < 100; ++i) {
    array.push(i);
  }
  return new Uint8Array(array);
}

describeWithEnvironment('LinearMemoryInspectorPane', () => {
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
    const scriptId = 'script-id';
    const title = 'Test Title';
    instance.create(scriptId, title, arrayWrapper, 10);

    const tabbedPane = instance.contentElement.querySelector('.tabbed-pane');
    assert.exists(tabbedPane);
    const inspector = tabbedPane.querySelector('devtools-linear-memory-inspector-inspector');
    assert.notInstanceOf(inspector, HTMLSpanElement);
  });
});
