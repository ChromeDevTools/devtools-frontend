// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Models from '../models/models.js';

import * as RecorderComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('ReplaySection', () => {
  setupActionRegistry();

  let settings: Models.RecorderSettings.RecorderSettings;
  async function createReplaySection() {
    settings = new Models.RecorderSettings.RecorderSettings();
    const component = new RecorderComponents.ReplaySection.ReplaySection();
    component.data = {settings, replayExtensions: []};
    renderElementIntoDOM(component);
    await coordinator.done();

    return component;
  }

  afterEach(() => {
    settings.speed = Models.RecordingPlayer.PlayRecordingSpeed.Normal;
  });

  it('should change the button value when another option is selected in select menu', async () => {
    const component = await createReplaySection();
    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Normal,
    );

    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectMenuSelectedEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );
    await coordinator.done();
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should emit startreplayevent on selectbuttonclick event', async () => {
    const component = await createReplaySection();
    const onceClicked = new Promise<RecorderComponents.ReplaySection.StartReplayEvent>(
        resolve => {
          component.addEventListener('startreplay', resolve, {once: true});
        },
    );

    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectMenuSelectedEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );
    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectButtonClickEvent(),
    );

    const event = await onceClicked;
    assert.deepEqual(
        event.speed,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should save the changed button when option is selected in select menu', async () => {
    const component = await createReplaySection();
    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );

    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectMenuSelectedEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );

    assert.strictEqual(
        settings.speed,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should load the saved button on initial render', async () => {
    settings.speed = Models.RecordingPlayer.PlayRecordingSpeed.Slow;

    const component = await createReplaySection();

    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });
});
