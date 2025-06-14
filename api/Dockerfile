FROM golang:alpine AS build

WORKDIR /build

COPY . .

RUN go build

FROM alpine

COPY --from=build /build/landing /landing

ENTRYPOINT [ "/landing" ]
