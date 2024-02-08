// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Console from '../console/console.js';

import {ConsoleInsight} from './components/ConsoleInsight.js';
import {InsightProvider} from './InsightProvider.js';
import {PromptBuilder} from './PromptBuilder.js';

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'explain.console-message.context':
      case 'explain.console-message.context.error':
      case 'explain.console-message.context.warning':
      case 'explain.console-message.context.other':
      case 'explain.console-message.hover': {
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
        const consoleViewMessage = context.flavor(Console.ConsoleViewMessage.ConsoleViewMessage);
        if (consoleViewMessage) {
          if (actionId.startsWith('explain.console-message.context')) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaContextMenu);
          } else if (actionId === 'explain.console-message.hover') {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaHoverButton);
          }
          const promptBuilder = new PromptBuilder(consoleViewMessage);
          const insightProvider = new InsightProvider();
          void ConsoleInsight.create(promptBuilder, insightProvider, action?.title()).then(insight => {
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
