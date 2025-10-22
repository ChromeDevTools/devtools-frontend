// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let connectionFactory: () => ConnectionTransport;

export abstract class ConnectionTransport {
  declare onMessage: ((arg0: Object) => void)|null;

  // on message from browser
  abstract setOnMessage(onMessage: (arg0: Object|string) => void): void;
  abstract setOnDisconnect(onDisconnect: (arg0: string) => void): void;

  // send raw CDP message to browser
  abstract sendRawMessage(message: string): void;

  abstract disconnect(): Promise<void>;

  static setFactory(factory: () => ConnectionTransport): void {
    connectionFactory = factory;
  }

  static getFactory(): () => ConnectionTransport {
    return connectionFactory;
  }
}
