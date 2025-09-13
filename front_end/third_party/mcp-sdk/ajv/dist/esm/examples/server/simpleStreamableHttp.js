import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '../../server/mcp.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import { getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter } from '../../server/auth/router.js';
import { requireBearerAuth } from '../../server/auth/middleware/bearerAuth.js';
import { isInitializeRequest } from '../../types.js';
import { InMemoryEventStore } from '../shared/inMemoryEventStore.js';
import { setupAuthServer } from './demoInMemoryOAuthProvider.js';
// Check for OAuth flag
const useOAuth = process.argv.includes('--oauth');
// Create an MCP server with implementation details
const getServer = () => {
    const server = new McpServer({
        name: 'simple-streamable-http-server',
        version: '1.0.0',
    }, { capabilities: { logging: {} } });
    // Register a simple tool that returns a greeting
    server.tool('greet', 'A simple greeting tool', {
        name: z.string().describe('Name to greet'),
    }, async ({ name }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: `Hello, ${name}!`,
                },
            ],
        };
    });
    // Register a tool that sends multiple greetings with notifications (with annotations)
    server.tool('multi-greet', 'A tool that sends different greetings with delays between them', {
        name: z.string().describe('Name to greet'),
    }, {
        title: 'Multiple Greeting Tool',
        readOnlyHint: true,
        openWorldHint: false
    }, async ({ name }, { sendNotification }) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await sendNotification({
            method: "notifications/message",
            params: { level: "debug", data: `Starting multi-greet for ${name}` }
        });
        await sleep(1000); // Wait 1 second before first greeting
        await sendNotification({
            method: "notifications/message",
            params: { level: "info", data: `Sending first greeting to ${name}` }
        });
        await sleep(1000); // Wait another second before second greeting
        await sendNotification({
            method: "notifications/message",
            params: { level: "info", data: `Sending second greeting to ${name}` }
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Good morning, ${name}!`,
                }
            ],
        };
    });
    // Register a simple prompt
    server.prompt('greeting-template', 'A simple greeting prompt template', {
        name: z.string().describe('Name to include in greeting'),
    }, async ({ name }) => {
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please greet ${name} in a friendly manner.`,
                    },
                },
            ],
        };
    });
    // Register a tool specifically for testing resumability
    server.tool('start-notification-stream', 'Starts sending periodic notifications for testing resumability', {
        interval: z.number().describe('Interval in milliseconds between notifications').default(100),
        count: z.number().describe('Number of notifications to send (0 for 100)').default(50),
    }, async ({ interval, count }, { sendNotification }) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        let counter = 0;
        while (count === 0 || counter < count) {
            counter++;
            try {
                await sendNotification({
                    method: "notifications/message",
                    params: {
                        level: "info",
                        data: `Periodic notification #${counter} at ${new Date().toISOString()}`
                    }
                });
            }
            catch (error) {
                console.error("Error sending notification:", error);
            }
            // Wait for the specified interval
            await sleep(interval);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Started sending periodic notifications every ${interval}ms`,
                }
            ],
        };
    });
    // Create a simple resource at a fixed URI
    server.resource('greeting-resource', 'https://example.com/greetings/default', { mimeType: 'text/plain' }, async () => {
        return {
            contents: [
                {
                    uri: 'https://example.com/greetings/default',
                    text: 'Hello, world!',
                },
            ],
        };
    });
    return server;
};
const MCP_PORT = 3000;
const AUTH_PORT = 3001;
const app = express();
app.use(express.json());
// Set up OAuth if enabled
let authMiddleware = null;
if (useOAuth) {
    // Create auth middleware for MCP endpoints
    const mcpServerUrl = new URL(`http://localhost:${MCP_PORT}`);
    const authServerUrl = new URL(`http://localhost:${AUTH_PORT}`);
    const oauthMetadata = setupAuthServer(authServerUrl);
    const tokenVerifier = {
        verifyAccessToken: async (token) => {
            const endpoint = oauthMetadata.introspection_endpoint;
            if (!endpoint) {
                throw new Error('No token verification endpoint available in metadata');
            }
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    token: token
                }).toString()
            });
            if (!response.ok) {
                throw new Error(`Invalid or expired token: ${await response.text()}`);
            }
            const data = await response.json();
            // Convert the response to AuthInfo format
            return {
                token,
                clientId: data.client_id,
                scopes: data.scope ? data.scope.split(' ') : [],
                expiresAt: data.exp,
            };
        }
    };
    // Add metadata routes to the main MCP server
    app.use(mcpAuthMetadataRouter({
        oauthMetadata,
        resourceServerUrl: mcpServerUrl,
        scopesSupported: ['mcp:tools'],
        resourceName: 'MCP Demo Server',
    }));
    authMiddleware = requireBearerAuth({
        verifier: tokenVerifier,
        requiredScopes: ['mcp:tools'],
        resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
    });
}
// Map to store transports by session ID
const transports = {};
// MCP POST endpoint with optional auth
const mcpPostHandler = async (req, res) => {
    console.log('Received MCP request:', req.body);
    if (useOAuth && req.auth) {
        console.log('Authenticated user:', req.auth);
    }
    try {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'];
        let transport;
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        }
        else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            const eventStore = new InMemoryEventStore();
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                eventStore, // Enable resumability
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                }
            });
            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
                const sid = transport.sessionId;
                if (sid && transports[sid]) {
                    console.log(`Transport closed for session ${sid}, removing from transports map`);
                    delete transports[sid];
                }
            };
            // Connect the transport to the MCP server BEFORE handling the request
            // so responses can flow back through the same transport
            const server = getServer();
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return; // Already handled
        }
        else {
            // Invalid request - no session ID or not initialization request
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided',
                },
                id: null,
            });
            return;
        }
        // Handle the request with existing transport - no need to reconnect
        // The existing transport is already connected to the server
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
};
// Set up routes with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.post('/mcp', authMiddleware, mcpPostHandler);
}
else {
    app.post('/mcp', mcpPostHandler);
}
// Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
const mcpGetHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    if (useOAuth && req.auth) {
        console.log('Authenticated SSE connection from user:', req.auth);
    }
    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
        console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    }
    else {
        console.log(`Establishing new SSE stream for session ${sessionId}`);
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};
// Set up GET route with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.get('/mcp', authMiddleware, mcpGetHandler);
}
else {
    app.get('/mcp', mcpGetHandler);
}
// Handle DELETE requests for session termination (according to MCP spec)
const mcpDeleteHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    console.log(`Received session termination request for session ${sessionId}`);
    try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    }
    catch (error) {
        console.error('Error handling session termination:', error);
        if (!res.headersSent) {
            res.status(500).send('Error processing session termination');
        }
    }
};
// Set up DELETE route with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.delete('/mcp', authMiddleware, mcpDeleteHandler);
}
else {
    app.delete('/mcp', mcpDeleteHandler);
}
app.listen(MCP_PORT, () => {
    console.log(`MCP Streamable HTTP Server listening on port ${MCP_PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
        try {
            console.log(`Closing transport for session ${sessionId}`);
            await transports[sessionId].close();
            delete transports[sessionId];
        }
        catch (error) {
            console.error(`Error closing transport for session ${sessionId}:`, error);
        }
    }
    console.log('Server shutdown complete');
    process.exit(0);
});
//# sourceMappingURL=simpleStreamableHttp.js.map