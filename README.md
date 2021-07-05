# Wired
Веб-интерфейс для управления Wireguard
## Установка
```shell
# Подготовка
wget https://github.com/1emilka/wired/raw/master/docker/docker-compose.yml
wget https://github.com/1emilka/wired/raw/master/docker/wired.Dockerfile
# Измените на имя своего хоста или внешний IP-адрес
sed -i -e "s/<WIRED_PSEUDOHOST>/$(uname -n)/g" docker-compose.yml
docker-compose up -d
# Если на предыдущем этапе Вы не исправляли WIRED_NETWORK
# и имя службы docker-compose, то данная команда выведет
# конфиг для администратора
docker exec wired curl -s http://10.100.0.1
```
## Обновление
```shell
docker exec wired git pull origin
docker commit wired
```
## Возможные аргументы (переменные среды) контейнера
Наименование | Описание | По умолчанию
--- | --- | ---
WIRED_HOST | Хост для подключения к VPN | localhost
WIRED_NETWORK | Сеть VPN | 10.100.0.0/24
WIRED_INTERFACE | Название сетевого интерфейса | wired