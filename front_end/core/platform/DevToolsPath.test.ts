// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from './platform.js';

describe('Platform', () => {
  describe('DevToolsPath', () => {
    function fnExpectingUrlString(urlString: Platform.DevToolsPath.UrlString): void {
      void urlString;
    }

    function fnExpectingRawPathString(rawPathString: Platform.DevToolsPath.RawPathString): void {
      void rawPathString;
    }

    function fnExpectingEncodedPathString(encPathString: Platform.DevToolsPath.EncodedPathString): void {
      void encPathString;
    }

    describe('UrlString', () => {
      it('is correctly type checked', () => {
        // eslint-disable-next-line rulesdir/prefer-url-string
        const urlString = 'urlStr' as Platform.DevToolsPath.UrlString;
        fnExpectingUrlString(urlString);
        // @ts-expect-error Passing a UrlString when RawPathString is expected
        fnExpectingRawPathString(urlString);
        // @ts-expect-error Passing a UrlString when EncodedPathString is expected
        fnExpectingEncodedPathString(urlString);
        // @ts-expect-error Passing a plain string when UrlString is expected
        fnExpectingUrlString('foo');
      });
    });

    describe('RawPathString', () => {
      it('is correctly type checked', () => {
        const rawPathString = 'rawPathStr' as Platform.DevToolsPath.RawPathString;
        fnExpectingRawPathString(rawPathString);
        // @ts-expect-error Passing a RawPathString when UrlString is expected
        fnExpectingUrlString(rawPathString);
        // @ts-expect-error Passing a RawPathString when EncodedPathString is expected
        fnExpectingEncodedPathString(rawPathString);
        // @ts-expect-error Passing a plain string when RawPathString is expected
        fnExpectingRawPathString('foo');
      });
    });

    describe('EncodedPathString', () => {
      it('is correctly type checked', () => {
        const encPathString = 'encPathStr' as Platform.DevToolsPath.EncodedPathString;
        fnExpectingEncodedPathString(encPathString);
        // @ts-expect-error Passing a EncodedPathString when UrlString is expected
        fnExpectingUrlString(encPathString);
        // @ts-expect-error Passing a EncodedPathString when RawPathString is expected
        fnExpectingRawPathString(encPathString);
        // @ts-expect-error Passing a plain string when EncodedPathString is expected
        fnExpectingEncodedPathString('foo');
      });
    });

    describe('urlString', () => {
      const {urlString} = Platform.DevToolsPath;

      it('acts like an identity function on URL strings', () => {
        assert.strictEqual('https://www.example.com', urlString`https://www.example.com`);
        assert.strictEqual('http://host/My%20File.txt', urlString`http://host/My%20File.txt`);
      });

      it('correctly composes URL strings', () => {
        const host = 'foo.com';
        const file = 'file.js';
        assert.strictEqual('http://foo.com/file.js', urlString`http://${host}/${file}`);
      });

      it('is correctly type checked', () => {
        fnExpectingUrlString(urlString`http://localhost`);
        // @ts-expect-error Passing a UrlString when RawPathString is expected
        fnExpectingRawPathString(urlString`http://localhost`);
        // @ts-expect-error Passing a UrlString when EncodedPathString is expected
        fnExpectingEncodedPathString(urlString`http://localhost`);
      });
    });
  });
});
