# Windows Background Process Quirks with pnpm

When running pnpm scripts in the background on Windows using `Execute` (with `fireAndForget: true`), the process may silently fail to start or fail to produce logs. This frequently happens with commands like `pnpm --filter @emerald/docs dev --port 3100`.

## Workaround

If you encounter this and need a long-running dev server in the background, consider writing a small Node.js script to spawn the server detached, rather than relying on direct `Execute` fireAndForget of pnpm commands.

Example:
```js
// _start-docs.js
const { spawn } = require('child_process');
const fs = require('fs');
const out = fs.openSync('./docs-out.log', 'a');
const err = fs.openSync('./docs-err.log', 'a');

const child = spawn('npx.cmd', ['pnpm', '--filter', '@emerald/docs', 'dev', '--port', '3100'], {
  detached: true,
  stdio: ['ignore', out, err]
});

child.unref();
```
Then run `node _start-docs.js` synchronously.
