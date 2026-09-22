const { execFileSync } = require('child_process');
const path = require('path');

execFileSync(
  'powershell',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'build-icons.ps1')],
  { stdio: 'inherit' }
);
