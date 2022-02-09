async function foo() {
  // Insertion marker for newline.
  return true;
}

async () => {
  const x = await foo();  // Breakpoint is set on this line.
}
const y = 25;  // Empty statement for the breakpoint to move to.
