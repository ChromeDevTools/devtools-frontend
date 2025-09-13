// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as i18n from './i18n.js';

describeWithLocale('ByteUtilities', () => {
  describe('bytesToString', () => {
    it('formats for < 1000 bytes', () => {
      assert.deepEqual(i18n.ByteUtilities.bytesToString(50), '50\xA0B');
    });

    it('formats for < 100 kilobytes', () => {
      assert.deepEqual(i18n.ByteUtilities.bytesToString(5 * 1000), '5.0\xA0kB');
    });

    it('formats for < 1000 kilobytes', () => {
      assert.deepEqual(i18n.ByteUtilities.bytesToString(500 * 1000), '500\xA0kB');
    });

    it('formats for < 100 megabytes', () => {
      const oneAndAHalfMegabytes = 1500 * 1000;
      assert.deepEqual(i18n.ByteUtilities.bytesToString(oneAndAHalfMegabytes), '1.5\xA0MB');
    });

    it('formats for > 100 megabytes', () => {
      const oneMegabyte = 1000 * 1000;
      const twoHundredAndTenMegabytes = oneMegabyte * 210;
      assert.deepEqual(i18n.ByteUtilities.bytesToString(twoHundredAndTenMegabytes), '210\xA0MB');
    });
  });
  describe('formatBytesToKb', () => {
    it('formats for < 1000 bytes', () => {
      // The formatter rounds up from 0.05 -> 0.1.
      assert.deepEqual(i18n.ByteUtilities.formatBytesToKb(50), '0.1\xA0kB');
    });

    it('formats for < 100 kilobytes', () => {
      assert.deepEqual(i18n.ByteUtilities.formatBytesToKb(5 * 1000), '5.0\xA0kB');
    });

    it('formats for < 1000 kilobytes', () => {
      assert.deepEqual(i18n.ByteUtilities.formatBytesToKb(500 * 1000), '500\xA0kB');
    });

    it('formats for < 100 megabytes', () => {
      const oneAndAHalfMegabytes = 1500 * 1000;
      assert.deepEqual(i18n.ByteUtilities.formatBytesToKb(oneAndAHalfMegabytes), '1,500\xA0kB');
    });

    it('formats for > 100 megabytes', () => {
      const oneMegabyte = 1000 * 1000;
      const twoHundredAndTenMegabytes = oneMegabyte * 210;
      assert.deepEqual(i18n.ByteUtilities.formatBytesToKb(twoHundredAndTenMegabytes), '210,000\xA0kB');
    });
  });
});
