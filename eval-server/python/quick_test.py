#!/usr/bin/env python3
"""Quick test to see what's happening with the server."""

import asyncio
import json
import websockets

async def test_server():
    print("🔗 Testing server connection...")
    try:
        async with websockets.connect('ws://127.0.0.1:8080') as ws:
            print("✅ Connected to server")
            
            # Wait for welcome message
            print("⏳ Waiting for welcome message...")
            welcome = await asyncio.wait_for(ws.recv(), timeout=5.0)
            print(f"📥 Welcome: {welcome}")
            
            # Send registration
            registration = {
                "type": "register",
                "clientId": "test-client-123",
                "secretKey": "hello",
                "capabilities": ["chat"]
            }
            print(f"📤 Sending registration: {json.dumps(registration)}")
            await ws.send(json.dumps(registration))
            
            # Wait for ack
            print("⏳ Waiting for registration ack...")
            ack = await asyncio.wait_for(ws.recv(), timeout=5.0)
            print(f"📥 Registration ack: {ack}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_server())