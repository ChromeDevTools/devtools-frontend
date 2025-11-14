// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../core/protocol_client/protocol_client.js';

export type CommandHandler<C extends ProtocolClient.CDPConnection.Command> =
    (params: ProtocolClient.CDPConnection.CommandParams<C>, sessionId: string|undefined) =>
        Promise<{result: ProtocolClient.CDPConnection.CommandResult<C>}|{error: ProtocolClient.CDPConnection.CDPError}>|
    {result: ProtocolClient.CDPConnection.CommandResult<C>}|{error: ProtocolClient.CDPConnection.CDPError};

export type CommandAndHandler<C extends ProtocolClient.CDPConnection.Command> = [C, CommandHandler<C>];

/**
 * This class fulfills a similar role as `describeWithMockConnection` with the main difference
 * being that it doesn't operate global.
 *
 * The right usage is to create a `MockCDPConnection` instance with your handlers, and then pass
 * it along to {@link createTarget}.
 *
 * This means a `MockCDPConnection` only affects the targets explicitly created with it and doesn't
 * leak anywhere else.
 */
export class MockCDPConnection implements ProtocolClient.CDPConnection.CDPConnection {
  readonly #observers = new Set<ProtocolClient.CDPConnection.CDPConnectionObserver>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #handlers: Map<ProtocolClient.CDPConnection.Command, CommandHandler<any>>;

  constructor(handlers: Array<CommandAndHandler<ProtocolClient.CDPConnection.Command>> = []) {
    this.#handlers = new Map(handlers);
  }

  /**
   * Sets the provided handler or clears an existing handler when passing `null`.
   *
   * Throws if a set would overwrite an existing handler.
   */
  setHandler<T extends ProtocolClient.CDPConnection.Command>(method: T, handler: CommandHandler<T>|null): void {
    if (handler && this.#handlers.has(method)) {
      throw new Error(`MockCDPConnection already has a handler for ${method}`);
    }

    if (handler) {
      this.#handlers.set(method, handler);
    } else {
      this.#handlers.delete(method);
    }
  }

  send<T extends ProtocolClient.CDPConnection.Command>(
      method: T, params: ProtocolClient.CDPConnection.CommandParams<T>,
      sessionId: string|undefined): Promise<{result: ProtocolClient.CDPConnection.CommandResult<T>}|{
    error: ProtocolClient.CDPConnection.CDPError,
  }> {
    const handler = this.#handlers.get(method);
    if (!handler) {
      return Promise.resolve({
        error: {
          message: `Method ${method} is not stubbed in MockCDPConnection`,
          code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
        }
      });
    }

    return Promise.resolve(handler(params, sessionId));
  }

  dispatchEvent<T extends ProtocolClient.CDPConnection.Event>(
      event: T, params: ProtocolClient.CDPConnection.EventParams<T>, sessionId: string|undefined): void {
    this.#observers.forEach(observer => observer.onEvent({
      sessionId,
      method: event,
      params,
    }));
  }

  observe(observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void {
    this.#observers.add(observer);
  }

  unobserve(observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void {
    this.#observers.delete(observer);
  }
}
