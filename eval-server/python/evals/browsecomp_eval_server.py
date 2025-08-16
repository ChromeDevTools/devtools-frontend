#!/usr/bin/env python3
"""
Browsecomp Evaluation Server

Command-line controlled eval processing server that loads browsecomp questions
into a stack and distributes them one per client connection.
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add eval-server src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Add current directory (evals) to path for browsecomp_dataset import
sys.path.insert(0, str(Path(__file__).parent))

from bo_eval_server import EvalServer, EvaluationStack
from browsecomp_dataset import BrowsecompDataset
from browsecomp_scorer import question_scorer, extract_answer, extract_confidence


def log_evaluation_event(logger: logging.Logger, event_type: str, data: Dict[str, Any]) -> None:
    """
    Log a structured evaluation event.
    
    Args:
        logger: Logger instance
        event_type: Type of event (client_connect, evaluation_start, evaluation_complete, etc.)
        data: Event data to log
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        **data
    }
    logger.info(f"EVENT: {json.dumps(log_entry)}")


def setup_logging(log_dir: str = "./logs") -> logging.Logger:
    """
    Set up logging to both console and file.
    
    Args:
        log_dir: Directory to save log files
        
    Returns:
        Configured logger
    """
    # Ensure logs directory exists
    Path(log_dir).mkdir(exist_ok=True)
    
    # Create timestamp for log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = Path(log_dir) / f"browsecomp_eval_server_{timestamp}.log"
    
    # Create logger
    logger = logging.getLogger('browsecomp_eval_server')
    logger.setLevel(logging.INFO)
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler (for immediate feedback)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (for persistent logging)
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    logger.info(f"Logging initialized - saving to {log_file}")
    return logger


def extract_response_text(result: Any) -> str:
    """
    Extract the actual response text from BrowserOperator's structured response format.
    
    Args:
        result: The response from BrowserOperator (could be string, dict, or structured format)
        
    Returns:
        The text content that should be scored
    """
    # Handle partial results with errors first
    if isinstance(result, dict) and result.get('partial') and result.get('error'):
        # This is our error structure, fallback to string representation
        return str(result)
    
    # Handle structured BrowserOperator response
    if isinstance(result, dict):
        # Look for messages array (main response structure)
        if 'messages' in result and isinstance(result['messages'], list):
            response_parts = []
            
            for message in result['messages']:
                if isinstance(message, dict):
                    # Model responses with answers
                    if message.get('entity') == 'model' and message.get('answer'):
                        response_parts.append(message['answer'])
                    # Tool results
                    elif message.get('entity') == 'tool_result' and message.get('resultText'):
                        response_parts.append(message['resultText'])
                    # User messages
                    elif message.get('entity') == 'user' and message.get('text'):
                        response_parts.append(message['text'])
            
            if response_parts:
                return '\n'.join(response_parts)
        
        # Fallback: look for common response fields
        for field in ['answer', 'response', 'result', 'text', 'content']:
            if field in result and result[field]:
                return str(result[field])
    
    # Fallback to string representation
    return str(result)


def convert_question_to_evaluation(question_row: Dict[str, Any], question_id: int) -> Dict[str, Any]:
    """
    Convert a browsecomp question to the evaluation format expected by eval-server.
    
    Args:
        question_row: Row from the browsecomp dataset DataFrame
        question_id: Question ID number (1-based)
        
    Returns:
        Evaluation object compatible with eval-server
    """
    question_text = question_row.get('question', question_row.get('problem_decrypted', ''))
    true_answer = question_row.get('true_answer', question_row.get('answer_decrypted', ''))
    
    return {
        "id": f"browsecomp_q{question_id}",
        "name": f"Browsecomp Question {question_id}",
        "description": f"Web browsing evaluation question from browsecomp dataset",
        "tool": "chat",
        "input": {
            "message": f"{question_text}\n\nPlease provide your response in the following format:\n\nExplanation: [Step-by-step reasoning and information gathering]\n\nExact Answer: [The precise answer to the question]\n\nConfidence Score: [Confidence as a percentage, e.g., 85%]"
        },
        # Store original data for later reference/scoring
        "metadata": {
            "question_id": question_id,
            "true_answer": true_answer,
            "original_question": question_text,
            "dataset": "browsecomp"
        }
    }


def load_browsecomp_evaluations(
    limit: Optional[int] = None,
    questions: Optional[List[int]] = None,
    start: Optional[int] = None,
    end: Optional[int] = None,
    password: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Load browsecomp questions and convert them to evaluation format.
    
    Args:
        limit: Maximum number of questions to load
        questions: Specific question numbers to load (1-based)
        start: Start question number for range selection (1-based, inclusive)
        end: End question number for range selection (1-based, inclusive)
        password: Decryption password (optional, auto-detected from dataset)
        
    Returns:
        List of evaluation objects
    """
    print("📚 Loading Browsecomp dataset...")
    
    # Load dataset
    dataset = BrowsecompDataset(password=password)
    
    try:
        df = dataset.load_dataset()
        print(f"✅ Loaded {len(df)} questions from dataset")
    except Exception as e:
        print(f"❌ Failed to load dataset: {e}")
        return []
    
    # Get specific questions, range, or apply limit
    if questions:
        print(f"📋 Filtering to specific questions: {questions}")
        df_filtered = dataset.get_questions(indices=questions)
    elif start is not None or end is not None:
        # Handle range selection
        if start is not None and end is not None:
            if start > end:
                print(f"❌ Invalid range: start ({start}) cannot be greater than end ({end})")
                return []
            if start < 1:
                print(f"❌ Invalid start: question numbers are 1-based, got {start}")
                return []
            if end > len(df):
                print(f"⚠️  End question {end} exceeds dataset size ({len(df)}), using {len(df)} instead")
                end = len(df)
            
            print(f"📋 Loading questions {start} to {end} (range of {end - start + 1} questions)")
            # Convert to 0-based indexing for pandas
            range_questions = list(range(start, end + 1))
            df_filtered = dataset.get_questions(indices=range_questions)
        elif start is not None:
            # Only start specified, go to end of dataset
            if start < 1:
                print(f"❌ Invalid start: question numbers are 1-based, got {start}")
                return []
            if start > len(df):
                print(f"❌ Start question {start} exceeds dataset size ({len(df)})")
                return []
            
            print(f"📋 Loading questions from {start} to end ({len(df) - start + 1} questions)")
            range_questions = list(range(start, len(df) + 1))
            df_filtered = dataset.get_questions(indices=range_questions)
        else:
            # Only end specified, start from beginning
            if end < 1:
                print(f"❌ Invalid end: question numbers are 1-based, got {end}")
                return []
            if end > len(df):
                print(f"⚠️  End question {end} exceeds dataset size ({len(df)}), using {len(df)} instead")
                end = len(df)
            
            print(f"📋 Loading questions 1 to {end} ({end} questions)")
            range_questions = list(range(1, end + 1))
            df_filtered = dataset.get_questions(indices=range_questions)
    elif limit:
        print(f"📋 Limiting to first {limit} questions")
        df_filtered = dataset.get_questions(limit=limit)
    else:
        print(f"📋 Loading all {len(df)} questions")
        df_filtered = df
    
    if df_filtered.empty:
        print("❌ No questions found with the specified criteria")
        return []
    
    print(f"🔄 Converting {len(df_filtered)} questions to evaluation format...")
    
    # Convert to evaluation format
    evaluations = []
    for idx, row in df_filtered.iterrows():
        question_id = row.get('question_id', idx + 1)
        evaluation = convert_question_to_evaluation(row.to_dict(), question_id)
        evaluations.append(evaluation)
        
        # Show preview of first few questions
        if len(evaluations) <= 3:
            question_preview = evaluation['input']['message'][:80] + "..."
            print(f"   • Q{question_id}: {question_preview}")
    
    if len(evaluations) > 3:
        print(f"   ... and {len(evaluations) - 3} more questions")
    
    print(f"✅ Created {len(evaluations)} evaluation objects")
    return evaluations


def main():
    """Main function for the browsecomp evaluation server."""
    return asyncio.run(async_main())

async def async_main():
    """Async main function for the browsecomp evaluation server."""
    parser = argparse.ArgumentParser(description="Browsecomp Evaluation Server")
    parser.add_argument(
        "--limit", 
        type=int, 
        help="Maximum number of questions to load (default: all 1,266 questions)"
    )
    parser.add_argument(
        "--questions", 
        type=int, 
        nargs="+", 
        help="Specific question numbers to load (1-based, e.g. --questions 1 5 10)"
    )
    parser.add_argument(
        "--start", 
        type=int, 
        help="Start question number for range selection (1-based, inclusive)"
    )
    parser.add_argument(
        "--end", 
        type=int, 
        help="End question number for range selection (1-based, inclusive)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8080, 
        help="Server port (default: 8080)"
    )
    parser.add_argument(
        "--host", 
        type=str, 
        default="127.0.0.1", 
        help="Server host (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--auth-key", 
        type=str, 
        default="browsecomp-eval", 
        help="Authentication key (default: browsecomp-eval)"
    )
    parser.add_argument(
        "--password", 
        type=str, 
        help="Dataset decryption password (optional, auto-detected from dataset)"
    )
    parser.add_argument(
        "--list", 
        action="store_true", 
        help="List available questions without starting server"
    )
    parser.add_argument(
        "--list-limit", 
        type=int, 
        default=20, 
        help="Number of questions to show when listing (default: 20)"
    )
    parser.add_argument(
        "--save-results", 
        action="store_true", 
        help="Save evaluation results to JSON file on completion"
    )
    parser.add_argument(
        "--timeout", 
        type=float, 
        default=3600.0, 
        help="Timeout for each evaluation in seconds (default: 3600s/60min)"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging("./logs")
    
    # Handle list mode
    if args.list:
        logger.info("📋 Listing available browsecomp questions...")
        dataset = BrowsecompDataset(password=args.password)
        
        # Apply filtering for list mode if range or specific questions are specified
        if args.questions or args.start is not None or args.end is not None:
            # Load the full dataset first
            df = dataset.load_dataset()
            
            # Apply the same filtering logic as the main function
            if args.questions:
                print(f"📋 Showing specific questions: {args.questions}")
                df_filtered = dataset.get_questions(indices=args.questions)
            elif args.start is not None or args.end is not None:
                # Handle range selection (same logic as in load_browsecomp_evaluations)
                if args.start is not None and args.end is not None:
                    if args.start > args.end:
                        print(f"❌ Invalid range: start ({args.start}) cannot be greater than end ({args.end})")
                        return 1
                    if args.start < 1:
                        print(f"❌ Invalid start: question numbers are 1-based, got {args.start}")
                        return 1
                    if args.end > len(df):
                        print(f"⚠️  End question {args.end} exceeds dataset size ({len(df)}), using {len(df)} instead")
                        args.end = len(df)
                    
                    print(f"📋 Showing questions {args.start} to {args.end}")
                    range_questions = list(range(args.start, args.end + 1))
                    df_filtered = dataset.get_questions(indices=range_questions)
                elif args.start is not None:
                    if args.start < 1:
                        print(f"❌ Invalid start: question numbers are 1-based, got {args.start}")
                        return 1
                    if args.start > len(df):
                        print(f"❌ Start question {args.start} exceeds dataset size ({len(df)})")
                        return 1
                    
                    print(f"📋 Showing questions from {args.start} to end")
                    range_questions = list(range(args.start, len(df) + 1))
                    df_filtered = dataset.get_questions(indices=range_questions)
                else:  # args.end is not None
                    if args.end < 1:
                        print(f"❌ Invalid end: question numbers are 1-based, got {args.end}")
                        return 1
                    if args.end > len(df):
                        print(f"⚠️  End question {args.end} exceeds dataset size ({len(df)}), using {len(df)} instead")
                        args.end = len(df)
                    
                    print(f"📋 Showing questions 1 to {args.end}")
                    range_questions = list(range(1, args.end + 1))
                    df_filtered = dataset.get_questions(indices=range_questions)
            
            # Display filtered results
            if not df_filtered.empty:
                print("=" * 80)
                for idx, row in df_filtered.iterrows():
                    question_id = row.get('question_id', idx + 1)
                    question = row.get('question', row.get('problem_decrypted', '[Encrypted]'))
                    
                    if isinstance(question, str):
                        question_preview = question[:60] + "..." if len(question) > 60 else question
                    else:
                        question_preview = str(question)[:60] + "..."
                    
                    print(f"#{question_id:3d} {question_preview}")
                
                print(f"\nShowing {len(df_filtered)} question(s)")
            else:
                print("❌ No questions found with the specified criteria")
        else:
            # Standard list mode
            dataset.list_questions(limit=args.list_limit)
        
        return
    
    logger.info("🚀 Starting Browsecomp Evaluation Server")
    logger.info("=" * 60)
    
    # Validate arguments
    if args.questions and (args.start is not None or args.end is not None):
        print("❌ Cannot use --questions together with --start/--end. Choose one approach.")
        return 1
    
    if args.limit and (args.start is not None or args.end is not None):
        print("❌ Cannot use --limit together with --start/--end. Choose one approach.")
        return 1
    
    # Load evaluations
    evaluations = load_browsecomp_evaluations(
        limit=args.limit,
        questions=args.questions,
        start=args.start,
        end=args.end,
        password=args.password
    )
    
    if not evaluations:
        print("❌ No evaluations loaded. Exiting.")
        return 1
    
    # Create evaluation stack and populate it
    stack = EvaluationStack()
    
    print(f"\n📚 Loading {len(evaluations)} evaluations into stack...")
    for evaluation in evaluations:
        stack.push(evaluation)
    
    print(f"✅ Stack loaded with {stack.size()} evaluations")
    print(f"🔝 Top evaluation: {stack.peek()['name'] if stack.peek() else 'None'}")
    
    # Create server
    server = EvalServer(
        auth_key=args.auth_key,
        host=args.host,
        port=args.port,
        log_level='INFO',
        log_dir='./logs',
        rpc_timeout=args.timeout,
    )
    
    # Track processed evaluations
    completed_evaluations = []
    failed_evaluations = []
    client_evaluation_map = {}  # client_id -> evaluation_id mapping
    
    print(f"\n🌐 Server Configuration:")
    print(f"   Host: {args.host}")
    print(f"   Port: {args.port}")
    print(f"   Auth Key: {args.auth_key}")
    print(f"   Timeout: {args.timeout}s ({args.timeout/60:.1f} minutes)")
    print(f"   Total Evaluations: {stack.size()}")
    
    @server.on_connect
    async def handle_client(client):
        logger.info(f'🎉 CLIENT CONNECTED!')
        logger.info(f'   - Client ID: {client.id}')
        logger.info(f'   - Client tabId: {client.tab_id}')
        logger.info(f'   - Client info: {client.get_info()}')
        
        # Log structured client connection event
        log_evaluation_event(logger, "client_connected", {
            "client_id": client.id,
            "tab_id": client.tab_id,
            "client_info": client.get_info(),
            "stack_remaining": stack.size()
        })
        
        # Check if we have evaluations left in the stack
        if stack.is_empty():
            print('⚠️  No more evaluations in stack for this client')
            print('   All browsecomp questions have been distributed')
            await client.send_message({
                "type": "no_evaluations",
                "message": "All browsecomp questions have been distributed"
            })
            return
        
        # Pop the next evaluation from the stack (ONE evaluation per client!)
        evaluation = stack.pop()
        evaluation_id = evaluation['id']
        question_id = evaluation['metadata']['question_id']
        
        print(f'📋 Assigning evaluation: "{evaluation["name"]}" (Question #{question_id})')
        print(f'📊 Remaining evaluations in stack: {stack.size()}')
        
        # Track which evaluation was sent to which client
        client_evaluation_map[client.id] = evaluation_id
        
        # Log evaluation assignment
        log_evaluation_event(logger, "evaluation_assigned", {
            "client_id": client.id,
            "evaluation_id": evaluation_id,
            "question_id": question_id,
            "evaluation_name": evaluation["name"],
            "stack_remaining": stack.size(),
            "true_answer": evaluation['metadata']['true_answer']
        })
        
        try:
            print(f'🔄 Starting evaluation... (timeout: {args.timeout}s)')
            result = await client.evaluate(evaluation, timeout=args.timeout)
            
            print('✅ Evaluation completed!')
            
            # Extract the true answer from evaluation metadata
            true_answer = evaluation['metadata']['true_answer']
            
            # Check if this is a partial result with errors
            is_partial_result = (isinstance(result, dict) and 
                               result.get('partial') and 
                               result.get('error'))
            
            # Extract the actual response text from the structured format
            response_text = extract_response_text(result)
            
            # Show structured response details if available
            if isinstance(result, dict) and 'messages' in result:
                message_count = len(result.get('messages', []))
                model_used = result.get('modelUsed', 'unknown')
                execution_time = result.get('executionTime', 0)
                tool_calls = len(result.get('toolCalls', []))
                print(f'📊 Response structure: {message_count} messages, {tool_calls} tool calls, {model_used} model, {execution_time}ms')
            else:
                print(f'📊 Response for "{evaluation["name"]}": {response_text[:100]}...')
            
            # Score the response
            is_correct = question_scorer(response_text, true_answer)
            extracted_answer = extract_answer(response_text)
            confidence = extract_confidence(response_text)
            
            # Print scoring results
            print(f'🎯 Scoring Results:')
            print(f'   - True Answer: {true_answer}')
            print(f'   - Extracted Answer: {extracted_answer}')
            print(f'   - Correct: {"✅ YES" if is_correct else "❌ NO"}')
            print(f'   - Confidence: {confidence}%')
            
            if is_partial_result:
                print(f'⚠️  Note: Result obtained after retries with errors:')
                print(f'   - Error: {result.get("error", "Unknown error")}')
                print(f'   - Attempts: {result.get("attempts", "Unknown")}')
                print(f'   - The BrowserOperator had issues but provided a response')
            
            # Log evaluation completion
            log_evaluation_event(logger, "evaluation_completed", {
                "client_id": client.id,
                "evaluation_id": evaluation_id,
                "question_id": question_id,
                "evaluation_name": evaluation["name"],
                "is_correct": is_correct,
                "extracted_answer": extracted_answer,
                "true_answer": true_answer,
                "confidence": confidence,
                "is_partial_result": is_partial_result,
                "model_used": result.get('modelUsed') if isinstance(result, dict) else None,
                "execution_time_ms": result.get('executionTime') if isinstance(result, dict) else None,
                "tool_calls_count": len(result.get('toolCalls', [])) if isinstance(result, dict) else None
            })
            
            completed_evaluations.append({
                'client_id': client.id,
                'evaluation': evaluation,
                'result': result,
                'question_id': question_id,
                'scoring': {
                    'is_correct': is_correct,
                    'true_answer': true_answer,
                    'extracted_answer': extracted_answer,
                    'confidence': confidence
                },
                'partial_result': is_partial_result,
                'execution_info': {
                    'had_errors': is_partial_result,
                    'error_message': result.get('error') if is_partial_result else None,
                    'retry_attempts': result.get('attempts') if is_partial_result else 1,
                    'model_used': result.get('modelUsed') if isinstance(result, dict) else None,
                    'execution_time_ms': result.get('executionTime') if isinstance(result, dict) else None,
                    'tool_calls_count': len(result.get('toolCalls', [])) if isinstance(result, dict) else None,
                    'messages_count': len(result.get('messages', [])) if isinstance(result, dict) else None
                }
            })
            
        except Exception as e:
            error_msg = str(e)
            print(f'❌ Evaluation "{evaluation["name"]}" failed: {error_msg}')
            
            # Check if this is a tool execution error that might still be running
            if "Tool execution failed" in error_msg or "-32000" in error_msg:
                print(f'⚠️  Note: BrowserOperator may still be processing this question')
                print(f'   The client reported an error but might continue execution')
                print(f'   Consider increasing timeout with --timeout parameter')
            
            # Log evaluation failure
            log_evaluation_event(logger, "evaluation_failed", {
                "client_id": client.id,
                "evaluation_id": evaluation_id,
                "question_id": question_id,
                "evaluation_name": evaluation["name"],
                "error_message": error_msg,
                "is_tool_execution_error": "Tool execution failed" in error_msg or "-32000" in error_msg,
                "true_answer": evaluation['metadata']['true_answer']
            })
            
            failed_evaluations.append({
                'client_id': client.id,
                'evaluation': evaluation,
                'error': error_msg,
                'question_id': question_id,
            })
        
        # Send completion message
        try:
            await client.send_message({
                "type": "evaluation_complete",
                "evaluation_id": evaluation_id,
                "evaluation_name": evaluation["name"],
                "question_id": question_id,
                "status": "completed" if evaluation_id not in [e['evaluation']['id'] for e in failed_evaluations] else "failed"
            })
        except Exception as e:
            print(f'   ⚠️  Failed to send completion message: {e}')
    
    @server.on_disconnect
    async def handle_disconnect(client_info):
        client_id = client_info["id"]
        print(f'\n🔌 Client disconnected: {client_id}')
        
        # Show what evaluation this client was working on
        evaluation_id = None
        if client_id in client_evaluation_map:
            evaluation_id = client_evaluation_map[client_id]
            print(f'   Was working on: {evaluation_id}')
        
        # Log client disconnect
        log_evaluation_event(logger, "client_disconnected", {
            "client_id": client_id,
            "evaluation_id": evaluation_id,
            "completed_count": len(completed_evaluations),
            "failed_count": len(failed_evaluations),
            "stack_remaining": stack.size()
        })
        
        # Show final statistics
        total_completed = len(completed_evaluations)
        total_failed = len(failed_evaluations)
        remaining = stack.size()
        total_original = len(evaluations)
        
        print(f'\n📊 Current Statistics:')
        print(f'   ✅ Completed: {total_completed}/{total_original}')
        print(f'   ❌ Failed: {total_failed}/{total_original}')
        print(f'   📚 Remaining: {remaining}/{total_original}')
        print(f'   🔄 In Progress: {total_original - total_completed - total_failed - remaining}')
        
        # Calculate scoring statistics
        if completed_evaluations:
            correct_count = sum(1 for item in completed_evaluations if item.get('scoring', {}).get('is_correct', False))
            partial_count = sum(1 for item in completed_evaluations if item.get('partial_result', False))
            accuracy = correct_count / total_completed * 100 if total_completed > 0 else 0
            avg_confidence = sum(item.get('scoring', {}).get('confidence', 0) for item in completed_evaluations) / total_completed if total_completed > 0 else 0
            
            print(f'\n🎯 Scoring Statistics:')
            print(f'   📊 Accuracy: {accuracy:.1f}% ({correct_count}/{total_completed} correct)')
            print(f'   💡 Average Confidence: {avg_confidence:.1f}%')
            if partial_count > 0:
                print(f'   ⚠️  Partial Results: {partial_count}/{total_completed} had execution errors but recovered')
        
        if completed_evaluations:
            print(f'\n🎯 Recently Completed Evaluations:')
            for item in completed_evaluations[-3:]:  # Show last 3
                eval_name = item['evaluation']['name']
                question_id = item['question_id']
                client_id_short = item['client_id'][:8]  # Short client ID
                is_correct = item.get('scoring', {}).get('is_correct', False)
                confidence = item.get('scoring', {}).get('confidence', 0)
                is_partial = item.get('partial_result', False)
                status_emoji = '✅' if is_correct else '❌'
                partial_indicator = '⚠️' if is_partial else ''
                print(f'   • Q{question_id}: {eval_name} {status_emoji}{partial_indicator} (confidence: {confidence}%, client: {client_id_short})')
        
        if failed_evaluations:
            print(f'\n💥 Failed Evaluations:')
            for item in failed_evaluations:
                eval_name = item['evaluation']['name']
                question_id = item['question_id']
                error = item['error']
                print(f'   • Q{question_id}: {eval_name} - {error}')
    
    # Start server
    try:
        print(f'\n🚀 Starting server on ws://{server.config.host}:{server.config.port}')
        print('   Connect your BrowserOperator to start processing browsecomp questions')
        print('   Press Ctrl+C to stop the server')
        print('=' * 60)
        
        await server.start()
        
        # Keep server running
        await server.wait_closed()
        
    except KeyboardInterrupt:
        print('\n🛑 Received interrupt signal, stopping server...')
        await server.stop()
        print('✅ Server stopped successfully')
        
        # Show final summary
        total_completed = len(completed_evaluations)
        total_failed = len(failed_evaluations)
        total_processed = total_completed + total_failed
        
        if total_processed > 0:
            print(f'\n📈 Final Summary:')
            print(f'   Total processed: {total_processed}/{len(evaluations)}')
            print(f'   Success rate: {total_completed/total_processed*100:.1f}%')
            print(f'   Completed: {total_completed}')
            print(f'   Failed: {total_failed}')
            
            # Final scoring statistics
            if completed_evaluations:
                correct_count = sum(1 for item in completed_evaluations if item.get('scoring', {}).get('is_correct', False))
                accuracy = correct_count / total_completed * 100 if total_completed > 0 else 0
                avg_confidence = sum(item.get('scoring', {}).get('confidence', 0) for item in completed_evaluations) / total_completed if total_completed > 0 else 0
                
                print(f'\n🏆 Final Scoring Results:')
                print(f'   📊 Overall Accuracy: {accuracy:.1f}% ({correct_count}/{total_completed} correct)')
                print(f'   💡 Average Confidence: {avg_confidence:.1f}%')
                
                # Show confidence correlation
                correct_items = [item for item in completed_evaluations if item.get('scoring', {}).get('is_correct', False)]
                incorrect_items = [item for item in completed_evaluations if not item.get('scoring', {}).get('is_correct', False)]
                
                if correct_items:
                    avg_conf_correct = sum(item.get('scoring', {}).get('confidence', 0) for item in correct_items) / len(correct_items)
                    print(f'   ✅ Avg confidence when correct: {avg_conf_correct:.1f}%')
                
                if incorrect_items:
                    avg_conf_incorrect = sum(item.get('scoring', {}).get('confidence', 0) for item in incorrect_items) / len(incorrect_items)
                    print(f'   ❌ Avg confidence when incorrect: {avg_conf_incorrect:.1f}%')
                
                # Save results to JSON file
                if completed_evaluations and (args.save_results or total_completed == len(evaluations)):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    results_file = f"browsecomp_eval_results_{timestamp}.json"
                    
                    results_data = {
                        "timestamp": timestamp,
                        "total_questions": len(evaluations),
                        "completed": total_completed,
                        "failed": total_failed,
                        "accuracy": accuracy,
                        "average_confidence": avg_confidence,
                        "evaluations": completed_evaluations
                    }
                    
                    with open(results_file, 'w') as f:
                        json.dump(results_data, f, indent=2)
                    
                    print(f'\n💾 Results saved to: {results_file}')
                
                # Log final session summary
                log_evaluation_event(logger, "session_completed", {
                    "total_questions": len(evaluations),
                    "completed": total_completed,
                    "failed": total_failed,
                    "accuracy": accuracy,
                    "average_confidence": avg_confidence,
                    "partial_results": partial_count,
                    "results_file": results_file if 'results_file' in locals() else None
                })
        
    except Exception as e:
        logger.error(f'💥 Server error: {e}')
        log_evaluation_event(logger, "server_error", {
            "error_message": str(e),
            "completed_count": len(completed_evaluations),
            "failed_count": len(failed_evaluations)
        })
        
        if server.is_running():
            await server.stop()
        return 1
    
    logger.info("✅ Server session ended successfully")
    return 0


if __name__ == "__main__":
    # Ensure logs directory exists
    Path("./logs").mkdir(exist_ok=True)
    
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Fatal error: {e}')
        sys.exit(1)