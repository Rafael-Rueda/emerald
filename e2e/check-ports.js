/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
http.get('http://localhost:3333/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('API:', res.statusCode, data));
}).on('error', err => console.log('API Error:', err.message));

http.get('http://localhost:3101/', (res) => {
  console.log('WS:', res.statusCode);
}).on('error', err => console.log('WS Error:', err.message));

http.get('http://localhost:3100/', (res) => {
  console.log('Docs:', res.statusCode);
}).on('error', err => console.log('Docs Error:', err.message));
