export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      1,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-empty': [1, 'never'],
    'subject-empty': [1, 'never'],
    'subject-full-stop': [0, 'never'],
    'header-max-length': [0, 'always', 100],
  },
}
