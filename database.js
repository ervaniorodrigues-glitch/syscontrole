// database.js - Abstração para SQLite (local) e PostgreSQL (produção)
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL;

let db;
let isPostgres = false;

// Detectar se deve usar PostgreSQL
if (DATABASE_URL) {
    isPostgres = true;
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('🐘 Conectado ao PostgreSQL');
} else {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./syscontrole.db', (err) => {
        if (err) {
            console.error('Erro ao conectar com SQLite:', err.message);
        } else {
            console.log('📦 Conectado ao SQLite');
        }
    });
}

// Wrapper para queries - funciona igual para SQLite e PostgreSQL
const query = {
    // SELECT múltiplas linhas
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            if (isPostgres) {
                // Converter ? para $1, $2, etc (PostgreSQL)
                const pgSql = convertToPostgres(sql);
                db.query(pgSql, params)
                    .then(result => resolve(result.rows))
                    .catch(reject);
            } else {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }
        });
    },

    // SELECT uma linha
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            if (isPostgres) {
                const pgSql = convertToPostgres(sql);
                db.query(pgSql, params)
                    .then(result => resolve(result.rows[0]))
                    .catch(reject);
            } else {
                db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            }
        });
    },

    // INSERT, UPDATE, DELETE
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            if (isPostgres) {
                const pgSql = convertToPostgres(sql);
                // Adicionar RETURNING id para INSERTs
                const finalSql = pgSql.toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')
                    ? pgSql + ' RETURNING id'
                    : pgSql;
                db.query(finalSql, params)
                    .then(result => {
                        resolve({
                            lastID: result.rows[0]?.id,
                            changes: result.rowCount
                        });
                    })
                    .catch(reject);
            } else {
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            }
        });
    },

    // Executar sem retorno (CREATE TABLE, etc)
    exec: (sql) => {
        return new Promise((resolve, reject) => {
            if (isPostgres) {
                const pgSql = convertToPostgres(sql);
                db.query(pgSql)
                    .then(() => resolve())
                    .catch(reject);
            } else {
                db.run(sql, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }
};

// Converter sintaxe SQLite para PostgreSQL
function convertToPostgres(sql) {
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
    
    // Converter date() para DATE()
    pgSql = pgSql.replace(/date\(([^)]+)\)/gi, 'DATE($1)');
    
    return pgSql;
}

// Inicializar tabelas
async function initDatabase() {
    try {
        // Tabela SSMA
        await query.exec(`
            CREATE TABLE IF NOT EXISTS SSMA (
                id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
                Nome TEXT NOT NULL,
                Empresa TEXT NOT NULL,
                Funcao TEXT NOT NULL,
                Vencimento TEXT,
                Anotacoes TEXT,
                Situacao TEXT DEFAULT 'S',
                Ambientacao TEXT DEFAULT 'N',
                Nr06_DataEmissao TEXT,
                Nr06_Vencimento TEXT,
                Nr06_Status TEXT,
                Nr10_DataEmissao TEXT,
                Nr10_Vencimento TEXT,
                Nr10_Status TEXT,
                Nr11_DataEmissao TEXT,
                Nr11_Vencimento TEXT,
                Nr11_Status TEXT,
                Nr12_DataEmissao TEXT,
                Nr12_Vencimento TEXT,
                Nr12_Status TEXT,
                Nr17_DataEmissao TEXT,
                Nr17_Vencimento TEXT,
                Nr17_Status TEXT,
                Nr18_DataEmissao TEXT,
                Nr18_Vencimento TEXT,
                Nr18_Status TEXT,
                Nr20_DataEmissao TEXT,
                Nr20_Vencimento TEXT,
                Nr20_Status TEXT,
                Nr33_DataEmissao TEXT,
                Nr33_Vencimento TEXT,
                Nr33_Status TEXT,
                Nr34_DataEmissao TEXT,
                Nr34_Vencimento TEXT,
                Nr34_Status TEXT,
                Nr35_DataEmissao TEXT,
                Nr35_Vencimento TEXT,
                Nr35_Status TEXT,
                Epi_DataEmissao TEXT,
                epiVencimento TEXT,
                EpiStatus TEXT,
                Foto ${isPostgres ? 'BYTEA' : 'BLOB'},
                Cadastro ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela FORNECEDOR
        await query.exec(`
            CREATE TABLE IF NOT EXISTS FORNECEDOR (
                id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
                Empresa TEXT NOT NULL,
                CNPJ TEXT,
                Telefone TEXT,
                Celular TEXT,
                Contato TEXT,
                Observacao TEXT,
                DataCadastro ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
                DataInativacao ${isPostgres ? 'TIMESTAMP' : 'DATETIME'},
                Situacao TEXT DEFAULT 'S'
            )
        `);

        // Tabela DOCUMENTACAO
        await query.exec(`
            CREATE TABLE IF NOT EXISTS DOCUMENTACAO (
                id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
                empresa TEXT NOT NULL,
                cnpj TEXT NOT NULL,
                pgr_emissao TEXT,
                pgr_vencimento TEXT,
                pgr_status TEXT,
                pgr_dias_corridos INTEGER,
                pgr_dias_vencer INTEGER,
                pcmso_emissao TEXT,
                pcmso_vencimento TEXT,
                pcmso_status TEXT,
                pcmso_dias_corridos INTEGER,
                pcmso_dias_vencer INTEGER,
                ativo TEXT DEFAULT 'S',
                DataCadastro ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
                DataAlteracao ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela configuracao_relatorio
        await query.exec(`
            CREATE TABLE IF NOT EXISTS configuracao_relatorio (
                id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
                titulo TEXT DEFAULT 'Relatório de Cursos',
                rodape TEXT DEFAULT 'SSMA',
                logo TEXT DEFAULT '/Logo-Hoss.jpg'
            )
        `);

        // Inserir configuração padrão
        const configCount = await query.get('SELECT COUNT(*) as count FROM configuracao_relatorio');
        if (configCount && configCount.count === 0) {
            await query.run(
                'INSERT INTO configuracao_relatorio (titulo, rodape, logo) VALUES (?, ?, ?)',
                ['Relatório de Cursos', 'SSMA', '/Logo-Hoss.jpg']
            );
        }

        // Criar índices
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_ssma_situacao ON SSMA(Situacao)',
            'CREATE INDEX IF NOT EXISTS idx_ssma_empresa ON SSMA(Empresa)',
            'CREATE INDEX IF NOT EXISTS idx_ssma_nome ON SSMA(Nome)',
            'CREATE INDEX IF NOT EXISTS idx_ssma_funcao ON SSMA(Funcao)',
            'CREATE INDEX IF NOT EXISTS idx_fornecedor_situacao ON FORNECEDOR(Situacao)'
        ];

        for (const idx of indices) {
            try {
                await query.exec(idx);
            } catch (e) {
                // Ignora se índice já existe
            }
        }

        console.log('✅ Banco de dados inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
    }
}

module.exports = { db, query, initDatabase, isPostgres };
