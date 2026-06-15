import net from 'net';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Menedżer routingu wielościeżkowego dla OpenCode MAS.
 * Obsługuje ClearNet, lokalne proxy, oraz trasowanie przez sieć Tor (SOCKS5h).
 */

export class NetworkRouter {
    constructor() {
        this.clearNetProxy = process.env.HTTP_PROXY || null;
        // Domyślny port Tor na lokalnej maszynie to 9050
        this.torSocksUrl = process.env.TOR_SOCKS_URL || 'socks5h://127.0.0.1:9050';
        this.torControlPort = parseInt(process.env.TOR_CONTROL_PORT || '9051', 10);
        this.torControlPassword = process.env.TOR_CONTROL_PASSWORD || '';
        
        // Zaufanie certyfikatom Enterprise
        if (process.env.NODE_EXTRA_CA_CERTS) {
            console.log(`[Router] Załadowano własne certyfikaty CA: ${process.env.NODE_EXTRA_CA_CERTS}`);
        }
    }

    /**
     * Zwraca agenta HTTP/HTTPS, który może być przypięty do np. Node fetch.
     */
    getTorAgent() {
        console.log(`[Router] Kierowanie ruchu przez Tor (SOCKS5h): ${this.torSocksUrl}`);
        // socks5h: Wymusza rozwiązywanie DNS po stronie węzła wyjściowego Tor, zapobiegając wyciekom.
        return new SocksProxyAgent(this.torSocksUrl);
    }

    /**
     * Uruchamia zmianę tożsamości IP (SIGNAL NEWNYM) przez protokół kontrolny Tor.
     */
    async rotateIdentity() {
        return new Promise((resolve, reject) => {
            console.log('[Router] Żądanie zmiany tożsamości Tor (IP Rotation)...');
            const client = net.connect(this.torControlPort, '127.0.0.1', () => {
                // Sekwencja autoryzacyjna
                client.write(`AUTHENTICATE "${this.torControlPassword}"\r\n`);
                client.write('SIGNAL NEWNYM\r\n');
                client.write('QUIT\r\n');
            });

            client.on('data', (data) => {
                const response = data.toString();
                if (response.includes('250 OK')) {
                    console.log('[Router] Tor zaakceptował sygnał NEWNYM. Tożsamość rotowana.');
                    resolve(true);
                }
            });

            client.on('error', (err) => {
                console.error(`[Router] Błąd połączenia z portem kontrolnym Tor: ${err.message}`);
                reject(err);
            });
        });
    }
}
