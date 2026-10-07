// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function getCssDeclarationAsJavascriptProperty(declaration) {
    const { name, value } = declaration;
    const declarationNameAsJs = name.startsWith('--') ? escapeAsSingleQuotedJsString(name) :
        name.replace(/-([a-z])/gi, (_str, group) => group.toUpperCase());
    const declarationAsJs = escapeAsSingleQuotedJsString(value);
    return `${declarationNameAsJs}: ${declarationAsJs}`;
}
function escapeAsSingleQuotedJsString(text) {
    // Escape the escape character itself before the quote character, so that
    // CSS source text (which may legitimately contain backslashes) does not
    // terminate the generated JavaScript string literal and inject live code into
    // the developer's paste destination.
    return `'${text.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}'`;
}
//# sourceMappingURL=StylePropertyUtils.js.map