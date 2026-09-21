import assert from 'node:assert/strict';
import {
	mkdtempSync,
	mkdirSync,
	copyFileSync,
	writeFileSync,
	readFileSync,
	existsSync,
	rmSync,
	statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = mkdtempSync(join(tmpdir(), 'extroonie-deploy-'));
try {
	const bin = join(root, 'bin');
	mkdirSync(bin);
	// Git is real; only Docker is simulated.
	writeFileSync(
		join(bin, 'docker'),
		`#!/bin/sh
set -eu
snapshot=''
if [ "\${1:-}" = compose ] && [ "\${2:-}" = --project-directory ]; then
  snapshot=$5
  shift 5
  set -- compose "$@"
fi
printf '%s %s [%s]\\n' "\${SITE_IMAGE:-unset}" "$*" "$snapshot" >> "$DEPLOY_LOG"
case "$*" in
  'compose version'|'info') exit 0 ;;
  'compose ps -q site')
    case "$snapshot" in
      *candidate.yaml) echo current-container ;;
      *current.yaml) echo restored-container ;;
      *) [ "$SCENARIO" = first-deploy ] || echo previous-container ;;
    esac ;;
  'compose config --images site') echo extroonie:local ;;
  'compose config --hash site')
    test "$SITE_IMAGE" = extroonie:previous
    printf 'site hash-%s\\n' "$(cat compose.yaml)" ;;
  'compose config site') printf 'name: test\\nservices:\\n  site:\\n    image: %s\\n    environment:\\n      RELEASE: %s\\n' "$SITE_IMAGE" "$(cat compose.yaml)" ;;
  'compose port site 8080') echo "127.0.0.1:\${SITE_PORT:-8080}" ;;
  'inspect --format {{.Image}} previous-container') echo sha256:previous ;;
  'inspect --format {{.Config.Image}} previous-container') echo extroonie:previous ;;
  'inspect --format {{index .Config.Labels "com.docker.compose.config-hash"}} previous-container')
    [ "$SCENARIO" = local-missing-hash ] || echo hash-old-config ;;
  'compose build --pull site')
    grep -q "RELEASE: $EXPECTED_CONFIG" "$snapshot"
    if [ "$SCENARIO" = local-dirty ]; then
      test "$(cat local.txt)" = 'keep me'
      test "$(cat staged.txt)" = 'staged change'
      test "$(cat unstaged.txt)" = 'unstaged change'
      test ! -f removed.txt
    fi
    [ "$SCENARIO" != build-failure ] ;;
  'compose up '*)
    case "$snapshot" in
      *previous.yaml)
        grep -q 'image: sha256:previous' "$snapshot"
        grep -q 'RELEASE: old-config' "$snapshot"
        [ "$SCENARIO" != rollback-failure ] ;;
      *candidate.yaml)
        case "$SCENARIO" in health-failure|cached-rollback|rollback-failure|local-health-failure) exit 1 ;; esac ;;
      *) exit 2 ;;
    esac ;;
  'compose logs '*) echo 'health check failed' ;;
  'image inspect '*) echo sha256:current ;;
  'image tag sha256:current extroonie:local'|'image tag sha256:previous extroonie:local') exit 0 ;;
  'image ls '*) printf 'extroonie:current sha256:current\\nextroonie:previous sha256:previous\\nextroonie:old sha256:old\\nunrelated:old sha256:unrelated\\n' ;;
  'image rm extroonie:old') exit 0 ;;
  *) echo "Unexpected Docker command: $*" >&2; exit 2 ;;
esac
`,
		{ mode: 0o755 },
	);
	function git(cwd, ...args) {
		const result = spawnSync('git', args, {
			cwd,
			encoding: 'utf8',
			env: {
				...process.env,
				GIT_AUTHOR_NAME: 'Test',
				GIT_AUTHOR_EMAIL: 'test@example.test',
				GIT_COMMITTER_NAME: 'Test',
				GIT_COMMITTER_EMAIL: 'test@example.test',
			},
		});
		assert.equal(result.status, 0, result.stderr);
		return result.stdout.trim();
	}
	for (const scenario of [
		'success',
		'first-deploy',
		'build-failure',
		'health-failure',
		'cached-rollback',
		'rollback-failure',
		'dirty-pull',
		'diverged',
		'local-clean',
		'local-dirty',
		'local-detached',
		'local-unborn',
		'local-health-failure',
		'local-unsaved-config',
		'local-stale-config',
		'local-missing-hash',
	]) {
		const pull = !scenario.startsWith('local-');
		const folder = join(root, scenario);
		const remote = join(folder, 'remote.git');
		const seed = join(folder, 'seed');
		const checkout = join(folder, 'checkout');
		mkdirSync(folder);
		git(folder, 'init', '--bare', remote);
		git(folder, 'init', '-b', 'main', seed);
		copyFileSync(resolve('.gitignore'), join(seed, '.gitignore'));
		copyFileSync(resolve('deploy.sh'), join(seed, 'deploy.sh'));
		writeFileSync(join(seed, 'compose.yaml'), 'old-config\n');
		for (const file of ['staged.txt', 'unstaged.txt', 'removed.txt']) writeFileSync(join(seed, file), 'original\n');
		git(seed, 'add', '.');
		git(seed, 'commit', '-m', 'Initial');
		git(seed, 'remote', 'add', 'origin', remote);
		git(seed, 'push', '-u', 'origin', 'main');
		git(folder, 'clone', '-b', 'main', remote, checkout);
		assert.equal(git(checkout, 'ls-files', 'deploy.sh'), 'deploy.sh');
		const state = join(checkout, '.git/extroonie-deploy');
		if (['cached-rollback', 'local-dirty', 'local-health-failure', 'local-stale-config'].includes(scenario)) {
			mkdirSync(state);
			writeFileSync(
				join(state, 'container'),
				scenario === 'local-stale-config' ? 'other-container\n' : 'previous-container\n',
			);
			writeFileSync(join(state, 'current.yaml'), 'image: sha256:previous\nRELEASE: old-config\n');
		}
		if (scenario === 'cached-rollback') {
			writeFileSync(join(checkout, 'compose.yaml'), 'failed-config\n');
			git(checkout, 'add', '.');
			git(checkout, 'commit', '-m', 'Earlier failed deployment');
			git(checkout, 'push');
			git(seed, 'pull', '--ff-only');
		}
		writeFileSync(join(seed, 'update.txt'), 'new release\n');
		writeFileSync(join(seed, 'compose.yaml'), 'new-config\n');
		git(seed, 'add', '.');
		git(seed, 'commit', '-m', 'Update');
		git(seed, 'push');
		if (scenario === 'dirty-pull') {
			writeFileSync(join(checkout, 'local.txt'), 'keep me');
			git(checkout, 'config', 'status.showUntrackedFiles', 'no');
		}
		if (scenario === 'local-dirty') {
			writeFileSync(join(checkout, 'local.txt'), 'keep me');
			writeFileSync(join(checkout, 'staged.txt'), 'staged change');
			git(checkout, 'add', 'staged.txt');
			writeFileSync(join(checkout, 'unstaged.txt'), 'unstaged change');
			rmSync(join(checkout, 'removed.txt'));
		}
		if (['local-dirty', 'local-health-failure', 'local-unsaved-config', 'local-stale-config'].includes(scenario))
			writeFileSync(join(checkout, 'compose.yaml'), 'new-config\n');
		if (scenario === 'local-detached') git(checkout, 'checkout', '--detach');
		if (scenario === 'local-unborn') {
			rmSync(join(checkout, '.git'), { recursive: true });
			git(checkout, 'init', '-b', 'main');
		}
		if (scenario === 'diverged') {
			writeFileSync(join(checkout, 'local.txt'), 'local commit');
			git(checkout, 'add', '.');
			git(checkout, 'commit', '-m', 'Local change');
		}
		const log = join(folder, 'docker.log');
		const beforeStatus = git(checkout, 'status', '--porcelain', '--untracked-files=normal');
		const beforeHead = git(checkout, 'rev-parse', '--revs-only', 'HEAD');
		const expectedConfig =
			pull || ['local-dirty', 'local-health-failure'].includes(scenario) ? 'new-config' : 'old-config';
		const run = spawnSync('sh', ['./deploy.sh', ...(pull ? ['--pull'] : [])], {
			cwd: checkout,
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `${bin}:${process.env.PATH}`,
				DEPLOY_LOG: log,
				SCENARIO: scenario,
				EXPECTED_CONFIG: expectedConfig,
			},
		});
		const calls = readFileSync(log, 'utf8');
		if (
			['success', 'first-deploy', 'local-clean', 'local-dirty', 'local-detached', 'local-unborn'].includes(
				scenario,
			)
		)
			assert.equal(run.status, 0, run.stdout + run.stderr);
		else assert.notEqual(run.status, 0, 'Expected deployment failure');
		assert(!existsSync(join(checkout, '.git/extroonie-deploy.lock')), 'Lock was not released');
		if (scenario === 'dirty-pull' || scenario === 'diverged') {
			assert(!calls.includes('compose build'), 'Built despite unsafe checkout');
			assert(existsSync(join(checkout, 'local.txt')), 'Local work lost');
			continue;
		}
		if (pull) assert(existsSync(join(checkout, 'update.txt')), 'Remote changes were not pulled');
		else {
			assert(!existsSync(join(checkout, 'update.txt')), 'Local deployment pulled remote changes');
			assert.equal(
				git(checkout, 'status', '--porcelain', '--untracked-files=normal'),
				beforeStatus,
				'Local work or staging changed',
			);
			assert.equal(
				git(checkout, 'rev-parse', '--revs-only', 'HEAD'),
				beforeHead,
				'Local deployment changed HEAD',
			);
			if (scenario === 'local-dirty' || scenario === 'local-unborn')
				assert.match(
					calls,
					/extroonie:[\w-]+-dirty-\d+-\d+ compose build/,
					'Uncommitted build lacks a dirty marker',
				);
		}
		if (['local-unsaved-config', 'local-stale-config', 'local-missing-hash'].includes(scenario)) {
			assert.match(run.stderr, /No saved configuration matches the running container/);
			assert(!calls.includes('compose build'), 'Built without a verified rollback configuration');
			assert(!calls.includes('compose up'), 'Replaced the running container without a recovery configuration');
			assert(!calls.includes('image rm'), 'Removed images without a recovery configuration');
			if (scenario === 'local-stale-config') {
				assert(readFileSync(join(state, 'current.yaml'), 'utf8').includes('RELEASE: old-config'));
				assert.equal(readFileSync(join(state, 'container'), 'utf8'), 'other-container\n');
			} else assert(!existsSync(join(state, 'current.yaml')), 'Saved unverified settings for recovery');
		}
		if (scenario === 'build-failure') {
			assert(!calls.includes('compose up'), 'Stopped serving after build failure');
			assert(
				readFileSync(join(state, 'current.yaml'), 'utf8').includes('RELEASE: old-config'),
				'Initial rollback configuration lost after failed build',
			);
		}
		if (['health-failure', 'cached-rollback', 'rollback-failure', 'local-health-failure'].includes(scenario)) {
			assert(calls.includes('previous.yaml]'), 'Rollback not attempted');
			assert(!calls.includes('image rm'), 'Cleanup ran after failed deployment');
			const recovery = readFileSync(join(state, 'current.yaml'), 'utf8');
			assert(recovery.includes('RELEASE: old-config'), 'Recovery configuration overwritten');
			assert(recovery.includes('image: sha256:previous'), 'Recovery image lost');
			if (scenario !== 'rollback-failure') {
				assert(calls.includes('image tag sha256:previous extroonie:local'), 'Stable tag was not restored');
				assert.equal(readFileSync(join(state, 'container'), 'utf8').trim(), 'restored-container');
			}
		}
		if (scenario === 'success') {
			assert(calls.indexOf('compose build') < calls.indexOf('compose up'));
			assert(calls.indexOf('compose up') < calls.indexOf('image rm'));
			assert(calls.includes('image rm extroonie:old'));
			assert(!calls.includes('image rm extroonie:previous'));
			assert(!calls.includes('image rm unrelated'));
			assert(calls.includes('image tag sha256:current extroonie:local'), 'Default Compose image would be stale');
			assert(readFileSync(join(state, 'current.yaml'), 'utf8').includes('RELEASE: new-config'));
			assert.equal(readFileSync(join(state, 'container'), 'utf8').trim(), 'current-container');
			assert.equal(
				statSync(join(state, 'current.yaml')).mode & 0o777,
				0o600,
				'Snapshot may contain private configuration',
			);
		}
	}
	console.log(
		'Passed: simulated working-file deployments, opt-in pulls, image tagging, verified rollback configuration, scoped cleanup, and real Git work preservation.',
	);
} finally {
	rmSync(root, { recursive: true, force: true });
}
