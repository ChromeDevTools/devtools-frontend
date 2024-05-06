// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('ARIAUtils', () => {
  beforeEach(() => {
    UI.Dialog.Dialog.getInstance()?.hide();
    UI.ARIAUtils.alert('');
    UI.ARIAUtils.alert('');
  });

  afterEach(() => {
    UI.ARIAUtils.alert('');
    UI.ARIAUtils.alert('');
    UI.Dialog.Dialog.getInstance()?.hide();
  });

  describe('ARIAUtils.alertElementInstance', () => {
    it('switches elements to announce alerts', () => {
      const container = document.createElement('div');
      const element1 = UI.ARIAUtils.alertElementInstance(container);
      const element2 = UI.ARIAUtils.alertElementInstance(container);
      const element3 = UI.ARIAUtils.alertElementInstance(container);
      const element4 = UI.ARIAUtils.alertElementInstance(container);
      assert.strictEqual(element1, element3);
      assert.strictEqual(element2, element4);
      assert.strictEqual(element1.textContent, '');
      assert.strictEqual(element2.textContent, '');
    });
  });

  describe('ARIAUtils.alert', () => {
    it('shows alerts in the dialog if it is shown', () => {
      UI.ARIAUtils.getOrCreateAlertElements(document.body);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement);
      dialog.show();

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).two.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).one.textContent, 'test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).two.textContent, '');

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).two.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).two.textContent, 'test');
    });

    // Flaky test.
    it.skip('[crbug.com/338872707] shows alerts in the body if the dialog is not shown', () => {
      UI.ARIAUtils.getOrCreateAlertElements(document.body);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement);
      dialog.hide();

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).one.textContent, 'test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).two.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).two.textContent, '');

      UI.ARIAUtils.alert('test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(document.body).two.textContent, 'test');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).one.textContent, '');
      assert.strictEqual(UI.ARIAUtils.getOrCreateAlertElements(dialog.contentElement).two.textContent, '');
    });
  });
});
