// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/1146002): Replace this import as soon as
// we are able to use `import as * ...` across the codebase
// in the following files:
// LinearMemoryNavigator.ts
// LinearMemoryValueInterpreter.ts
import '../../ui/components/Icon.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as LinearMemoryInspector from '../../linear_memory_inspector/linear_memory_inspector.js';

ComponentHelpers.ComponentServerSetup.setup().then(() => renderComponent());

const renderComponent = (): void => {
  const array = [];
  const string = 'Hello this is a string from the memory buffer!';

  for (let i = 0; i < string.length; ++i) {
    array.push(string.charCodeAt(i));
  }

  for (let i = -1000; i < 1000; ++i) {
    array.push(i);
  }

  const memory = new Uint8Array(array);
  const memoryInspector = new LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector();
  document.getElementById('container')?.appendChild(memoryInspector);

  memoryInspector.data = {
    memory: memory,
    address: 0,
    memoryOffset: 0,
    outerMemoryLength: memory.length,
  };
};
