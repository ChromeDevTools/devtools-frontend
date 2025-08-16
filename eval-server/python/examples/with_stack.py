#!/usr/bin/env python3
"""
EvalServer with EvaluationStack example.

This example demonstrates using an EvaluationStack to queue evaluations
and distribute them across multiple client connections.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path for local development
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from bo_eval_server import EvalServer, EvaluationStack


def create_sample_evaluations():
    """Create evaluations matching NodeJS multiple-evals.js exactly."""
    evaluations = [
        {
            "id": "math_eval",
            "name": "Basic Math Problem",
            "description": "Simple arithmetic evaluation",
            "tool": "chat",
            "input": {
                "message": "What is 15 * 7 + 23? Please show your calculation steps."
            }
        },
        {
            "id": "geography_eval", 
            "name": "Capital of France",
            "description": "Geography knowledge test",
            "tool": "chat",
            "input": {
                "message": "What is the capital of France?"
            }
        },
        {
            "id": "creative_eval",
            "name": "Creative Writing",
            "description": "Short creative writing task",
            "tool": "chat", 
            "input": {
                "message": "Write a two-sentence story about a robot discovering friendship."
            }
        },
        {
            "id": "tech_eval",
            "name": "Technology Knowledge",  
            "description": "Basic technology concepts",
            "tool": "chat",
            "input": {
                "message": "Explain what HTTP stands for and what it's used for in simple terms."
            }
        }
    ]
    return evaluations


async def main():
    """Main example function for evaluation stack usage."""
    # Create evaluation stack and populate it
    stack = EvaluationStack()
    sample_evaluations = create_sample_evaluations()
    
    print(f"📚 Created {len(sample_evaluations)} sample evaluations")
    
    # Add evaluations to stack (LIFO order)
    for evaluation in sample_evaluations:
        stack.push(evaluation)
        print(f"   ➕ Added: {evaluation['name']}")
    
    print(f"📊 Stack size: {stack.size()}")
    print(f"🔝 Top evaluation: {stack.peek()['name'] if stack.peek() else 'None'}")
    
    # Create server
    server = EvalServer(
        auth_key='stack-demo',
        host='127.0.0.1',
        port=8080,
        log_level='INFO',
        log_dir='./logs',
    )
    
    # Track processed evaluations
    completed_evaluations = []
    failed_evaluations = []
    
    @server.on_connect
    async def handle_client(client):
        print('🎉 CLIENT CONNECTED!')
        print(f'   - Client ID: {client.id}')
        print(f'   - Client tabId: {client.tab_id}')
        print(f'   - Client info: {client.get_info()}')
        
        # Check if we have evaluations left in the stack
        if stack.is_empty():
            print('⚠️  No more evaluations in stack for this client')
            print('   Consider refilling the stack or handling this scenario')
            return
        
        # Pop the next evaluation from the stack (ONE evaluation per client!)
        evaluation = stack.pop()
        print(f'📋 Assigning evaluation: "{evaluation["name"]}" ({evaluation["id"]})')
        print(f'📊 Remaining evaluations in stack: {stack.size()}')
        
        try:
            print('🔄 Starting evaluation...')
            result = await client.evaluate(evaluation)
            
            print('✅ Evaluation completed!')
            print(f'📊 Response for "{evaluation["name"]}": {result}')
            
            completed_evaluations.append({
                'client_id': client.id,
                'evaluation': evaluation,
                'result': result,
            })
            
        except Exception as e:
            print(f'❌ Evaluation "{evaluation["name"]}" failed: {e}')
            
            failed_evaluations.append({
                'client_id': client.id,
                'evaluation': evaluation,
                'error': str(e),
            })
        
        # Send completion message
        try:
            await client.send_message({
                "type": "evaluation_complete",
                "evaluation_id": evaluation["id"],
                "evaluation_name": evaluation["name"],
                "status": "completed" if evaluation["id"] not in [e['evaluation']['id'] for e in failed_evaluations] else "failed"
            })
        except Exception as e:
            print(f'   ⚠️  Failed to send completion message: {e}')
    
    @server.on_disconnect
    async def handle_disconnect(client_info):
        print(f'\n🔌 Client disconnected: {client_info["id"]}')
        
        # Show final statistics
        total_completed = len(completed_evaluations)
        total_failed = len(failed_evaluations) 
        remaining = stack.size()
        
        print(f'\n📊 Final Statistics:')
        print(f'   ✅ Completed: {total_completed}')
        print(f'   ❌ Failed: {total_failed}')
        print(f'   📚 Remaining: {remaining}')
        
        if completed_evaluations:
            print(f'\n🎯 Completed Evaluations:')
            for item in completed_evaluations:
                eval_name = item['evaluation']['name']
                client_id = item['client_id'][:8]  # Short client ID
                print(f'   • {eval_name} (client: {client_id})')
        
        if failed_evaluations:
            print(f'\n💥 Failed Evaluations:')
            for item in failed_evaluations:
                eval_name = item['evaluation']['name']
                error = item['error']
                print(f'   • {eval_name}: {error}')
    
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