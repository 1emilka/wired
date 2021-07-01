FROM alpine:3.14

LABEL author = "Emil Khayrullin" \
      email  = "bdevelop+dev@ya.ru"

ARG WIRED_HOST=localhost
ARG WIRED_NETWORK=10.100.0.0/24
ARG WIRED_INTERFACE=wired
ARG WIRED_VPNPORT=443
ARG WIRED_WEBPORT=80

ENV WIRED_HOST="${WIRED_HOST}"
ENV WIRED_NETWORK="${WIRED_NETWORK}"
ENV WIRED_INTERFACE="${WIRED_INTERFACE}"
ENV WIRED_VPNPORT="${WIRED_VPNPORT}"
ENV WIRED_WEBPORT="${WIRED_WEBPORT}"

WORKDIR /root
RUN apk update && apk upgrade \
    && apk add -U git wireguard-tools nodejs npm
RUN git clone https://github.com/1emilka/wired && mkdir /root/wired/conf
WORKDIR /root/wired/server
VOLUME /root/wired/conf
RUN npm i -g nodemon && npm i
EXPOSE $WIRED_VPNPORT
EXPOSE $WIRED_WEBPORT
CMD npm run start