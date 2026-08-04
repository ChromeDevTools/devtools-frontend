// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../core/host/host.js';
/**
 * @returns True, iff a metric event with the provided name and code was recorded. False otherwise.
 */
export function recordedMetricsContain(actionName, actionCode) {
    const instance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
    if (instance instanceof Host.InspectorFrontendHost.InspectorFrontendHostStub) {
        return instance.recordedEnumeratedHistograms.some(event => event.actionName === actionName && event.actionCode === actionCode);
    }
    return false;
}
export function resetRecordedMetrics() {
    const instance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
    if (instance instanceof Host.InspectorFrontendHost.InspectorFrontendHostStub) {
        instance.recordedEnumeratedHistograms = [];
    }
}
export function setupUserMetricHooks() {
    beforeEach(() => {
        const mockEnumCodes = new Map();
        function getMockEnumCode(enumName, prop) {
            if (prop === 'MAX_VALUE') {
                return 1000;
            }
            if (!mockEnumCodes.has(enumName)) {
                mockEnumCodes.set(enumName, new Map());
            }
            const propMap = mockEnumCodes.get(enumName);
            if (!propMap.has(prop)) {
                propMap.set(prop, propMap.size);
            }
            return propMap.get(prop);
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics = new Proxy({}, {
            get(_target, enumName) {
                if (typeof enumName !== 'string') {
                    return undefined;
                }
                return new Proxy({}, {
                    get(_target, prop) {
                        if (typeof prop !== 'string' || prop === 'then') {
                            return undefined;
                        }
                        return getMockEnumCode(enumName, prop);
                    },
                    has(_target, prop) {
                        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                            return false;
                        }
                        return true;
                    },
                    ownKeys(_target) {
                        const propMap = mockEnumCodes.get(enumName);
                        return propMap ? Array.from(propMap.keys()) : [];
                    },
                    getOwnPropertyDescriptor(_target, prop) {
                        if (typeof prop !== 'string') {
                            return undefined;
                        }
                        return {
                            configurable: true,
                            enumerable: true,
                            value: getMockEnumCode(enumName, prop),
                            writable: false,
                        };
                    },
                });
            },
        });
    });
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const globalObject = globalThis;
        delete globalObject.DevToolsMetrics;
    });
}
//# sourceMappingURL=UserMetricsHelpers.js.map