"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOAuthMetadata = void 0;
exports.mcpAuthRouter = mcpAuthRouter;
exports.mcpAuthMetadataRouter = mcpAuthMetadataRouter;
exports.getOAuthProtectedResourceMetadataUrl = getOAuthProtectedResourceMetadataUrl;
const express_1 = __importDefault(require("express"));
const register_js_1 = require("./handlers/register.js");
const token_js_1 = require("./handlers/token.js");
const authorize_js_1 = require("./handlers/authorize.js");
const revoke_js_1 = require("./handlers/revoke.js");
const metadata_js_1 = require("./handlers/metadata.js");
const checkIssuerUrl = (issuer) => {
    // Technically RFC 8414 does not permit a localhost HTTPS exemption, but this will be necessary for ease of testing
    if (issuer.protocol !== "https:" && issuer.hostname !== "localhost" && issuer.hostname !== "127.0.0.1") {
        throw new Error("Issuer URL must be HTTPS");
    }
    if (issuer.hash) {
        throw new Error(`Issuer URL must not have a fragment: ${issuer}`);
    }
    if (issuer.search) {
        throw new Error(`Issuer URL must not have a query string: ${issuer}`);
    }
};
const createOAuthMetadata = (options) => {
    var _a;
    const issuer = options.issuerUrl;
    const baseUrl = options.baseUrl;
    checkIssuerUrl(issuer);
    const authorization_endpoint = "/authorize";
    const token_endpoint = "/token";
    const registration_endpoint = options.provider.clientsStore.registerClient ? "/register" : undefined;
    const revocation_endpoint = options.provider.revokeToken ? "/revoke" : undefined;
    const metadata = {
        issuer: issuer.href,
        service_documentation: (_a = options.serviceDocumentationUrl) === null || _a === void 0 ? void 0 : _a.href,
        authorization_endpoint: new URL(authorization_endpoint, baseUrl || issuer).href,
        response_types_supported: ["code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint: new URL(token_endpoint, baseUrl || issuer).href,
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        scopes_supported: options.scopesSupported,
        revocation_endpoint: revocation_endpoint ? new URL(revocation_endpoint, baseUrl || issuer).href : undefined,
        revocation_endpoint_auth_methods_supported: revocation_endpoint ? ["client_secret_post"] : undefined,
        registration_endpoint: registration_endpoint ? new URL(registration_endpoint, baseUrl || issuer).href : undefined,
    };
    return metadata;
};
exports.createOAuthMetadata = createOAuthMetadata;
/**
 * Installs standard MCP authorization server endpoints, including dynamic client registration and token revocation (if supported).
 * Also advertises standard authorization server metadata, for easier discovery of supported configurations by clients.
 * Note: if your MCP server is only a resource server and not an authorization server, use mcpAuthMetadataRouter instead.
 *
 * By default, rate limiting is applied to all endpoints to prevent abuse.
 *
 * This router MUST be installed at the application root, like so:
 *
 *  const app = express();
 *  app.use(mcpAuthRouter(...));
 */
function mcpAuthRouter(options) {
    const oauthMetadata = (0, exports.createOAuthMetadata)(options);
    const router = express_1.default.Router();
    router.use(new URL(oauthMetadata.authorization_endpoint).pathname, (0, authorize_js_1.authorizationHandler)({ provider: options.provider, ...options.authorizationOptions }));
    router.use(new URL(oauthMetadata.token_endpoint).pathname, (0, token_js_1.tokenHandler)({ provider: options.provider, ...options.tokenOptions }));
    router.use(mcpAuthMetadataRouter({
        oauthMetadata,
        // This router is used for AS+RS combo's, so the issuer is also the resource server
        resourceServerUrl: new URL(oauthMetadata.issuer),
        serviceDocumentationUrl: options.serviceDocumentationUrl,
        scopesSupported: options.scopesSupported,
        resourceName: options.resourceName
    }));
    if (oauthMetadata.registration_endpoint) {
        router.use(new URL(oauthMetadata.registration_endpoint).pathname, (0, register_js_1.clientRegistrationHandler)({
            clientsStore: options.provider.clientsStore,
            ...options,
        }));
    }
    if (oauthMetadata.revocation_endpoint) {
        router.use(new URL(oauthMetadata.revocation_endpoint).pathname, (0, revoke_js_1.revocationHandler)({ provider: options.provider, ...options.revocationOptions }));
    }
    return router;
}
function mcpAuthMetadataRouter(options) {
    var _a;
    checkIssuerUrl(new URL(options.oauthMetadata.issuer));
    const router = express_1.default.Router();
    const protectedResourceMetadata = {
        resource: options.resourceServerUrl.href,
        authorization_servers: [
            options.oauthMetadata.issuer
        ],
        scopes_supported: options.scopesSupported,
        resource_name: options.resourceName,
        resource_documentation: (_a = options.serviceDocumentationUrl) === null || _a === void 0 ? void 0 : _a.href,
    };
    router.use("/.well-known/oauth-protected-resource", (0, metadata_js_1.metadataHandler)(protectedResourceMetadata));
    // Always add this for backwards compatibility
    router.use("/.well-known/oauth-authorization-server", (0, metadata_js_1.metadataHandler)(options.oauthMetadata));
    return router;
}
/**
 * Helper function to construct the OAuth 2.0 Protected Resource Metadata URL
 * from a given server URL. This replaces the path with the standard metadata endpoint.
 *
 * @param serverUrl - The base URL of the protected resource server
 * @returns The URL for the OAuth protected resource metadata endpoint
 *
 * @example
 * getOAuthProtectedResourceMetadataUrl(new URL('https://api.example.com/mcp'))
 * // Returns: 'https://api.example.com/.well-known/oauth-protected-resource'
 */
function getOAuthProtectedResourceMetadataUrl(serverUrl) {
    return new URL('/.well-known/oauth-protected-resource', serverUrl).href;
}
//# sourceMappingURL=router.js.map