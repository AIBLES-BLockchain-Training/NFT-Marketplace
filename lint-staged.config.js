module.exports = {
  'apps/**/*.{ts,tsx}': ['eslint --fix'],
  'packages/**/*.{ts,tsx}': ['eslint --fix'],
  'apps/**/*.{json,css,scss,md,mdx}': ['prettier -w'],
  'packages/**/*.{json,css,scss,md,mdx}': ['prettier -w'],
};
