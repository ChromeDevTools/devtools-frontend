import { OAuthClientInformationFullSchema, OAuthTokensSchema, } from "../../../shared/auth.js";
import { ServerError } from "../errors.js";
/**
 * Implements an OAuth server that proxies requests to another OAuth server.
 */
export class ProxyOAuthServerProvider {
    constructor(options) {
        var _a;
        this.skipLocalPkceValidation = true;
        this._endpoints = options.endpoints;
        this._verifyAccessToken = options.verifyAccessToken;
        this._getClient = options.getClient;
        if ((_a = options.endpoints) === null || _a === void 0 ? void 0 : _a.revocationUrl) {
            this.revokeToken = async (client, request) => {
                const revocationUrl = this._endpoints.revocationUrl;
                if (!revocationUrl) {
                    throw new Error("No revocation endpoint configured");
                }
                const params = new URLSearchParams();
                params.set("token", request.token);
                params.set("client_id", client.client_id);
                if (client.client_secret) {
                    params.set("client_secret", client.client_secret);
                }
                if (request.token_type_hint) {
                    params.set("token_type_hint", request.token_type_hint);
                }
                const response = await fetch(revocationUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: params.toString(),
                });
                if (!response.ok) {
                    throw new ServerError(`Token revocation failed: ${response.status}`);
                }
            };
        }
    }
    get clientsStore() {
        const registrationUrl = this._endpoints.registrationUrl;
        return {
            getClient: this._getClient,
            ...(registrationUrl && {
                registerClient: async (client) => {
                    const response = await fetch(registrationUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(client),
                    });
                    if (!response.ok) {
                        throw new ServerError(`Client registration failed: ${response.status}`);
                    }
                    const data = await response.json();
                    return OAuthClientInformationFullSchema.parse(data);
                }
            })
        };
    }
    async authorize(client, params, res) {
        var _a;
        // Start with required OAuth parameters
        const targetUrl = new URL(this._endpoints.authorizationUrl);
        const searchParams = new URLSearchParams({
            client_id: client.client_id,
            response_type: "code",
            redirect_uri: params.redirectUri,
            code_challenge: params.codeChallenge,
            code_challenge_method: "S256"
        });
        // Add optional standard OAuth parameters
        if (params.state)
            searchParams.set("state", params.state);
        if ((_a = params.scopes) === null || _a === void 0 ? void 0 : _a.length)
            searchParams.set("scope", params.scopes.join(" "));
        targetUrl.search = searchParams.toString();
        res.redirect(targetUrl.toString());
    }
    async challengeForAuthorizationCode(_client, _authorizationCode) {
        // In a proxy setup, we don't store the code challenge ourselves
        // Instead, we proxy the token request and let the upstream server validate it
        return "";
    }
    async exchangeAuthorizationCode(client, authorizationCode, codeVerifier, redirectUri) {
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: client.client_id,
            code: authorizationCode,
        });
        if (client.client_secret) {
            params.append("client_secret", client.client_secret);
        }
        if (codeVerifier) {
            params.append("code_verifier", codeVerifier);
        }
        if (redirectUri) {
            params.append("redirect_uri", redirectUri);
        }
        const response = await fetch(this._endpoints.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });
        if (!response.ok) {
            throw new ServerError(`Token exchange failed: ${response.status}`);
        }
        const data = await response.json();
        return OAuthTokensSchema.parse(data);
    }
    async exchangeRefreshToken(client, refreshToken, scopes) {
        const params = new URLSearchParams({
            grant_type: "refresh_token",
            client_id: client.client_id,
            refresh_token: refreshToken,
        });
        if (client.client_secret) {
            params.set("client_secret", client.client_secret);
        }
        if (scopes === null || scopes === void 0 ? void 0 : scopes.length) {
            params.set("scope", scopes.join(" "));
        }
        const response = await fetch(this._endpoints.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });
        if (!response.ok) {
            throw new ServerError(`Token refresh failed: ${response.status}`);
        }
        const data = await response.json();
        return OAuthTokensSchema.parse(data);
    }
    async verifyAccessToken(token) {
        return this._verifyAccessToken(token);
    }
}
//# sourceMappingURL=proxyProvider.js.map