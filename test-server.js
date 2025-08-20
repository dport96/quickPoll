const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Prevent HTTPS upgrade
  res.setHeader('Strict-Transport-Security', 'max-age=0');
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Server</title>
        <style>body { font-family: Arial; padding: 20px; }</style>
      </head>
      <body>
        <h1>Test Server Working!</h1>
        <p>If you can see this with styles, the server is working correctly.</p>
        <p>Server IP: 128.171.195.8:3001</p>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(3002, () => {
  console.log('Test server running on http://128.171.195.8:3002');
  console.log('Try accessing this URL to test if HTTP works');
});
