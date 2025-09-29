// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import {NetworkRequestFormatter} from '../ai_assistance.js';

describe('NetworkRequestFormatter', () => {
  describe('allowHeader', () => {
    it('allows a header from the list', () => {
      assert.isTrue(NetworkRequestFormatter.allowHeader('content-type'));
    });

    it('disallows headers not on the list', () => {
      assert.isFalse(NetworkRequestFormatter.allowHeader('cookie'));
      assert.isFalse(NetworkRequestFormatter.allowHeader('set-cookie'));
      assert.isFalse(NetworkRequestFormatter.allowHeader('authorization'));
    });
  });

  describe('formatInitiatorUrl', () => {
    const tests = [
      {
        allowedResource: 'https://example.test',
        targetResource: 'https://example.test',
        shouldBeRedacted: false,
      },
      {
        allowedResource: 'https://example.test',
        targetResource: 'https://another-example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'file://test',
        targetResource: 'https://another-example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://another-example.test',
        targetResource: 'file://test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://test.example.test',
        targetResource: 'https://example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://test.example.test:9900',
        targetResource: 'https://test.example.test:9901',
        shouldBeRedacted: true,
      },
    ];

    for (const t of tests) {
      it(`${t.targetResource} test when allowed resource is ${t.allowedResource}`, () => {
        const formatted = NetworkRequestFormatter.formatInitiatorUrl(
            new URL(t.targetResource).origin, new URL(t.allowedResource).origin);
        if (t.shouldBeRedacted) {
          assert.strictEqual(
              formatted, '<redacted cross-origin initiator URL>', `${JSON.stringify(t)} was not redacted`);
        } else {
          assert.strictEqual(formatted, t.targetResource, `${JSON.stringify(t)} was redacted`);
        }
      });
    }
  });

  describe('formatBody', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        Platform.DevToolsPath.urlString`url1`,
        Platform.DevToolsPath.urlString`documentURL`,
        null,
    );

    it('handles empty response correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('', false, ''));
      };

      const result = await NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, 'test:\n<empty response>');
    });

    it('handles base64 text correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('some base64 string', true, ''));
      };

      const result = await NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, 'test:\n<binary data>');
    });

    it('handles the text limit correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData('some text that is longer than expected', false, 'text/plain'));
      };

      const result = await NetworkRequestFormatter.formatBody('test:', fakeRequest, 20);

      assert.strictEqual(result, `test:\nsome text that is lo... <truncated>`);
    });

    it('handles the text format correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData(JSON.stringify({response: 'body'}), false, 'application/json'));
      };

      const result = await NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, `test:\n${JSON.stringify({response: 'body'})}`);
    });

    it('handles error correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve({
          error: 'an error has occurred',
        } as TextUtils.ContentData.ContentDataOrError);
      };

      const result = await NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, '');
    });
  });

  describe('formatHeaders', () => {
    it('does not redact a header from the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'content-type', value: 'foo'}]),
          'test:\ncontent-type: foo');
    });

    it('disallows headers not on the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'cookie', value: 'foo'}]),
          'test:\ncookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'set-cookie', value: 'foo'}]),
          'test:\nset-cookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'authorization', value: 'foo'}]),
          'test:\nauthorization: <redacted>');
    });
  });
});
