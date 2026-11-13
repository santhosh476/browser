const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronExe, [__dirname], {
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  console.log('Exited with code:', code);
});
