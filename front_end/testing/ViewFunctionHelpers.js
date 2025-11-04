// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function createViewFunctionStub(_constructor, outputValues) {
    const result = sinon.fake((input, output, _target) => {
        result.input = input;
        if (output && outputValues) {
            Object.assign(output, outputValues);
        }
        result.invoked?.(input);
    });
    Object.defineProperty(result, 'nextInput', {
        get() {
            return new Promise(resolve => {
                result.invoked = resolve;
            });
        }
    });
    return result;
}
//# sourceMappingURL=ViewFunctionHelpers.js.map