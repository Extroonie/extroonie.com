#!/bin/sh
set -eu

main() {
	case "$#:${1:-}" in
		0:) pull=false ;;
		1:--pull) pull=true ;;
		*) echo 'Usage: ./deploy.sh [--pull]' >&2; exit 2 ;;
	esac
	cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
	command -v git >/dev/null
	command -v docker >/dev/null
	docker compose version >/dev/null
	docker info >/dev/null

	lock_dir="$(git rev-parse --git-path extroonie-deploy.lock)"
	if ! mkdir "$lock_dir" 2>/dev/null; then
		echo "Another deployment is running. If it was interrupted, remove $lock_dir after checking." >&2
		exit 1
	fi
	trap 'rm -f "$lock_dir/previous.yaml" "$lock_dir/candidate.yaml"; rmdir "$lock_dir"' EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM

	if "$pull"; then
		if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
			echo 'The --pull option needs a clean checkout. Omit --pull to deploy local changes.' >&2
			exit 1
		fi
		branch=$(git symbolic-ref --quiet --short HEAD) || {
			echo 'Check out a branch to use --pull, or omit --pull to deploy the current files.' >&2
			exit 1
		}
	fi
	umask 077
	state_dir="$(git rev-parse --git-path extroonie-deploy)"
	mkdir -p "$state_dir"
	previous_container=$(docker compose ps -q site)
	previous_id=''
	if [ -n "$previous_container" ]; then
		previous_id=$(docker inspect --format '{{.Image}}' "$previous_container")
		if [ -f "$state_dir/current.yaml" ] && [ -f "$state_dir/container" ] &&
			[ "$(cat "$state_dir/container")" = "$previous_container" ]; then
			cp "$state_dir/current.yaml" "$lock_dir/previous.yaml"
		else
			previous_image=$(docker inspect --format '{{.Config.Image}}' "$previous_container")
			previous_hash=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$previous_container")
			config_hash=$(SITE_IMAGE=$previous_image docker compose config --hash site)
			if [ "$config_hash" != "site $previous_hash" ]; then
				echo 'No saved configuration matches the running container, and the current Compose settings differ.' >&2
				echo 'Restore its Compose settings before deploying so a failed replacement can be rolled back safely.' >&2
				exit 1
			fi
			SITE_IMAGE=$previous_id docker compose config site > "$lock_dir/previous.yaml"
			cp "$lock_dir/previous.yaml" "$state_dir/current.yaml"
			printf '%s\n' "$previous_container" > "$state_dir/container"
		fi
	fi
	if "$pull"; then
		remote=${DEPLOY_REMOTE:-origin}
		echo "Updating $branch from $remote..."
		git pull --ff-only "$remote" "$branch"
	fi

	stable_image=$(docker compose config --images site)
	case "$stable_image" in
		''|*@*|*[[:space:]]*) echo 'The site image must be a single, taggable image name.' >&2; exit 1 ;;
	esac
	revision=$(git rev-parse --short=12 HEAD 2>/dev/null || printf 'local')
	if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
		revision="$revision-dirty"
	fi
	SITE_IMAGE="extroonie:$revision-$(date -u +%Y%m%d%H%M%S)-$$"
	export SITE_IMAGE
	docker compose config site > "$lock_dir/candidate.yaml"
	echo 'Building and validating the replacement while the existing site keeps running...'
	compose_candidate build --pull site
	if ! compose_candidate up -d --no-deps --no-build --wait --wait-timeout 60 site; then
		echo 'Replacement failed its health check.' >&2
		compose_candidate logs --tail 50 site >&2 || true
		if [ -n "$previous_id" ]; then
			echo "Restoring the previous image and Compose configuration..." >&2
			docker compose --project-directory "$PWD" -f "$lock_dir/previous.yaml" up -d --no-deps --no-build --wait --wait-timeout 60 site || {
				echo "Automatic rollback failed; recovery configuration: $state_dir/current.yaml" >&2
				cp "$lock_dir/previous.yaml" "$state_dir/current.yaml"
				exit 1
			}
			docker image tag "$previous_id" "$stable_image"
			cp "$lock_dir/previous.yaml" "$state_dir/current.yaml"
			docker compose --project-directory "$PWD" -f "$state_dir/current.yaml" ps -q site > "$state_dir/container"
			echo "Rolled back. Use docker compose --project-directory '$PWD' -f '$state_dir/current.yaml' for the restored configuration until the next successful deployment." >&2
		fi
		exit 1
	fi

	current_id=$(docker image inspect --format '{{.Id}}' "$SITE_IMAGE")
	docker image tag "$current_id" "$stable_image"
	cp "$lock_dir/candidate.yaml" "$state_dir/current.yaml"
	compose_candidate ps -q site > "$state_dir/container"
	echo 'Removing older site images; keeping the current and previous images...'
	docker image ls --filter label=com.extroonie.app=website --format '{{.Repository}}:{{.Tag}} {{.ID}}' --no-trunc |
		while read -r image_name image_id; do
			[ "$image_id" != "$current_id" ] || continue
			[ "$image_id" != "$previous_id" ] || continue
			case "$image_name" in
				extroonie:*) docker image rm "$image_name" || true ;;
				'<none>:<none>') docker image rm "$image_id" || true ;;
			esac
		done
	echo "Deployed $revision. Listening on:"
	compose_candidate port site 8080
}

compose_candidate() {
	docker compose --project-directory "$PWD" -f "$lock_dir/candidate.yaml" "$@"
}

main "$@"
