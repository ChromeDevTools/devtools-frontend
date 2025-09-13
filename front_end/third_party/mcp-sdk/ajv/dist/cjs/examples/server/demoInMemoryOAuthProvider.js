"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthServer = exports.DemoInMemoryAuthProvider = exports.DemoInMemoryClientsStore = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = __importDefault(require("express"));
const router_js_1 = require("src/server/auth/router.js");
class DemoInMemoryClientsStore {
    constructor() {
        this.clients = new Map();
    }
    async getClient(clientId) {
        return this.clients.get(clientId);
    }
    async registerClient(clientMetadata) {
        this.clients.set(clientMetadata.client_id, clientMetadata);
        return clientMetadata;
    }
}
exports.DemoInMemoryClientsStore = DemoInMemoryClientsStore;
/**
 * 🚨 DEMO ONLY - NOT FOR PRODUCTION
 *
 * This example demonstrates MCP OAuth flow but lacks some of the features required for production use,
 * for example:
 * - Persistent token storage
 * - Rate limiting
 */
class DemoInMemoryAuthProvider {
    constructor() {
        this.clientsStore = new DemoInMemoryClientsStore();
        this.codes = new Map();
        this.tokens = new Map();
    }
    async authorize(client, params, res) {
        const code = (0, node_crypto_1.randomUUID)();
        const searchParams = new URLSearchParams({
            code,
        });
        if (params.state !== undefined) {
            searchParams.set('state', params.state);
        }
        this.codes.set(code, {
            client,
            params
        });
        const targetUrl = new URL(client.redirect_uris[0]);
        targetUrl.search = searchParams.toString();
        res.redirect(targetUrl.toString());
    }
    async challengeForAuthorizationCode(client, authorizationCode) {
        // Store the challenge with the code data
        const codeData = this.codes.get(authorizationCode);
        if (!codeData) {
            throw new Error('Invalid authorization code');
        }
        return codeData.params.codeChallenge;
    }
    async exchangeAuthorizationCode(client, authorizationCode, 
    // Note: code verifier is checked in token.ts by default
    // it's unused here for that reason.
    _codeVerifier) {
        const codeData = this.codes.get(authorizationCode);
        if (!codeData) {
            throw new Error('Invalid authorization code');
        }
        if (codeData.client.client_id !== client.client_id) {
            throw new Error(`Authorization code was not issued to this client, ${codeData.client.client_id} != ${client.client_id}`);
        }
        this.codes.delete(authorizationCode);
        const token = (0, node_crypto_1.randomUUID)();
        const tokenData = {
            token,
            clientId: client.client_id,
            scopes: codeData.params.scopes || [],
            expiresAt: Date.now() + 3600000, // 1 hour
            type: 'access'
        };
        this.tokens.set(token, tokenData);
        return {
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            scope: (codeData.params.scopes || []).join(' '),
        };
    }
    async exchangeRefreshToken(_client, _refreshToken, _scopes) {
        throw new Error('Not implemented for example demo');
    }
    async verifyAccessToken(token) {
        const tokenData = this.tokens.get(token);
        if (!tokenData || !tokenData.expiresAt || tokenData.expiresAt < Date.now()) {
            throw new Error('Invalid or expired token');
        }
        return {
            token,
            clientId: tokenData.clientId,
            scopes: tokenData.scopes,
            expiresAt: Math.floor(tokenData.expiresAt / 1000),
        };
    }
}
exports.DemoInMemoryAuthProvider = DemoInMemoryAuthProvider;
const setupAuthServer = (authServerUrl) => {
    // Create separate auth server app
    // NOTE: This is a separate app on a separate port to illustrate
    // how to separate an OAuth Authorization Server from a Resource
    // server in the SDK. The SDK is not intended to be provide a standalone
    // authorization server.
    const provider = new DemoInMemoryAuthProvider();
    const authApp = (0, express_1.default)();
    authApp.use(express_1.default.json());
    // For introspection requests
    authApp.use(express_1.default.urlencoded());
    // Add OAuth routes to the auth server
    // NOTE: this will also add a protected resource metadata route,
    // but it won't be used, so leave it.
    authApp.use((0, router_js_1.mcpAuthRouter)({
        provider,
        issuerUrl: authServerUrl,
        scopesSupported: ['mcp:tools'],
    }));
    authApp.post('/introspect', async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) {
                res.status(400).json({ error: 'Token is required' });
                return;
            }
            const tokenInfo = await provider.verifyAccessToken(token);
            res.json({
                active: true,
                client_id: tokenInfo.clientId,
                scope: tokenInfo.scopes.join(' '),
                exp: tokenInfo.expiresAt
            });
            return;
        }
        catch (error) {
            res.status(401).json({
                active: false,
                error: 'Unauthorized',
                error_description: `Invalid token: ${error}`
            });
        }
    });
    const auth_port = authServerUrl.port;
    // Start the auth server
    authApp.listen(auth_port, () => {
        console.log(`OAuth Authorization Server listening on port ${auth_port}`);
    });
    // Note: we could fetch this from the server, but then we end up
    // with some top level async which gets annoying.
    const oauthMetadata = (0, router_js_1.createOAuthMetadata)({
        provider,
        issuerUrl: authServerUrl,
        scopesSupported: ['mcp:tools'],
    });
    oauthMetadata.introspection_endpoint = new URL("/introspect", authServerUrl).href;
    return oauthMetadata;
};
exports.setupAuthServer = setupAuthServer;
//# sourceMappingURL=demoInMemoryOAuthProvider.js.map