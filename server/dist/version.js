import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
let cachedVersion;
export function getServerVersion() {
    if (cachedVersion !== undefined)
        return cachedVersion;
    try {
        const __dirname = fileURLToPath(new URL('.', import.meta.url));
        const pkgPath = join(__dirname, '..', 'package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        cachedVersion = pkg.version ?? '0.0.0';
        return cachedVersion;
    }
    catch {
        cachedVersion = '0.0.0';
        return cachedVersion;
    }
}
//# sourceMappingURL=version.js.map