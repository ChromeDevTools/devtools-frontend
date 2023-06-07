// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as SettingComponents from '../../../../../../front_end/ui/components/settings/settings.js';
import {TestRevealer} from '../../../helpers/RevealerHelpers.js';

function createWarningElement(deprecationNotice: Common.SettingRegistration.SettingRegistration['deprecationNotice']) {
  const registration: Common.SettingRegistration.SettingRegistration = {
    settingName: 'boolean',
    settingType: Common.Settings.SettingType.BOOLEAN,
    defaultValue: false,
    deprecationNotice,
  };
  const component = new SettingComponents.SettingDeprecationWarning.SettingDeprecationWarning();
  component.data = new Common.Settings.Deprecation(registration);
  const element = component.shadowRoot?.firstElementChild as HTMLElement | undefined;
  return {component, element};
}

const warning = () => 'Warning' as Platform.UIString.LocalizedString;
const EXPERIMENT_NAME = 'testExperiment';

describe('SettingDeprecationWarning', () => {
  beforeEach(() => {
    Root.Runtime.experiments.clearForTest();
  });
  afterEach(() => {
    Root.Runtime.experiments.clearForTest();
  });

  it('shows the warning tooltip', () => {
    const {element} = createWarningElement({disabled: true, warning});
    assert.deepEqual(element?.title, warning());
  });

  it('is clickable when disabled and associated with an experiment', () => {
    Root.Runtime.experiments.register(EXPERIMENT_NAME, EXPERIMENT_NAME);
    const {element} = createWarningElement({disabled: true, warning, experiment: EXPERIMENT_NAME});
    assertNotNullOrUndefined(element);
    assert.include(Array.from(element.classList.values()), 'clickable');
  });

  it('is not clickable when not disabled and associated with an experiment', () => {
    Root.Runtime.experiments.register(EXPERIMENT_NAME, EXPERIMENT_NAME);
    const {element} = createWarningElement({disabled: false, warning, experiment: EXPERIMENT_NAME});
    assertNotNullOrUndefined(element);
    assert.notInclude(Array.from(element.classList.values()), 'clickable');
  });

  it('reveals the associated experiment on click', () => {
    Root.Runtime.experiments.register(EXPERIMENT_NAME, EXPERIMENT_NAME);
    const experiment = Root.Runtime.experiments.allConfigurableExperiments().find(e => e.name === EXPERIMENT_NAME);
    assertNotNullOrUndefined(experiment);
    const {element} = createWarningElement({disabled: true, warning, experiment: EXPERIMENT_NAME});
    const callback = sinon.fake((_object: Object|null, _omitFocus?: boolean) => Promise.resolve());
    TestRevealer.install(callback);
    assertNotNullOrUndefined(element);
    element.click();

    assert.isTrue(
        callback.calledOnceWithExactly(experiment, undefined),
        'Revealer was either not called or was called with unexpected arguments');
    TestRevealer.reset();
  });
});
