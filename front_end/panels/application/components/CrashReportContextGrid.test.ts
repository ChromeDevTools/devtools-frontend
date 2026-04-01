// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components.js';

describeWithEnvironment('CrashReportContextGrid', () => {
  let viewFunction: ViewFunctionStub<typeof ApplicationComponents.CrashReportContextGrid.CrashReportContextGrid>;
  let component: ApplicationComponents.CrashReportContextGrid.CrashReportContextGrid;

  beforeEach(() => {
    viewFunction = createViewFunctionStub(ApplicationComponents.CrashReportContextGrid.CrashReportContextGrid);
    component = new ApplicationComponents.CrashReportContextGrid.CrashReportContextGrid(undefined, viewFunction);
  });

  it('renders entries in the grid', async () => {
    const inputPromise = viewFunction.nextInput;
    component.data = {
      entries: [
        {key: 'key1', value: 'value1'},
        {key: 'key2', value: 'value2'},
      ]
    };

    const input = await inputPromise;
    assert.lengthOf(input.entries, 2);
    assert.strictEqual(input.entries[0].key, 'key1');
    assert.strictEqual(input.entries[0].value, 'value1');
    assert.strictEqual(input.entries[1].key, 'key2');
    assert.strictEqual(input.entries[1].value, 'value2');
  });

  it('filters entries when a filter is applied', async () => {
    const inputPromise = viewFunction.nextInput;
    component.data = {
      entries: [
        {key: 'apple', value: 'red'},
        {key: 'banana', value: 'yellow'},
      ],
      filters: [{key: 'key,value', regex: /apple/i, negative: false}],
    };

    const input = await inputPromise;
    assert.lengthOf(input.entries, 1);
    assert.strictEqual(input.entries[0].key, 'apple');
  });

  it('fires select event when a row is selected', async () => {
    const inputPromise = viewFunction.nextInput;
    component.data = {
      entries: [
        {key: 'apple', value: 'red'},
      ],
    };

    const input = await inputPromise;

    let selectedKey = '';
    component.element.addEventListener('select', (e: Event) => {
      selectedKey = (e as CustomEvent<string>).detail;
    });

    // Simulate selecting
    input.onSelect('apple');

    assert.strictEqual(selectedKey, 'apple');
  });

  it('copies key and value correctly from context menu', async () => {
    const inputPromise = viewFunction.nextInput;
    component.data = {
      entries: [
        {key: 'apple', value: 'red'},
      ],
    };

    const input = await inputPromise;

    const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');

    const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));
    input.onContextMenu(new CustomEvent('contextmenu', {detail: contextMenu}), 'apple', 'red');

    const copyKeyItem = contextMenu.defaultSection().items.find(item => item.buildDescriptor().label === 'Copy key');
    assert.exists(copyKeyItem);
    const copyValueItem =
        contextMenu.defaultSection().items.find(item => item.buildDescriptor().label === 'Copy value');
    assert.exists(copyValueItem);

    // Trigger copy key
    contextMenu.invokeHandler(copyKeyItem!.id());
    sinon.assert.calledWith(copyTextStub, 'apple');

    // Trigger copy value
    contextMenu.invokeHandler(copyValueItem!.id());
    sinon.assert.calledWith(copyTextStub, 'red');
  });
});
