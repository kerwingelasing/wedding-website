// Runs before every `firebase deploy` (predeploy in firebase.json). The live site must match
// what's on GitHub, so deploying is blocked until every change is committed and pushed.
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function fail(msg) {
  console.error(`\nDeploy blocked: ${msg}\n`);
  process.exit(1);
}

try {
  git('rev-parse', '--is-inside-work-tree');
} catch {
  fail('this folder is not a git repository.');
}

const changes = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trimEnd();
if (changes) {
  fail(`you have changes that aren't committed:\n${changes}\nCommit them and push to GitHub, then deploy again.`);
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
let upstream;
try {
  upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
} catch {
  fail(`branch "${branch}" isn't on GitHub yet. Run: git push -u origin ${branch}`);
}

try {
  git('fetch', '--quiet', upstream.split('/')[0]);
} catch {
  fail("couldn't reach GitHub to check what's pushed. Check your connection and try again.");
}

const ahead = Number(git('rev-list', '--count', `${upstream}..HEAD`));
const behind = Number(git('rev-list', '--count', `HEAD..${upstream}`));
if (ahead) fail(`${ahead} commit${ahead === 1 ? '' : 's'} on "${branch}" not pushed yet. Run: git push`);
if (behind) fail(`GitHub has ${behind} newer commit${behind === 1 ? '' : 's'} on ${upstream}. Run: git pull, check the site, then deploy.`);

console.log(`Git check passed: ${branch} matches ${upstream} (${git('rev-parse', '--short', 'HEAD')}).`);
