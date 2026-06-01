// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';

import * as AiAssistance from './ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('AiUtils', () => {
  describe('isSameOrigin', () => {
    it('returns true for identical origins', () => {
      const url1 = urlString`https://example.com/page1`;
      const url2 = urlString`https://example.com/page2`;
      assert.isTrue(AiAssistance.AiUtils.isSameOrigin(url1, url2));
    });

    it('returns false for different origins', () => {
      const url1 = urlString`https://example.com`;
      const url2 = urlString`https://google.com`;
      assert.isFalse(AiAssistance.AiUtils.isSameOrigin(url1, url2));
    });

    it('returns true for identical data URLs', () => {
      const url1 = urlString`data:text/html,hello`;
      const url2 = urlString`data:text/html,hello`;
      assert.isTrue(AiAssistance.AiUtils.isSameOrigin(url1, url2));
    });

    it('returns false for different data URLs', () => {
      const url1 = urlString`data:text/html,hello`;
      const url2 = urlString`data:text/html,world`;
      assert.isFalse(AiAssistance.AiUtils.isSameOrigin(url1, url2));
    });

    it('returns false if one is data URL and other is not', () => {
      const url1 = urlString`https://example.com`;
      const url2 = urlString`data:text/html,hello`;
      assert.isFalse(AiAssistance.AiUtils.isSameOrigin(url1, url2));
    });
  });
});
