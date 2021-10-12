// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class UrlStringTag {
  private urlTag: (string|undefined);
}
/**
 * File paths in DevTools that are represented as URLs
 * @example
 * “file:///Hello%20World/file/js”
 */
export type UrlString = string&UrlStringTag;

class RawPathStringTag {
  private rawPathTag: (string|undefined);
}
/**
 * File paths in DevTools that are represented as unencoded absolute
 * or relative paths
 * @example
 * “/Hello World/file.js”
 */
export type RawPathString = string&RawPathStringTag;

class EncodedPathStringTag {
  private encodedPathTag: (string|undefined);
}
/**
 * File paths in DevTools that are represented as encoded paths
 * @example
 * “/Hello%20World/file.js”
 */
export type EncodedPathString = string&EncodedPathStringTag;
