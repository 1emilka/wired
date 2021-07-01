# Wired
Веб-интерфейс для управления Wireguard
## Установка
```shell
mkdir wired && cd wired
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
docker run -d --cap-add=NET_ADMIN \
      -e WIRED_HOST=<ВАШЕ_ИМЯ_ХОСТА> \
      -p 443:443/udp -p 80:80 -p 3001:3001 $(docker build -q -f wired.Dockerfile .)
```
## Возможные аргументы контейнера
Наименование | Описание | По умолчанию
--- | --- | ---
WIRED_HOST | Хост для подключения к VPN (работает в паре с WIRED_PORT) | localhost
WIRED_VPNPORT | UDP-порт подключения к VPN | 443
WIRED_NETWORK | Сеть VPN | 10.100.0.0/24
WIRED_INTERFACE | Название сетевого интерфейса | wired
WIRED_WEBPORT | Порт веб-интерфейса | 80