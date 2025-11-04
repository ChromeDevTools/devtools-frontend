// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Console from '../console/console.js';
import { ConsoleInsight } from './components/ConsoleInsight.js';
export class ActionDelegate {
    handleAction(context, actionId) {
        switch (actionId) {
            case 'explain.console-message.context':
            case 'explain.console-message.context.error':
            case 'explain.console-message.context.warning':
            case 'explain.console-message.context.other':
            case 'explain.console-message.teaser':
            case 'explain.console-message.hover': {
                const consoleViewMessage = context.flavor(Console.ConsoleViewMessage.ConsoleViewMessage);
                if (consoleViewMessage) {
                    if (actionId.startsWith('explain.console-message.context')) {
                        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaContextMenu);
                    }
                    else if (actionId === 'explain.console-message.teaser') {
                        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaTeaser);
                    }
                    else if (actionId === 'explain.console-message.hover') {
                        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRequestedViaHoverButton);
                    }
                    const promptBuilder = new Console.PromptBuilder.PromptBuilder(consoleViewMessage);
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
//# sourceMappingURL=ActionDelegate.js.map