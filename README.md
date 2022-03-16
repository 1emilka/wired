# Wired
Веб-интерфейс для управления Wireguard
## Быстрая установка
```shell
# Важно! Приватная сеть, порт по умолчанию указаны ниже в разделе «Аргументы сборки образа»
curl -sL https://github.com/1emilka/wired/raw/master/docker/install-wired | sh
docker exec wired curl -s http://10.0.0.1
```
## Обновление
```shell
docker exec wired git pull origin
docker commit wired
```
## Аргументы сборки образа
|  Наименование   |           Описание           |      По умолчанию       |
|:---------------:|:----------------------------:|:-----------------------:|
|   WIRED_HOST    |  Хост для подключения к VPN  | $(uname -n) / localhost |
|  WIRED_NETWORK  |           Сеть VPN           |       10.0.0.0/24       |
|  WIRED_VPNPORT  |           Порт VPN           |           443           |
| WIRED_INTERFACE | Название сетевого интерфейса |          wired          |