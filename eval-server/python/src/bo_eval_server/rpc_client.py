"""
JSON-RPC 2.0 client implementation for calling methods on connected agents.

Handles request/response correlation, timeouts, and error conditions.
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, Optional, Callable, Awaitable

import websockets
from loguru import logger

from .logger import log_rpc_call


class RpcError(Exception):
    """Exception raised for RPC-related errors."""
    pass


class RpcTimeoutError(RpcError):
    """Exception raised when RPC call times out."""
    pass


class RpcClient:
    """JSON-RPC 2.0 client for bidirectional communication with agents."""
    
    def __init__(self, websocket: websockets.WebSocketServerProtocol, timeout: float = 1500.0):
        """
        Initialize RPC client for a WebSocket connection.
        
        Args:
            websocket: WebSocket connection to the agent
            timeout: Default timeout for RPC calls in seconds
        """
        self.websocket = websocket
        self.timeout = timeout
        self._pending_calls: Dict[str, asyncio.Future] = {}
        self._message_handler_task: Optional[asyncio.Task] = None
        self._closed = False
    
    async def start(self) -> None:
        """Start the RPC client message handler."""
        if self._message_handler_task is None:
            self._message_handler_task = asyncio.create_task(self._handle_messages())
    
    async def stop(self) -> None:
        """Stop the RPC client and cancel pending calls."""
        self._closed = True
        
        # Cancel message handler
        if self._message_handler_task:
            self._message_handler_task.cancel()
            try:
                await self._message_handler_task
            except asyncio.CancelledError:
                pass
        
        # Cancel all pending calls
        for future in self._pending_calls.values():
            if not future.done():
                future.cancel()
        self._pending_calls.clear()
    
    async def call(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None,
        client_id: Optional[str] = None,
    ) -> Any:
        """
        Make an RPC call to the connected agent.
        
        Args:
            method: RPC method name to call
            params: Parameters to pass to the method
            timeout: Timeout for this call (uses default if None)
            client_id: Client ID for logging purposes
            
        Returns:
            The result returned by the agent
            
        Raises:
            RpcError: If the call fails or returns an error
            RpcTimeoutError: If the call times out
            ConnectionError: If the WebSocket connection is closed
        """
        if self._closed:
            raise ConnectionError("RPC client is closed")
        
        call_id = str(uuid.uuid4())
        call_timeout = timeout or self.timeout
        
        # Create JSON-RPC 2.0 request
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": call_id,
        }
        
        # Create future for response
        future: asyncio.Future = asyncio.Future()
        self._pending_calls[call_id] = future
        
        start_time = time.time()
        
        try:
            # Log RPC call start
            log_rpc_call(
                method=method,
                client_id=client_id or "unknown",
                call_id=call_id,
                status="sent",
                params=params,
            )
            
            # Send request
            await self.websocket.send(json.dumps(request))
            
            # Wait for response with timeout
            try:
                result = await asyncio.wait_for(future, timeout=call_timeout)
                duration = time.time() - start_time
                
                # Log successful completion
                log_rpc_call(
                    method=method,
                    client_id=client_id or "unknown",
                    call_id=call_id,
                    status="completed",
                    duration=duration,
                )
                
                return result
                
            except asyncio.TimeoutError:
                duration = time.time() - start_time
                
                # Log timeout
                log_rpc_call(
                    method=method,
                    client_id=client_id or "unknown",
                    call_id=call_id,
                    status="timeout",
                    duration=duration,
                )
                
                raise RpcTimeoutError(f"RPC call '{method}' timed out after {call_timeout}s")
                
        except Exception as e:
            duration = time.time() - start_time
            
            # Log failure
            log_rpc_call(
                method=method,
                client_id=client_id or "unknown",
                call_id=call_id,
                status="failed",
                duration=duration,
                error=str(e),
            )
            
            raise
            
        finally:
            # Clean up pending call
            self._pending_calls.pop(call_id, None)
    
    async def _handle_messages(self) -> None:
        """Handle incoming WebSocket messages and route RPC responses."""
        try:
            async for message in self.websocket:
                if self._closed:
                    break
                
                try:
                    await self._process_message(message)
                except Exception as e:
                    logger.error(f"Error processing RPC message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.debug("WebSocket connection closed in RPC message handler")
        except Exception as e:
            logger.error(f"Error in RPC message handler: {e}")
        finally:
            await self.stop()
    
    async def _process_message(self, message: str) -> None:
        """Process a single WebSocket message."""
        try:
            data = json.loads(message)
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in RPC message: {e}")
            return
        
        # Handle JSON-RPC 2.0 responses
        if isinstance(data, dict) and "jsonrpc" in data and "id" in data:
            call_id = data["id"]
            future = self._pending_calls.get(call_id)
            
            if future and not future.done():
                if "result" in data:
                    # Successful response
                    future.set_result(data["result"])
                elif "error" in data:
                    # Error response
                    error = data["error"]
                    error_msg = f"RPC error {error.get('code', 'unknown')}: {error.get('message', 'Unknown error')}"
                    future.set_exception(RpcError(error_msg))
                else:
                    # Invalid response format
                    future.set_exception(RpcError("Invalid RPC response format"))
            else:
                logger.warning(f"Received response for unknown or completed call: {call_id}")
    
    def is_connected(self) -> bool:
        """Check if the RPC client is still active."""
        return not self._closed
    
    def __repr__(self) -> str:
        """String representation of the RPC client."""
        status = "connected" if self.is_connected() else "closed"
        return f"RpcClient(status={status}, pending_calls={len(self._pending_calls)})"