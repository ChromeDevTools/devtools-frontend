# Instructions on how to verify your changes

## Testing

- To test a file, you can run `npm run test -- <FILEPATH>` where `FILEPATH` is a path to a `*.test.ts` file, relative to the working directory.
- Test files are usually defined alongside their implementation. So if you are working on `front_end/panels/timeline/TimelinePanel.ts`, you would expect the test file to be defined in `front_end/panels/timeline/TimelinePanel.test.ts`.
- You can also test an entire directory. For example, `npm run test -- front_end/models/trace` will run all tests in that directory.

## Building & compiling

- Check for TypeScript or dependency issues in the build system by running `autoninja -C out/Default`.

## Fast builds

- If the `out/Fast` or `out/fast-build` directory exists, this means that a build that does not execute TypeScript is available to you which greatly decreases build time.
- To use the fast build for tests, pass the `--target=Fast` (adjust the value based on the name of the directory) argument to `npm run test`.

## Linting

- `npm run lint` will execute ESLint and StyleLint and report any violations that must be fixed.

## Best practices

- Run tests often to verify your changes.
- Prefer using a fast build, if it exists, to keep the feedback loop shorter.
- Periodically compile with TypeScript to check for type errors.
- Run linting at the end of your code changes.
