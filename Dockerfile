FROM node:15-alpine AS builder
RUN apk add git
COPY . /workdir
WORKDIR /workdir
RUN git clean -dffx
RUN yarn pack

FROM node:15-alpine
COPY --from=builder /workdir/exposr*.tgz /tmp
RUN yarn add /tmp/exposr*.tgz && \
    rm /tmp/exposr*.tgz

USER nobody
EXPOSE 8080
ENTRYPOINT ["/node_modules/exposr/exposr"]
