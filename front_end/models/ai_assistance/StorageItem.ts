// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The StorageItem is used as context for the Ai Assistance.
// If the user selects a row in e.g. the cookies table, the storageType and key
// will be populated. An empty {} StorageItem is used if the user asks general questions.
export type StorageItem = {
  origin: string,
}&({
  storageType?: never,
  key?: never,
}|{
  storageType: 'cookie' | 'localStorage' | 'sessionStorage',
  key: string,
});
