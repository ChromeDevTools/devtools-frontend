"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_js_1 = require("../../server/mcp.js");
const streamableHttp_js_1 = require("../../server/streamableHttp.js");
const zod_1 = require("zod");
const getServer = () => {
    // Create an MCP server with implementation details
    const server = new mcp_js_1.McpServer({
        name: 'stateless-streamable-http-server',
        version: '1.0.0',
    }, { capabilities: { logging: {} } });
    // Register a simple prompt
    server.prompt('greeting-template', 'A simple greeting prompt template', {
        name: zod_1.z.string().describe('Name to include in greeting'),
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
        interval: zod_1.z.number().describe('Interval in milliseconds between notifications').default(100),
        count: zod_1.z.number().describe('Number of notifications to send (0 for 100)').default(10),
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
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/mcp', async (req, res) => {
    const server = getServer();
    try {
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });
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
app.get('/mcp', async (req, res) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
app.delete('/mcp', async (req, res) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
});
//# sourceMappingURL=simpleStatelessStreamableHttp.js.map