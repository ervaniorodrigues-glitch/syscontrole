// Script de inicialização que escolhe o servidor correto
// No Render, sempre usa PostgreSQL
// Localmente, usa SQLite

console.log('🔍 Verificando ambiente...');
console.log('   DATABASE_URL existe?', !!process.env.DATABASE_URL);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);

// Se DATABASE_URL existe OU se PORT é diferente de 3000 (Render usa porta aleatória)
const isRender = process.env.DATABASE_URL || (process.env.PORT && process.env.PORT !== '3000');

if (isRender) {
    console.log('🐘 Ambiente: RENDER - Usando PostgreSQL');
    require('./server-postgres.js');
} else {
    console.log('📁 Ambiente: LOCAL - Usando SQLite');
    require('./server.js');
}
