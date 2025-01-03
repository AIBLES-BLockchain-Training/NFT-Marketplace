module.exports = {
  'apps/**/*.{ts,tsx}': ['eslint --fix'],
  'packages/**/*.{ts,tsx}': ['eslint --fix'],
  'apps/**/*.{html,json,css,scss,md,mdx}': ['prettier -w'],
  'packages/**/*.{html,json,css,scss,md,mdx}': ['prettier -w'],
};
