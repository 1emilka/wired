'use strict';
// Библиотеки
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { spawnSync } = require('child_process');
// Конфигурация
let wired = {
    yaml: null, // Данные из yaml-конфигурации
    host: process.env.WIRED_HOST || 'localhost', // Внешний хост (или IP) для подключения к VPN
    network: process.env.WIRED_NETWORK || '10.0.0.0/24', // Подсеть
    interface: process.env.WIRED_INTERFACE || 'wired', // Интерфейс
    vpnPort: process.env.WIRED_VPNPORT || 443, // Порт для VPN
    webPort: 80, // Веб-порт
    callback(msg) { // Обработчик запросов от UI
        let jsr = {ok: false};
        if(wired.yaml === null) {
            jsr.m = 'cannot read config';
            return jsr;
        }
        let json = JSON.parse(msg);
        switch(json.cmd) {
            case 'peers': // Работа с пользователями
                switch(json.action) {
                    // Получить пользователей
                    case 'all':
                        jsr.cmd = 'peers';
                        jsr.action = 'all';
                        let cmd = spawnSync('wg', ['show', wired.interface, 'dump']);
                        let cmd_output = cmd.stdout.toString();
                        let peersByPublickey = [];
                        if(cmd_output.length > 0) {
                            let peers = cmd_output.split('\n').map(v => v.split('\t'));
                            peers.forEach(peer => {
                                if (peer[0] !== wired.yaml.server.keys.private && peer.length === 8) {
                                    peersByPublickey[peer[0]] = {
                                        online: peer[2] !== '(none)' && (Date.now() - peer[4] * 1000) <= 120000,
                                        foreignpair: peer[2],
                                        tx: +peer[5],
                                        rx: +peer[6],
                                    };
                                }
                            });
                        }
                        //---
                        jsr.ok = true;
                        jsr.server = {
                            publicKey: wired.yaml.server.keys.public,
                            endpoint: wired.host + ':' + wired.vpnPort,
                            network: wired.network,
                            gateway: wired.calculateGatewayIP(),
                            possibleIPs: wired.calculateIPs(),
                        };
                        jsr.peers = wired.yaml.peers.map(peer => {
                            let t = {
                                admin: peer.admin,
                                name: peer.name,
                                keys: peer.keys,
                                ip: peer.ip,
                                online: false,
                            };
                            if(peersByPublickey.hasOwnProperty(peer.keys.public)) {
                                t.tx = peersByPublickey[peer.keys.public].tx;
                                t.rx = peersByPublickey[peer.keys.public].rx;
                                t.online = peersByPublickey[peer.keys.public].online;
                                t.foreignpair =
                                    (t.foreignpair = peersByPublickey[peer.keys.public].foreignpair) !== '(none)' ?
                                        t.foreignpair : null;
                            }
                            return t;
                        });
                        break;
                    // Новый пользователь
                    case 'add':
                        jsr.cmd = 'peers';
                        jsr.action = 'add';
                        let privateKey = wired.genkey(),
                            publicKey = wired.pubkey(privateKey);
                        let name = json.name || ('user' + privateKey.substr(0, 5));
                        wired.yaml.peers.push({
                            name,
                            admin: false,
                            keys: {
                                private: privateKey,
                                public: publicKey,
                            },
                            ip: json.ip,
                        });
                        wired.update.yaml();
                        wired.update.conf();
                        wired.update.interface();
                        jsr.possible_ips = wired.calculateIPs();
                        jsr.ok = true;
                        break;
                    case 'admin':
                        jsr.cmd = 'peers';
                        jsr.action = 'admin';
                        if(json.hasOwnProperty('index') && wired.yaml.peers.hasOwnProperty(json.index)) {
                            wired.yaml.peers[json.index].admin = !!!wired.yaml.peers[json.index].admin;
                            wired.update.yaml();
                            wired.update.conf();
                            wired.update.interface();
                            jsr.ok = true;
                        } else jsr.m = 'need peer index';
                        break;
                    case 'del':
                        jsr.cmd = 'peers';
                        jsr.action = 'del';
                        if(json.hasOwnProperty('index') && wired.yaml.peers.hasOwnProperty(json.index)) {
                            wired.yaml.peers = wired.yaml.peers.filter((_, peerIndex) => {
                                return json.index !== peerIndex;
                            });
                            wired.update.yaml();
                            wired.update.conf();
                            wired.update.interface();
                            jsr.ok = true;
                        } else jsr.m = 'need peer index';
                        break;
                    default:
                        jsr.m = 'not implemented';
                }
                break;
            case 'reload':
                switch(json.action) {
                    case 'interface':
                        jsr.cmd = 'reload';
                        jsr.action = 'interface';
                        wired.update.interface();
                        jsr.ok = true;
                        jsr.cmd = 'reload';
                        break;
                    default:
                        jsr.m = 'not implemented';
                }
                break;
            default:
                jsr.m = 'cmd not found or invalid';
        }
        return jsr;
    },
    reload: {
        yaml() {
            if(wired.yaml === null) {
                try {
                    let configFile = fs.readFileSync(__dirname + '/../conf/wired.yml', 'utf8');
                    wired.yaml = yaml.load(configFile);
                    wired.vpnPort = wired.yaml.server.port;
                    wired.interface = wired.yaml.server.interface;
                    wired.network = wired.yaml.server.ip;
                } catch (e) { }
            }
        }
    },
    update: {
        yaml() {
            if(wired.yaml.hasOwnProperty('peers') && !Array.isArray(wired.yaml.peers)) wired.yaml.peers = [];
            let yamlStr = yaml.dump(wired.yaml);
            fs.writeFileSync(__dirname + '/../conf/wired.yml', yamlStr, {
                encoding: 'utf8',
                flags: 'w',
            });
        },
        conf() {
            let confStr = '';
            confStr += "[Interface]\n";
            confStr += `ListenPort = ${wired.yaml.server.port}\n`;
            confStr += `PrivateKey = ${wired.yaml.server.keys.private}\n`;
            confStr += '\n';
            wired.yaml.peers.forEach(peer => {
                confStr += "[Peer]\n";
                confStr += `PublicKey = ${peer.keys.public}\n`;
                confStr += `AllowedIPs = ${peer.ip}/32\n`;
                confStr += 'PersistentKeepalive = 25\n';
                confStr += '\n';
            });
            fs.writeFileSync(__dirname + '/../conf/wired.conf', confStr, {
                encoding: 'utf8',
                flags: 'w',
            });
        },
        interface() {
            let cmd = spawnSync('wg', ['syncconf', wired.interface, 'wired.conf'], {cwd: __dirname + '/../conf'});
            return cmd.status === 0;
        }
    },
    // Ключи
    genkey() {
        let cmd = spawnSync('wg', ['genkey']);
        return cmd.status === 0 ? cmd.stdout.toString().trim() : '';
    },
    pubkey(privatekey) {
        let cmd = spawnSync('wg', ['pubkey'], {input : privatekey});
        return cmd.status === 0 ? cmd.stdout.toString().trim() : '';
    },
    // Первый запуск
    checkHealthy() {
        // yaml-конфиг
        if(!fs.existsSync(__dirname + '/../conf/wired.yml')) {
            wired.yaml = {
                server: {
                    ip: wired.network,
                    interface: wired.interface,
                    port: wired.vpnPort,
                    keys: {
                        private: '',
                        public: '',
                    },
                    debug: false,
                },
                peers: [],
            };
            // Создание администратора
            let privateKey = wired.genkey(),
                publicKey = wired.pubkey(privateKey),
                availableIPs = wired.calculateIPs();
            if(availableIPs.length < 1)
                throw Error('create admin');
            let name = 'admin_' + publicKey.substr(0, 5);
            wired.yaml.peers.push({
                name,
                admin: true,
                keys: {
                    private: privateKey,
                    public: publicKey,
                },
                ip: availableIPs[0],
            });
            let serverPrivate = wired.genkey(), serverPublic = wired.pubkey(serverPrivate);
            if((serverPrivate + serverPublic).length === 88) {
                wired.yaml.server.keys.private = serverPrivate;
                wired.yaml.server.keys.public = serverPublic;
                wired.update.yaml();
                wired.update.conf();
            } else {
                throw Error('generate server keypair');
            }
        } else {
            wired.reload.yaml();
        }
        // conf-конфиг
        wired.update.conf();
        // Интерфейс
        let firewallRules = _ => {
            if(spawnSync('iptables', ['-t', 'nat', '-A', 'POSTROUTING', '-s', wired.network, '-o', 'eth0', '-j', 'MASQUERADE']).status !== 0)
                throw Error('postrouting rule');
            if(spawnSync('iptables', ['-A', 'INPUT', '-p', 'udp', '-m', 'udp', '--dport', wired.vpnPort, '-j', 'ACCEPT']).status !== 0)
                throw Error('accept vpn input rule');
            if(spawnSync('iptables', ['-A', 'FORWARD', '-i', wired.interface, '-j', 'ACCEPT']).status !== 0)
                throw Error('forward input rule');
            if(spawnSync('iptables', ['-A', 'FORWARD', '-o', wired.interface, '-j', 'ACCEPT']).status !== 0)
                throw Error('forward output rule');
        };
        let checkCmd = spawnSync('ip', ['link', 'show', wired.interface]);
        if(checkCmd.status !== 0) {
            if(spawnSync('ip', ['link', 'add', 'dev', wired.interface, 'type', 'wireguard']).status !== 0)
                throw Error('create interface');
            if(spawnSync('ip', ['addr', 'add', 'dev', wired.interface, wired.calculateGatewayIP(true)]).status !== 0)
                throw Error('add addr to interface');
            if(spawnSync('wg', ['setconf', wired.interface, 'wired.conf'], {cwd: __dirname + '/../conf'}).status !== 0)
                throw Error('set config to interface');
            if(spawnSync('ip', ['link', 'set', 'up', 'dev', wired.interface]).status !== 0)
                throw Error('up new interface');
            firewallRules();
        } else {
            let cmdOutput = checkCmd.stdout.toString();
            if(cmdOutput.indexOf('state DOWN') !== -1) {
                if(spawnSync('ip', ['link', 'set', 'up', 'dev', wired.interface]).status !== 0)
                    throw Error('up old interface');
                wired.update.interface();
                firewallRules();
            }
            if(spawnSync('wg', ['setconf', wired.interface, 'wired.conf'], {cwd: __dirname + '/../conf'}).status !== 0)
                throw Error('set config to interface');
        }
    },
    // IP
    calculateGatewayIP(withMask) {
        let networkArray = wired.network.split('/');
        let ip = false;
        let netMask = '';
        if(networkArray.length === 2) {
            let temp = new Uint32Array(2); temp[0] = temp[1] = 0;
            let rawIp = new Uint8Array(4);
            let subnet = networkArray[0].split('.');
            netMask = +networkArray[1];
            if(subnet.length === 4) {
                // Считаем IP подсети как 32-битное число
                subnet.forEach((subnetPart, i) => {
                    temp[0] += subnetPart << (8 * (3 - i));
                });
                temp[1] = ~((2 ** (32 - netMask)) - 1);
                temp[0] = temp[1] & temp[0];
                temp[0] += 1;
                for(let i = 0; i < 4; i++) rawIp[i] = temp[0] >> (8 * (3 - i));
                ip = rawIp.join('.');
            } else throw Error('invalid subnet in network')
        } else throw Error('calculate network');
        return ip + (withMask ? ('/' + netMask) : '');
    },
    calculateIPs() {
        let networkArray = wired.network.split('/');
        let ips = [];
        if(networkArray.length === 2) {
            let temp = new Uint32Array(2); temp[0] = temp[1] = 0;
            let rawIp = new Uint8Array(4);
            let subnet = networkArray[0].split('.');
            let netMask = +networkArray[1];
            if(subnet.length === 4) {
                // Считаем IP подсети как 32-битное число
                subnet.forEach((subnetPart, i) => {
                    temp[0] += subnetPart << (8 * (3 - i));
                });
                temp[1] = ~((2 ** (32 - netMask)) - 1);
                temp[0] = temp[1] & temp[0];
                temp[0] += 1; temp[1] += 1;
                while(temp[1] !== 0) {
                    temp[0] += 1; temp[1] += 1;
                    for(let i = 0; i < 4; i++) rawIp[i] = temp[0] >> (8 * (3 - i));
                    ips.push(rawIp.join('.'));
                }
            } else throw Error('invalid subnet in network')
        } else throw Error('calculate network');
        let currentIps = [];
        wired.yaml.peers.forEach(peer => {
            currentIps.push(peer.ip);
        })
        ips.filter(ip => {
            return !ip.includes(currentIps);
        });
        return ips;
    }
}
try {
    wired.checkHealthy();
    const wss = new WebSocket.Server({host: wired.calculateGatewayIP(), port: 3001});
    wss.on('connection', wsc => {
        wsc.on('message', msg => {
            wsc.send(JSON.stringify(wired.callback(msg)));
        });
    });
    http.createServer((req, res) => {
        let clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress;
        if([wired.calculateGatewayIP(), '127.0.0.1'].includes(clientIp)) {
            let configStr = '';
            let adminPeerIndex = wired.yaml.peers.findIndex(peer => peer.admin);
            if(adminPeerIndex >= 0) {
                configStr = `# config: ${wired.yaml.peers[adminPeerIndex].name}\n`;
                configStr += '[Interface]\n';
                configStr += `PrivateKey = ${wired.yaml.peers[adminPeerIndex].keys.private}\n`;
                configStr += `Address = ${wired.yaml.peers[adminPeerIndex].ip}/32\n`;
                configStr += 'DNS = ' + wired.calculateGatewayIP() + '\n\n';
                configStr += '[Peer]\n';
                configStr += `PublicKey = ${wired.yaml.server.keys.public}\n`;
                configStr += `AllowedIPs = ${wired.network}\n`;
                configStr += `Endpoint = ${wired.host}:${wired.vpnPort}\n`;
                configStr += 'PersistentKeepalive = 25';
            }
            res.writeHead(adminPeerIndex >= 0 ? 200 : 404, {'Content-Type': 'text/plain'});
            res.end(configStr);
        } else {
            let isAdmin = wired.yaml.peers.reduce((yes, peer) => (yes || (peer.admin && peer.ip === clientIp)), false);
            let fp = req.url.split('/').splice(1).join('/');
            fp = fp.length === 0  || fp.indexOf('..') !== -1 ? 'index.html' : fp;
            let contentType = ({
                '.html': 'text/html',
                '.htm': 'text/html',
                '.svg': 'image/svg+xml',
                '.woff': 'application/font-woff',
                '.js': 'text/javascript',
                '.css': 'text/css',
            })[path.extname(fp)];
            fp = __dirname + '/../web/' + fp;
            fs.readFile(fp, (e, c) => {
                if(wired.yaml.server.debug) console.log({clientIp, isAdmin, fp, httpCode: (e || !isAdmin) ? 404 : 200});
                res.writeHead((e || !isAdmin) ? 404 : 200, {'Content-Type': (e || !isAdmin) ? 'text/plain' : contentType});
                res.end((e || !isAdmin) ? 'error' : c, 'utf-8');
            });
        }
    }).listen(wired.webPort, wired.calculateGatewayIP());
} catch (e) {
    console.log('wired error');
    console.error(e);
}