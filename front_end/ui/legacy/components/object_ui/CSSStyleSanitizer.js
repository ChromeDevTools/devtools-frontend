// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
/**
 * Builds a regex fragment that matches a CSS identifier even when written
 * with hex escapes (e.g. `\75\72\6c` for `url`).
 */
export function cssEscapeRegex(cssString) {
    return [...cssString]
        .map(char => {
        const charCodes = new Set([char.toLowerCase(), char.toUpperCase()].map(c => c.charCodeAt(0).toString(16)));
        const charCodeRegex = [...charCodes].map(charCode => `\\\\0{0,${6 - charCode.length}}${charCode}[ \\n\\t]?`).join('|');
        return `\\\\?(?:${charCodeRegex}|${char})`;
    })
        .join('');
}
const ALLOWED_PROPERTY_PREFIXES = ['background', 'border', 'color', 'font', 'line', 'margin', 'padding', 'text'];
// We only allow data URLs with the `url()` CSS function.
// The capture group is not intended to grab the whole URL exactly, just enough so we can check the scheme.
// The regex also covers CSS hex-escaped variations of `url()`.
const URL_REGEX = new RegExp(`(?=${cssEscapeRegex('url')}\\(['"]?([^\\)]*))`, 'gi');
// We greedily capture all `image-set()`s to make sure that all of
// them properly use `url()`s to enforce the data URL check later.
const IMAGESET_REGEX = new RegExp(`(?=(${cssEscapeRegex('image-set')}\\(.*))`, 'gi');
const GOOD_IMAGESET_REGEX = /^image-set\((?:(?:(?:url|type)\("[^\\"]*"\)|[\d.]+(?:x|dpi|dpcm|dppx)),?\s*)+\)/i;
/**
 * Parses `styleToAdd` as a CSS style string and populates `currentStyle`
 * with only the properties that pass safety checks:
 *   - Property name must start with one of the allowed prefixes.
 *   - `url()` values must use `data:` scheme only.
 *   - `image-set()` values must use properly formed `url()`s.
 *
 * The map is cleared before being populated.
 */
export function sanitizeStyle(currentStyle, styleToAdd) {
    currentStyle.clear();
    // eslint-disable-next-line @devtools/no-imperative-dom-api
    const buffer = document.createElement('span');
    buffer.setAttribute('style', styleToAdd);
    for (const property of buffer.style) {
        if (!ALLOWED_PROPERTY_PREFIXES.some(prefix => property.startsWith(prefix) || property.startsWith(`-webkit-${prefix}`))) {
            continue;
        }
        const value = buffer.style.getPropertyValue(property);
        // We make sure every `image-set()` only uses `url()`s for its images.
        // If any of them seem malformed, we skip the whole property.
        const imageSets = [...value.matchAll(IMAGESET_REGEX)];
        if (imageSets.some(match => !GOOD_IMAGESET_REGEX.test(match[1]))) {
            continue;
        }
        // There could be multiple `url()` functions, so we check them all.
        // If any of them is not a `data` URL, we skip the whole property.
        const potentialUrls = [...value.matchAll(URL_REGEX)].map(match => match[1]);
        if (potentialUrls.some(potentialUrl => !Common.ParsedURL.schemeIs(potentialUrl, 'data:'))) {
            continue;
        }
        currentStyle.set(property, {
            value,
            priority: buffer.style.getPropertyPriority(property),
        });
    }
}
//# sourceMappingURL=CSSStyleSanitizer.js.map