# Wired
Веб-интерфейс для управления Wireguard
## Установка
### docker run
```shell
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
docker run -d --cap-add=NET_ADMIN \
      -e WIRED_HOST=<ВАШЕ_ИМЯ_ХОСТА> \
      -p 443:443/udp -p 80:80 -p 3001:3001 $(docker build -q -f wired.Dockerfile .)
```
### docker-compose
```shell
wget https://github.com/1emilka/wired/raw/master/docker/docker-compose.yml
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
# Не забудьте изменить WIRED_HOST на имя своего хоста в docker-compose.yml
docker-compose up -d
```
## Возможные аргументы контейнера
Наименование | Описание | По умолчанию
--- | --- | ---
WIRED_HOST | Хост для подключения к VPN (работает в паре с WIRED_PORT) | localhost
WIRED_VPNPORT | UDP-порт подключения к VPN | 443
WIRED_NETWORK | Сеть VPN | 10.100.0.0/24
WIRED_INTERFACE | Название сетевого интерфейса | wired
WIRED_WEBPORT | Порт веб-интерфейса | 80