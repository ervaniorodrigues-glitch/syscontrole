// Script de inicialização que escolhe o servidor correto
const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');

if (isPostgres) {
    console.log('🐘 Iniciando com PostgreSQL (Render)...');
    require('./server-postgres.js');
} else {
    console.log('📁 Iniciando com SQLite (Local)...');
    require('./server.js');
}
