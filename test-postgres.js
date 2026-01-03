// Teste simples para verificar se PostgreSQL está funcionando
const { Pool } = require('pg');

console.log('🔍 Testando conexão PostgreSQL...');
console.log('DATABASE_URL existe?', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada!');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err);
        process.exit(1);
    }
    
    console.log('✅ Conectado ao PostgreSQL!');
    
    client.query('SELECT version()', (err, result) => {
        release();
        
        if (err) {
            console.error('❌ Erro na query:', err);
            process.exit(1);
        }
        
        console.log('✅ Versão PostgreSQL:', result.rows[0].version);
        console.log('✅ TESTE PASSOU!');
        process.exit(0);
    });
});
