FROM node:lts-alpine AS base

RUN apk add git bash shadow gnupg curl bash-completion && echo '/bin/bash' | chsh `whoami`
RUN git config --global pager.branch false

FROM base

RUN apk add git-lfs && git lfs install

RUN bash -c "corepack enable pnpm && pnpm config set store-dir /home/node/.local/share/pnpm/store"
