#!/usr/bin/env python3
"""
Test client for debugging connection issues with bo-eval-server.

This client helps test the WebSocket connection and protocol implementation.
"""

import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add src to path for development
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    import websockets
except ImportError:
    print("❌ websockets not installed. Run: uv add websockets")
    sys.exit(1)


class TestClient:
    """Simple test client for debugging server connections."""
    
    def __init__(self, server_url: str = "ws://127.0.0.1:8080", auth_key: str = "hello"):
        self.server_url = server_url
        self.auth_key = auth_key
        self.client_id = str(uuid.uuid4())
        self.websocket = None
    
    async def connect_and_test(self):
        """Connect to server and test the NodeJS-compatible protocol."""
        print(f"🔗 Connecting to {self.server_url}")
        print(f"   Client ID: {self.client_id}")
        print(f"   Auth Key: {self.auth_key}")
        
        try:
            # Connect to WebSocket
            self.websocket = await websockets.connect(
                self.server_url,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=10,
            )
            print("✅ WebSocket connection established")
            
            # Send registration message (NodeJS style)
            registration = {
                "type": "register",
                "clientId": self.client_id,
                "secretKey": self.auth_key,
                "capabilities": ["chat", "action", "research"]
            }
            
            print("📤 Sending registration message:")
            print(f"   {json.dumps(registration, indent=2)}")
            
            await self.websocket.send(json.dumps(registration))
            
            # Wait for registration acknowledgment
            print("⏳ Waiting for registration acknowledgment...")
            response = await asyncio.wait_for(self.websocket.recv(), timeout=10.0)
            response_data = json.loads(response)
            
            print("📥 Received registration acknowledgment:")
            print(f"   {json.dumps(response_data, indent=2)}")
            
            if response_data.get("type") == "registration_ack" and response_data.get("status") == "accepted":
                print("✅ Registration successful!")
                
                # Send ready signal
                ready_message = {"type": "ready"}
                print("📤 Sending ready signal:")
                print(f"   {json.dumps(ready_message, indent=2)}")
                
                await self.websocket.send(json.dumps(ready_message))
                print("✅ Ready signal sent")
                
                # Listen for RPC calls
                print("👂 Listening for RPC calls...")
                await self.listen_for_calls()
                
            elif response_data.get("type") == "error":
                print(f"❌ Registration failed: {response_data.get('message')}")
                return False
            else:
                print(f"❓ Unexpected response: {response_data}")
                return False
                
        except asyncio.TimeoutError:
            print("⏰ Timeout waiting for server response")
            return False
        except websockets.exceptions.ConnectionClosed as e:
            print(f"🔌 Connection closed: {e}")
            return False
        except Exception as e:
            print(f"💥 Error during connection: {e}")
            return False
        finally:
            if self.websocket:
                await self.websocket.close()
        
        return True
    
    async def listen_for_calls(self):
        """Listen for RPC calls from the server."""
        try:
            async for message in self.websocket:
                print(f"\n📥 Received message: {message}")
                
                try:
                    data = json.loads(message)
                    
                    if data.get("jsonrpc") == "2.0" and data.get("method") == "evaluate":
                        print("🎯 Received RPC evaluation request")
                        print(f"   ID: {data.get('id')}")
                        print(f"   Params: {json.dumps(data.get('params', {}), indent=2)}")
                        
                        # Send mock response
                        response = {
                            "jsonrpc": "2.0",
                            "id": data["id"],
                            "result": {
                                "status": "completed",
                                "output": {
                                    "response": f"Mock response for evaluation {data['params'].get('name', 'unknown')}"
                                },
                                "metadata": {
                                    "client_id": self.client_id,
                                    "test_client": True
                                }
                            }
                        }
                        
                        print("📤 Sending mock response:")
                        print(f"   {json.dumps(response, indent=2)}")
                        
                        await self.websocket.send(json.dumps(response))
                        print("✅ Mock response sent")
                    else:
                        print(f"❓ Unknown message type: {data}")
                        
                except json.JSONDecodeError as e:
                    print(f"❌ Invalid JSON received: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            print("🔌 Connection closed by server")
        except Exception as e:
            print(f"💥 Error listening for calls: {e}")


async def main():
    """Main test function."""
    print("🧪 Test Client for bo-eval-server")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        server_url = sys.argv[1]
    else:
        server_url = "ws://127.0.0.1:8080"
    
    if len(sys.argv) > 2:
        auth_key = sys.argv[2]
    else:
        auth_key = "hello"  # Default from examples
    
    client = TestClient(server_url, auth_key)
    
    try:
        success = await client.connect_and_test()
        if success:
            print("\n✅ Test completed successfully!")
        else:
            print("\n❌ Test failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("Usage: python test_client.py [ws://server:port] [auth_key]")
    print("Example: python test_client.py ws://127.0.0.1:8080 hello")
    print()
    
    asyncio.run(main())