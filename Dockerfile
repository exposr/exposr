ARG NODE_VERSION
ARG ALPINE_VERSION=3.19
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder
RUN apk add \
    build-base \
    cmake \
    python3 \
    curl \
    git
RUN touch /.yarnrc && chmod 666 /.yarnrc
RUN mkdir /.npm && chmod 777 /.npm
RUN npm -g install node-gyp
RUN git config --system --add safe.directory /workdir
WORKDIR /workdir
CMD ["/bin/sh"]

FROM builder AS dist
ENV NODE_ENV=production
ARG DIST_SRC
COPY ${DIST_SRC} /exposr.tgz
RUN tar xvf /exposr.tgz -C /
WORKDIR /package
RUN yarn install --production --no-default-rc --frozen-lockfile

FROM alpine:${ALPINE_VERSION} as runner
ENV NODE_ENV=production
COPY --from=dist /usr/local/bin/node /bin/node
COPY --from=dist /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6
COPY --from=dist /usr/lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1
COPY --from=dist /package/exposr.mjs /app/exposr.mjs
COPY --from=dist /package/node_modules /app/node_modules
RUN mkdir -p /entrypoint-initdb.d
COPY docker/entrypoint.sh /entrypoint.sh
WORKDIR /app

ENTRYPOINT ["/entrypoint.sh"]