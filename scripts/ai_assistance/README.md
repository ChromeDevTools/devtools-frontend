# AI Assistance Evaluation

This directory contains scripts for the prompt iteration & evaluation process for AI Assistance.

Mainly, `auto-run/auto-run.ts` script takes example URLs, runs the examples and outputs the results to the `auto-run/data/` directory. Then, the HTML page in `eval/` folder takes these results and presents them in a UI for evaluation.

**NOTE: looking for the automatic evaluation suite?**
As of September 2025, we also have an evaluation suite where we can define evaluations to apply to an output and have them automatically evaluated, including using an LLM as judge. See the README in `suites/` for more detail on this.

## Running

**Prerequisites**
* You need to have at least Node v22 to run Auto AI Assistance.
* You need to have a version of Chrome that contains the AI Assistance feature. (i.e. you also need to be logged in & have sync enabled)
* You must have enabled AI Assistance logging. To do this, load up DevTools-on-DevTools and in the console run `setAiAssistanceStructuredLogEnabled(true)`.

**Steps**
1. Run a AI Assistance enabled Chrome executable with `--remote-debugging-port 9222`, `--user-data-dir=/tmp/aida` and `--auto-open-devtools-for-tabs` targeting `about:blank` and login with a Google account. For example:
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

At the end of these steps, the examples in the urls `<example-url-1>` and `<example-url-2>` should be run and the results must be saved to the `auto-run/data/` folder.

Tip: You can add a `--label <label>` argument to the run to label the dataset. For example:
```bash
npm run auto-run -- --label title-change --example-urls <example-url-1> <example-url-2>
```

## `--test-target` values

* `elements`: tests the entrypoint via right clicking on an element in the Elements panel.
* `elements-multimodal`: tests the multimodal support for Elements entrypoint by providing screenshot input with the prompt.
* `performance-main-thread`: tests the entrypoint via right clicking on an event in the Performance panel main thread.
* `performance-insights`: tests the entrypoint via the "Ask AI" button shown on an individual Insight in the Performance panel sidebar.
* `network`: tests the entrypoint via a left click on a request in the Network panel.
* `patching`: tests the file patching flow. This mode is different
because it automatically rates the results using assertions defined in
tests. You need to manually add all workspace folders to your Chrome
instance before running the tests. The resulting JSON files are not
compatible with the eval UI.

## Evaluating the results

**Steps**
1. Serve the `scripts/ai_assistance` folder in 8000 port by using a simple file server. For example:
```bash
python3 -m http.server
```
2. Visit http://localhost:8000/eval URL to see the UI.
3. Select the dataset you want to evaluate in the UI. (`Dataset:` selector)
4. Evaluate the examples one by one.

Tip: You can navigate the questions with `Tab` key and move between examples with `ArrowLeft` and `ArrowRight`.
