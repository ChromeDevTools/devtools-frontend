// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

describeWithEnvironment('ShowMoreDetailsWidget', () => {
  it('updates view on text change', async () => {
    const view = createViewFunctionStub(Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);
    const widget = new Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget(undefined, view);
    widget.text = 'some text';

    const input = await view.nextInput;
    assert.strictEqual(input.text, 'some text');
    assert.isFalse(input.showMore);
  });

  it('updates view on copy item change', async () => {
    const view = createViewFunctionStub(Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);
    const widget = new Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget(undefined, view);

    const copyItem = {
      menuItem: new UI.ContextMenu.Item(null, 'item', 'Copy'),
      handler: () => {},
    };
    widget.copy = copyItem;

    const input = await view.nextInput;
    assert.strictEqual(input.copy, copyItem);
  });

  it('toggles showMore state', async () => {
    const view = createViewFunctionStub(Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);
    const widget = new Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget(undefined, view);
    widget.text = 'some text';

    let input = await view.nextInput;
    assert.isFalse(input.showMore);

    input.onToggle();

    input = await view.nextInput;
    assert.isTrue(input.showMore);
  });
});
