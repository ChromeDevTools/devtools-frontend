// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

describe('MCP', () => {
  it('can import', async function() {
    await import('./mcp.js');
  });
});
