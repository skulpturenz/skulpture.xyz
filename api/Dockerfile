FROM golang:alpine AS build

RUN apk update && apk upgrade && apk add --no-cache ca-certificates tzdata
RUN update-ca-certificates

WORKDIR /build

COPY . .

RUN go build

FROM alpine

COPY --from=build /build/landing /landing

ENTRYPOINT [ "/landing" ]
