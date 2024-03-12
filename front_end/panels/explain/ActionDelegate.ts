// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import type * as UI from '../../ui/legacy/legacy.js';
import * as Console from '../console/console.js';

import {ConsoleInsight} from './components/ConsoleInsight.js';
import {PromptBuilder} from './PromptBuilder.js';

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'explain.console-message.context':
      case 'explain.console-message.context.error':
      case 'explain.console-message.context.warning':
      case 'explain.console-message.context.other':
      case 'explain.console-message.hover': {
        const consoleViewMessage = context.flavor(Console.ConsoleViewMessage.ConsoleViewMessage);
        if (consoleViewMessage) {
          if (actionId.startsWith('explain.console-message.context')) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaContextMenu);
          } else if (actionId === 'explain.console-message.hover') {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaHoverButton);
          }
          const promptBuilder = new PromptBuilder(consoleViewMessage);
          const aidaClient = new Host.AidaClient.AidaClient();
          void ConsoleInsight.create(promptBuilder, aidaClient).then(insight => {
            consoleViewMessage.setInsight(insight);
          });
          return true;
        }
        return false;
      }
    }
    return false;
  }
}
