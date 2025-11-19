// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Provides abstractions for host features that require different implementations depending
 * on whether DevTools runs in the browser or Node.js
 */
export interface HostRuntime {
  createWorker(url: string): Worker;
}

/**
 * Abstracts away the differences between browser web workers and Node.js worker threads.
 */
export interface Worker {
  // TODO(crbug.com/461952544): Actually add some methods here.
  // Leave one marker method to make this non-empty.
  dispose?(): void;
}
