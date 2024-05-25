FROM node:lts-alpine as base

RUN apk add git bash shadow gnupg curl && echo '/bin/bash' | chsh `whoami`

FROM base

RUN bash -c "corepack enable pnpm && pnpm config set store-dir /home/node/.local/share/pnpm/store"
