# Wired
Веб-интерфейс для управления Wireguard
## Установка
```shell
wget https://github.com/1emilka/wired/raw/master/docker/docker-compose.yml
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
# Не забудьте изменить WIRED_HOST на имя своего хоста в docker-compose.yml
docker-compose up -d
```
## Возможные аргументы (переменные среды) контейнера
Наименование | Описание | По умолчанию
--- | --- | ---
WIRED_HOST | Хост для подключения к VPN | localhost
WIRED_NETWORK | Сеть VPN | 10.100.0.0/24
WIRED_INTERFACE | Название сетевого интерфейса | wired