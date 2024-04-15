// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const CLASS_NAMES = ['class-1', 'class-2', 'class-3'];

describeWithMockConnection('ClassesPaneWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.ClassesPaneWidget.ClassesPaneWidget;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  afterEach(() => {
    view.detach();
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    view = new Elements.ClassesPaneWidget.ClassesPaneWidget();
    view.markAsRoot();
    view.show(document.body);

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    const createCheckboxLabel = sinon.spy(UI.UIUtils.CheckboxLabel, 'create');
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'getAttribute').withArgs('class').returns(CLASS_NAMES.join(' '));
    assert.isFalse(createCheckboxLabel.called);

    model.dispatchEventToListeners(SDK.DOMModel.Events.DOMMutated, node);
    assert.strictEqual(createCheckboxLabel.callCount, inScope ? CLASS_NAMES.length : 0);
  };

  it('updates UI on in scope update event', updatesUiOnEvent(true));
  it('does not update UI on out of scope update event', updatesUiOnEvent(false));
});
