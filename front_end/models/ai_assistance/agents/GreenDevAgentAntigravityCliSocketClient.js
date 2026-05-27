// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class GreenDevAgentAntigravityCliSocketClient {
    #websocket;
    sessionReady;
    #sessionReadyResolve = null;
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
    #onOpen() {
        console.warn('WebSocket connected (Antigravity).');
        if (this.#sessionReadyResolve) {
            this.#sessionReadyResolve();
            this.#sessionReadyResolve = null;
        }
    }
    #onMessage(event) {
        console.warn('Antigravity WebSocket message received:', event.data);
        if (this.#onChunkCallback) {
            this.#onChunkCallback(event.data);
        }
    }
    #onClose() {
        console.warn('WebSocket disconnected (Antigravity).');
    }
    #onError(error) {
        console.error('WebSocket error (Antigravity):', error);
    }
    #onChunkCallback = null;
    sendPrompt(promptText, onChunk) {
        this.#onChunkCallback = onChunk;
        console.warn(`Sending Antigravity prompt: "${promptText}"`);
        this.#websocket.send(promptText);
        return Promise.resolve();
    }
}
//# sourceMappingURL=GreenDevAgentAntigravityCliSocketClient.js.map