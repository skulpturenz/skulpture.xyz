FROM golang:alpine AS build

WORKDIR /build

COPY . .

RUN go build

FROM scratch

COPY --from=build /build/landing /landing

ENTRYPOINT [ "/landing" ]
