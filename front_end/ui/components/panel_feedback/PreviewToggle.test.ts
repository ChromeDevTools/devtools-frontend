// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as PanelFeedback from './panel_feedback.js';

describeWithLocale('Preview toggle', () => {
  it('calls out correctly to enable experiment', async () => {
    const isEnabledStub = sinon.stub(Root.Runtime.experiments, 'isEnabled');
    isEnabledStub.callsFake(() => false);
    const setEnabledStub = sinon.stub(Root.Runtime.experiments, 'setEnabled');
    setEnabledStub.callsFake(() => {});
    const spy = sinon.spy();

    const component = new PanelFeedback.PreviewToggle.PreviewToggle();
    component.data = {
      name: 'toggle name',
      helperText: 'more about this toggle',
      feedbackURL: 'https://feedbackurl.com',
      experiment: 'testExperiment' as Root.Runtime.ExperimentName,
      onChangeCallback: spy,
    };

    renderElementIntoDOM(component);
    await RenderCoordinator.done();

    assert.isNotNull(component.shadowRoot);
    const checkbox = component.shadowRoot.querySelector('devtools-checkbox');
    assert.exists(checkbox);
    checkbox.click();
    sinon.assert.callCount(setEnabledStub, 1);
    assert.isTrue(
        setEnabledStub.firstCall.calledWith('testExperiment', true),
        'experiments.setEnabled was not called with the correct experiment');
    sinon.assert.callCount(spy, 1);
    assert.isTrue(spy.firstCall.firstArg);
  });

  it('calls out correctly to disable experiment', async () => {
    const isEnabledStub = sinon.stub(Root.Runtime.experiments, 'isEnabled');
    isEnabledStub.callsFake(() => true);
    const setEnabledStub = sinon.stub(Root.Runtime.experiments, 'setEnabled');
    setEnabledStub.callsFake(() => {});
    const spy = sinon.spy();

    const component = new PanelFeedback.PreviewToggle.PreviewToggle();
    component.data = {
      name: 'toggle name',
      helperText: 'more about this toggle',
      feedbackURL: 'https://feedbackurl.com',
      experiment: 'testExperiment' as Root.Runtime.ExperimentName,
      onChangeCallback: spy,
    };

    renderElementIntoDOM(component);
    await RenderCoordinator.done();

    const checkbox = component.shadowRoot!.querySelector('devtools-checkbox');
    assert.exists(checkbox);
    checkbox.click();
    sinon.assert.callCount(setEnabledStub, 1);
    assert.isTrue(
        setEnabledStub.firstCall.calledWith('testExperiment', false),
        'experiments.setEnabled was not called with the correct experiment');
    sinon.assert.callCount(spy, 1);
    assert.isFalse(spy.firstCall.firstArg);
  });
});
