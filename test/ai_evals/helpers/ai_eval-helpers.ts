// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as AiAssistance from '../../../front_end/panels/ai_assistance/ai_assistance.js';
import {openNetworkTab, selectRequestByName} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../../e2e/shared/frontend-helper.js';

export type AiAssistanceContext = NonNullable<AiAssistance.ExternalHandler.ExternalAIRequestOptions['context']>;

/**
 * Finds and selects the specified context in DevTools so that it is set
 * as the active flavor (e.g. in UI.Context.Context) for AI evaluation.
 */
export async function findAndSetContext(
    devToolsPage: DevToolsPage,
    context: AiAssistanceContext,
    ): Promise<void> {
  switch (context.type) {
    case 'NETWORK_REQUEST': {
      await openNetworkTab(devToolsPage);
      await selectRequestByName(devToolsPage, context.contextIdentifier);
      break;
    }
    default: {
      const unsupportedType: never = context.type;
      throw new Error(`Unsupported context type: ${unsupportedType}`);
    }
  }
}
