#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { EvaluationCLI } from './CLI.js';

// Start CLI if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new EvaluationCLI();
  
  process.on('SIGINT', () => {
    cli.quit();
  });
  
  cli.start().catch(error => {
    console.error('Failed to start CLI:', error.message);
    process.exit(1);
  });
}

export { EvaluationCLI };