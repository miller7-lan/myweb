import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(rootDir, 'src/data/releases.ts');
const cacheDir = path.join(rootDir, 'node_modules/.tmp');
const compiledPath = path.join(cacheDir, 'verify-downloads-releases.mjs');

const source = await fs.readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: false,
  },
  fileName: sourcePath,
});

await fs.mkdir(cacheDir, { recursive: true });
await fs.writeFile(compiledPath, compiled.outputText);

const { releases } = await import(`${pathToFileURL(compiledPath).href}?t=${Date.now()}`);
const shouldCheckNetwork = process.argv.includes('--network');
const failures = [];
const downloads = releases.flatMap((release) => [
  ...(release.primaryDownload ? [{ release, download: release.primaryDownload }] : []),
  ...(release.links ?? []).map((download) => ({ release, download })),
]);

for (const { release, download } of downloads) {
  if (!download.external && !download.sha256) {
    failures.push(`${release.title} / ${download.label}: missing SHA-256`);
  }

  if (!/^https:\/\//.test(download.href)) {
    failures.push(`${release.title} / ${download.label}: expected HTTPS URL, got ${download.href}`);
  }

  if (!shouldCheckNetwork) {
    continue;
  }

  try {
    const response = await fetch(download.href, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (!response.ok) {
      failures.push(`${release.title} / ${download.label}: HTTP ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    failures.push(`${release.title} / ${download.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(`Download verification failed (${failures.length}):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const externalLinks = downloads.filter(({ download }) => download.external).length;
console.log(
  `Verified ${downloads.length - externalLinks} download entries and ${externalLinks} external links`
  + `${shouldCheckNetwork ? ' with network checks' : ''}.`,
);
