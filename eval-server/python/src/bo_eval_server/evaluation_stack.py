"""
EvaluationStack - A simple stack-like structure for managing evaluations.

Provides LIFO (Last In, First Out) access to evaluation objects.
Useful for distributing different evaluations across multiple client connections.
"""

from typing import Dict, Any, List, Optional


class EvaluationStack:
    """A LIFO stack for managing evaluation objects."""
    
    def __init__(self) -> None:
        """Initialize an empty evaluation stack."""
        self._evaluations: List[Dict[str, Any]] = []
    
    def push(self, evaluation: Dict[str, Any]) -> None:
        """
        Add an evaluation to the top of the stack.
        
        Args:
            evaluation: The evaluation object to add
            
        Raises:
            ValueError: If evaluation is invalid or missing required fields
        """
        if not evaluation or not isinstance(evaluation, dict):
            raise ValueError('Evaluation must be a valid dictionary')
        
        # Validate required fields
        required_fields = ['id', 'name', 'tool', 'input']
        for field in required_fields:
            if field not in evaluation or not evaluation[field]:
                raise ValueError(f'Evaluation missing required field: {field}')
        
        self._evaluations.append(evaluation)
    
    def pop(self) -> Optional[Dict[str, Any]]:
        """
        Remove and return the evaluation from the top of the stack.
        
        Returns:
            The evaluation object, or None if stack is empty
        """
        if self._evaluations:
            return self._evaluations.pop()
        return None
    
    def is_empty(self) -> bool:
        """
        Check if the stack is empty.
        
        Returns:
            True if stack has no evaluations
        """
        return len(self._evaluations) == 0
    
    def size(self) -> int:
        """
        Get the number of evaluations in the stack.
        
        Returns:
            The stack size
        """
        return len(self._evaluations)
    
    def peek(self) -> Optional[Dict[str, Any]]:
        """
        Peek at the top evaluation without removing it.
        
        Returns:
            The top evaluation object, or None if stack is empty
        """
        if self.is_empty():
            return None
        return self._evaluations[-1]
    
    def clear(self) -> None:
        """Clear all evaluations from the stack."""
        self._evaluations.clear()
    
    def to_array(self) -> List[Dict[str, Any]]:
        """
        Get a copy of all evaluations in the stack (top to bottom).
        
        Returns:
            List of evaluation objects from top to bottom
        """
        return list(reversed(self._evaluations))
    
    def __len__(self) -> int:
        """Return the number of evaluations in the stack."""
        return len(self._evaluations)
    
    def __bool__(self) -> bool:
        """Return True if stack has evaluations."""
        return not self.is_empty()
    
    def __repr__(self) -> str:
        """String representation of the stack."""
        return f"EvaluationStack(size={self.size()})"