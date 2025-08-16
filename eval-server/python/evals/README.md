# Python Evaluation Scripts

This directory contains evaluation scripts for running various benchmark datasets using the Python eval-server.

## Available Scripts

### Browsecomp Evaluation Server

**Script**: `browsecomp_eval_server.py`  
**Wrapper**: `run_browsecomp_eval_server.sh`

The browsecomp eval server loads questions from the [Browsecomp benchmark](https://github.com/openai/simple-evals) and distributes them to connected BrowserOperator clients via WebSocket connections.

#### Features

- Loads and decrypts 1,266 browsecomp questions automatically
- Distributes exactly one question per client connection
- Stack-based LIFO distribution
- **Automatic scoring**: Compares responses against true answers
- **Structured response parsing**: Handles BrowserOperator's message format
- **Comprehensive logging**: Structured logs saved to timestamped files
- Real-time progress tracking with accuracy metrics  
- Confidence score extraction and analysis
- Results saved to JSON file for later analysis
- Configurable timeout (default: 60 minutes)
- Configurable server settings

#### Usage

```bash
# Use the wrapper script for proper dependencies
./run_browsecomp_eval_server.sh --help

# List available questions
./run_browsecomp_eval_server.sh --list --list-limit 10

# Start server with first 5 questions
./run_browsecomp_eval_server.sh --limit 5

# Start server with specific questions
./run_browsecomp_eval_server.sh --questions 1 5 10 25

# Start server with a range of questions (questions 10-15)
./run_browsecomp_eval_server.sh --start 10 --end 15

# Start server from question 100 to the end
./run_browsecomp_eval_server.sh --start 100

# Start server with questions 1-50
./run_browsecomp_eval_server.sh --end 50

# Start server with all 1,266 questions
./run_browsecomp_eval_server.sh

# Custom configuration
./run_browsecomp_eval_server.sh --limit 20 --port 8081 --auth-key my-key

# Save results to JSON file
./run_browsecomp_eval_server.sh --limit 10 --save-results
```

#### How It Works

1. **Load Questions**: The server loads browsecomp questions from the dataset
2. **Stack Distribution**: Questions are placed in a LIFO stack
3. **Client Connection**: When a BrowserOperator connects, it receives one question
4. **Processing**: The client processes the question and returns results
5. **Automatic Scoring**: Server compares responses against true answers
6. **Tracking**: Server tracks completion, accuracy, and confidence statistics
7. **Results**: Optionally saves detailed results to JSON file

#### Example Workflow

```bash
# Terminal 1: Start the eval server
cd /path/to/eval-server/python/evals
./run_browsecomp_eval_server.sh --limit 10 --save-results

# Terminal 2+: Connect BrowserOperator clients
# Each client will automatically receive and process one question
```

#### Scoring Output

When evaluations complete, you'll see automatic scoring results:

```
✅ Evaluation completed!
📊 Response structure: 12 messages, 3 tool calls, gpt-4 model, 45230ms

🎯 Scoring Results:
   - True Answer: 1988-96
   - Extracted Answer: 1988-96
   - Correct: ✅ YES
   - Confidence: 85%

📊 Current Statistics:
   ✅ Completed: 5/10
   ❌ Failed: 0/10
   📚 Remaining: 5/10

🎯 Scoring Statistics:
   📊 Accuracy: 80.0% (4/5 correct)
   💡 Average Confidence: 78.5%
```

#### Results JSON Format

When using `--save-results`, evaluations are saved to `browsecomp_eval_results_[timestamp].json`:

```json
{
  "timestamp": "20240115_143022",
  "total_questions": 10,
  "completed": 10,
  "failed": 0,
  "accuracy": 80.0,
  "average_confidence": 78.5,
  "evaluations": [
    {
      "client_id": "abc123...",
      "question_id": 1,
      "result": "Explanation: ... Exact Answer: 1988-96 Confidence Score: 85%",
      "scoring": {
        "is_correct": true,
        "true_answer": "1988-96",
        "extracted_answer": "1988-96",
        "confidence": 85
      }
    }
  ]
}
```

#### Logging

The server creates comprehensive logs in the `./logs/` directory:

- **Console Output**: Real-time progress with emojis and summaries
- **Structured Logs**: Timestamped log file `browsecomp_eval_server_YYYYMMDD_HHMMSS.log`

**Structured Log Events**:
```
EVENT: {"timestamp": "2024-01-15T14:30:22", "event_type": "client_connected", "client_id": "abc123", "stack_remaining": 10}
EVENT: {"timestamp": "2024-01-15T14:30:25", "event_type": "evaluation_assigned", "evaluation_id": "browsecomp_q1", "question_id": 1}
EVENT: {"timestamp": "2024-01-15T14:32:10", "event_type": "evaluation_completed", "is_correct": true, "confidence": 85, "model_used": "gpt-4"}
EVENT: {"timestamp": "2024-01-15T14:35:00", "event_type": "session_completed", "accuracy": 80.0, "total_questions": 10}
```

**Log Files Location**: 
- `./logs/browsecomp_eval_server_YYYYMMDD_HHMMSS.log` - Main server log
- `./logs/` - Directory also used by eval-server's internal logging

## Dependencies

The evaluation scripts require additional dependencies beyond the base eval-server:
- `pandas` - For dataset loading and manipulation
- `requests` - For downloading datasets

These are automatically installed when you run `uv sync` in the eval-server/python directory.

## Adding New Evaluation Scripts

To add a new evaluation script:

1. Create your script in this directory
2. Import the eval-server modules:
   ```python
   import sys
   from pathlib import Path
   sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
   from bo_eval_server import EvalServer, EvaluationStack
   ```

3. Create a wrapper script for easy execution:
   ```bash
   #!/bin/bash
   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   cd "$SCRIPT_DIR/.."
   uv run python evals/your_script.py "$@"
   ```

4. Make the wrapper executable: `chmod +x your_wrapper.sh`

## Dataset Files

- `browsecomp_dataset.py` - Dataset loader for browsecomp questions with automatic decryption support
- `browsecomp_scorer.py` - Scoring logic that extracts answers and compares against ground truth

## Notes

- Always use the wrapper scripts (`.sh` files) to ensure proper dependencies are loaded
- The eval server runs on WebSocket protocol (ws://localhost:8080 by default)
- Each connected client receives exactly one evaluation from the stack
- Progress and statistics are shown in real-time during execution