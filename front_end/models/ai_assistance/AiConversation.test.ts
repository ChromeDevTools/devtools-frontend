// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import type * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiConversation', () => {
  it('should be able to switch agent type based on context', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation(AiAssistance.AiHistoryStorage.ConversationType.STYLING);
    const networkRequest = new AiAssistance.NetworkAgent.RequestContext(
        {} as SDK.NetworkRequest.NetworkRequest, {} as NetworkTimeCalculator.NetworkTransferTimeCalculator);

    conversation.setContext(networkRequest);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NETWORK);
  });

  it('should be able to switch agent type when context is removed', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation(AiAssistance.AiHistoryStorage.ConversationType.STYLING);

    conversation.setContext(null);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NONE);
  });
});
