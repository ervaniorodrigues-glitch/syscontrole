// db-config.js - Configuração do banco de dados
// Suporta SQLite (local) e PostgreSQL (Render.com)

const DATABASE_URL = process.env.DATABASE_URL;

let db;

if (DATABASE_URL) {
    // Produção - PostgreSQL
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    // Wrapper para manter compatibilidade com API do SQLite
    db = {
        _pool: pool,
        _isPostgres: true,
        
        all: function(sql, params, callback) {
            const pgSql = this._convertSql(sql);
            this._pool.query(pgSql, params)
                .then(result => callback(null, result.rows))
                .catch(err => callback(err));
        },
        
        get: function(sql, params, callback) {
            const pgSql = this._convertSql(sql);
            this._pool.query(pgSql, params)
                .then(result => callback(null, result.rows[0]))
                .catch(err => callback(err));
        },
        
        run: function(sql, params, callback) {
            let pgSql = this._convertSql(sql);
            
            // Adicionar RETURNING id para INSERTs
            if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                pgSql += ' RETURNING id';
            }
            
            this._pool.query(pgSql, params)
                .then(result => {
                    // Simular o contexto do SQLite
                    const context = {
                        lastID: result.rows[0]?.id || 0,
                        changes: result.rowCount
                    };
                    if (callback) callback.call(context, null);
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        },
        
        _convertSql: function(sql) {
            let pgSql = sql;
            
            // Converter ? para $1, $2, etc
            let paramIndex = 0;
            pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
            
            // Converter AUTOINCREMENT para SERIAL
            pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
            
            // Converter DATETIME para TIMESTAMP
            pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');
            
            // Converter BLOB para BYTEA
            pgSql = pgSql.replace(/\bBLOB\b/gi, 'BYTEA');
            
            return pgSql;
        }
    };
    
    console.log('🐘 Conectado ao PostgreSQL (Render.com)');
    
} else {
    // Desenvolvimento - SQLite
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./syscontrole.db', (err) => {
        if (err) {
            console.error('Erro ao conectar com o banco:', err.message);
        } else {
            console.log('📦 Conectado ao SQLite (local)');
        }
    });
    db._isPostgres = false;
}

module.exports = db;
