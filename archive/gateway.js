const http = require('http');
const httpProxy = require('http-proxy');

const servers = [
  { name: 'Server 1', address: 'localhost', port: 3000 },
  { name: 'Server 2', address: 'localhost', port: 3001 },
  { name: 'Server 3', address: 'localhost', port: 3002 }
];

let currentIndex = 0;

const proxy = httpProxy.createProxyServer();

const server = http.createServer((req, res) => {
  const startTime = new Date();
  const target = servers[currentIndex];
  currentIndex = (currentIndex + 1) % servers.length;

  // Proxy the request to the selected server
  proxy.web(req, res, { target: `http://${target.address}:${target.port}` }, (err) => {
    console.error('Proxy error:', err);

    // Check if the error indicates a dropped request
    if (err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND')) {
      console.error(`Request dropped: ${req.method} ${req.url}`);
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy error');
    }
  });

  const endTime = new Date();
  const responseTime = endTime - startTime;
  console.log(`Request from ${req.connection.remoteAddress} served by ${target.name} (${target.address}:${target.port}) - Response Time: ${responseTime}ms`);
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



