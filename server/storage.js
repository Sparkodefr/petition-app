// Stockage des signatures dans un fichier NDJSON (une signature JSON par ligne).
// Ajouts en fin de fichier : une coupure ne peut corrompre que la dernière ligne,
// qui est alors ignorée au chargement. Les suppressions réécrivent le fichier
// de façon atomique (fichier temporaire puis renommage).
import fs from 'node:fs';
import path from 'node:path';

export function createStore(dataDir) {
  const file = path.join(dataDir, 'signatures.ndjson');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.W_OK);

  const signatures = [];
  const ids = new Set();

  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const [i, line] of lines.entries()) {
      if (!line.trim()) continue;
      try {
        const sig = JSON.parse(line);
        if (!ids.has(sig.id)) {
          ids.add(sig.id);
          signatures.push(sig);
        }
      } catch {
        console.warn(`[storage] ligne ${i + 1} illisible ignorée`);
      }
    }
  }

  let fd = fs.openSync(file, 'a');

  return {
    file,
    count: () => signatures.length,
    all: () => signatures.slice(),
    has: (id) => ids.has(id),
    add(sig) {
      if (ids.has(sig.id)) return false;
      fs.writeSync(fd, JSON.stringify(sig) + '\n');
      fs.fsyncSync(fd);
      ids.add(sig.id);
      signatures.push(sig);
      return true;
    },
    remove(id) {
      const index = signatures.findIndex((s) => s.id === id);
      if (index === -1) return null;
      const remaining = signatures.filter((s) => s.id !== id);

      const tmp = `${file}.tmp`;
      const tmpFd = fs.openSync(tmp, 'w');
      fs.writeSync(tmpFd, remaining.map((s) => JSON.stringify(s) + '\n').join(''));
      fs.fsyncSync(tmpFd);
      fs.closeSync(tmpFd);
      fs.closeSync(fd);
      fs.renameSync(tmp, file);
      fd = fs.openSync(file, 'a');

      const [removed] = signatures.splice(index, 1);
      ids.delete(id);
      return removed;
    },
  };
}
