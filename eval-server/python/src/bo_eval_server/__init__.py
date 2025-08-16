"""
bo-eval-server: A minimal Python library for WebSocket-based LLM agent evaluation servers.

This package provides core functionality for:
- WebSocket server for agent connections
- JSON-RPC 2.0 bidirectional communication  
- Evaluation stack for managing evaluation queues
- Enhanced logging and client management
"""

from .eval_server import EvalServer
from .evaluation_stack import EvaluationStack
from .client_manager import ClientManager, ClientProxy
from .rpc_client import RpcClient
from .config import Config
from .logger import setup_logger

__version__ = "1.0.0"
__author__ = "Browser Operator Team"

__all__ = [
    "EvalServer",
    "EvaluationStack", 
    "ClientManager",
    "ClientProxy",
    "RpcClient",
    "Config",
    "setup_logger",
]