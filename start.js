// Script de inicialização que escolhe o servidor correto
// No Render, sempre usa PostgreSQL
// Localmente, usa SQLite

const isLocal = !process.env.DATABASE_URL;

if (isLocal) {
    console.log('📁 Iniciando com SQLite (Local)...');
    require('./server.js');
} else {
    console.log('🐘 Iniciando com PostgreSQL (Render)...');
    require('./server-postgres.js');
}
