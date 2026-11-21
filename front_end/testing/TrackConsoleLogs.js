// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { after, before } from 'mocha';
const expectedLogsStack = [];
/** This needs to be invoked within a describe block, rather than within an it() block. **/
export function expectConsoleLogs(expectedLogs) {
    before(() => {
        expectedLogsStack.push(expectedLogs);
    });
    after(() => {
        const idx = expectedLogsStack.lastIndexOf(expectedLogs);
        if (idx !== -1) {
            expectedLogsStack.splice(idx, 1);
        }
    });
}
function safeFormatArg(arg) {
    if (arg === null || arg === undefined) {
        return '';
    }
    try {
        return String(arg);
    }
    catch {
        return Object.prototype.toString.call(arg);
    }
}
function safeJoinArgs(data) {
    return data.map(safeFormatArg).join(' ');
}
function getStack(error) {
    return (error.stack ?? 'No stack').split('\n').slice(2).join('\n');
}
export function createConsoleLogTracker(targetConsole = console) {
    const originals = {
        log: targetConsole.log,
        warn: targetConsole.warn,
        error: targetConsole.error,
    };
    const unexpectedLogs = [];
    function isExpected(level, joined) {
        return expectedLogsStack.some(entry => entry[level]?.includes(joined));
    }
    function startTracking() {
        unexpectedLogs.length = 0;
        targetConsole.log = (...data) => {
            if (isExpected('log', safeJoinArgs(data))) {
                return;
            }
            originals.log.apply(targetConsole, data);
        };
        for (const level of ['warn', 'error']) {
            targetConsole[level] = (...data) => {
                const message = safeJoinArgs(data);
                if (isExpected(level, message)) {
                    return;
                }
                unexpectedLogs.push({
                    level,
                    message,
                    stack: getStack(new Error()),
                });
                originals[level].apply(targetConsole, data);
            };
        }
    }
    function stopTracking() {
        unexpectedLogs.length = 0;
        targetConsole.log = originals.log;
        targetConsole.warn = originals.warn;
        targetConsole.error = originals.error;
    }
    function checkForUnexpectedLogs(testName = '') {
        if (unexpectedLogs.length === 0) {
            return;
        }
        const details = unexpectedLogs.map(entry => `console.${entry.level}: ${entry.message}\n${entry.stack}`).join('\n\n');
        throw new Error(`The test "${testName}" produced ${unexpectedLogs.length} unexpected console.${unexpectedLogs.length === 1 ? 'error/warn call' : 'error/warn calls'}:\n${details}`);
    }
    return {
        startTracking,
        stopTracking,
        checkForUnexpectedLogs,
    };
}
const defaultTracker = createConsoleLogTracker(console);
export function startTrackingConsoleLogs() {
    defaultTracker.startTracking();
}
export function stopTrackingConsoleLogs() {
    defaultTracker.stopTracking();
}
export function checkForUnexpectedConsoleLogs(testName = '') {
    defaultTracker.checkForUnexpectedLogs(testName);
}
//# sourceMappingURL=TrackConsoleLogs.js.map