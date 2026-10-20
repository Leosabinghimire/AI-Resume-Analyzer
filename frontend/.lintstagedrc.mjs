// Runs from frontend/ on staged files only (invoked by the root Husky pre-commit hook).
const config = {
  "*.{ts,tsx,mjs}": ["eslint --max-warnings=0 --fix"],
  // Type errors can surface in files that were not staged, so check the whole project once.
  "*.{ts,tsx}": () => "tsc --noEmit",
};

export default config;
