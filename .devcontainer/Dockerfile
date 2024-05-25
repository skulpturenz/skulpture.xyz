FROM node:lts-alpine

RUN apk add git bash shadow gnupg
RUN echo '/bin/bash' | chsh `whoami`

RUN bash -c "corepack enable pnpm"
RUN bash -c "pnpm config set store-dir /home/node/.local/share/pnpm/store"
