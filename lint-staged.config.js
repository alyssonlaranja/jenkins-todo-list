export default {
  '*.{js,jsx,ts,tsx}': ['eslint --fix --max-warnings 500', 'prettier --write'],
  '*.{json,css,md}': ['prettier --write'],
}
