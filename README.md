# Wired
Веб-интерфейс для управления Wireguard
## Установка
```shell
make wired && cd wired
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
docker run -d -p 50443:443 -p 50080:80 $(docker build -q -f wired.Dockerfile .)
```
## Возможные аргументы
Наименование | Описание | По умолчанию
--- | --- | ---
WIRED_HOST | Хост для подключения к VPN (работает в паре с WIRED_PORT) | localhost
WIRED_VPNPORT | UDP-порт подключения к VPN | 443
WIRED_NETWORK | Сеть VPN | 10.100.0.0/24
WIRED_INTERFACE | Название сетевого интерфейса | wired
WIRED_WEBPORT | Порт веб-интерфейса | 80