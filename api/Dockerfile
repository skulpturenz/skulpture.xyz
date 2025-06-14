FROM golang:alpine AS build

WORKDIR /build

COPY . .

RUN go build

FROM scratch

COPY --from=build /build/landing /landing
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENTRYPOINT [ "/landing" ]
