import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '../../server/mcp.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import { isInitializeRequest } from '../../types.js';
// Create an MCP server with implementation details
const server = new McpServer({
    name: 'resource-list-changed-notification-server',
    version: '1.0.0',
});
// Store transports by session ID to send notifications
const transports = {};
const addResource = (name, content) => {
    const uri = `https://mcp-example.com/dynamic/${encodeURIComponent(name)}`;
    server.resource(name, uri, { mimeType: 'text/plain', description: `Dynamic resource: ${name}` }, async () => {
        return {
            contents: [{ uri, text: content }],
        };
    });
};
addResource('example-resource', 'Initial content for example-resource');
const resourceChangeInterval = setInterval(() => {
    const name = randomUUID();
    addResource(name, `Content for ${name}`);
}, 5000); // Change resources every 5 seconds for testing
const app = express();
app.use(express.json());
app.post('/mcp', async (req, res) => {
    console.log('Received MCP request:', req.body);
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
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                }
            });
            // Connect the transport to the MCP server
            await server.connect(transport);
            // Handle the request - the onsessioninitialized callback will store the transport
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
        // Handle the request with existing transport
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
});
// Handle GET requests for SSE streams (now using built-in support from StreamableHTTP)
app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    clearInterval(resourceChangeInterval);
    await server.close();
    process.exit(0);
});
//# sourceMappingURL=standaloneSseWithGetStreamableHttp.js.map