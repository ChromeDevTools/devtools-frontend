// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import * as i18n from '../../../../../../../front_end/core/i18n/i18n.js';
import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import * as QuickOpen from '../../../../../../../front_end/ui/legacy/components/quick_open/quick_open.js';
import {createFakeSetting, describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';
import {TestRevealer} from '../../../../helpers/RevealerHelpers.js';

function createCommandMenuProvider(
    deprecationNotice: Common.SettingRegistration.SettingRegistration['deprecationNotice']) {
  const setting = createFakeSetting<boolean>('Test Setting', false);
  setting.setRegistration({
    settingName: 'Test Setting',
    settingType: Common.SettingRegistration.SettingType.BOOLEAN,
    category: Common.SettingRegistration.SettingCategory.APPEARANCE,
    defaultValue: false,
    deprecationNotice,
  });
  const command =
      QuickOpen.CommandMenu.CommandMenu.createSettingCommand(setting, i18n.i18n.lockedString('Test Set Value'), true);
  const provider = new QuickOpen.CommandMenu.CommandMenuProvider([command]);
  return {setting, provider, command};
}

const warning = () => ('Deprecation Warning' as Platform.UIString.LocalizedString);

function setupElements() {
  const toplevel = document.createElement('div');
  const container = toplevel.createChild('div') as HTMLDivElement;
  const title = container.createChild('div') as HTMLDivElement;
  const subtitle = container.createChild('div') as HTMLDivElement;
  return {toplevel, container, title, subtitle};
}

describeWithLocale('CommandMenu', () => {
  let elements: {title: HTMLDivElement, subtitle: HTMLDivElement, toplevel: HTMLDivElement, container: HTMLDivElement};
  beforeEach(() => {
    elements = setupElements();
  });

  afterEach(() => {
    const {toplevel, container, title, subtitle} = elements;
    subtitle.remove();
    title.remove();
    container.remove();
    toplevel.remove();
  });

  it('shows a deprecation warning for deprecated settings', () => {
    const deprecation = {disabled: true, warning};
    const {provider} = createCommandMenuProvider(deprecation);

    provider.renderItem(0, 'Test', elements.title, elements.subtitle);

    const tags = Array.from(elements.toplevel.querySelectorAll('.deprecated-tag')) as HTMLElement[];
    try {
      assert.deepEqual(tags.map(e => e.textContent), ['— deprecated']);
      assert.deepEqual(tags[0].title, 'Deprecation Warning');
    } finally {
    }
  });

  it('reveals the setting when calling a deprecated setting', () => {
    const deprecation = {disabled: true, warning};
    const {setting, command} = createCommandMenuProvider(deprecation);
    const callback = sinon.fake((_object: Object, _omitFocus?: boolean|undefined) => Promise.resolve());
    TestRevealer.install(callback);

    command.execute();

    assert.isTrue(
        callback.calledOnceWithExactly(setting, undefined),
        'Revealer was either not called or was called with unexpected arguments');
    TestRevealer.reset();
  });
});
