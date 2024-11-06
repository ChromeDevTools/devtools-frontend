// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../core/host/host.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import * as Freestyler from '../../../../panels/freestyler/freestyler.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const noop = () => {};

const component = new Freestyler.FreestylerChatUi({
  onTextSubmit: noop,
  onInspectElementClick: noop,
  onFeedbackSubmit: noop,
  onCancelClick: noop,
  onContextClick: noop,
  onNewConversation: noop,
  inspectElementToggled: false,
  state: Freestyler.State.CHAT_VIEW,
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
  messages: [],
  selectedContext: new Freestyler.NodeContext({} as unknown as SDK.DOMModel.DOMNode),
  agentType: Freestyler.AgentType.FREESTYLER,
  isLoading: false,
  canShowFeedbackForm: false,
  userInfo: {},
  blockedByCrossOrigin: false,
  isReadOnly: false,
  stripLinks: false,
});

document.getElementById('container')?.appendChild(component);
