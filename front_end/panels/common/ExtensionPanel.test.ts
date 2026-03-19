// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Common from './common.js';

describeWithEnvironment('ExtensionSidebarPane', () => {
  it('creates a read-only object properties section for objects', async () => {
    // Stub the renderer since we just want to ensure it is called with the right editable flag.
    const rendererStub = sinon.stub(UI.UIUtils.Renderer, 'render').resolves({
      element: document.createElement('div'),
      forceSelect: () => {},
    });

    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'panel-name', 'panel title' as Platform.UIString.LocalizedString, 'id');

    await new Promise(resolve => sidebarPane.setObject({foo: 'bar'}, 'title', resolve));

    sinon.assert.calledOnce(rendererStub);
    const callArgs = rendererStub.firstCall.args;
    assert.isFalse(callArgs[1]?.editable);
  });
});
