# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2-alpine AS development
ARG HUGO_VERSION=0.166.0
ARG TARGETARCH
RUN apk add --no-cache curl ca-certificates tzdata \
 && curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" -o /tmp/hugo.tar.gz \
 && curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_checksums.txt" -o /tmp/checksums.txt \
 && awk -v name="hugo_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" '$2 == name {print $1 "  /tmp/hugo.tar.gz"}' /tmp/checksums.txt > /tmp/checksum.txt \
 && test -s /tmp/checksum.txt \
 && sha256sum -c /tmp/checksum.txt \
 && tar -xzf /tmp/hugo.tar.gz -C /usr/local/bin hugo \
 && rm /tmp/hugo.tar.gz /tmp/checksums.txt /tmp/checksum.txt
WORKDIR /site
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
EXPOSE 1313
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
FROM development AS build
ARG SITE_BASE_URL
RUN bun run format:check && bun run test && bun run build
FROM caddy:2.11.4-alpine AS production
LABEL com.extroonie.app="website"
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /site/dist /srv
EXPOSE 8080
