// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ProtocolMapping} from '../../generated/protocol-mapping.js';

export type CommandParams<T extends keyof ProtocolMapping.Commands> = ProtocolMapping.Commands[T]['paramsType'][0];
export type CommandResult<T extends keyof ProtocolMapping.Commands> = ProtocolMapping.Commands[T]['returnType'];
export type EventParams<T extends keyof ProtocolMapping.Events> = ProtocolMapping.Events[T];

export interface CDPBaseMessage {
  sessionId?: string;
}

export interface CDPCommandRequest<T extends keyof ProtocolMapping.Commands> extends CDPBaseMessage {
  id: number;
  method: T;
  params: CommandParams<T>;
}

export interface CDPCommandResponse<T extends keyof ProtocolMapping.Commands> extends CDPBaseMessage {
  id: number;
  result: CommandResult<T>;
}

export interface CDPEvent<T extends keyof ProtocolMapping.Events> extends CDPBaseMessage {
  method: T;
  params: EventParams<T>;
}

/**
 * Keep this in sync with https://source.chromium.org/chromium/chromium/src/+/main:third_party/inspector_protocol/crdtp/dispatch.h.
 */
export const enum CDPErrorStatus {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR = -32000,
  SESSION_NOT_FOUND = SERVER_ERROR - 1,
}

export interface CDPError extends CDPBaseMessage {
  id?: number;
  error: {
    code: CDPErrorStatus,
    message: string,
    data?: string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CDPMessage = CDPCommandRequest<any>|CDPCommandResponse<any>|CDPEvent<any>|CDPError;

/**
 * Allows the sending and receiving of CDP commands and the notification of CDP events to observers.
 *
 * An instance of a CDPConnection "owns" the full transport channel and no other CDP traffic must
 * be proxied over it. This is because each implementation needs to manage "message IDs", which
 * would conflict with any other shared traffic.
 */
export interface CDPConnection {
  send<T extends keyof ProtocolMapping.Commands>(method: T, params: CommandParams<T>, sessionId: string|undefined):
      Promise<CommandResult<T>|{getError(): string}>;

  observe(observer: CDPConnectionObserver): void;
  unobserve(observer: CDPConnectionObserver): void;
}

export interface CDPConnectionObserver {
  onEvent<T extends keyof ProtocolMapping.Events>(event: ProtocolMapping.Events[T]): void;
  onDisconnect(reason: string): void;
}

/**
 * The protocol monitor and test harness require inspection of raw CDP message traffic.
 */
export interface DebuggableCDPConnection extends CDPConnection {
  observeMessages(observer: RawMessageObserver): void;
  unobserveMessages(observer: RawMessageObserver): void;
}

export interface RawMessageObserver {
  onMessageReceived(message: CDPMessage): void;
  onMessageSent(message: CDPMessage): void;
}
