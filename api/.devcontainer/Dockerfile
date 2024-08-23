FROM golang:alpine AS base

RUN go install github.com/mitranim/gow@latest
RUN apk add git bash shadow gnupg curl python3 py3-pip bash-completion && echo '/bin/bash' | chsh `whoami`
RUN git config --global pager.branch false

FROM base

RUN apk add git-lfs && git lfs install

RUN bash -c "curl https://sdk.cloud.google.com > /tmp/install-gcloud.sh" && bash /tmp/install-gcloud.sh --disable-prompts
ENV PATH="${PATH}:/root/google-cloud-sdk/bin"
