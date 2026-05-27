// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class GreenDevAgentGeminiCliSocketClient {
    #websocket;
    #sessionId;
    #activeMessage = '';
    #messageLog = [];
    #promptResolve = null;
    sessionReady;
    #sessionReadyResolve = null;
    constructor() {
        this.sessionReady = new Promise(resolve => {
            this.#sessionReadyResolve = resolve;
        });
        this.#websocket = new WebSocket('ws://localhost:6655');
        this.#websocket.onopen = this.#onOpen.bind(this);
        this.#websocket.onmessage = this.#onMessage.bind(this);
        this.#websocket.onclose = this.#onClose.bind(this);
        this.#websocket.onerror = this.#onError.bind(this);
    }
    #onOpen() {
        console.warn('WebSocket connected.');
        this.#websocket.send(JSON.stringify({ jsonrpc: '2.0', method: 'session/new', params: { cwd: '.', mcpServers: [] }, id: 14 }));
    }
    #onMessage(event) {
        this.#messageLog.push(event.data);
        try {
            const data = JSON.parse(event.data);
            if (data?.result?.sessionId && !this.#sessionId) {
                this.#sessionId = data.result.sessionId;
                console.warn(`Successfully created new session with ID: ${this.#sessionId}`);
                if (this.#sessionReadyResolve) {
                    this.#sessionReadyResolve();
                    this.#sessionReadyResolve = null;
                }
            }
            const update = data?.params?.update;
            if (update?.sessionUpdate === 'agent_message_chunk') {
                this.#activeMessage += update.content?.text || '';
            }
            if (data?.result?.stopReason) {
                if (this.#activeMessage) {
                    console.warn(this.#activeMessage);
                }
                console.warn(`Stop Reason: ${data.result.stopReason}`, this.#messageLog);
                if (this.#promptResolve) {
                    this.#promptResolve(this.#activeMessage);
                    this.#promptResolve = null;
                }
                this.#activeMessage = '';
                this.#messageLog = [];
            }
            else if (data?.method === 'session/request_permission') {
                // TODO(finnur): Needs augmenting once I turn off YOLO in the bridge.
                this.#websocket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: data.id,
                    result: {
                        outcome: {
                            selected: {
                                optionId: 'proceed_always',
                            },
                        },
                    },
                }));
            }
        }
        catch (e) {
            // Log the raw data if it's not valid JSON.
            console.error('Failed to parse WebSocket message or process data:', event.data, e);
        }
    }
    #onClose() {
        console.warn('WebSocket disconnected.');
    }
    #onError(error) {
        console.error('WebSocket error:', error);
    }
    sendPrompt(promptText) {
        return new Promise((resolve, reject) => {
            if (this.#promptResolve) {
                reject(new Error('Another prompt is already in progress.'));
                return;
            }
            if (!this.#sessionId) {
                reject(new Error('Cannot send prompt without a session ID.'));
                return;
            }
            this.#promptResolve = resolve;
            console.warn(`Sending prompt: "${promptText}"`);
            console.warn('Thinking...');
            this.#websocket.send(JSON.stringify({
                jsonrpc: '2.0',
                method: 'session/prompt',
                params: {
                    prompt: [{ type: 'text', text: promptText }],
                    sessionId: this.#sessionId,
                },
                id: 15,
            }));
        });
    }
}
//# sourceMappingURL=GreenDevAgentGeminiCliSocketClient.js.map