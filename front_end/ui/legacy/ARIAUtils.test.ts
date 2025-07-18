// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

const NBSP = '\u00A0';

function clearAlerts() {
  for (const alert of document.querySelectorAll('body > [role=alert]')) {
    alert.remove();
  }
}

function clearStatuses() {
  for (const status of document.querySelectorAll('body > [role=status]')) {
    status.remove();
  }
}

describeWithEnvironment('ARIAUtils', () => {
  beforeEach(() => {
    UI.Dialog.Dialog.getInstance()?.hide();
    clearAlerts();
    clearStatuses();
  });

  afterEach(() => {
    UI.Dialog.Dialog.getInstance()?.hide();
    clearAlerts();
    clearStatuses();
  });

  describe('ARIAUtils.LiveAnnouncer.alert', () => {
    it('shows alerts in the dialog if it is shown', () => {
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.ALERT);
      dialog.show();

      UI.ARIAUtils.LiveAnnouncer.alert('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          '');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer
              .getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          'test');
    });

    it('repeated alerts include a non breaking space to trigger announcement for the same text multiple times', () => {
      UI.ARIAUtils.LiveAnnouncer.alert('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          'test');

      UI.ARIAUtils.LiveAnnouncer.alert('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          `test${NBSP}`);
    });

    it('shows alerts in the body if the dialog is not shown', () => {
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.ALERT);
      dialog.hide();

      UI.ARIAUtils.LiveAnnouncer.alert('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          'test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer
              .getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.ALERT)
              .textContent,
          '');
    });
  });

  describe('ARIAUtils.status', () => {
    it('shows status texts in the dialog if it is shown', () => {
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.STATUS);
      dialog.show();

      UI.ARIAUtils.LiveAnnouncer.status('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS)
              .textContent,
          '');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer
              .getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.STATUS)
              .textContent,
          'test');
    });

    it('repeated status calls include a non breaking space to trigger announcement for the same text multiple times',
       () => {
         UI.ARIAUtils.LiveAnnouncer.status('test');
         assert.strictEqual(
             UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS)
                 .textContent,
             'test');

         UI.ARIAUtils.LiveAnnouncer.status('test');
         assert.strictEqual(
             UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS)
                 .textContent,
             `test${NBSP}`);
       });

    it('shows status calls in the body if the dialog is not shown', () => {
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS);
      const dialog = new UI.Dialog.Dialog();
      UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.STATUS);
      dialog.hide();

      UI.ARIAUtils.LiveAnnouncer.status('test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer.getOrCreateAnnouncerElement(document.body, UI.ARIAUtils.AnnouncerRole.STATUS)
              .textContent,
          'test');
      assert.strictEqual(
          UI.ARIAUtils.LiveAnnouncer
              .getOrCreateAnnouncerElement(dialog.contentElement, UI.ARIAUtils.AnnouncerRole.STATUS)
              .textContent,
          '');
    });
  });
});
