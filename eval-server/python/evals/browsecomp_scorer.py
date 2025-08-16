#!/usr/bin/env python3
"""
Browsecomp Benchmark Scorer
Implements the scoring logic for Browsecomp benchmark questions
"""

import re
from typing import Union, Any, Optional, Dict


# Grader template based on the original Browsecomp evaluation
GRADER_TEMPLATE = """
Judge whether the following [response] to [question] is correct or not based on the precise and unambiguous [correct_answer] below.

[question]: {question}

[response]: {response}

Your judgement must be in the format and criteria specified below:

extracted_final_answer: The final exact answer extracted from the [response]. Put the answer as 'None' if there is no exact, final answer to extract.

[correct_answer]: {correct_answer}

reasoning: Explain why the extracted_final_answer is correct or incorrect based on [correct_answer], focusing only on if there are meaningful differences between [correct_answer] and the extracted_final_answer.

correct: Answer 'yes' if extracted_final_answer matches the [correct_answer] given above, or is within a small margin of error for numerical problems. Answer 'no' otherwise.

confidence: The extracted confidence score between 0% and 100% from [response]. Put 100 if no confidence score available.
""".strip()


def extract_answer(response: str) -> str:
    """Extract the exact answer from a response."""
    # Look for "Exact Answer:" pattern
    patterns = [
        r'[Ee]xact [Aa]nswer:\s*([^\n]+)',
        r'[Ff]inal [Aa]nswer:\s*([^\n]+)',
        r'[Aa]nswer:\s*([^\n]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, response)
        if match:
            return match.group(1).strip()
    
    # If no pattern found, try to extract from the end of response
    lines = response.strip().split('\n')
    if lines:
        # Check last few lines for answer-like content
        for line in reversed(lines[-3:]):
            line = line.strip()
            if line and not line.startswith('[') and not line.startswith('Confidence'):
                return line
    
    return ""


def extract_confidence(response: str) -> float:
    """Extract confidence score from response."""
    patterns = [
        r'[Cc]onfidence\s*[Ss]core:\s*(\d+)%',
        r'[Cc]onfidence:\s*(\d+)%',
        r'(\d+)%\s*confident',
        r'I am (\d+)% confident',
        r'(\d+)%\s*confidence',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, response)
        if match:
            return float(match.group(1))
    
    return 100.0  # Default to 100% if not specified


def normalize_answer(answer: str) -> str:
    """Normalize answer for comparison."""
    if not isinstance(answer, str):
        answer = str(answer)
    
    # Convert to lowercase
    answer = answer.lower().strip()
    
    # Remove common punctuation at the end
    answer = answer.rstrip('.,!?;:')
    
    # Normalize whitespace
    answer = ' '.join(answer.split())
    
    return answer


def extract_number(text: str) -> Union[float, None]:
    """Extract a number from text."""
    # Remove common separators and convert to standard format
    text = text.replace(',', '')
    
    # Try to find numbers with various patterns
    patterns = [
        r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?',  # Scientific notation
        r'[-+]?\d+\.?\d*',  # Regular numbers
        r'[-+]?\d+',  # Integers
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        if matches:
            try:
                # Return the first valid number
                return float(matches[0])
            except ValueError:
                continue
    
    return None


def compare_numeric_answers(pred: str, true: str, tolerance: float = 0.01) -> bool:
    """Compare numeric answers with tolerance."""
    pred_num = extract_number(pred)
    true_num = extract_number(true)
    
    if pred_num is None or true_num is None:
        return False
    
    # Check relative tolerance for non-zero values
    if true_num != 0:
        relative_error = abs(pred_num - true_num) / abs(true_num)
        return relative_error <= tolerance
    else:
        # For zero values, use absolute tolerance
        return abs(pred_num - true_num) <= tolerance


def question_scorer(prediction: str, true_answer: str) -> bool:
    """
    Score a prediction against the true answer.
    Returns True if the prediction is considered correct.
    
    This is a simplified scorer for quick evaluation.
    For production use, consider using grade_with_llm for more accurate grading.
    """
    if not prediction or not true_answer:
        return False
    
    # Extract the answer part from the prediction
    extracted_answer = extract_answer(prediction)
    if not extracted_answer:
        extracted_answer = prediction
    
    # Normalize both answers
    pred_norm = normalize_answer(extracted_answer)
    true_norm = normalize_answer(true_answer)
    
    # Exact match after normalization
    if pred_norm == true_norm:
        return True
    
    # Check if the true answer is contained in the prediction
    if true_norm in pred_norm:
        return True
    
    # Check numeric answers
    if any(char.isdigit() for char in true_answer):
        if compare_numeric_answers(extracted_answer, true_answer):
            return True
    
    # Check for common variations
    # Handle yes/no answers
    if true_norm in ['yes', 'no']:
        if true_norm == 'yes' and pred_norm in ['yes', 'true', 'correct', 'affirmative']:
            return True
        if true_norm == 'no' and pred_norm in ['no', 'false', 'incorrect', 'negative']:
            return True
    
    return False


def grade_with_llm(question: str, correct_answer: str, response: str,
                   grader_function: Optional[callable] = None) -> Dict[str, Any]:
    """
    Grade a response using an LLM grader.
    
    Args:
        question: The original question
        correct_answer: The correct answer
        response: The model's response
        grader_function: Optional function to call the grader LLM
        
    Returns:
        Dictionary with grading results
    """
    if not grader_function:
        # If no grader function provided, use simple scoring
        is_correct = question_scorer(response, correct_answer)
        confidence = extract_confidence(response)
        
        return {
            'is_correct': is_correct,
            'confidence': confidence,
            'reasoning': 'Graded using rule-based scorer',
            'extracted_answer': extract_answer(response)
        }
    
    # Format the grading prompt
    grader_prompt = GRADER_TEMPLATE.format(
        question=question,
        correct_answer=correct_answer,
        response=response,
    )
    
    # Call the grader
    grading_response = grader_function(grader_prompt)
    
    # Parse the grading response
    is_correct = False
    confidence = 100.0
    reasoning = ""
    extracted_answer = ""
    
    # Look for patterns in grading response
    correct_match = re.search(r"correct:\s*(yes|no)", grading_response.lower())
    if correct_match:
        is_correct = correct_match.group(1) == "yes"
    
    confidence_match = re.search(r"confidence:\s*(\d+)", grading_response)
    if confidence_match:
        confidence = float(confidence_match.group(1))
    
    reasoning_match = re.search(r"reasoning:\s*([^\n]+)", grading_response, re.IGNORECASE)
    if reasoning_match:
        reasoning = reasoning_match.group(1).strip()
    
    answer_match = re.search(r"extracted_final_answer:\s*([^\n]+)", grading_response, re.IGNORECASE)
    if answer_match:
        extracted_answer = answer_match.group(1).strip()
    
    return {
        'is_correct': is_correct,
        'confidence': confidence,
        'reasoning': reasoning,
        'extracted_answer': extracted_answer,
        'grader_response': grading_response
    }


def evaluate_predictions(predictions: list, true_answers: list) -> dict:
    """
    Evaluate a list of predictions against true answers.
    Returns statistics about the evaluation.
    """
    if len(predictions) != len(true_answers):
        raise ValueError("Predictions and true answers must have the same length")
    
    results = {
        'total': len(predictions),
        'correct': 0,
        'incorrect': 0,
        'details': [],
        'average_confidence': 0.0
    }
    
    total_confidence = 0.0
    
    for pred, true in zip(predictions, true_answers):
        is_correct = question_scorer(pred, true)
        confidence = extract_confidence(pred)
        
        results['details'].append({
            'prediction': pred,
            'true_answer': true,
            'correct': is_correct,
            'confidence': confidence,
            'extracted_answer': extract_answer(pred)
        })
        
        if is_correct:
            results['correct'] += 1
        else:
            results['incorrect'] += 1
        
        total_confidence += confidence
    
    results['accuracy'] = results['correct'] / results['total'] if results['total'] > 0 else 0
    results['average_confidence'] = total_confidence / results['total'] if results['total'] > 0 else 0
    
    return results


# Example usage and tests
if __name__ == "__main__":
    # Test cases
    test_cases = [
        (
            "Explanation: I found that...\nExact Answer: Paris\nConfidence Score: 95%",
            "Paris",
            True
        ),
        (
            "The answer is 42",
            "42",
            True
        ),
        (
            "Exact Answer: Yes\nConfidence: 80%",
            "yes",
            True
        ),
        (
            "After browsing, I found the answer is 3.14159",
            "3.14",
            True
        ),
        (
            "The result is 99",
            "100",
            False
        ),
    ]
    
    print("Testing Browsecomp scorer:")
    for pred, true, expected in test_cases:
        result = question_scorer(pred, true)
        extracted = extract_answer(pred)
        confidence = extract_confidence(pred)
        status = "✓" if result == expected else "✗"
        print(f"{status} Pred: '{pred[:50]}...' | True: '{true}' | Correct: {result}")
        print(f"   Extracted: '{extracted}' | Confidence: {confidence}%")