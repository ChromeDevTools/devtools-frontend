#!/usr/bin/env python3
"""
Programmatic evaluation creation example.

This example demonstrates creating and customizing evaluations programmatically
in Python code, including dynamic evaluation generation and conditional logic.
"""

import asyncio
import random
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

# Add src to path for local development
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from bo_eval_server import EvalServer, EvaluationStack


class EvaluationGenerator:
    """Helper class for generating evaluations programmatically."""
    
    def __init__(self):
        self.counter = 0
    
    def create_evaluation(
        self,
        name: str,
        tool: str,
        input_data: Dict[str, Any],
        description: str = "",
        metadata: Dict[str, Any] = None,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        """Create a standardized evaluation object."""
        self.counter += 1
        
        return {
            "id": f"generated_{self.counter:03d}_{int(time.time())}",
            "name": name,
            "description": description or f"Programmatically generated evaluation: {name}",
            "tool": tool,
            "input": input_data,
            "timeout": timeout,
            "metadata": {
                "generated": True,
                "timestamp": time.time(),
                "generator": "programmatic_evals.py",
                **(metadata or {})
            }
        }
    
    def create_chat_evaluation(
        self,
        message: str,
        name: str = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create a chat-based evaluation."""
        return self.create_evaluation(
            name=name or f"Chat: {message[:30]}...",
            tool="chat",
            input_data={"message": message},
            **kwargs
        )
    
    def create_action_evaluation(
        self,
        objective: str,
        url: str = None,
        name: str = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create an action-based evaluation."""
        input_data = {"objective": objective}
        if url:
            input_data["url"] = url
            
        return self.create_evaluation(
            name=name or f"Action: {objective[:30]}...",
            tool="action",
            input_data=input_data,
            **kwargs
        )
    
    def create_research_evaluation(
        self,
        query: str,
        depth: str = "basic",
        name: str = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Create a research-based evaluation."""
        return self.create_evaluation(
            name=name or f"Research: {query[:30]}...",
            tool="research",
            input_data={
                "query": query,
                "depth": depth,
            },
            **kwargs
        )


def create_dynamic_evaluations(generator: EvaluationGenerator) -> List[Dict[str, Any]]:
    """Create evaluations based on dynamic logic."""
    evaluations = []
    
    # Math evaluations with increasing difficulty
    for i in range(3):
        if i == 0:
            a, b = random.randint(1, 10), random.randint(1, 10)
            op = "+"
            difficulty = "easy"
        elif i == 1:
            a, b = random.randint(10, 50), random.randint(10, 50)
            op = "*"
            difficulty = "medium"
        else:
            a, b = random.randint(100, 1000), random.randint(2, 20)
            op = "/"
            difficulty = "hard"
        
        evaluation = generator.create_chat_evaluation(
            message=f"Calculate: {a} {op} {b}",
            name=f"Math {difficulty.title()} #{i+1}",
            metadata={
                "category": "mathematics",
                "difficulty": difficulty,
                "numbers": [a, b],
                "operation": op
            }
        )
        evaluations.append(evaluation)
    
    # Conditional evaluations based on current time
    current_hour = time.localtime().tm_hour
    if 6 <= current_hour < 12:
        time_context = "morning"
        questions = [
            "What's a good breakfast recipe?",
            "How can I boost my energy in the morning?",
        ]
    elif 12 <= current_hour < 18:
        time_context = "afternoon"
        questions = [
            "What's a healthy lunch option?",
            "How can I stay productive in the afternoon?",
        ]
    else:
        time_context = "evening"
        questions = [
            "What's a good dinner recipe?",
            "How can I relax in the evening?",
        ]
    
    for i, question in enumerate(questions):
        evaluation = generator.create_chat_evaluation(
            message=question,
            name=f"{time_context.title()} Question #{i+1}",
            metadata={
                "category": "lifestyle",
                "time_context": time_context,
                "hour": current_hour
            }
        )
        evaluations.append(evaluation)
    
    # Generate research evaluations for trending topics
    trending_topics = [
        "artificial intelligence trends 2024",
        "sustainable energy solutions",
        "space exploration recent developments",
    ]
    
    for topic in trending_topics:
        evaluation = generator.create_research_evaluation(
            query=topic,
            depth="detailed",
            name=f"Research: {topic.title()}",
            metadata={
                "category": "research",
                "topic": topic,
                "priority": "high"
            },
            timeout=60.0  # Longer timeout for research
        )
        evaluations.append(evaluation)
    
    return evaluations


async def main():
    """Main example function for programmatic evaluation creation."""
    print("🏭 Programmatic Evaluation Generation Example")
    print("=" * 50)
    
    # Create evaluation generator
    generator = EvaluationGenerator()
    
    # Create evaluation stack
    stack = EvaluationStack()
    
    # Generate static evaluations
    print("\n📝 Creating static evaluations...")
    static_evals = [
        generator.create_chat_evaluation(
            message="Explain quantum computing in simple terms",
            name="Quantum Computing Explanation",
            metadata={"category": "science", "complexity": "advanced"}
        ),
        generator.create_action_evaluation(
            objective="Find and click the search button",
            url="https://www.google.com",
            name="Google Search Action",
            metadata={"category": "web_automation", "site": "google"}
        ),
        generator.create_chat_evaluation(
            message="Write a haiku about programming",
            name="Programming Haiku",
            metadata={"category": "creative", "format": "poetry"}
        ),
    ]
    
    for eval_obj in static_evals:
        stack.push(eval_obj)
        print(f"   ➕ {eval_obj['name']}")
    
    # Generate dynamic evaluations
    print("\n🎲 Creating dynamic evaluations...")
    dynamic_evals = create_dynamic_evaluations(generator)
    
    for eval_obj in dynamic_evals:
        stack.push(eval_obj)
        print(f"   ➕ {eval_obj['name']} (category: {eval_obj['metadata']['category']})")
    
    print(f"\n📊 Total evaluations created: {stack.size()}")
    
    # Create server
    server = EvalServer(
        auth_key='programmatic-demo',
        host='127.0.0.1',
        port=8080,
        log_level='INFO',
        log_dir='./logs',
        max_concurrent_evaluations=5,  # Allow more concurrent evaluations
    )
    
    # Track evaluation results with detailed analysis
    results = {
        'completed': [],
        'failed': [],
        'by_category': {},
        'by_difficulty': {},
        'timing': [],
    }
    
    @server.on_connect
    async def handle_client(client):
        print(f'\n🔗 Client connected: {client.id}')
        print(f'   Processing {stack.size()} evaluations...')
        
        start_time = time.time()
        processed = 0
        
        while not stack.is_empty():
            evaluation = stack.pop()
            if not evaluation:
                break
            
            processed += 1
            eval_start = time.time()
            
            print(f'\n📋 [{processed}] {evaluation["name"]}')
            print(f'   Category: {evaluation["metadata"].get("category", "unknown")}')
            print(f'   Tool: {evaluation["tool"]}')
            
            try:
                # Use concurrency-limited evaluation
                result = await server.evaluate_with_concurrency_limit(
                    client, 
                    evaluation,
                    timeout=evaluation.get("timeout", 30.0)
                )
                
                eval_duration = time.time() - eval_start
                
                # Record successful result
                result_record = {
                    'evaluation': evaluation,
                    'result': result,
                    'duration': eval_duration,
                    'client_id': client.id,
                    'timestamp': time.time(),
                }
                results['completed'].append(result_record)
                
                # Update category stats
                category = evaluation["metadata"].get("category", "unknown")
                if category not in results['by_category']:
                    results['by_category'][category] = {'completed': 0, 'failed': 0}
                results['by_category'][category]['completed'] += 1
                
                # Update difficulty stats
                difficulty = evaluation["metadata"].get("difficulty", "unknown")
                if difficulty not in results['by_difficulty']:
                    results['by_difficulty'][difficulty] = {'completed': 0, 'failed': 0}
                results['by_difficulty'][difficulty]['completed'] += 1
                
                # Record timing
                results['timing'].append(eval_duration)
                
                print(f'   ✅ Completed in {eval_duration:.2f}s')
                
                # Show preview of response
                if "output" in result and "response" in result["output"]:
                    response = result["output"]["response"]
                    preview = response[:150] + "..." if len(response) > 150 else response
                    print(f'   💬 "{preview}"')
                
            except Exception as e:
                eval_duration = time.time() - eval_start
                
                # Record failed result
                failure_record = {
                    'evaluation': evaluation,
                    'error': str(e),
                    'duration': eval_duration,
                    'client_id': client.id,
                    'timestamp': time.time(),
                }
                results['failed'].append(failure_record)
                
                # Update stats
                category = evaluation["metadata"].get("category", "unknown")
                if category not in results['by_category']:
                    results['by_category'][category] = {'completed': 0, 'failed': 0}
                results['by_category'][category]['failed'] += 1
                
                difficulty = evaluation["metadata"].get("difficulty", "unknown")
                if difficulty not in results['by_difficulty']:
                    results['by_difficulty'][difficulty] = {'completed': 0, 'failed': 0}
                results['by_difficulty'][difficulty]['failed'] += 1
                
                print(f'   ❌ Failed after {eval_duration:.2f}s: {e}')
        
        total_duration = time.time() - start_time
        print(f'\n🏁 Batch completed in {total_duration:.2f}s')
        print(f'   Processed: {processed}')
        print(f'   Success rate: {len(results["completed"])/processed*100:.1f}%')
        
        # Send detailed completion message
        await client.send_message({
            "type": "batch_analysis",
            "total_processed": processed,
            "completed": len(results['completed']),
            "failed": len(results['failed']),
            "duration": total_duration,
            "average_eval_time": sum(results['timing']) / len(results['timing']) if results['timing'] else 0,
            "categories": list(results['by_category'].keys()),
        })
    
    @server.on_disconnect
    async def handle_disconnect(client_info):
        print(f'\n🔌 Client disconnected: {client_info["id"]}')
        
        # Show detailed analysis
        total = len(results['completed']) + len(results['failed'])
        if total > 0:
            print(f'\n📈 Final Analysis:')
            print(f'   Total evaluations: {total}')
            print(f'   Successful: {len(results["completed"])} ({len(results["completed"])/total*100:.1f}%)')
            print(f'   Failed: {len(results["failed"])} ({len(results["failed"])/total*100:.1f}%)')
            
            if results['timing']:
                avg_time = sum(results['timing']) / len(results['timing'])
                min_time = min(results['timing'])
                max_time = max(results['timing'])
                print(f'   Average time: {avg_time:.2f}s (min: {min_time:.2f}s, max: {max_time:.2f}s)')
            
            print(f'\n📊 By Category:')
            for category, stats in results['by_category'].items():
                total_cat = stats['completed'] + stats['failed']
                success_rate = stats['completed'] / total_cat * 100 if total_cat > 0 else 0
                print(f'   {category}: {total_cat} total, {success_rate:.1f}% success')
            
            if any(results['by_difficulty'].values()):
                print(f'\n🎯 By Difficulty:')
                for difficulty, stats in results['by_difficulty'].items():
                    if difficulty != "unknown":
                        total_diff = stats['completed'] + stats['failed']
                        success_rate = stats['completed'] / total_diff * 100 if total_diff > 0 else 0
                        print(f'   {difficulty}: {total_diff} total, {success_rate:.1f}% success')
    
    # Start server
    try:
        await server.start()
        print(f'\n🚀 Server running on ws://{server.config.host}:{server.config.port}')
        print('   Connect your agent client to start processing evaluations')
        print('   Press Ctrl+C to stop the server')
        
        # Keep server running
        await server.wait_closed()
        
    except KeyboardInterrupt:
        print('\n🛑 Received interrupt signal, stopping server...')
        await server.stop()
        print('✅ Server stopped successfully')
        
    except Exception as e:
        print(f'💥 Server error: {e}')
        if server.is_running():
            await server.stop()


if __name__ == "__main__":
    # Ensure logs directory exists
    Path("./logs").mkdir(exist_ok=True)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Fatal error: {e}')
        sys.exit(1)