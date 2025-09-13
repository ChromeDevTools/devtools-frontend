#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_readline_1 = require("node:readline");
const node_url_1 = require("node:url");
const node_child_process_1 = require("node:child_process");
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const types_js_1 = require("../../types.js");
const auth_js_1 = require("../../client/auth.js");
// Configuration
const DEFAULT_SERVER_URL = 'http://localhost:3000/mcp';
const CALLBACK_PORT = 8090; // Use different port than auth server (3001)
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
/**
 * In-memory OAuth client provider for demonstration purposes
 * In production, you should persist tokens securely
 */
class InMemoryOAuthClientProvider {
    constructor(_redirectUrl, _clientMetadata, onRedirect) {
        this._redirectUrl = _redirectUrl;
        this._clientMetadata = _clientMetadata;
        this._onRedirect = onRedirect || ((url) => {
            console.log(`Redirect to: ${url.toString()}`);
        });
    }
    get redirectUrl() {
        return this._redirectUrl;
    }
    get clientMetadata() {
        return this._clientMetadata;
    }
    clientInformation() {
        return this._clientInformation;
    }
    saveClientInformation(clientInformation) {
        this._clientInformation = clientInformation;
    }
    tokens() {
        return this._tokens;
    }
    saveTokens(tokens) {
        this._tokens = tokens;
    }
    redirectToAuthorization(authorizationUrl) {
        this._onRedirect(authorizationUrl);
    }
    saveCodeVerifier(codeVerifier) {
        this._codeVerifier = codeVerifier;
    }
    codeVerifier() {
        if (!this._codeVerifier) {
            throw new Error('No code verifier saved');
        }
        return this._codeVerifier;
    }
}
/**
 * Interactive MCP client with OAuth authentication
 * Demonstrates the complete OAuth flow with browser-based authorization
 */
class InteractiveOAuthClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.client = null;
        this.rl = (0, node_readline_1.createInterface)({
            input: process.stdin,
            output: process.stdout,
        });
    }
    /**
     * Prompts user for input via readline
     */
    async question(query) {
        return new Promise((resolve) => {
            this.rl.question(query, resolve);
        });
    }
    /**
     * Opens the authorization URL in the user's default browser
     */
    async openBrowser(url) {
        console.log(`🌐 Opening browser for authorization: ${url}`);
        const command = `open "${url}"`;
        (0, node_child_process_1.exec)(command, (error) => {
            if (error) {
                console.error(`Failed to open browser: ${error.message}`);
                console.log(`Please manually open: ${url}`);
            }
        });
    }
    /**
     * Example OAuth callback handler - in production, use a more robust approach
     * for handling callbacks and storing tokens
     */
    /**
     * Starts a temporary HTTP server to receive the OAuth callback
     */
    async waitForOAuthCallback() {
        return new Promise((resolve, reject) => {
            const server = (0, node_http_1.createServer)((req, res) => {
                // Ignore favicon requests
                if (req.url === '/favicon.ico') {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                console.log(`📥 Received callback: ${req.url}`);
                const parsedUrl = new node_url_1.URL(req.url || '', 'http://localhost');
                const code = parsedUrl.searchParams.get('code');
                const error = parsedUrl.searchParams.get('error');
                if (code) {
                    console.log(`✅ Authorization code received: ${code === null || code === void 0 ? void 0 : code.substring(0, 10)}...`);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <html>
              <body>
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);
                    resolve(code);
                    setTimeout(() => server.close(), 3000);
                }
                else if (error) {
                    console.log(`❌ Authorization error: ${error}`);
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
            <html>
              <body>
                <h1>Authorization Failed</h1>
                <p>Error: ${error}</p>
              </body>
            </html>
          `);
                    reject(new Error(`OAuth authorization failed: ${error}`));
                }
                else {
                    console.log(`❌ No authorization code or error in callback`);
                    res.writeHead(400);
                    res.end('Bad request');
                    reject(new Error('No authorization code provided'));
                }
            });
            server.listen(CALLBACK_PORT, () => {
                console.log(`OAuth callback server started on http://localhost:${CALLBACK_PORT}`);
            });
        });
    }
    async attemptConnection(oauthProvider) {
        console.log('🚢 Creating transport with OAuth provider...');
        const baseUrl = new node_url_1.URL(this.serverUrl);
        const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(baseUrl, {
            authProvider: oauthProvider
        });
        console.log('🚢 Transport created');
        try {
            console.log('🔌 Attempting connection (this will trigger OAuth redirect)...');
            await this.client.connect(transport);
            console.log('✅ Connected successfully');
        }
        catch (error) {
            if (error instanceof auth_js_1.UnauthorizedError) {
                console.log('🔐 OAuth required - waiting for authorization...');
                const callbackPromise = this.waitForOAuthCallback();
                const authCode = await callbackPromise;
                await transport.finishAuth(authCode);
                console.log('🔐 Authorization code received:', authCode);
                console.log('🔌 Reconnecting with authenticated transport...');
                await this.attemptConnection(oauthProvider);
            }
            else {
                console.error('❌ Connection failed with non-auth error:', error);
                throw error;
            }
        }
    }
    /**
     * Establishes connection to the MCP server with OAuth authentication
     */
    async connect() {
        console.log(`🔗 Attempting to connect to ${this.serverUrl}...`);
        const clientMetadata = {
            client_name: 'Simple OAuth MCP Client',
            redirect_uris: [CALLBACK_URL],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            scope: 'mcp:tools'
        };
        console.log('🔐 Creating OAuth provider...');
        const oauthProvider = new InMemoryOAuthClientProvider(CALLBACK_URL, clientMetadata, (redirectUrl) => {
            console.log(`📌 OAuth redirect handler called - opening browser`);
            console.log(`Opening browser to: ${redirectUrl.toString()}`);
            this.openBrowser(redirectUrl.toString());
        });
        console.log('🔐 OAuth provider created');
        console.log('👤 Creating MCP client...');
        this.client = new index_js_1.Client({
            name: 'simple-oauth-client',
            version: '1.0.0',
        }, { capabilities: {} });
        console.log('👤 Client created');
        console.log('🔐 Starting OAuth flow...');
        await this.attemptConnection(oauthProvider);
        // Start interactive loop
        await this.interactiveLoop();
    }
    /**
     * Main interactive loop for user commands
     */
    async interactiveLoop() {
        console.log('\n🎯 Interactive MCP Client with OAuth');
        console.log('Commands:');
        console.log('  list - List available tools');
        console.log('  call <tool_name> [args] - Call a tool');
        console.log('  quit - Exit the client');
        console.log();
        while (true) {
            try {
                const command = await this.question('mcp> ');
                if (!command.trim()) {
                    continue;
                }
                if (command === 'quit') {
                    break;
                }
                else if (command === 'list') {
                    await this.listTools();
                }
                else if (command.startsWith('call ')) {
                    await this.handleCallTool(command);
                }
                else {
                    console.log('❌ Unknown command. Try \'list\', \'call <tool_name>\', or \'quit\'');
                }
            }
            catch (error) {
                if (error instanceof Error && error.message === 'SIGINT') {
                    console.log('\n\n👋 Goodbye!');
                    break;
                }
                console.error('❌ Error:', error);
            }
        }
    }
    async listTools() {
        if (!this.client) {
            console.log('❌ Not connected to server');
            return;
        }
        try {
            const request = {
                method: 'tools/list',
                params: {},
            };
            const result = await this.client.request(request, types_js_1.ListToolsResultSchema);
            if (result.tools && result.tools.length > 0) {
                console.log('\n📋 Available tools:');
                result.tools.forEach((tool, index) => {
                    console.log(`${index + 1}. ${tool.name}`);
                    if (tool.description) {
                        console.log(`   Description: ${tool.description}`);
                    }
                    console.log();
                });
            }
            else {
                console.log('No tools available');
            }
        }
        catch (error) {
            console.error('❌ Failed to list tools:', error);
        }
    }
    async handleCallTool(command) {
        const parts = command.split(/\s+/);
        const toolName = parts[1];
        if (!toolName) {
            console.log('❌ Please specify a tool name');
            return;
        }
        // Parse arguments (simple JSON-like format)
        let toolArgs = {};
        if (parts.length > 2) {
            const argsString = parts.slice(2).join(' ');
            try {
                toolArgs = JSON.parse(argsString);
            }
            catch (_a) {
                console.log('❌ Invalid arguments format (expected JSON)');
                return;
            }
        }
        await this.callTool(toolName, toolArgs);
    }
    async callTool(toolName, toolArgs) {
        if (!this.client) {
            console.log('❌ Not connected to server');
            return;
        }
        try {
            const request = {
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: toolArgs,
                },
            };
            const result = await this.client.request(request, types_js_1.CallToolResultSchema);
            console.log(`\n🔧 Tool '${toolName}' result:`);
            if (result.content) {
                result.content.forEach((content) => {
                    if (content.type === 'text') {
                        console.log(content.text);
                    }
                    else {
                        console.log(content);
                    }
                });
            }
            else {
                console.log(result);
            }
        }
        catch (error) {
            console.error(`❌ Failed to call tool '${toolName}':`, error);
        }
    }
    close() {
        this.rl.close();
        if (this.client) {
            // Note: Client doesn't have a close method in the current implementation
            // This would typically close the transport connection
        }
    }
}
/**
 * Main entry point
 */
async function main() {
    const serverUrl = process.env.MCP_SERVER_URL || DEFAULT_SERVER_URL;
    console.log('🚀 Simple MCP OAuth Client');
    console.log(`Connecting to: ${serverUrl}`);
    console.log();
    const client = new InteractiveOAuthClient(serverUrl);
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Goodbye!');
        client.close();
        process.exit(0);
    });
    try {
        await client.connect();
    }
    catch (error) {
        console.error('Failed to start client:', error);
        process.exit(1);
    }
    finally {
        client.close();
    }
}
// Run if this file is executed directly
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=simpleOAuthClient.js.map