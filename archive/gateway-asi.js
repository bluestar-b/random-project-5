const http = require('http');
const httpProxy = require('http-proxy');

const servers = [
  { name: 'Server 1', address: 'localhost', port: 3000 },
  { name: 'Server 2', address: 'localhost', port: 3001 },
  { name: 'Server 3', address: 'localhost', port: 3002 }
];

const ipToServerMap = new Map();

const proxy = httpProxy.createProxyServer();

const server = http.createServer((req, res) => {
  const clientIP = req.connection.remoteAddress;
  console.log(ipToServerMap)
  if (ipToServerMap.has(clientIP)) {
    const { serverInfo, timeoutId } = ipToServerMap.get(clientIP);

    clearTimeout(timeoutId);

    const newTimeoutId = setTimeout(() => {
      ipToServerMap.delete(clientIP);
      console.log(`Assignment timeout for ${clientIP}`);
    }, 2 * 60 * 1000); // 2 minutes in milliseconds

    ipToServerMap.set(clientIP, { serverInfo, timeoutId: newTimeoutId });

    proxy.web(req, res, { target: `http://${serverInfo.address}:${serverInfo.port}` }, handleProxyError);
  } else {
    const target = servers[ipToServerMap.size % servers.length];
    const timeoutId = setTimeout(() => {
      ipToServerMap.delete(clientIP);
      console.log(`Assignment timeout for ${clientIP}`);
    }, 2 * 60 * 1000); // 2 minutes in milliseconds

    ipToServerMap.set(clientIP, { serverInfo: target, timeoutId });

    proxy.web(req, res, { target: `http://${target.address}:${target.port}` }, handleProxyError);
  }
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy server error:', err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy server error');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Load balancer running on port ${PORT}`);
});

function handleProxyError(err, req, res) {
  console.error('Proxy error:', err);
  if (err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND')) {
    console.error(`Request dropped: ${req.method} ${req.url}`);
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Service Unavailable');
  } else {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error');
  }
}

