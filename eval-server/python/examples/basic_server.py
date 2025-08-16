#!/usr/bin/env python3
"""
Basic EvalServer example - Simple WebSocket server setup.

This example shows the minimal setup for a WebSocket evaluation server.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path for local development
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from bo_eval_server import EvalServer


async def main():
    """Main example function for basic server setup."""
    # Create server with basic configuration
    server = EvalServer(
        auth_key='hello',
        host='127.0.0.1',
        port=8080,
        log_level='DEBUG',
        log_dir='./logs',  # Optional: create logs directory
    )
    
    # Set up client connection handler
    @server.on_connect
    async def handle_client(client):
        print(f'🔗 Client connected: {client.id}')
        print(f'   Tab ID: {client.tab_id}')
        print(f'   Capabilities: {client.capabilities}')
        
        # Send EXACTLY the same evaluation as NodeJS library-usage.js
        try:
            print('🔄 Starting evaluation...')
            response = await client.evaluate({
                "id": "test_eval",
                "name": "Capital of France",
                "description": "Simple test evaluation", 
                "tool": "chat",
                "input": {
                    "message": "What is the capital of France?"
                }
            })
            
            print('✅ Evaluation completed!')
            print(f'📊 Response: {response}')
            
        except Exception as e:
            print(f'❌ Evaluation failed: {e}')
        
        # Send a custom message
        try:
            await client.send_message({
                "type": "info",
                "message": "Evaluation completed successfully!"
            })
        except Exception as e:
            print(f'⚠️  Failed to send message: {e}')
    
    # Set up client disconnection handler
    @server.on_disconnect
    async def handle_disconnect(client_info):
        print(f'🔌 Client disconnected: {client_info["id"]}')
        print(f'   Connection duration: {client_info.get("duration", "unknown")}s')
    
    # Start the server
    try:
        await server.start()
        print(f'🚀 Server running on ws://{server.config.host}:{server.config.port}')
        print('   Press Ctrl+C to stop the server')
        
        # Keep server running
        await server.wait_closed()
        
    except KeyboardInterrupt:
        print('\n🛑 Received interrupt signal, stopping server...')
        await server.stop()
        print('✅ Server stopped successfully')
        
    except Exception as e:
        print(f'💥 Server error: {e}')
        if server.is_running():
            await server.stop()


if __name__ == "__main__":
    # Check if logs directory exists, create if needed
    Path("./logs").mkdir(exist_ok=True)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Fatal error: {e}')
        sys.exit(1)