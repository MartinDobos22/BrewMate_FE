import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.join('.', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export { LOG_DIR };
