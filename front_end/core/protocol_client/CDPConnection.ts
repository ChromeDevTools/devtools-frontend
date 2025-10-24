// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ProtocolMapping} from '../../generated/protocol-mapping.js';

/**
 * Allows the sending and receiving of CDP commands and the notification of CDP events to observers.
 *
 * An instance of a CDPConnection "owns" the full transport channel and no other CDP traffic must
 * be proxied over it. This is because each implementation needs to manage "message IDs", which
 * would conflict with any other shared traffic.
 */
export interface CDPConnection {
  send<T extends keyof ProtocolMapping.Commands>(
      method: T, params: ProtocolMapping.Commands[T]['paramsType'][0],
      sessionId: string|undefined): Promise<ProtocolMapping.Commands[T]['returnType']|{getError(): string}>;

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
  onMessageReceived(message: unknown): void;
  onMessageSent(message: unknown): void;
}
