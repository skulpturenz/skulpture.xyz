FROM golang:alpine as base

RUN go install github.com/mitranim/gow@latest
RUN apk add git bash shadow gnupg curl python3 py3-pip && echo '/bin/bash' | chsh `whoami`

FROM base

RUN bash -c "curl https://sdk.cloud.google.com > /tmp/install-gcloud.sh" && bash /tmp/install-gcloud.sh --disable-prompts
ENV PATH="${PATH}:/root/google-cloud-sdk/bin"
