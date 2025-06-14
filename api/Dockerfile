FROM golang:alpine AS build

RUN apk update && apk upgrade && apk add --no-cache ca-certificates tzdata
RUN update-ca-certificates

WORKDIR /build

COPY . .

RUN go build

FROM scratch

COPY --from=build /build/landing /landing
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo

ENTRYPOINT [ "/landing" ]
