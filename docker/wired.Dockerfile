FROM alpine:3.14
LABEL maintainer = "Emil Khayrullin <hajrullin.emil-r02@net.ugatu.su>"

ARG WIRED_HOST=localhost
ARG WIRED_NETWORK=10.0.0.0/24
ARG WIRED_INTERFACE=wired
ARG WIRED_VPNPORT=443

ENV WIRED_HOST=${WIRED_HOST}
ENV WIRED_NETWORK=${WIRED_NETWORK}
ENV WIRED_INTERFACE=${WIRED_INTERFACE}
ENV WIRED_VPNPORT=${WIRED_VPNPORT}

RUN apk update && apk upgrade && apk add --no-cache -U git wireguard-tools nodejs npm iptables curl bind
RUN mkdir /wired && cd /wired && git clone https://github.com/1emilka/wired . && mkdir conf
COPY named.conf /etc/bind
RUN sed -i -e "s|<WIRED_NETWORK>|$WIRED_NETWORK|g" /etc/bind/named.conf
RUN named
WORKDIR /wired/server
VOLUME /wired/conf
RUN npm i -g nodemon && npm i
EXPOSE ${WIRED_VPNPORT}/udp
CMD npm run start