// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

const NBSP = '\u00A0';

describeWithEnvironment('ARIAUtils', () => {
  function clearAlerts() {
    for (const alert of document.querySelectorAll('body > [role=alert]')) {
      alert.remove();
    }
  }

  beforeEach(() => {
    UI.Dialog.Dialog.getInstance()?.hide();
    clearAlerts();
  });

  afterEach(() => {
    UI.Dialog.Dialog.getInstance()?.hide();
    clearAlerts();
  });

  describe('ARIAUtils.alert', () => {
    it('shows alerts in the dialog if it is shown', () => {
      UI.ARIAUtils.getOrCreateAlertElement(document.body);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.getOrCreateAlertElement(dialog.contentElement);
      dialog.show();

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(document.body).textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(dialog.contentElement).textContent, 'test');
    });

    it('repeated alerts include a non breaking space to trigger announcement for the same text multiple times', () => {
      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(document.body).textContent, 'test');

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(document.body).textContent, `test${NBSP}`);
    });

    it('shows alerts in the body if the dialog is not shown', () => {
      UI.ARIAUtils.getOrCreateAlertElement(document.body);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.getOrCreateAlertElement(dialog.contentElement);
      dialog.hide();

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(document.body).textContent, 'test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElement(dialog.contentElement).textContent, '');
    });
  });
});
