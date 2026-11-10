import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'deployment');
const htdocs = join(output, 'htdocs');
if (htdocs !== resolve(root, 'deployment', 'htdocs')) throw new Error('Chemin de sortie inattendu.');
const skipBuild = process.argv.includes('--skip-build');

const rootHtaccess = `# OCD Live — racine du site (htdocs). Fichier généré par scripts/package-deployment.mjs.
Options -Indexes
DirectoryIndex index.html

<IfModule mod_mime.c>
    AddType image/webp .webp
    AddType font/woff2 .woff2
    AddType application/javascript .js
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    <FilesMatch "^index\\.html$">
        Header set Cache-Control "no-cache"
    </FilesMatch>
    # Les fichiers de assets/ portent une empreinte dans leur nom.
    <FilesMatch "\\.(?:js|css|woff2|webp|jpg|png)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    # Après émission du certificat SSL et vérification manuelle, activer la redirection HTTPS :
    # RewriteCond %{HTTPS} off
    # RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    RewriteRule (?:^|/)\\.(?!well-known/) - [F,L]
    RewriteRule ^api(?:/|$) - [L]
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    # Repli de l'application React : uniquement pour les chemins sans extension.
    RewriteRule ^[^.]*$ /index.html [L]
</IfModule>
`;
const robots = 'User-agent: *\nDisallow: /\n';
const deny = `# Défense en profondeur : ce dossier n'est jamais servi directement.
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order deny,allow
    Deny from all
</IfModule>
`;

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
const posix = (path) => relative(htdocs, path).split(sep).join('/');

if (!skipBuild) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const dist = join(root, 'dist');
if (!(await stat(join(dist, 'index.html')).catch(() => null))) throw new Error('dist/index.html est absent : lancez le build.');

await rm(htdocs, { recursive: true, force: true });
await mkdir(htdocs, { recursive: true });
await cp(dist, htdocs, { recursive: true });
await writeFile(join(htdocs, '.htaccess'), rootHtaccess);
await writeFile(join(htdocs, 'robots.txt'), robots);

const apiSource = join(root, 'api');
const apiTarget = join(htdocs, 'api');
await mkdir(apiTarget, { recursive: true });
for (const file of ['index.php', '.htaccess']) await cp(join(apiSource, file), join(apiTarget, file));
for (const directory of ['config', 'controllers', 'middleware', 'routes', 'services', 'utils']) {
  await mkdir(join(apiTarget, directory), { recursive: true });
  for (const entry of await readdir(join(apiSource, directory), { withFileTypes: true })) {
    if (!entry.isFile() || !(entry.name.endsWith('.php') || entry.name === '.htaccess') || /^secrets(?:\.example)?\.php$/.test(entry.name)) continue;
    await cp(join(apiSource, directory, entry.name), join(apiTarget, directory, entry.name));
  }
}
for (const directory of ['storage', 'storage/logs', 'storage/rate-limit']) {
  await mkdir(join(apiTarget, directory), { recursive: true });
  await writeFile(join(apiTarget, directory, '.htaccess'), deny);
}

const files = (await walk(htdocs)).sort();
const problems = [];
const forbiddenName = [/(^|\/)(\.env[^/]*|\.git[^/]*|node_modules|tests?|database|docs?|scripts|src)(\/|$)/i, /\.(sql|md|map|ts|tsx|log|bak|old|zip|example|env|json|mjs)$/i, /secrets/i, /gitkeep/i, /readme|deployment/i];
const sensitive = [/DB_PASS['"]?\s*(?:=|=>|:)\s*['"]?[^\s'",)]+/, /APP_KEY['"]?\s*(?:=|=>|:)\s*['"]?[A-Za-z0-9+/_-]{8,}/, /PREFLIGHT_TOKEN['"]?\s*(?:=|=>|:)\s*['"]?[A-Za-z0-9+/_-]{8,}/, /\$2[ayb]\$\d\d\$/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /if0_\d+/i, /byetcluster/i, /sql\d+\.[a-z]+/i];
const expectedApi = new Set(['api/index.php', 'api/.htaccess']);
for (const directory of ['config', 'controllers', 'middleware', 'routes', 'services', 'utils']) {
  for (const entry of await readdir(join(apiSource, directory))) if ((entry.endsWith('.php') || entry === '.htaccess') && !/^secrets/.test(entry)) expectedApi.add(`api/${directory}/${entry}`);
}
for (const directory of ['storage', 'storage/logs', 'storage/rate-limit']) expectedApi.add(`api/${directory}/.htaccess`);

const manifest = [];
for (const file of files) {
  const name = posix(file);
  const info = await stat(file);
  const content = await readFile(file);
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  const limit = ['.js', '.php', '.html'].includes(extension) ? 1024 * 1024 : name.endsWith('.htaccess') ? 10 * 1024 : 10 * 1024 * 1024;
  if (info.size > limit) problems.push(`${name} dépasse la limite de taille de l'hébergeur (${info.size} octets).`);
  if (name !== '.htaccess' && !name.endsWith('/.htaccess') && forbiddenName.some((pattern) => pattern.test(name))) problems.push(`Nom interdit dans le paquet : ${name}`);
  if (['.php', '.js', '.css', '.html', '.htaccess', '.txt'].includes(extension) || name.endsWith('.htaccess')) {
    // Seule exception documentée : hash public factice (mot de passe « password ») utilisé pour égaliser le temps de réponse d'un compte inconnu.
    const text = name === 'api/controllers/AuthController.php' ? content.toString('utf8').replace('$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', '') : content.toString('utf8');
    for (const pattern of sensitive) if (pattern.test(text)) problems.push(`Motif sensible (${pattern}) dans ${name}`);
  }
  if (name.startsWith('api/') && !expectedApi.has(name)) problems.push(`Fichier API non prévu : ${name}`);
  manifest.push({ name, size: info.size, sha256: createHash('sha256').update(content).digest('hex') });
}
for (const expected of expectedApi) if (!files.some((file) => posix(file) === expected)) problems.push(`Fichier API attendu manquant : ${expected}`);
const html = await readFile(join(htdocs, 'index.html'), 'utf8');
for (const [, reference] of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) if (!files.some((file) => posix(file) === reference.slice(1))) problems.push(`Référence cassée dans index.html : ${reference}`);
const forbiddenOutside = ['.env', 'secrets.php', 'config/secrets.php', 'api/config/secrets.php', 'api/.env', 'api/tests', 'api/database'];
for (const name of forbiddenOutside) if (files.some((file) => posix(file) === name || posix(file).startsWith(`${name}/`))) problems.push(`Chemin interdit présent : ${name}`);
await writeFile(join(output, 'MANIFEST.txt'), `${manifest.map((item) => `${item.sha256}  ${String(item.size).padStart(9)}  htdocs/${item.name}`).join('\n')}\n`);
if (problems.length) {
  console.error(`Paquet REFUSÉ :\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Paquet prêt : ${manifest.length} fichiers dans ${relative(root, htdocs)}, manifeste ${relative(root, join(output, 'MANIFEST.txt'))}. Aucun fichier n'a été téléversé.`);
