# AI Assistance Evaluation

This directory contains scripts for the prompt iteration & evaluation process for AI Assistance.

Mainly, `auto-run/auto-run.ts` script takes example URLs, runs the examples and outputs evaluation trajectories to the `auto-run/data/` directory. These trajectories are then evaluated using the automated evaluation suite in [`suite/`](suite/README.md).

## Running

**Prerequisites**
* You need to have at least Node v22 to run Auto AI Assistance.
* You need to have a version of Chrome that contains the AI Assistance feature. (i.e. you also need to be logged in & have sync enabled)
* You must have enabled AI Assistance logging. To do this, load up DevTools-on-DevTools and in the console run `setAiAssistanceStructuredLogEnabled(true)`.

**Steps**
1. Run an AI Assistance enabled Chrome executable with `--remote-debugging-port 9222`, `--user-data-dir=/tmp/aida` and `--auto-open-devtools-for-tabs` targeting `about:blank` and login with a Google account. For example:
```bash
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --remote-debugging-port=9222 --user-data-dir=/tmp/aida --auto-open-devtools-for-tabs about:blank
```
> `--user-data-dir` is now required for `--remote-debugging-port` to take effect.

2. Make sure you use en-US locale in DevTools.

3. Close the DevTools window for the initial `about:blank` page but keep the tab open.

4. Run the following command from the `scripts/ai_assistance` folder. See below for the list of values `--test-target` supports. This flag is used to determine which AI experience is evaluated.
```bash
npm run auto-run -- --test-target elements --example-urls <example-url-1> <example-url-2>
```

At the end of these steps, the examples in the urls `<example-url-1>` and `<example-url-2>` should be run and the evaluation trajectory results saved to the `auto-run/data/` folder.

Tip: You can add a `--label <label>` argument to the run to label the dataset. For example:
```bash
npm run auto-run -- --label title-change --example-urls <example-url-1> <example-url-2>
```

Tip: You can omit `--example-urls` and `--label` to run the script in **Recipe Mode**. In this mode, it reads URLs and labels from `auto-run/recipes.json` for the specified `--test-target`. For example:
```bash
npm run auto-run -- --test-target network --grade
```
This will run all available evaluations for the target, generate output files for each label, and grade them if `--grade` is specified.

Tip: You can add a `--grade` flag to the run to automatically grade the results. This flag generates the `.eval.json` file, copies it to the correct subfolder in `suite/outputs/outputs/` (renaming it to use only the label, e.g., `network-test.json`), and then executes the corresponding grader script (e.g., `suite/network.eval.ts`) to calculate scores using the LLM judge.

Tip: You can add an `--upload` flag to automatically upload resulting `trajectory.json` files to the GCS bucket (`gs://gleam-eval-cd4h-nonprod/ai_evals/runs/<run_id>/tasks/<task_id>/output/trajectory.json`).

## `--test-target` values

* `elements`: tests the entrypoint via right clicking on an element in the Elements panel.
* `elements-multimodal`: tests the multimodal support for Elements entrypoint by providing screenshot input with the prompt.
* `performance`: tests the entrypoint via asking the model about the whole performance trace.
* `performance-main-thread`: tests the entrypoint via right clicking on an event in the Performance panel main thread.
* `performance-insights`: tests the entrypoint via the "Ask AI" button shown on an individual Insight in the Performance panel sidebar.
* `network`: tests the entrypoint via a left click on a request in the Network panel.
* `patching`: tests the file patching flow. This mode automatically rates the results using assertions defined in tests. You need to manually add all workspace folders to your Chrome instance before running the tests.

## Annotating Examples

The auto-run script looks for a comment in the example page to know what to ask the AI.
The supported format is:
```text
Prompt: [The prompt to run]
Explanation: [The expected response]
FollowupN: [Optional follow-up prompt(s) (multiple followups are supported); N is the order in which the followup prompt will be executed;]
```
If there is only one comment on the page, it is treated as the prompt.
Then you can use `[Prompt] \n # [Explanation]`.

If multiple comments are present, the script targets the one with an explicit `Prompt:` or `Explanation:`/`#`.

## Evaluating the results

See the [README in `suite/`](suite/README.md) for details on executing the automated evaluation suite and configuring the LLM-as-a-judge scorers.
