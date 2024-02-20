// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from './platform.js';

function fnExpectingUrlString(urlString: Platform.DevToolsPath.UrlString): void {
  urlString;
}

function fnExpectingRawPathString(rawPathString: Platform.DevToolsPath.RawPathString): void {
  rawPathString;
}

function fnExpectingEncodedPathString(encPathString: Platform.DevToolsPath.EncodedPathString): void {
  encPathString;
}

// @ts-expect-error Passing a plain string when UrlString is expected
fnExpectingUrlString('foo');
// @ts-expect-error Passing a plain string when RawPathString is expected
fnExpectingRawPathString('foo');
// @ts-expect-error Passing a plain string when EncodedPathString is expected
fnExpectingEncodedPathString('foo');

const urlString = 'urlStr' as Platform.DevToolsPath.UrlString;
fnExpectingUrlString(urlString);
// @ts-expect-error Passing a UrlString when RawPathString is expected
fnExpectingRawPathString(urlString);
// @ts-expect-error Passing a UrlString when EncodedPathString is expected
fnExpectingEncodedPathString(urlString);

const rawPathString = 'rawPathStr' as Platform.DevToolsPath.RawPathString;
fnExpectingRawPathString(rawPathString);
// @ts-expect-error Passing a RawPathString when UrlString is expected
fnExpectingUrlString(rawPathString);
// @ts-expect-error Passing a RawPathString when EncodedPathString is expected
fnExpectingEncodedPathString(rawPathString);

const encPathString = 'encPathStr' as Platform.DevToolsPath.EncodedPathString;
fnExpectingEncodedPathString(encPathString);
// @ts-expect-error Passing a EncodedPathString when UrlString is expected
fnExpectingUrlString(encPathString);
// @ts-expect-error Passing a EncodedPathString when RawPathString is expected
fnExpectingRawPathString(encPathString);
