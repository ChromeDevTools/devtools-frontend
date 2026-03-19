// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithEnvironment('WatchExpression', () => {
  it('creates read-only object properties for watch expression', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves({object, exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const expandController = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(
        new UI.TreeOutline.TreeOutline());
    const linkifier = new Components.Linkifier.Linkifier();
    const watchExpression = new Sources.WatchExpressionsSidebarPane.WatchExpression('obj', expandController, linkifier);

    await new Promise(resolve => setTimeout(resolve, 0));

    const treeElement = watchExpression.treeElement();
    assert.exists(treeElement);

    // Ensure children are populated
    await treeElement.onpopulate();

    const firstProperty = treeElement.childAt(0);
    assert.instanceOf(firstProperty, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(firstProperty.editable);
  });
});
