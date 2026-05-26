// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class GreenDevAgentAntigravityCliSocketClient {
  #websocket: WebSocket;
  sessionReady: Promise<void>;
  #sessionReadyResolve: ((value: void|PromiseLike<void>) => void)|null = null;

  constructor() {
    this.sessionReady = new Promise(resolve => {
      this.#sessionReadyResolve = resolve;
    });
    this.#websocket = new WebSocket('ws://localhost:5566');
    this.#websocket.onopen = this.#onOpen.bind(this);
    this.#websocket.onmessage = this.#onMessage.bind(this);
    this.#websocket.onclose = this.#onClose.bind(this);
    this.#websocket.onerror = this.#onError.bind(this);
  }

  #onOpen(): void {
    console.warn('WebSocket connected (Antigravity).');
    if (this.#sessionReadyResolve) {
      this.#sessionReadyResolve();
      this.#sessionReadyResolve = null;
    }
  }

  #onMessage(event: MessageEvent): void {
    console.warn('Antigravity WebSocket message received:', event.data);
    if (this.#onChunkCallback) {
      this.#onChunkCallback(event.data);
    }
  }

  #onClose(): void {
    console.warn('WebSocket disconnected (Antigravity).');
  }

  #onError(error: Event): void {
    console.error('WebSocket error (Antigravity):', error);
  }

  #onChunkCallback: ((chunk: string) => void)|null = null;

  sendPrompt(promptText: string, onChunk: (chunk: string) => void): Promise<void> {
    this.#onChunkCallback = onChunk;

    console.warn(`Sending Antigravity prompt: "${promptText}"`);
    this.#websocket.send(promptText);
    return Promise.resolve();
  }
}
