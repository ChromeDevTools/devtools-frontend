"""
Enhanced logging setup for bo-eval-server using loguru.

Provides structured logging with JSON formatting and multiple log levels.
"""

import sys
from pathlib import Path
from typing import Optional, Dict, Any

from loguru import logger


def setup_logger(
    log_level: str = "INFO",
    log_dir: Optional[str] = None,
    enable_json: bool = True,
) -> None:
    """
    Setup enhanced logging with loguru.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files (default: ./logs)
        enable_json: Whether to use JSON formatting for structured logs
    """
    # Remove default handler
    logger.remove()
    
    # Console handler with colored output
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
               "<level>{message}</level>",
        colorize=True,
    )
    
    # File handlers if log_dir is specified
    if log_dir:
        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)
        
        # Combined log file
        logger.add(
            log_path / "combined.log",
            level="DEBUG",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="7 days",
        )
        
        # Error log file
        logger.add(
            log_path / "error.log", 
            level="ERROR",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="30 days",
        )
        
        # Structured JSON log for evaluations
        if enable_json:
            logger.add(
                log_path / "evaluations.jsonl",
                level="INFO",
                format="{message}",
                filter=lambda record: record["extra"].get("event_type") == "evaluation",
                rotation="10 MB",
                retention="30 days",
            )


def log_connection(event: str, client_id: str, **kwargs) -> None:
    """
    Log connection events with structured data.
    
    Args:
        event: Connection event type (connect, disconnect, ready)
        client_id: Client identifier
        **kwargs: Additional event data
    """
    logger.bind(event_type="connection").info(
        f"Connection {event}: {client_id}",
        extra={
            "event_type": "connection",
            "connection_event": event,
            "client_id": client_id,
            **kwargs,
        }
    )


def log_evaluation(
    evaluation_id: str,
    client_id: str,
    status: str,
    duration: Optional[float] = None,
    **kwargs
) -> None:
    """
    Log evaluation events with structured data.
    
    Args:
        evaluation_id: Unique evaluation identifier
        client_id: Client that handled the evaluation
        status: Evaluation status (started, completed, failed, timeout)
        duration: Evaluation duration in seconds
        **kwargs: Additional evaluation data
    """
    message = f"Evaluation {status}: {evaluation_id} (client: {client_id})"
    if duration is not None:
        message += f" ({duration:.2f}s)"
    
    log_data = {
        "event_type": "evaluation",
        "evaluation_id": evaluation_id,
        "client_id": client_id,
        "status": status,
        "duration": duration,
        **kwargs,
    }
    
    logger.bind(event_type="evaluation").info(message, extra=log_data)


def log_rpc_call(
    method: str,
    client_id: str,
    call_id: str,
    status: str,
    duration: Optional[float] = None,
    **kwargs
) -> None:
    """
    Log RPC call events with structured data.
    
    Args:
        method: RPC method name
        client_id: Target client identifier
        call_id: RPC call identifier
        status: Call status (sent, completed, failed, timeout)
        duration: Call duration in seconds
        **kwargs: Additional call data
    """
    message = f"RPC {status}: {method} -> {client_id} (id: {call_id})"
    if duration is not None:
        message += f" ({duration:.2f}s)"
    
    log_data = {
        "event_type": "rpc",
        "method": method,
        "client_id": client_id,
        "call_id": call_id,
        "status": status,
        "duration": duration,
        **kwargs,
    }
    
    logger.bind(event_type="rpc").info(message, extra=log_data)


def log_server_event(event: str, **kwargs) -> None:
    """
    Log server lifecycle events.
    
    Args:
        event: Server event type (start, stop, error)
        **kwargs: Additional event data
    """
    logger.bind(event_type="server").info(
        f"Server {event}",
        extra={
            "event_type": "server",
            "server_event": event,
            **kwargs,
        }
    )