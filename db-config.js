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
            // Se params é uma função, é o callback
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            params = params || [];
            
            const pgSql = this._convertSql(sql);
            this._pool.query(pgSql, params)
                .then(result => {
                    if (callback) callback(null, result.rows);
                })
                .catch(err => {
                    console.error('PostgreSQL Error (all):', err.message);
                    if (callback) callback(err);
                });
        },
        
        get: function(sql, params, callback) {
            // Se params é uma função, é o callback
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            params = params || [];
            
            const pgSql = this._convertSql(sql);
            this._pool.query(pgSql, params)
                .then(result => {
                    if (callback) callback(null, result.rows[0]);
                })
                .catch(err => {
                    console.error('PostgreSQL Error (get):', err.message);
                    if (callback) callback(err);
                });
        },
        
        run: function(sql, params, callback) {
            // Se params é uma função, é o callback
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            params = params || [];
            
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
                    console.error('PostgreSQL Error (run):', err.message, '\nSQL:', sql);
                    if (callback) callback.call({lastID: 0, changes: 0}, err);
                });
        },
        
        _convertSql: function(sql) {
            let pgSql = sql;
            
            // Converter ? para $1, $2, etc
            let paramIndex = 0;
            pgSql = pgSql.replace(/\?/g, () => '$' + (++paramIndex));
            
            // Converter AUTOINCREMENT para SERIAL
            pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
            
            // Converter DATETIME para TIMESTAMP
            pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');
            
            // Converter BLOB para BYTEA
            pgSql = pgSql.replace(/\bBLOB\b/gi, 'BYTEA');
            
            // Adicionar aspas duplas em colunas com maiúsculas (case-sensitive no PostgreSQL)
            const colunas = [
                'Nome', 'Empresa', 'Funcao', 'Vencimento', 'Situacao', 'Foto', 'Status',
                'Anotacoes', 'Ambientacao', 'Cadastro', 'DataInativacao', 'CANCELADO',
                'Nr06_DataEmissao', 'Nr06_Vencimento', 'Nr06_Status',
                'Nr10_DataEmissao', 'Nr10_Vencimento', 'Nr10_Status',
                'Nr11_DataEmissao', 'Nr11_Vencimento', 'Nr11_Status',
                'Nr12_DataEmissao', 'NR12_Vencimento', 'Nr12_Status', 'Nr12_Ferramenta',
                'Nr17_DataEmissao', 'Nr17_Vencimento', 'Nr17_Status',
                'Nr18_DataEmissao', 'NR18_Vencimento', 'Nr18_Status',
                'Nr20_DataEmissao', 'Nr20_Vencimento', 'Nr20_Status',
                'Nr33_DataEmissao', 'NR33_Vencimento', 'Nr33_Status',
                'Nr34_DataEmissao', 'Nr34_Vencimento', 'Nr34_Status',
                'Nr35_DataEmissao', 'NR35_Vencimento', 'Nr35_Status',
                'Epi_DataEmissao', 'epiVencimento', 'EpiStatus', 'Epi_Status',
                'CNPJ', 'Telefone', 'Celular', 'Contato', 'Observacao', 'DataCadastro', 'DataAlteracao'
            ];
            
            colunas.forEach(col => {
                // Adicionar aspas apenas se não estiver já entre aspas
                const regex = new RegExp(`\\b${col}\\b(?!")`, 'g');
                pgSql = pgSql.replace(regex, `"${col}"`);
            });
            
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
