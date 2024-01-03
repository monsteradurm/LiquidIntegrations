const localtunnel = require('localtunnel');
const MAX_RETRIES = 5;

const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'TunnelHelper', level: 'info' });

const createTunnel = async (port, retries = 0) => {
  const tunnel = await localtunnel({
    host: process.env.TUNNEL_SERVER_HOST,
    port,
    subdomain: process.env.TUNNEL_SUBDOMAIN,
  });
  const { url } = tunnel;

  const usedSubDomain = url.includes(process.env.TUNNEL_SUBDOMAIN);
  if (!usedSubDomain && retries < MAX_RETRIES) {
    console.warn('could not use requested subdomain, retrying');
    tunnel.close();
    return setTimeout(() => {
      createTunnel(port, ++retries);
    }, 200);
  }

  if (!usedSubDomain) {
    console.warn('could not use requested subdomain, generated a random one');
  }
  logger.info(`listening at localhost:${port} || tunnel: ${url}`);

  tunnel.on('close', () => {
    // tunnels are closed
  });
};

module.exports = { createTunnel };
