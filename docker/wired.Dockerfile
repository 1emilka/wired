FROM alpine:3.14
LABEL maintainer = "Emil Khayrullin <hajrullin.emil-r02@net.ugatu.su>"

ARG WIRED_HOST=localhost
ARG WIRED_NETWORK=10.100.0.0/24
ARG WIRED_INTERFACE=wired

ENV WIRED_HOST="${WIRED_HOST}"
ENV WIRED_NETWORK="${WIRED_NETWORK}"
ENV WIRED_INTERFACE="${WIRED_INTERFACE}"

RUN apk update && apk upgrade && apk add -U git wireguard-tools nodejs npm iptables curl
RUN mkdir /wired && cd /wired && git clone https://github.com/1emilka/wired . && mkdir conf
WORKDIR /wired/server
VOLUME /wired/conf
RUN npm i -g nodemon && npm i
EXPOSE 443/udp
CMD npm run start