// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCall(stub, options = {}) {
    return new Promise(resolve => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stub.callsFake(function (...args) {
            if (stub.callCount >= (options.callCount ?? 1)) {
                resolve(args);
            }
            return (options.fakeFn ? options.fakeFn.apply(this, args) : undefined);
        });
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectCalled(stub, options = {}) {
    const remainingCalls = (options.callCount ?? 1) - stub.callCount;
    if (remainingCalls <= 0) {
        return Promise.resolve(stub.lastCall.args);
    }
    return expectCall(stub, { ...options, callCount: remainingCalls });
}
export function spyCall(obj, method) {
    const { promise, resolve } = Promise.withResolvers();
    const original = obj[method];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub = sinon.stub(obj, method).callsFake(function (...args) {
        const result = original.apply(this, args);
        resolve({ args, result });
        stub.restore();
    });
    return promise;
}
//# sourceMappingURL=ExpectStubCall.js.map