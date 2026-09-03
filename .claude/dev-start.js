process.env.DATA_DIR = process.env.DATA_DIR || require('path').join(__dirname, 'local-data');
require('../server.js');
