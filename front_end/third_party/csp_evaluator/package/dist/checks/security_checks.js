"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHasConfiguredReporting = exports.checkSrcHttp = exports.checkNonceLength = exports.checkDeprecatedDirective = exports.checkIpSource = exports.looksLikeIpAddress = exports.checkFlashObjectAllowlistBypass = exports.checkScriptAllowlistBypass = exports.checkMissingDirectives = exports.checkMultipleMissingBaseUriDirective = exports.checkMissingBaseUriDirective = exports.checkMissingScriptSrcDirective = exports.checkMissingObjectSrcDirective = exports.checkWildcards = exports.checkPlainUrlSchemes = exports.checkScriptUnsafeEval = exports.checkScriptUnsafeInline = exports.URL_SCHEMES_CAUSING_XSS = exports.DIRECTIVES_CAUSING_XSS = void 0;
const angular = __importStar(require("../allowlist_bypasses/angular"));
const flash = __importStar(require("../allowlist_bypasses/flash"));
const jsonp = __importStar(require("../allowlist_bypasses/jsonp"));
const csp = __importStar(require("../csp"));
const csp_1 = require("../csp");
const finding_1 = require("../finding");
const utils = __importStar(require("../utils"));
exports.DIRECTIVES_CAUSING_XSS = [csp_1.Directive.SCRIPT_SRC, csp_1.Directive.OBJECT_SRC, csp_1.Directive.BASE_URI];
exports.URL_SCHEMES_CAUSING_XSS = ['data:', 'http:', 'https:'];
function checkScriptUnsafeInline(effectiveCsp) {
    const directiveName = effectiveCsp.getEffectiveDirective(csp_1.Directive.SCRIPT_SRC);
    const values = effectiveCsp.directives[directiveName] || [];
    if (values.includes(csp_1.Keyword.UNSAFE_INLINE)) {
        return [new finding_1.Finding(finding_1.Type.SCRIPT_UNSAFE_INLINE, `'unsafe-inline' allows the execution of unsafe in-page scripts ` +
                'and event handlers.', finding_1.Severity.HIGH, directiveName, csp_1.Keyword.UNSAFE_INLINE)];
    }
    return [];
}
exports.checkScriptUnsafeInline = checkScriptUnsafeInline;
function checkScriptUnsafeEval(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp_1.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (values.includes(csp_1.Keyword.UNSAFE_EVAL)) {
        return [new finding_1.Finding(finding_1.Type.SCRIPT_UNSAFE_EVAL, `'unsafe-eval' allows the execution of code injected into DOM APIs ` +
                'such as eval().', finding_1.Severity.MEDIUM_MAYBE, directiveName, csp_1.Keyword.UNSAFE_EVAL)];
    }
    return [];
}
exports.checkScriptUnsafeEval = checkScriptUnsafeEval;
function checkPlainUrlSchemes(parsedCsp) {
    const violations = [];
    const directivesToCheck = parsedCsp.getEffectiveDirectives(exports.DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        const values = parsedCsp.directives[directive] || [];
        for (const value of values) {
            if (exports.URL_SCHEMES_CAUSING_XSS.includes(value)) {
                violations.push(new finding_1.Finding(finding_1.Type.PLAIN_URL_SCHEMES, value + ' URI in ' + directive + ' allows the execution of ' +
                    'unsafe scripts.', finding_1.Severity.HIGH, directive, value));
            }
        }
    }
    return violations;
}
exports.checkPlainUrlSchemes = checkPlainUrlSchemes;
function checkWildcards(parsedCsp) {
    const violations = [];
    const directivesToCheck = parsedCsp.getEffectiveDirectives(exports.DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        const values = parsedCsp.directives[directive] || [];
        for (const value of values) {
            const url = utils.getSchemeFreeUrl(value);
            if (url === '*') {
                violations.push(new finding_1.Finding(finding_1.Type.PLAIN_WILDCARD, directive + ` should not allow '*' as source`, finding_1.Severity.HIGH, directive, value));
                continue;
            }
        }
    }
    return violations;
}
exports.checkWildcards = checkWildcards;
function checkMissingObjectSrcDirective(parsedCsp) {
    let objectRestrictions = [];
    if (csp_1.Directive.OBJECT_SRC in parsedCsp.directives) {
        objectRestrictions = parsedCsp.directives[csp_1.Directive.OBJECT_SRC];
    }
    else if (csp_1.Directive.DEFAULT_SRC in parsedCsp.directives) {
        objectRestrictions = parsedCsp.directives[csp_1.Directive.DEFAULT_SRC];
    }
    if (objectRestrictions !== undefined && objectRestrictions.length >= 1) {
        return [];
    }
    return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, `Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`, finding_1.Severity.HIGH, csp_1.Directive.OBJECT_SRC)];
}
exports.checkMissingObjectSrcDirective = checkMissingObjectSrcDirective;
function checkMissingScriptSrcDirective(parsedCsp) {
    if (csp_1.Directive.SCRIPT_SRC in parsedCsp.directives ||
        csp_1.Directive.DEFAULT_SRC in parsedCsp.directives) {
        return [];
    }
    return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, 'script-src directive is missing.', finding_1.Severity.HIGH, csp_1.Directive.SCRIPT_SRC)];
}
exports.checkMissingScriptSrcDirective = checkMissingScriptSrcDirective;
function checkMissingBaseUriDirective(parsedCsp) {
    return checkMultipleMissingBaseUriDirective([parsedCsp]);
}
exports.checkMissingBaseUriDirective = checkMissingBaseUriDirective;
function checkMultipleMissingBaseUriDirective(parsedCsps) {
    const needsBaseUri = (csp) => (csp.policyHasScriptNonces() ||
        (csp.policyHasScriptHashes() && csp.policyHasStrictDynamic()));
    const hasBaseUri = (csp) => csp_1.Directive.BASE_URI in csp.directives;
    if (parsedCsps.some(needsBaseUri) && !parsedCsps.some(hasBaseUri)) {
        const description = 'Missing base-uri allows the injection of base tags. ' +
            'They can be used to set the base URL for all relative (script) ' +
            'URLs to an attacker controlled domain. ' +
            `Can you set it to 'none' or 'self'?`;
        return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, description, finding_1.Severity.HIGH, csp_1.Directive.BASE_URI)];
    }
    return [];
}
exports.checkMultipleMissingBaseUriDirective = checkMultipleMissingBaseUriDirective;
function checkMissingDirectives(parsedCsp) {
    return [
        ...checkMissingObjectSrcDirective(parsedCsp),
        ...checkMissingScriptSrcDirective(parsedCsp),
        ...checkMissingBaseUriDirective(parsedCsp),
    ];
}
exports.checkMissingDirectives = checkMissingDirectives;
function checkScriptAllowlistBypass(parsedCsp) {
    const violations = [];
    const effectiveScriptSrcDirective = parsedCsp.getEffectiveDirective(csp_1.Directive.SCRIPT_SRC);
    const scriptSrcValues = parsedCsp.directives[effectiveScriptSrcDirective] || [];
    if (scriptSrcValues.includes(csp_1.Keyword.NONE)) {
        return violations;
    }
    for (const value of scriptSrcValues) {
        if (value === csp_1.Keyword.SELF) {
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_ALLOWLIST_BYPASS, `'self' can be problematic if you host JSONP, AngularJS or user ` +
                'uploaded files.', finding_1.Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
            continue;
        }
        if (value.startsWith('\'')) {
            continue;
        }
        if (csp.isUrlScheme(value) || value.indexOf('.') === -1) {
            continue;
        }
        const url = '//' + utils.getSchemeFreeUrl(value);
        const angularBypass = utils.matchWildcardUrls(url, angular.URLS);
        let jsonpBypass = utils.matchWildcardUrls(url, jsonp.URLS);
        if (jsonpBypass) {
            const evalRequired = jsonp.NEEDS_EVAL.includes(jsonpBypass.hostname);
            const evalPresent = scriptSrcValues.includes(csp_1.Keyword.UNSAFE_EVAL);
            if (evalRequired && !evalPresent) {
                jsonpBypass = null;
            }
        }
        if (jsonpBypass || angularBypass) {
            let bypassDomain = '';
            let bypassTxt = '';
            if (jsonpBypass) {
                bypassDomain = jsonpBypass.hostname;
                bypassTxt = ' JSONP endpoints';
            }
            if (angularBypass) {
                bypassDomain = angularBypass.hostname;
                bypassTxt += (bypassTxt.trim() === '') ? '' : ' and';
                bypassTxt += ' Angular libraries';
            }
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_ALLOWLIST_BYPASS, bypassDomain + ' is known to host' + bypassTxt +
                ' which allow to bypass this CSP.', finding_1.Severity.HIGH, effectiveScriptSrcDirective, value));
        }
        else {
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_ALLOWLIST_BYPASS, `No bypass found; make sure that this URL doesn't serve JSONP ` +
                'replies or Angular libraries.', finding_1.Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
        }
    }
    return violations;
}
exports.checkScriptAllowlistBypass = checkScriptAllowlistBypass;
function checkFlashObjectAllowlistBypass(parsedCsp) {
    const violations = [];
    const effectiveObjectSrcDirective = parsedCsp.getEffectiveDirective(csp_1.Directive.OBJECT_SRC);
    const objectSrcValues = parsedCsp.directives[effectiveObjectSrcDirective] || [];
    const pluginTypes = parsedCsp.directives[csp_1.Directive.PLUGIN_TYPES];
    if (pluginTypes && !pluginTypes.includes('application/x-shockwave-flash')) {
        return [];
    }
    for (const value of objectSrcValues) {
        if (value === csp_1.Keyword.NONE) {
            return [];
        }
        const url = '//' + utils.getSchemeFreeUrl(value);
        const flashBypass = utils.matchWildcardUrls(url, flash.URLS);
        if (flashBypass) {
            violations.push(new finding_1.Finding(finding_1.Type.OBJECT_ALLOWLIST_BYPASS, flashBypass.hostname +
                ' is known to host Flash files which allow to bypass this CSP.', finding_1.Severity.HIGH, effectiveObjectSrcDirective, value));
        }
        else if (effectiveObjectSrcDirective === csp_1.Directive.OBJECT_SRC) {
            violations.push(new finding_1.Finding(finding_1.Type.OBJECT_ALLOWLIST_BYPASS, `Can you restrict object-src to 'none' only?`, finding_1.Severity.MEDIUM_MAYBE, effectiveObjectSrcDirective, value));
        }
    }
    return violations;
}
exports.checkFlashObjectAllowlistBypass = checkFlashObjectAllowlistBypass;
function looksLikeIpAddress(maybeIp) {
    if (maybeIp.startsWith('[') && maybeIp.endsWith(']')) {
        return true;
    }
    if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(maybeIp)) {
        return true;
    }
    return false;
}
exports.looksLikeIpAddress = looksLikeIpAddress;
function checkIpSource(parsedCsp) {
    const violations = [];
    const checkIp = (directive, directiveValues) => {
        for (const value of directiveValues) {
            const host = utils.getHostname(value);
            if (looksLikeIpAddress(host)) {
                if (host === '127.0.0.1') {
                    violations.push(new finding_1.Finding(finding_1.Type.IP_SOURCE, directive + ' directive allows localhost as source. ' +
                        'Please make sure to remove this in production environments.', finding_1.Severity.INFO, directive, value));
                }
                else {
                    violations.push(new finding_1.Finding(finding_1.Type.IP_SOURCE, directive + ' directive has an IP-Address as source: ' + host +
                        ' (will be ignored by browsers!). ', finding_1.Severity.INFO, directive, value));
                }
            }
        }
    };
    utils.applyCheckFunktionToDirectives(parsedCsp, checkIp);
    return violations;
}
exports.checkIpSource = checkIpSource;
function checkDeprecatedDirective(parsedCsp) {
    const violations = [];
    if (csp_1.Directive.REFLECTED_XSS in parsedCsp.directives) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'reflected-xss is deprecated since CSP2. ' +
            'Please, use the X-XSS-Protection header instead.', finding_1.Severity.INFO, csp_1.Directive.REFLECTED_XSS));
    }
    if (csp_1.Directive.REFERRER in parsedCsp.directives) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'referrer is deprecated since CSP2. ' +
            'Please, use the Referrer-Policy header instead.', finding_1.Severity.INFO, csp_1.Directive.REFERRER));
    }
    if (csp_1.Directive.DISOWN_OPENER in parsedCsp.directives) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'disown-opener is deprecated since CSP3. ' +
            'Please, use the Cross Origin Opener Policy header instead.', finding_1.Severity.INFO, csp_1.Directive.DISOWN_OPENER));
    }
    return violations;
}
exports.checkDeprecatedDirective = checkDeprecatedDirective;
function checkNonceLength(parsedCsp) {
    const noncePattern = new RegExp('^\'nonce-(.+)\'$');
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (directive, directiveValues) => {
        for (const value of directiveValues) {
            const match = value.match(noncePattern);
            if (!match) {
                continue;
            }
            const nonceValue = match[1];
            if (nonceValue.length < 8) {
                violations.push(new finding_1.Finding(finding_1.Type.NONCE_LENGTH, 'Nonces should be at least 8 characters long.', finding_1.Severity.MEDIUM, directive, value));
            }
            if (!csp.isNonce(value, true)) {
                violations.push(new finding_1.Finding(finding_1.Type.NONCE_CHARSET, 'Nonces should only use the base64 charset.', finding_1.Severity.INFO, directive, value));
            }
        }
    });
    return violations;
}
exports.checkNonceLength = checkNonceLength;
function checkSrcHttp(parsedCsp) {
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (directive, directiveValues) => {
        for (const value of directiveValues) {
            const description = directive === csp_1.Directive.REPORT_URI ?
                'Use HTTPS to send violation reports securely.' :
                'Allow only resources downloaded over HTTPS.';
            if (value.startsWith('http://')) {
                violations.push(new finding_1.Finding(finding_1.Type.SRC_HTTP, description, finding_1.Severity.MEDIUM, directive, value));
            }
        }
    });
    return violations;
}
exports.checkSrcHttp = checkSrcHttp;
function checkHasConfiguredReporting(parsedCsp) {
    const reportUriValues = parsedCsp.directives[csp_1.Directive.REPORT_URI] || [];
    if (reportUriValues.length > 0) {
        return [];
    }
    const reportToValues = parsedCsp.directives[csp_1.Directive.REPORT_TO] || [];
    if (reportToValues.length > 0) {
        return [new finding_1.Finding(finding_1.Type.REPORT_TO_ONLY, `This CSP policy only provides a reporting destination via the 'report-to' directive. This directive is only supported in Chromium-based browsers so it is recommended to also use a 'report-uri' directive.`, finding_1.Severity.INFO, csp_1.Directive.REPORT_TO)];
    }
    return [new finding_1.Finding(finding_1.Type.REPORTING_DESTINATION_MISSING, 'This CSP policy does not configure a reporting destination. This makes it difficult to maintain the CSP policy over time and monitor for any breakages.', finding_1.Severity.INFO, csp_1.Directive.REPORT_URI)];
}
exports.checkHasConfiguredReporting = checkHasConfiguredReporting;
//# sourceMappingURL=security_checks.js.map