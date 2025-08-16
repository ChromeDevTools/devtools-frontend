"""
Configuration management for bo-eval-server.

Handles server configuration with environment variable support.
"""

import os
from typing import Optional


class Config:
    """Configuration class for EvalServer with environment variable support."""
    
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        auth_key: Optional[str] = None,
        log_level: Optional[str] = None,
        rpc_timeout: Optional[float] = None,
        max_concurrent_evaluations: Optional[int] = None,
    ):
        """
        Initialize configuration with optional overrides.
        
        Args:
            host: Server host (default: localhost)
            port: Server port (default: 8080)
            auth_key: Authentication key for clients
            log_level: Logging level (default: INFO)
            rpc_timeout: RPC call timeout in seconds (default: 1500.0)
            max_concurrent_evaluations: Max concurrent evaluations (default: 10)
        """
        self.host = host or os.getenv('BO_EVAL_SERVER_HOST', 'localhost')
        self.port = int(port or os.getenv('BO_EVAL_SERVER_PORT', '8080'))
        self.auth_key = auth_key or os.getenv('BO_EVAL_SERVER_AUTH_KEY')
        self.log_level = log_level or os.getenv('BO_EVAL_SERVER_LOG_LEVEL', 'INFO')
        self.rpc_timeout = float(
            rpc_timeout or os.getenv('BO_EVAL_SERVER_RPC_TIMEOUT', '1500.0')
        )
        self.max_concurrent_evaluations = int(
            max_concurrent_evaluations or 
            os.getenv('BO_EVAL_SERVER_MAX_CONCURRENT', '10')
        )
    
    def validate(self) -> None:
        """Validate configuration parameters."""
        if not self.auth_key:
            raise ValueError("auth_key is required for server authentication")
        
        if not isinstance(self.port, int) or self.port <= 0 or self.port > 65535:
            raise ValueError(f"Invalid port: {self.port}")
        
        if self.rpc_timeout <= 0:
            raise ValueError(f"Invalid RPC timeout: {self.rpc_timeout}")
        
        if self.max_concurrent_evaluations <= 0:
            raise ValueError(
                f"Invalid max_concurrent_evaluations: {self.max_concurrent_evaluations}"
            )
    
    def to_dict(self) -> dict:
        """Convert configuration to dictionary."""
        return {
            'host': self.host,
            'port': self.port,
            'auth_key': '***' if self.auth_key else None,  # Hide sensitive data
            'log_level': self.log_level,
            'rpc_timeout': self.rpc_timeout,
            'max_concurrent_evaluations': self.max_concurrent_evaluations,
        }
    
    def __repr__(self) -> str:
        """String representation of configuration."""
        return f"Config({self.to_dict()})"