// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

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
    assertNotNullOrUndefined(model);
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
