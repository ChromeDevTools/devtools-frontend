// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Explain from '../../../../../front_end/panels/explain/explain.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithLocale('PromptBuilder', () => {
  describe('allowHeader', () => {
    it('disallows cookie headers', () => {
      assert(!Explain.allowHeader({name: 'Cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'cookiE', value: ''}));
      assert(!Explain.allowHeader({name: 'cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'set-cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'Set-cOokie', value: ''}));
    });

    it('disallows authorization headers', () => {
      assert(!Explain.allowHeader({name: 'AuthoRization', value: ''}));
      assert(!Explain.allowHeader({name: 'authorization', value: ''}));
    });

    it('disallows custom headers', () => {
      assert(!Explain.allowHeader({name: 'X-smth', value: ''}));
      assert(!Explain.allowHeader({name: 'X-', value: ''}));
      assert(!Explain.allowHeader({name: 'x-smth', value: ''}));
      assert(!Explain.allowHeader({name: 'x-', value: ''}));
    });
  });

  describe('format formatNetworkRequest', () => {
    it('formats a network request', () => {
      assert.strictEqual(
          Explain.formatNetworkRequest({
            url() {
              return 'https://example.com' as Platform.DevToolsPath.UrlString;
            },
            requestHeaders() {
              return [{
                name: 'Origin',
                value: 'https://example.com',
              }];
            },
            statusCode: 404,
            statusText: 'Not found',
            responseHeaders: [{
              name: 'Origin',
              value: 'https://example.com',
            }],
          }),
          `Request: https://example.com

Request headers:
Origin: https://example.com

Response headers:
Origin: https://example.com

Response status: 404 Not found`);
    });
  });

  describe('formatRelatedCode', () => {
    it('formats a single line code', () => {
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 5),
          '89012');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 6),
          '890123');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 30),
          '12345678901234567890');
    });

    it('formats a multiline code', () => {
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 5),
          '456');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 10),
          '456\n789\n123');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 12),
          '123\n456\n789\n123');
    });
  });
});
