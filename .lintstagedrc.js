module.exports = {
  'backend/**/*.{js,jsx,ts,tsx}': [
    'cd backend && npm run lint:fix',
    'cd backend && npm run format',
    'git add'
  ],
  'web/**/*.{js,jsx,ts,tsx}': [
    'cd web && npm run lint:fix',
    'cd web && npm run format',
    'git add'
  ],
  'mobile/**/*.{js,jsx,ts,tsx}': [
    'cd mobile && npm run lint:fix',
    'cd mobile && npm run format',
    'git add'
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write',
    'git add'
  ]
};