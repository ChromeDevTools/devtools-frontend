// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
export class BackgroundServiceModel extends SDK.SDKModel.SDKModel {
    backgroundServiceAgent;
    events;
    constructor(target) {
        super(target);
        this.backgroundServiceAgent = target.backgroundServiceAgent();
        target.registerBackgroundServiceDispatcher(this);
        this.events = new Map();
    }
    enable(service) {
        this.events.set(service, []);
        void this.backgroundServiceAgent.invoke_startObserving({ service });
    }
    setRecording(shouldRecord, service) {
        void this.backgroundServiceAgent.invoke_setRecording({ shouldRecord, service });
    }
    clearEvents(service) {
        this.events.set(service, []);
        void this.backgroundServiceAgent.invoke_clearEvents({ service });
    }
    getEvents(service) {
        return this.events.get(service) || [];
    }
    recordingStateChanged({ isRecording, service }) {
        this.dispatchEventToListeners(Events.RecordingStateChanged, { isRecording, serviceName: service });
    }
    backgroundServiceEventReceived({ backgroundServiceEvent }) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-expect-error
        this.events.get(backgroundServiceEvent.service).push(backgroundServiceEvent);
        this.dispatchEventToListeners(Events.BackgroundServiceEventReceived, backgroundServiceEvent);
    }
}
SDK.SDKModel.SDKModel.register(BackgroundServiceModel, { capabilities: 1 /* SDK.Target.Capability.BROWSER */, autostart: false });
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["RecordingStateChanged"] = "RecordingStateChanged";
    Events["BackgroundServiceEventReceived"] = "BackgroundServiceEventReceived";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
//# sourceMappingURL=BackgroundServiceModel.js.map