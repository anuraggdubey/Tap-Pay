const http = require('node:http');
const {createDevServerMiddleware} = require('@react-native-community/cli-server-api');

const {middleware} = createDevServerMiddleware({host: 'localhost', port: 0, watchFolders: []});
const server = http.createServer(middleware);
server.listen(0, '127.0.0.1', () => process.send(server.address().port));
