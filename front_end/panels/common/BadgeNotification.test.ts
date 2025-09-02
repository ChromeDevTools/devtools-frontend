// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import * as BadgeNotification from './BadgeNotification.js';

const {html} = Lit;

describeWithEnvironment('BadgeNotification', () => {
  async function createWidget(properties?: Partial<BadgeNotification.BadgeNotificationProperties>) {
    const view = createViewFunctionStub(BadgeNotification.BadgeNotification);
    const widget = new BadgeNotification.BadgeNotification(undefined, view);
    widget.message = properties?.message ?? html`Test message`;
    widget.imageUri = properties?.imageUri ?? 'test.png';
    widget.actions = properties?.actions ?? [];
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    widget.requestUpdate();
    await view.nextInput;
    return {view, widget};
  }

  let inspectorViewRootElementStub: HTMLElement;
  beforeEach(() => {
    inspectorViewRootElementStub = document.createElement('div');
    renderElementIntoDOM(inspectorViewRootElementStub, {allowMultipleChildren: true});

    const inspectorViewStub = sinon.createStubInstance(UI.InspectorView.InspectorView);
    Object.assign(inspectorViewStub, {element: inspectorViewRootElementStub});
    sinon.stub(UI.InspectorView.InspectorView, 'instance').returns(inspectorViewStub);
  });

  it('invokes action callback on click', async () => {
    const action1Spy = sinon.spy();
    const {view} = await createWidget({actions: [{label: 'Action 1', onClick: action1Spy}]});

    view.input.actions[0].onClick();
    sinon.assert.calledOnce(action1Spy);
  });

  it('is removed on close click', async () => {
    const {view, widget} = await createWidget();
    widget.show(inspectorViewRootElementStub);
    assert.isTrue(inspectorViewRootElementStub.contains(widget.element));

    view.input.onCloseClick();
    assert.isFalse(inspectorViewRootElementStub.contains(widget.element));
  });
});
