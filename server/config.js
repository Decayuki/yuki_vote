require('dotenv').config();
const path = require('path');

module.exports = {
    port: process.env.PORT || 3001,
    host: '0.0.0.0',  // Permet l'accès depuis n'importe quelle interface réseau
    corsOrigin: '*',  // Permet l'accès depuis n'importe quelle origine
    dbPath: path.join(__dirname, 'database.sqlite')
};
