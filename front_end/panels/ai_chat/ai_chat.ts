// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file is the entrypoint for the AI Chat panel
// It re-exports everything from the implementation file

import * as AIChatImpl from './ai_chat_impl.js';

export const AIChatPanel = AIChatImpl.AIChatPanel;
