// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
export class MediaModel extends SDK.SDKModel.SDKModel {
    enabled;
    agent;
    constructor(target) {
        super(target);
        this.enabled = false;
        this.agent = target.mediaAgent();
        target.registerMediaDispatcher(this);
    }
    async resumeModel() {
        if (!this.enabled) {
            return await Promise.resolve();
        }
        await this.agent.invoke_enable();
    }
    ensureEnabled() {
        void this.agent.invoke_enable();
        this.enabled = true;
    }
    playerPropertiesChanged(event) {
        this.dispatchEventToListeners("PlayerPropertiesChanged" /* Events.PLAYER_PROPERTIES_CHANGED */, event);
    }
    playerEventsAdded(event) {
        this.dispatchEventToListeners("PlayerEventsAdded" /* Events.PLAYER_EVENTS_ADDED */, event);
    }
    playerMessagesLogged(event) {
        this.dispatchEventToListeners("PlayerMessagesLogged" /* Events.PLAYER_MESSAGES_LOGGED */, event);
    }
    playerErrorsRaised(event) {
        this.dispatchEventToListeners("PlayerErrorsRaised" /* Events.PLAYER_ERRORS_RAISED */, event);
    }
    playerCreated({ player }) {
        this.dispatchEventToListeners("PlayerCreated" /* Events.PLAYER_CREATED */, player);
    }
}
SDK.SDKModel.SDKModel.register(MediaModel, { capabilities: 262144 /* SDK.Target.Capability.MEDIA */, autostart: false });
//# sourceMappingURL=MediaModel.js.map