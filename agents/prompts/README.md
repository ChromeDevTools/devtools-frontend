This directory contains a series of prompts that can be added to your root `GEMINI.md` file, which is not committed to version control.

More context for Googlers: go/chrome-devtools:ai-agents-use

## Getting started

1. Create `//GEMINI.md` in the root of the `devtools-frontend` repository.
2. Include the relevant prompts with `@`:

```
@agents/prompts/verification.md
```

The `/memory show` command in Gemini CL can be used to verify that the files have been included correctly.

## Contributing

Contributions to existing prompts or to add new ones are encouraged; CLs are very welcome.
