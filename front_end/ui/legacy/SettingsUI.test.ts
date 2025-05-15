// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeSetting} from '../../testing/EnvironmentHelpers.js';
import {Directives, html, render} from '../lit/lit.js';

import * as UI from './legacy.js';

describe('bindToSetting (string)', () => {
  function setup(validate?: (arg: string) => boolean) {
    const {bindToSetting} = UI.SettingsUI;
    const setting = createFakeSetting<string>('fake-setting', 'defaultValue');
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const inputRef = Directives.createRef<HTMLInputElement>();
    render(html`<input ${Directives.ref(inputRef)} ${bindToSetting(setting, validate)}></input>`, container);

    const input = inputRef.value;
    assert.exists(input);

    return {input, setting, container};
  }

  it('shows the current value on initial render', () => {
    const {input} = setup();

    assert.strictEqual(input.value, 'defaultValue');
  });

  it('changes the setting when the input changes', () => {
    const {setting, input} = setup();

    input.value = 'new value via user edit';
    input.dispatchEvent(new Event('change'));

    assert.strictEqual(setting.get(), 'new value via user edit');
  });

  it('changes the input when the setting changes', () => {
    const {setting, input} = setup();

    setting.set('new value via change listener');

    assert.strictEqual(input.value, 'new value via change listener');
  });

  it('does not change the setting when validation fails', () => {
    const {setting, input} = setup(arg => /[0-9]+/.test(arg));

    input.value = 'text must not update the setting';
    input.dispatchEvent(new Event('change'));

    assert.strictEqual(setting.get(), 'defaultValue');

    input.value = '42';
    input.dispatchEvent(new Event('change'));

    assert.strictEqual(setting.get(), '42');
  });

  it('removes the change listener when the input is removed from the DOM', () => {
    const {setting, input, container} = setup();
    render(html``, container);

    setting.set('new value via change listener');

    assert.isFalse(input.isConnected);
    assert.strictEqual(input.value, 'defaultValue');
  });
});
