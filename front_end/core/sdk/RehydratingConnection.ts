// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This file is the implementation of a protocol `Connection` object
 *  which is central to the rehydrated devtools feature. The premise of
 * this feature is that the enhanced traces will contain enough
 * information to power this class with all metadata needed. This class
 * then interacts with rehydrated devtools in a way that produces the
 * equivalent result as live debugging session.
 *
 * It's much more of a state machine than the other Connection
 * implementations, which simply interact with a network protocol in
 * one way or another.
 *
 * Note on the methodology to derive runtime/debugger domain behavior below:
 * We can use protocol monitor in the devtools to look at how dt-fe
 * communicates with the backend, and it's also how majority of the behavior
 * in the rehydrated sesion was derived at the first place. In the event of
 * adding more support and capability to rehydrated session, developers will
 * want to look at protocol monitor to imitate the behavior in a real session
 *
 */

import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';

import * as EnhancedTraces from './EnhancedTracesParser.js';
import type {
  ProtocolMessage, RehydratingExecutionContext, RehydratingScript, RehydratingTarget, ServerMessage, TraceFile} from
  './RehydratingObject.js';
import {TraceObject} from './TraceObject.js';

const UIStrings = {
  /**
   * @description Text that appears when no source text is available for the given script
   */
  noSourceText: 'No source text available',
  /**
   * @description Text to indicate rehydrating connection cannot find host window
   */
  noHostWindow: 'Can not find host window',
  /**
   * @description Text to indicate that there is an error loading the log
   */
  errorLoadingLog: 'Error loading log',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/RehydratingConnection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RehydratingConnectionInterface {
  postToFrontend: (arg: ServerMessage) => void;
}

export const enum RehydratingConnectionState {
  UNINITIALIZED = 1,
  INITIALIZED = 2,
  REHYDRATED = 3,
}

export class RehydratingConnection implements ProtocolClient.InspectorBackend.Connection {
  rehydratingConnectionState: RehydratingConnectionState = RehydratingConnectionState.UNINITIALIZED;
  onDisconnect: ((arg0: string) => void)|null = null;
  onMessage: ((arg0: Object) => void)|null = null;
  trace: TraceFile|null = null;
  sessions = new Map<number, RehydratingSessionBase>();
  #onConnectionLost: (message: Platform.UIString.LocalizedString) => void;
  #rehydratingWindow: Window&typeof globalThis;
  #onReceiveHostWindowPayloadBound = this.#onReceiveHostWindowPayload.bind(this);

  constructor(onConnectionLost: (message: Platform.UIString.LocalizedString) => void) {
    // If we're invoking this class, we're in the rehydrating pop-up window. Rename window for clarity.
    this.#onConnectionLost = onConnectionLost;
    this.#rehydratingWindow = window;
    this.#setupMessagePassing();
  }

  #setupMessagePassing(): void {
    this.#rehydratingWindow.addEventListener('message', this.#onReceiveHostWindowPayloadBound);
    if (!this.#rehydratingWindow.opener) {
      this.#onConnectionLost(i18nString(UIStrings.noHostWindow));
    }
    this.#rehydratingWindow.opener.postMessage({type: 'REHYDRATING_WINDOW_READY'});
  }

  /**
   * This is a callback for rehydrated session to receive payload from host window. Payload includes but not limited to
   * the trace event and all necessary data to power a rehydrated session.
   */
  #onReceiveHostWindowPayload(event: MessageEvent): void {
    if (event.data.type === 'REHYDRATING_TRACE_FILE') {
      const traceJson = event.data.traceJson as string;
      let trace;
      try {
        trace = JSON.parse(traceJson) as TraceFile;
      } catch {
        this.#onConnectionLost(i18nString(UIStrings.errorLoadingLog));
        return;
      }
      void this.startHydration(trace);
    }
    this.#rehydratingWindow.removeEventListener('message', this.#onReceiveHostWindowPayloadBound);
  }

  async startHydration(trace: TraceFile): Promise<boolean> {
    // OnMessage should've been set before hydration, and the connection should
    // be initialized and not hydrated already.
    if (!this.onMessage || this.rehydratingConnectionState !== RehydratingConnectionState.INITIALIZED) {
      return false;
    }

    if (!('traceEvents' in trace)) {
      console.error('RehydratingConnection failed to initialize due to missing trace events in payload');
      return false;
    }

    this.trace = trace;
    const enhancedTracesParser = new EnhancedTraces.EnhancedTracesParser(trace);
    const hydratingData = enhancedTracesParser.data();

    let sessionId = 0;
    // Set up default rehydrating session.
    this.sessions.set(sessionId, new RehydratingSessionBase(this));
    for (const hydratingDataPerTarget of hydratingData) {
      const target = hydratingDataPerTarget.target;
      const executionContexts = hydratingDataPerTarget.executionContexts;
      const scripts = hydratingDataPerTarget.scripts;
      this.postToFrontend({
        method: 'Target.targetCreated',
        params: {
          targetInfo: {
            targetId: target.targetId,
            type: target.type,
            title: target.url,
            url: target.url,
            attached: false,
            canAccessOpener: false,
          },
        },
      });

      // Create new session associated to the target created and send
      // Target.attachedToTarget to frontend.
      sessionId += 1;
      this.sessions.set(sessionId, new RehydratingSession(sessionId, target, executionContexts, scripts, this));
    }
    await this.#onRehydrated();
    return true;
  }

  async #onRehydrated(): Promise<void> {
    if (!this.trace) {
      return;
    }

    this.rehydratingConnectionState = RehydratingConnectionState.REHYDRATED;
    // Use revealer to load trace into performance panel
    const trace = new TraceObject(this.trace.traceEvents as object[], this.trace.metadata);
    await Common.Revealer.reveal(trace);
  }

  setOnMessage(onMessage: (arg0: Object|string) => void): void {
    this.onMessage = onMessage;
    this.rehydratingConnectionState = RehydratingConnectionState.INITIALIZED;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.onDisconnect = onDisconnect;
  }

  // The function "sendRawMessage" is typically devtools front-end
  // sending message to the backend via CDP. In this case, given that Rehydrating
  // connection is an emulation of devtool back-end, sendRawMessage here
  // is in fact rehydrating connection directly handling and acting on the
  // receieved message.
  sendRawMessage(message: string|object): void {
    if (typeof message === 'string') {
      message = JSON.parse(message);
    }
    const data = message as ProtocolMessage;
    if (typeof data.sessionId !== 'undefined') {
      const session = this.sessions.get(data.sessionId);
      if (session) {
        session.handleFrontendMessageAsFakeCDPAgent(data);
      } else {
        console.error('Invalid SessionId: ' + data.sessionId);
      }
    } else {
      this.sessions.get(0)?.handleFrontendMessageAsFakeCDPAgent(data);
    }
  }

  // Posting rehydrating connection's message/response
  // to devtools frontend through debugger protocol.
  postToFrontend(arg: ServerMessage): void {
    if (this.onMessage) {
      this.onMessage(arg);
    } else {
      // onMessage should be set before the connection is rehydrated
      console.error('onMessage was not initialized');
    }
  }

  disconnect(): Promise<void> {
    return Promise.reject();
  }
}

// Default rehydrating session with default responses.
class RehydratingSessionBase {
  connection: RehydratingConnectionInterface|null = null;

  constructor(connection: RehydratingConnectionInterface) {
    this.connection = connection;
  }

  sendMessageToFrontend(payload: ServerMessage): void {
    requestAnimationFrame(() => {
      if (this.connection) {
        this.connection.postToFrontend(payload);
      }
    });
  }

  handleFrontendMessageAsFakeCDPAgent(data: ProtocolMessage): void {
    // Send default response in default session.
    this.sendMessageToFrontend({
      id: data.id,
      result: {},
    });
  }
}

export class RehydratingSession extends RehydratingSessionBase {
  sessionId: number;
  target: RehydratingTarget;
  executionContexts: RehydratingExecutionContext[] = [];
  scripts: RehydratingScript[] = [];

  constructor(
      sessionId: number, target: RehydratingTarget, executionContexts: RehydratingExecutionContext[],
      scripts: RehydratingScript[], connection: RehydratingConnectionInterface) {
    super(connection);
    this.sessionId = sessionId;
    this.target = target;
    this.executionContexts = executionContexts;
    this.scripts = scripts;
    this.sessionAttachToTarget();
  }

  override sendMessageToFrontend(payload: ServerMessage, attachSessionId = true): void {
    // Attach the session's Id to the message.
    if (this.sessionId !== 0 && attachSessionId) {
      payload.sessionId = this.sessionId;
    }
    super.sendMessageToFrontend(payload);
  }

  override handleFrontendMessageAsFakeCDPAgent(data: ProtocolMessage): void {
    switch (data.method) {
      case 'Runtime.enable':
        this.handleRuntimeEnabled(data.id);
        break;
      case 'Debugger.enable':
        this.handleDebuggerEnable(data.id);
        break;
      case 'Debugger.getScriptSource':
        if (data.params) {
          const params = data.params as Protocol.Debugger.GetScriptSourceRequest;
          this.handleDebuggerGetScriptSource(data.id, params.scriptId);
        }
        break;
      default:
        this.sendMessageToFrontend({
          id: data.id,
          result: {},
        });
        break;
    }
  }

  private sessionAttachToTarget(): void {
    this.sendMessageToFrontend(
        {
          method: 'Target.attachedToTarget',
          params: {
            sessionId: this.sessionId,
            waitingForDebugger: false,
            targetInfo: {
              targetId: this.target.targetId,
              type: this.target.type,
              title: this.target.url,
              url: this.target.url,
              attached: true,
              canAccessOpener: false,
            },
          },
        },
        /* attachSessionId */ false);
  }

  // Runtime.Enable indicates that Runtime domain is flushing the event to communicate
  // the current state with the backend. In rehydrating connection, we made up the artificial
  // execution context to support the rehydrated session.
  private handleRuntimeEnabled(id: number): void {
    for (const executionContext of this.executionContexts) {
      executionContext.name = executionContext.origin;
      this.sendMessageToFrontend({
        method: 'Runtime.executionContextCreated',
        params: {
          context: executionContext,
        },
      });
    }

    this.sendMessageToFrontend({
      id,
      result: {},
    });
  }

  private handleDebuggerGetScriptSource(id: number, scriptId: Protocol.Runtime.ScriptId): void {
    const script = this.scripts.find(script => script.scriptId === scriptId);
    if (!script) {
      console.error('No script for id: ' + scriptId);
      return;
    }
    this.sendMessageToFrontend({
      id,
      result: {
        scriptSource: typeof script.sourceText === 'undefined' ? i18nString(UIStrings.noSourceText) : script.sourceText,
      },
    });
  }

  // Debugger.Enable indicates that Debugger domain is flushing the event to communicate
  // the current state with the backend. In rehydrating connection, we made up the artificial
  // script parsed event to communicate the current script state and respond with a mock
  // debugger id.
  private handleDebuggerEnable(id: number): void {
    for (const script of this.scripts) {
      this.sendMessageToFrontend({
        method: 'Debugger.scriptParsed',
        params: script,
      });
    }

    const mockDebuggerId = '7777777777777777777.8888888888888888888';
    this.sendMessageToFrontend({
      id,
      result: {
        debuggerId: mockDebuggerId,
      },
    });
  }
}
