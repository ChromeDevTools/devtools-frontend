// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Helper type to introduce new branded types.
 *
 * `Base` is the underlying data type and `Tag` must be unique symbol/string.
 *
 * Usage:
 * ```
 *   type LineNumber = Brand<number, "LineNumber">;
 *   type RawUrl = Brand<string, "RawUrl">;
 * ```
 */
export type Brand<Base, Tag> = Base&{_tag: Tag};
