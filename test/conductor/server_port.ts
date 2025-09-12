
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Set when we launch the server. It will be different for each
// sub-process runner when running in parallel.
let testServerPort: number|null;

export const setTestServerPort = (port: number) => {
  if (testServerPort) {
    throw new Error('Can\'t set the test server port twice.');
  }
  testServerPort = port;
};

export const getTestServerPort = () => {
  if (!testServerPort) {
    throw new Error(
        'Unable to locate test server port. Was it stored first?' +
        '\nYou might be calling this function at module instantiation time, instead of ' +
        'at runtime when the port is available.');
  }
  return testServerPort;
};

export function clearServerPort() {
  testServerPort = null;
}
