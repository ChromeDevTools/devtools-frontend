"""
EvalServer - Main WebSocket server for LLM agent evaluations.

A library-first evaluation server that accepts connections from AI agents,
sends them evaluation tasks via RPC calls, and collects their responses.
"""

import asyncio
from typing import Dict, Any, Optional, Callable, Awaitable, List

import websockets
from loguru import logger

from .config import Config
from .client_manager import ClientManager, ClientProxy
from .logger import setup_logger, log_server_event


class EvalServer:
    """
    Main evaluation server class for managing WebSocket connections and evaluations.
    
    Example usage:
    ```python
    server = EvalServer(
        auth_key='your-secret-key',
        host='127.0.0.1', 
        port=8080
    )
    
    @server.on_connect
    async def handle_client(client):
        print(f'Client connected: {client.id}')
        
        result = await client.evaluate({
            "id": "test_eval",
            "name": "Test Evaluation",
            "tool": "chat",
            "input": {"message": "Hello world"}
        })
        
        print(f'Response: {result}')
    
    await server.start()
    await server.wait_closed()
    ```
    """
    
    def __init__(
        self,
        auth_key: str,
        host: str = 'localhost',
        port: int = 8080,
        rpc_timeout: float = 1500.0,
        log_level: str = 'INFO',
        log_dir: Optional[str] = None,
        max_concurrent_evaluations: int = 10,
    ):
        """
        Initialize the evaluation server.
        
        Args:
            auth_key: Required authentication key for client connections
            host: Server host address
            port: Server port number  
            rpc_timeout: Default timeout for RPC calls in seconds
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
            log_dir: Directory for log files (optional)
            max_concurrent_evaluations: Maximum concurrent evaluations
        """
        # Create and validate configuration
        self.config = Config(
            host=host,
            port=port,
            auth_key=auth_key,
            log_level=log_level,
            rpc_timeout=rpc_timeout,
            max_concurrent_evaluations=max_concurrent_evaluations,
        )
        self.config.validate()
        
        # Setup logging
        setup_logger(
            log_level=self.config.log_level,
            log_dir=log_dir,
        )
        
        # Initialize client manager
        self.client_manager = ClientManager(
            auth_key=self.config.auth_key,
            rpc_timeout=self.config.rpc_timeout,
        )
        
        # Server state
        self._server: Optional[websockets.WebSocketServer] = None
        self._running = False
        self._start_time: Optional[float] = None
        
        # Evaluation concurrency control
        self._evaluation_semaphore = asyncio.Semaphore(
            self.config.max_concurrent_evaluations
        )
    
    def on_connect(self, handler: Callable[[ClientProxy], Awaitable[None]]) -> Callable:
        """
        Decorator to set the client connection handler.
        
        Args:
            handler: Async function to call when a client connects
            
        Returns:
            The handler function (for decorator use)
        """
        self.client_manager.on_connect(handler)
        return handler
    
    def on_disconnect(self, handler: Callable[[Dict[str, Any]], Awaitable[None]]) -> Callable:
        """
        Decorator to set the client disconnection handler.
        
        Args:
            handler: Async function to call when a client disconnects
            
        Returns:
            The handler function (for decorator use)
        """
        self.client_manager.on_disconnect(handler)
        return handler
    
    async def start(self) -> None:
        """
        Start the WebSocket server.
        
        Raises:
            RuntimeError: If server is already running
            OSError: If unable to bind to the specified host/port
        """
        if self._running:
            raise RuntimeError("Server is already running")
        
        try:
            logger.info(f"Starting EvalServer on {self.config.host}:{self.config.port}")
            
            # Start WebSocket server
            self._server = await websockets.serve(
                self.client_manager.handle_connection,
                self.config.host,
                self.config.port,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=10,
            )
            
            self._running = True
            self._start_time = asyncio.get_event_loop().time()
            
            log_server_event(
                event="start",
                host=self.config.host,
                port=self.config.port,
                config=self.config.to_dict(),
            )
            
            logger.info(f"EvalServer started successfully on ws://{self.config.host}:{self.config.port}")
            
        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            log_server_event(event="start_failed", error=str(e))
            raise
    
    async def stop(self) -> None:
        """
        Stop the WebSocket server.
        
        Raises:
            RuntimeError: If server is not running
        """
        if not self._running:
            raise RuntimeError("Server is not running")
        
        try:
            logger.info("Stopping EvalServer...")
            
            if self._server:
                self._server.close()
                await self._server.wait_closed()
            
            self._running = False
            self._start_time = None
            
            log_server_event(event="stop")
            logger.info("EvalServer stopped successfully")
            
        except Exception as e:
            logger.error(f"Error stopping server: {e}")
            log_server_event(event="stop_failed", error=str(e))
            raise
    
    async def wait_closed(self) -> None:
        """
        Wait for the server to be closed.
        
        This method blocks until the server is stopped, useful for keeping
        the server running in the main program.
        """
        if not self._running or not self._server:
            return
            
        try:
            await self._server.wait_closed()
        except Exception as e:
            logger.error(f"Error waiting for server closure: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get server status information.
        
        Returns:
            Dictionary with server status details
        """
        uptime = None
        if self._running and self._start_time:
            uptime = asyncio.get_event_loop().time() - self._start_time
        
        return {
            'running': self._running,
            'host': self.config.host,
            'port': self.config.port,
            'uptime': uptime,
            'config': self.config.to_dict(),
            'clients': self.client_manager.get_status(),
        }
    
    def get_clients(self) -> List[ClientProxy]:
        """
        Get list of connected clients.
        
        Returns:
            List of ClientProxy objects
        """
        return self.client_manager.get_clients()
    
    def get_client(self, client_id: str) -> Optional[ClientProxy]:
        """
        Get a specific client by ID.
        
        Args:
            client_id: Client identifier
            
        Returns:
            ClientProxy object or None if not found
        """
        return self.client_manager.get_client(client_id)
    
    async def evaluate_with_concurrency_limit(
        self,
        client: ClientProxy,
        evaluation: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute an evaluation with concurrency limiting.
        
        Args:
            client: Client to execute evaluation on
            evaluation: Evaluation object
            timeout: Optional timeout override
            
        Returns:
            Evaluation result
        """
        async with self._evaluation_semaphore:
            return await client.evaluate(evaluation, timeout)
    
    def is_running(self) -> bool:
        """Check if the server is currently running."""
        return self._running
    
    def __repr__(self) -> str:
        """String representation of the server."""
        status = "running" if self._running else "stopped"
        return f"EvalServer(status={status}, host={self.config.host}, port={self.config.port})"
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._running:
            await self.stop()