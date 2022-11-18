// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** The list of all supported locales of DevTools */
export const LOCALES: readonly Intl.UnicodeBCP47LocaleIdentifier[];

/** A subset of `LOCALES` that are bundled with Chromium. The rest is fetched remotely */
export const BUNDLED_LOCALES: readonly Intl.UnicodeBCP47LocaleIdentifier[];

export const DEFAULT_LOCALE:  Intl.UnicodeBCP47LocaleIdentifier;

export const REMOTE_FETCH_PATTERN: string;

export const LOCAL_FETCH_PATTERN: string;
