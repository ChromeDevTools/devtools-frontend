"""
Client management for WebSocket connections.

Handles client registration, authentication, and provides a proxy interface
for interacting with connected agents.
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, Optional, List, Callable, Awaitable

import websockets
from loguru import logger

from .rpc_client import RpcClient, RpcError, RpcTimeoutError
from .logger import log_connection, log_evaluation


class ClientProxy:
    """Proxy object for interacting with a connected agent."""
    
    def __init__(
        self,
        client_id: str,
        websocket: websockets.WebSocketServerProtocol,
        rpc_client: RpcClient,
        tab_id: Optional[str] = None,
        base_client_id: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
    ):
        """
        Initialize client proxy.
        
        Args:
            client_id: Unique client identifier
            websocket: WebSocket connection
            rpc_client: RPC client for method calls
            tab_id: Browser tab ID (if applicable)
            base_client_id: Base client ID for grouping
            capabilities: List of agent capabilities
        """
        self.id = client_id
        self.tab_id = tab_id
        self.base_client_id = base_client_id or client_id
        self.capabilities = capabilities or []
        self._websocket = websocket
        self._rpc_client = rpc_client
        self._connected_at = time.time()
    
    async def evaluate(
        self,
        evaluation: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute an evaluation on the connected agent.
        
        Args:
            evaluation: Evaluation object with required fields
            timeout: Optional timeout override
            
        Returns:
            Evaluation result from the agent
            
        Raises:
            ValueError: If evaluation is invalid
            RpcError: If the RPC call fails
            RpcTimeoutError: If the call times out
        """
        # Validate evaluation object
        required_fields = ['id', 'name', 'tool', 'input']
        for field in required_fields:
            if field not in evaluation:
                raise ValueError(f"Evaluation missing required field: {field}")
        
        evaluation_id = evaluation['id']
        start_time = time.time()
        
        try:
            # Log evaluation start
            log_evaluation(
                evaluation_id=evaluation_id,
                client_id=self.id,
                status="started",
                evaluation_name=evaluation.get('name'),
                tool=evaluation.get('tool'),
            )
            
            # Make RPC call to agent
            result = await self._rpc_client.call(
                method="evaluate",
                params=evaluation,
                timeout=timeout,
                client_id=self.id,
            )
            
            duration = time.time() - start_time
            
            # Log evaluation completion
            log_evaluation(
                evaluation_id=evaluation_id,
                client_id=self.id,
                status="completed",
                duration=duration,
                evaluation_name=evaluation.get('name'),
                tool=evaluation.get('tool'),
            )
            
            return result
            
        except RpcTimeoutError:
            duration = time.time() - start_time
            log_evaluation(
                evaluation_id=evaluation_id,
                client_id=self.id,
                status="timeout",
                duration=duration,
                evaluation_name=evaluation.get('name'),
                tool=evaluation.get('tool'),
            )
            raise
            
        except Exception as e:
            duration = time.time() - start_time
            log_evaluation(
                evaluation_id=evaluation_id,
                client_id=self.id,
                status="failed",
                duration=duration,
                error=str(e),
                evaluation_name=evaluation.get('name'),
                tool=evaluation.get('tool'),
            )
            raise
    
    async def send_message(self, message: Dict[str, Any]) -> None:
        """
        Send a custom message to the connected agent.
        
        Args:
            message: Message object to send
        """
        try:
            await self._websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to client {self.id}: {e}")
            raise
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get client information.
        
        Returns:
            Dictionary with client details
        """
        return {
            'id': self.id,
            'tab_id': self.tab_id,
            'base_client_id': self.base_client_id,
            'capabilities': self.capabilities,
            'connected_at': self._connected_at,
            'connected': self._rpc_client.is_connected(),
        }
    
    def is_connected(self) -> bool:
        """Check if the client is still connected."""
        return self._rpc_client.is_connected()
    
    def __repr__(self) -> str:
        """String representation of the client proxy."""
        return f"ClientProxy(id={self.id}, connected={self.is_connected()})"


class ClientManager:
    """Manages WebSocket client connections and authentication."""
    
    def __init__(self, auth_key: str, rpc_timeout: float = 1500.0):
        """
        Initialize client manager.
        
        Args:
            auth_key: Required authentication key for clients
            rpc_timeout: Default RPC timeout in seconds
        """
        self.auth_key = auth_key
        self.rpc_timeout = rpc_timeout
        self._clients: Dict[str, ClientProxy] = {}
        self._pending_connections: Dict[str, Dict[str, Any]] = {}
        
        # Event handlers
        self._on_connect_handler: Optional[Callable[[ClientProxy], Awaitable[None]]] = None
        self._on_disconnect_handler: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    
    def on_connect(self, handler: Callable[[ClientProxy], Awaitable[None]]) -> None:
        """Set the handler for client connections."""
        self._on_connect_handler = handler
    
    def on_disconnect(self, handler: Callable[[Dict[str, Any]], Awaitable[None]]) -> None:
        """Set the handler for client disconnections."""
        self._on_disconnect_handler = handler
    
    async def handle_connection(self, websocket: websockets.WebSocketServerProtocol) -> None:
        """
        Handle a new WebSocket connection - matches NodeJS EvalServer flow.
        
        Args:
            websocket: WebSocket connection
        """
        connection_id = str(uuid.uuid4())
        client_proxy: Optional[ClientProxy] = None
        
        try:
            # Send welcome message immediately (like NodeJS)
            welcome_message = {
                'type': 'welcome',
                'serverId': 'python-eval-server-001',
                'version': '1.0.0',
                'timestamp': time.time()
            }
            logger.debug(f"Sending welcome message to connection {connection_id}")
            await websocket.send(json.dumps(welcome_message))
            
            # Wait for registration message
            client_proxy = await self._authenticate_client(websocket, connection_id)
            
            if client_proxy:
                # Start RPC client
                await client_proxy._rpc_client.start()
                
                # Add to active clients
                self._clients[client_proxy.id] = client_proxy
                
                # Call connection handler
                if self._on_connect_handler:
                    await self._on_connect_handler(client_proxy)
                
                # Keep connection alive until closed
                await client_proxy._rpc_client._message_handler_task
                
        except websockets.exceptions.ConnectionClosed:
            logger.debug(f"WebSocket connection closed: {connection_id}")
        except Exception as e:
            logger.error(f"Error handling connection {connection_id}: {e}")
        finally:
            # Clean up on disconnect
            if client_proxy:
                await self._handle_disconnect(client_proxy)
    
    async def _authenticate_client(
        self,
        websocket: websockets.WebSocketServerProtocol,
        connection_id: str,
    ) -> Optional[ClientProxy]:
        """Authenticate and register a client connection - matches NodeJS implementation."""
        try:
            logger.debug(f"Waiting for registration message from connection {connection_id}")
            # Wait for registration message with timeout
            message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            logger.debug(f"Received message from {connection_id}: {message}")
            data = json.loads(message)
            
            if data.get('type') != 'register':
                logger.warning(f"Invalid first message from {connection_id}: expected 'register', got '{data.get('type')}'")
                await websocket.send(json.dumps({
                    'type': 'registration_ack',
                    'status': 'rejected',
                    'message': 'First message must be registration'
                }))
                return None
            
            # Auto-accept clients like NodeJS does (NodeJS auto-creates client configs)
            # For simplicity, we'll accept any client with the correct secret key or no secret key
            if 'secretKey' in data:
                if data.get('secretKey') != self.auth_key:
                    logger.warning(f"Invalid auth key from {connection_id}: expected '{self.auth_key}', got '{data.get('secretKey')}'")
                    await websocket.send(json.dumps({
                        'type': 'registration_ack',
                        'clientId': data.get('clientId', str(uuid.uuid4())),
                        'status': 'rejected',
                        'message': 'Invalid authentication key'
                    }))
                    return None
                else:
                    logger.debug(f"Valid secret key provided by {connection_id}")
            else:
                logger.debug(f"No secret key provided by {connection_id}, accepting anyway")
            
            client_id = data.get('clientId', str(uuid.uuid4()))
            tab_id = data.get('tabId')
            base_client_id = data.get('baseClientId')
            capabilities = data.get('capabilities', [])
            
            logger.info(f"Registering client {client_id} from connection {connection_id}")
            logger.debug(f"Client capabilities: {capabilities}")
            
            # Send registration acknowledgment
            registration_response = {
                'type': 'registration_ack',
                'clientId': client_id,
                'status': 'accepted',
                'message': 'Client registered successfully'
            }
            logger.debug(f"Sending registration ack to {client_id}: {registration_response}")
            await websocket.send(json.dumps(registration_response))
            
            # Wait for ready signal
            logger.debug(f"Waiting for ready signal from client {client_id}")
            ready_message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            logger.debug(f"Received ready message from {client_id}: {ready_message}")
            ready_data = json.loads(ready_message)
            
            if ready_data.get('type') != 'ready':
                logger.warning(f"Invalid ready message from {client_id}: expected 'ready', got '{ready_data.get('type')}'")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': 'Expected ready signal after registration'
                }))
                return None
            
            logger.info(f"Client {client_id} is ready for evaluations")
            
            # Create RPC client and proxy
            rpc_client = RpcClient(websocket, self.rpc_timeout)
            client_proxy = ClientProxy(
                client_id=client_id,
                websocket=websocket,
                rpc_client=rpc_client,
                tab_id=tab_id,
                base_client_id=base_client_id,
                capabilities=capabilities,
            )
            
            # Log successful connection
            log_connection(
                event="connect",
                client_id=client_id,
                tab_id=tab_id,
                base_client_id=base_client_id,
                capabilities=capabilities,
            )
            
            return client_proxy
            
        except asyncio.TimeoutError:
            logger.warning(f"Client registration timeout: {connection_id}")
            return None
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON in registration: {connection_id}")
            return None
        except Exception as e:
            logger.error(f"Error during client authentication: {e}")
            return None
    
    async def _handle_disconnect(self, client_proxy: ClientProxy) -> None:
        """Handle client disconnection cleanup."""
        client_id = client_proxy.id
        
        # Remove from active clients
        self._clients.pop(client_id, None)
        
        # Stop RPC client
        await client_proxy._rpc_client.stop()
        
        # Get client info for disconnect handler
        client_info = client_proxy.get_info()
        
        # Log disconnection
        log_connection(
            event="disconnect",
            client_id=client_id,
            tab_id=client_proxy.tab_id,
            base_client_id=client_proxy.base_client_id,
        )
        
        # Call disconnect handler
        if self._on_disconnect_handler:
            try:
                await self._on_disconnect_handler(client_info)
            except Exception as e:
                logger.error(f"Error in disconnect handler: {e}")
    
    def get_clients(self) -> List[ClientProxy]:
        """Get list of connected clients."""
        return list(self._clients.values())
    
    def get_client(self, client_id: str) -> Optional[ClientProxy]:
        """Get a specific client by ID."""
        return self._clients.get(client_id)
    
    def get_status(self) -> Dict[str, Any]:
        """Get client manager status."""
        return {
            'connected_clients': len(self._clients),
            'client_ids': list(self._clients.keys()),
        }
    
    def __repr__(self) -> str:
        """String representation of the client manager."""
        return f"ClientManager(clients={len(self._clients)})"