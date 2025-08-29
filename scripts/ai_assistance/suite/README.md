# DevTools AI Evals Suite

This folder contains the scripts required to execute the DevTools eval suite.

At this time, this is being heavily iterated on and may change rapidly. Chat to jacktfranklin@ if you have any questions or feedback.

## Getting started

### 1: get the outputs from GCP

The actual output files you need to run the suite are hosted in a GCP bucket. The contents are fetched for you by `gclient sync` but only if you set the `checkout_ai_evals` arg in your `.gclient` config:

```
solutions = [
  {
    "name": "devtools-frontend",
    "url": "https://chromium.googlesource.com/devtools/devtools-frontend.git",
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
    "custom_vars": {
      "checkout_ai_evals": True,
    }
  },
]
```

Note that you have to be a Google employee to access this.

### 2: set your Gemini API key.

Evaluations that engage an LLM will expect to find a `GEMINI_API_KEY` environment variable defined.

## Running the suite

Run `cd scripts/ai_assistance && npm run eval-suite` to execute the suite.

## Adding new outputs

Once you have new outputs you want to put into the set, move them into the right place in the `suite/outputs/outputs` folder.:

The structure of files in this folder is like so: `outputs/type/YYYY-MM-DD/label-XYZ.json`.

- Type here should map roughly to an agent, e.g. "performance".
- For actual outputs, store them as JSON files within a `YYYY-MM-DD` folder.
- The file name must start with a label - e.g. `lcp-breakdown`. After that, it can have any other content you like. You can have one JSON file with multiple outputs, or you can have multiple files with outputs. If there are multiple files, they will be merged accordingly when the eval suite is run.

Then, run (from the DevTools root directory in this case, but it doesn't matter):

```
node scripts/ai_assistance/suite/upload_to_gcp.ts
```

This will upload the changes to the GCP bucket and update the `DEPS` file for you, which you should ensure you commit in a CL.

If you get any authorisation errors, run `gsutil.py config` to refresh your authentication status.

