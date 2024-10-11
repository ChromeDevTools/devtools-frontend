// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Brand} from './Brand.js';

/**
 * File paths in DevTools that are represented as URLs
 * @example
 * “file:///Hello%20World/file/js”
 */
export type UrlString = Brand<string, 'UrlString'>;
export const EmptyUrlString = '' as UrlString;

/**
 * File paths in DevTools that are represented as unencoded absolute
 * or relative paths
 * @example
 * “/Hello World/file.js”
 */
export type RawPathString = Brand<string, 'RawPathString'>;
export const EmptyRawPathString = '' as RawPathString;

/**
 * File paths in DevTools that are represented as encoded paths
 * @example
 * “/Hello%20World/file.js”
 */
export type EncodedPathString = Brand<string, 'EncodedPathString'>;
export const EmptyEncodedPathString = '' as EncodedPathString;
