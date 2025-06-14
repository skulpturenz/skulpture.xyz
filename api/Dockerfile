FROM golang:alpine AS build

RUN apk update && apk upgrade && apk add --no-cache ca-certificates tzdata
RUN update-ca-certificates

WORKDIR /build

COPY . .

RUN go build

FROM scratch

COPY --from=build /build/landing /landing
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

ENTRYPOINT [ "/landing" ]
