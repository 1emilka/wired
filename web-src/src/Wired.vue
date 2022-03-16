<script>
import {Modal} from 'bootstrap';
import QRious from 'qrious';
import {library} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {
    faUserPlus,
    faDownload,
    faMobile,
    faChevronUp,
    faChevronDown,
    faHeartPulse,
    faCheck,
    faTimes,
    faFaceFrown,
    faArrowsRotate,
    faQrcode,
    faLock,
    faUnlock,
    faBars,
    faFaceSmile,
} from '@fortawesome/free-solid-svg-icons';
export default {
    components: {
        FontAwesomeIcon,
    },
    data: _ => ({
        ws: null,
        server: {
            gateway: '',
            publicKey: '',
            endpoint: '',
            network: '',
            possibleIPs: [],
        },
        peers: [],
        onepeer: {
            id: -1,
            ip: '',
            name: '',
        },
        qrUrl: '',
    }),
    methods: {
        getConfig(peerIndex) {
            let configStr = '';
            if (this.peers.hasOwnProperty(peerIndex)) {
                configStr = '[Interface]\n';
                configStr += `PrivateKey = ${this.peers[peerIndex].keys.private}\n`;
                configStr += `Address = ${this.peers[peerIndex].ip}/32\n`;
                configStr += `DNS = ${this.server.gateway}\n\n`;
                configStr += '[Peer]\n';
                configStr += `PublicKey = ${this.server.publicKey}\n`;
                configStr += `AllowedIPs = ${this.server.network}\n`;
                configStr += `Endpoint = ${this.server.endpoint}\n`;
                configStr += 'PersistentKeepalive = 25';
            }
            return configStr;
        },
        toggleAdmin(peerIndex) {
            if (this.peers.hasOwnProperty(peerIndex)) {
                this.onepeer.id = peerIndex;
                this.wsSend({
                    cmd: 'peers',
                    action: 'admin',
                    index: this.onepeer.id,
                });
                this.onepeer.id = -1;
            }
        },
        fileConfig(peerIndex) {
            if (this.peers.hasOwnProperty(peerIndex)) {
                let configStr = this.getConfig(peerIndex);
                let link = document.createElement('a');
                link.download = 'wired.conf';
                let blob = new Blob([configStr], {type: 'text/plain'});
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            }
        },
        qrConfig(peerIndex) {
            if (this.peers.hasOwnProperty(peerIndex)) {
                let value = this.getConfig(peerIndex);
                let qr = new QRious({
                    value,
                    size: 500,
                    level: 'H',
                });
                this.qrUrl = qr.toDataURL('image/jpeg');
                new Modal(document.getElementById('qrpeer_modal')).show();
            }
        },
        preNewPeer() {
            new Modal(document.getElementById('newpeer_modal')).show();
        },
        preDelPeer(peerIndex) {
            if (this.peers.hasOwnProperty(peerIndex)) {
                this.onepeer.id = peerIndex;
                new Modal(document.getElementById('delpeer_modal')).show();
            }
        },
        newPeer() {
            this.wsSend({
                cmd: 'peers',
                action: 'add',
                ip: this.onepeer.ip,
                name: this.onepeer.name,
            });
            this.onepeer = {
                id: -1,
                ip: '',
                name: '',
            };
            Modal.getInstance(document.getElementById('newpeer_modal')).hide();
        },
        delPeer() {
            this.wsSend({
                cmd: 'peers',
                action: 'del',
                index: this.onepeer.id,
            });
            this.onepeer.id = -1;
            Modal.getInstance(document.getElementById('delpeer_modal')).hide();
        },
        reloadConfig() {
            this.wsSend({
                cmd: 'peers',
                action: 'all',
            });
            // this.wsSend({
            //     cmd: 'reload',
            //     action: 'interface',
            // });
        },
        wsSend(obj) {
            let ok = false;
            try {
                this.ws.send(JSON.stringify(obj));
                ok = true;
            } catch (e) {
            }
            return ok;
        },
        wsMessages(ev) {
            let json = JSON.parse(ev.data);
            if (json && json.ok) {
                switch (json.cmd) {
                    case 'peers':
                        switch (json.action) {
                            case 'all':
                                this.peers = json.peers;
                                this.server = json.server;
                                break;
                            case 'add':
                                if (json.hasOwnProperty('possible_ips'))
                                    this.server.possibleIPs = json.possible_ips;
                                break;
                            case 'admin':
                                break;
                        }
                        break;
                }
            }
        },
        wsAlert(msg) {
            let al = document.createElement('div');
            al.setAttribute('class', 'alert alert-warning alert-dismissible my-3 fade show');
            al.setAttribute('role', 'alert');
            al.innerHTML = msg + '<button type="button" data-bs-dismiss="alert" class="btn-close"></button>';
            document.querySelector('#app').prepend(al);
        },
        shortBytes(bytes) {
            let ci = ['байт', 'Кб', 'Мб', 'Гб', 'Пб'], c = 0, tmp = bytes;
            for (; tmp >= 1024; c++) tmp /= 1024.;
            return tmp.toFixed(1) + ' ' + ci[c];
        }
    },
    created() {
        library.add(
            faUserPlus,
            faDownload,
            faMobile,
            faChevronUp,
            faChevronDown,
            faHeartPulse,
            faCheck,
            faTimes,
            faFaceFrown,
            faArrowsRotate,
            faQrcode,
            faLock,
            faUnlock,
            faBars,
            faFaceSmile,
        );
        this.ws = new WebSocket('ws://' + location.hostname + ':3001');
        this.ws.addEventListener('message', this.wsMessages);
        this.wsSend({
            cmd: 'peers',
            action: 'all',
        });
    }
}
</script>
<template>
    <div class="container-md mt-2">
        <div class="row g-2">
            <div class="col-12">
                <div class="d-flex align-items-center">
                    <h1 class="flex-fill mb-0">wired</h1>
                    <button type="button" class="btn btn-primary" @click.prevent="preNewPeer">
                        <FontAwesomeIcon icon="user-plus"/>
                    </button>
                    <button type="button" class="btn btn-light text-black-50" @click.prevent="reloadConfig">
                        <FontAwesomeIcon icon="arrows-rotate"/>
                    </button>
                </div>
            </div>
            <template v-if="peers.length < 1">
                <div class="col-12">
                    <span class="text-muted">Нет ни одного пира. Добавьте нового, нажав на синюю кнопку выше!</span>
                </div>
            </template>
            <template v-else>
                <div class="col-12" v-for="(peer, peerIndex) in peers">
                    <div class="d-flex align-items-center">
                        <h3 class="flex-fill mb-0">{{ peer.name }}</h3>
                        <div class="col-auto btn-group d-none d-md-block">
                            <button type="button" class="btn btn-outline-light" disabled>
                                <span class="text-black-50 lh-1 me-1">{{ peer.online ? 'Онлайн' : 'Не в сети' }}</span>
                                <FontAwesomeIcon
                                    :icon="peer.online ? 'face-smile' : 'face-frown'"
                                    :class="'text-' + (peer.online ? 'success' : 'warning')"
                                    v-if="peer.online !== undefined"
                                />
                            </button>
                            <button
                                type="button" class="btn btn-light text-black-50"
                                @click.prevent="toggleAdmin(peerIndex)"
                                :title="peer.admin ? 'Исключить из администраторов' : 'Сделать администратором'"
                            >
                                <FontAwesomeIcon
                                    :icon="peer.admin ? 'unlock' : 'lock'"
                                />
                            </button>
                            <button type="button"
                                    class="btn btn-light text-black-50"
                                    @click.prevent="fileConfig(peerIndex)"
                                    title="Скачать конфигурацию wired.conf">
                                <FontAwesomeIcon
                                    icon="download"
                                />
                            </button>
                            <button type="button"
                                    class="btn btn-light text-black-50"
                                    @click.prevent="qrConfig(peerIndex)"
                                    title="QR-код конфигурации для смартфона">
                                <FontAwesomeIcon
                                    icon="qrcode"
                                />
                            </button>
                            <button type="button"
                                    class="btn btn-light"
                                    @click.prevent="preDelPeer(peerIndex)" title="Удалить пира">
                                <FontAwesomeIcon
                                    icon="times"
                                    class="text-danger"
                                />
                            </button>
                        </div>
                        <div class="col-auto d-inline-block d-md-none">
                            <div class="dropdown">
                                <button type="button" class="btn btn-light text-black-50 w-100" data-bs-toggle="dropdown" title="Действия с пользователем">
                                    <FontAwesomeIcon
                                        icon="bars"
                                    />
                                </button>
                                <div class="dropdown-menu">
                                    <a
                                        href="#"
                                        class="dropdown-item"
                                        @click.prevent="toggleAdmin(peerIndex)">{{ peer.admin ? '-Адм' : '+Адм' }}</a>
                                    <a
                                        href="#"
                                        class="dropdown-item"
                                        @click.prevent="fileConfig(peerIndex)">Конфигурация</a>
                                    <a
                                        href="#"
                                        class="dropdown-item"
                                        @click.prevent="qrConfig(peerIndex)">QR-код</a>
                                    <a
                                        href="#"
                                        class="dropdown-item text-danger"
                                        @click.prevent="preDelPeer(peerIndex)">Удалить</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="small text-muted lh-1">
                        <span class="me-1">{{ peer.ip }}</span>
                        <span class="me-1" v-if="peer.foreignpair">({{ peer.foreignpair }})</span>
                        <span class="me-1" v-if="peer.tx">
                            <FontAwesomeIcon
                                icon="chevron-down"
                                class="me-1"
                            />
                            <span>{{ shortBytes(peer.tx) }}</span>
                        </span>
                        <span v-if="peer.rx">
                            <FontAwesomeIcon
                                icon="chevron-up"
                                class="me-1"
                            />
                            <span>{{ shortBytes(peer.rx) }}</span>
                        </span>
                    </div>
                </div>
            </template>
            <div class="col-12">
                <div class="modal fade" id="newpeer_modal">
                    <div class="modal-dialog">
                        <div class="modal-content rounded-6 shadow border-0 py-2">
                            <div class="modal-body">
                                <form>
                                    <div class="mb-3">
                                        <label class="form-label" for="nameField">Имя</label>
                                        <input type="text" class="form-control" id="nameField" v-model="onepeer.name">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label" for="ipField">IP</label>
                                        <input type="text" class="form-control" id="ipField" list="ipList"
                                               v-model="onepeer.ip">
                                        <datalist id="ipList">
                                            <option v-for="possibleIP in server.possibleIPs">{{ possibleIP }}</option>
                                        </datalist>
                                        <small class="form-text" v-if="server.network && server.network.length > 1">Выбирайте
                                            доступный IP-адрес из сети {{ server.network }}</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-top-0">
                                <button type="button" class="btn btn-lg w-100 btn-primary" @click.prevent="newPeer">Добавить</button>
                                <button type="button" class="btn btn-lg w-100 btn-light" data-bs-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal fade" id="delpeer_modal">
                    <div class="modal-dialog">
                        <div class="modal-content rounded-6 shadow border-0 py-2">
                            <div class="modal-body">
                                <p>Подтвердите удаление нажатием на кнопку «Удалить» ниже</p>
                            </div>
                            <div class="modal-footer border-top-0">
                                <button type="button" class="btn btn-lg w-100 btn-danger" @click.prevent="delPeer">Удалить</button>
                                <button type="button" class="btn btn-lg w-100 btn-light" data-bs-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal fade" id="qrpeer_modal">
                    <div class="modal-dialog">
                        <div class="modal-content rounded-6 shadow border-0 py-2">
                            <div class="modal-body">
                                <img :src="qrUrl" class="img-fluid" alt="QR-код конфигурации">
                            </div>
                            <div class="modal-footer border-top-0">
                                <button type="button" class="btn btn-lg w-100 btn-light" data-bs-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style lang="scss">
    @import "assets/main";
</style>