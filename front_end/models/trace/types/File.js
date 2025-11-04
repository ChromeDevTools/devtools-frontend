// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function isTimeRangeAnnotation(annotation) {
    return annotation.type === 'TIME_RANGE';
}
export function isEntryLabelAnnotation(annotation) {
    return annotation.type === 'ENTRY_LABEL';
}
export function isEntriesLinkAnnotation(annotation) {
    return annotation.type === 'ENTRIES_LINK';
}
export function traceEventKeyToValues(key) {
    const parts = key.split('-');
    const type = parts[0];
    switch (type) {
        case "p" /* EventKeyType.PROFILE_CALL */:
            if (parts.length !== 5 ||
                !(parts.every((part, i) => i === 0 || typeof part === 'number' || !isNaN(parseInt(part, 10))))) {
                throw new Error(`Invalid ProfileCallKey: ${key}`);
            }
            return {
                type: parts[0],
                processID: parseInt(parts[1], 10),
                threadID: parseInt(parts[2], 10),
                sampleIndex: parseInt(parts[3], 10),
                protocol: parseInt(parts[4], 10),
            };
        case "r" /* EventKeyType.RAW_EVENT */:
            if (parts.length !== 2 || !(typeof parts[1] === 'number' || !isNaN(parseInt(parts[1], 10)))) {
                throw new Error(`Invalid RawEvent Key: ${key}`);
            }
            return {
                type: parts[0],
                rawIndex: parseInt(parts[1], 10),
            };
        case "s" /* EventKeyType.SYNTHETIC_EVENT */:
            if (parts.length !== 2 || !(typeof parts[1] === 'number' || !isNaN(parseInt(parts[1], 10)))) {
                throw new Error(`Invalid SyntheticEvent Key: ${key}`);
            }
            return {
                type: parts[0],
                rawIndex: parseInt(parts[1], 10),
            };
        case "l" /* EventKeyType.LEGACY_TIMELINE_FRAME */: {
            if (parts.length !== 2 || Number.isNaN(parseInt(parts[1], 10))) {
                throw new Error(`Invalid LegacyTimelineFrame Key: ${key}`);
            }
            return {
                type,
                rawIndex: parseInt(parts[1], 10),
            };
        }
        default:
            throw new Error(`Unknown trace event key: ${key}`);
    }
}
//# sourceMappingURL=File.js.map