// ============================================
// SYSCONTROLE - VERSÃO POSTGRESQL (RENDER)
// ============================================
// Este arquivo é uma versão adaptada do server.js
// para funcionar com PostgreSQL no Render.com
// 
// IMPORTANTE: NÃO use este arquivo localmente!
// Use server.js (SQLite) para desenvolvimento local.
// ============================================

console.log('🚀🚀🚀 INICIANDO SERVER-POSTGRES.JS 🚀🚀🚀');
console.log('📍 Arquivo: server-postgres.js');
console.log('🐘 Banco: PostgreSQL');
console.log('🌐 DATABASE_URL existe?', !!process.env.DATABASE_URL);

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARES ============
app.use(cors());
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));

// ============ CONFIGURAÇÃO POSTGRESQL ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err);
        process.exit(1);
    } else {
        console.log('✅ Conectado ao PostgreSQL (Render.com)');
        release();
    }
});

// ============ FUNÇÕES HELPER ============

// Converter ? para $1, $2, etc (sintaxe PostgreSQL)
function convertToPostgresQuery(sql, params) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: pgSql, params };
}

// Executar SELECT queries
async function query(sql, params = []) {
    try {
        const { sql: pgSql, params: pgParams } = convertToPostgresQuery(sql, params);
        const result = await pool.query(pgSql, pgParams);
        return result.rows;
    } catch (err) {
        console.error('Erro na query:', err);
        throw err;
    }
}

// Executar INSERT/UPDATE/DELETE
async function run(sql, params = []) {
    try {
        const { sql: pgSql, params: pgParams } = convertToPostgresQuery(sql, params);
        
        // Se for INSERT, adicionar RETURNING id
        let finalSql = pgSql;
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')) {
            finalSql = pgSql + ' RETURNING id';
        }
        
        const result = await pool.query(finalSql, pgParams);
        return {
            lastID: result.rows[0]?.id,
            changes: result.rowCount,
            rows: result.rows
        };
    } catch (err) {
        console.error('Erro no run:', err);
        throw err;
    }
}


// ============ CRIAR TABELAS ============
async function criarTabelas() {
    console.log('🔧 Criando/verificando tabelas...');
    
    try {
        // Tabela SSMA
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ssma (
                id SERIAL PRIMARY KEY,
                Nome VARCHAR(255),
                Empresa VARCHAR(255),
                Funcao VARCHAR(255),
                DataEmissao DATE,
                Vencimento DATE,
                DiasVencer INTEGER,
                DiasCorridos INTEGER,
                Status VARCHAR(50),
                Ambientacao CHAR(1),
                Situacao CHAR(1) DEFAULT 'N',
                Cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                DataInativacao TIMESTAMP,
                Anotacoes TEXT,
                Foto BYTEA,
                Nr06_DataEmissao DATE,
                Nr06_Vencimento DATE,
                Nr06_Status VARCHAR(50),
                Nr10_DataEmissao DATE,
                Nr10_Vencimento DATE,
                Nr10_Status VARCHAR(50),
                Nr11_DataEmissao DATE,
                Nr11_Vencimento DATE,
                Nr11_Status VARCHAR(50),
                Nr12_DataEmissao DATE,
                NR12_Vencimento DATE,
                Nr12_Status VARCHAR(50),
                Nr12_Ferramenta TEXT,
                Nr17_DataEmissao DATE,
                Nr17_Vencimento DATE,
                Nr17_Status VARCHAR(50),
                Nr18_DataEmissao DATE,
                NR18_Vencimento DATE,
                Nr18_Status VARCHAR(50),
                Nr20_DataEmissao DATE,
                Nr20_Vencimento DATE,
                Nr20_Status VARCHAR(50),
                Nr33_DataEmissao DATE,
                NR33_Vencimento DATE,
                Nr33_Status VARCHAR(50),
                Nr34_DataEmissao DATE,
                Nr34_Vencimento DATE,
                Nr34_Status VARCHAR(50),
                Nr35_DataEmissao DATE,
                NR35_Vencimento DATE,
                Nr35_Status VARCHAR(50),
                Epi_DataEmissao DATE,
                epiVencimento DATE,
                EpiStatus VARCHAR(50)
            )
        `);
        
        // Tabela FORNECEDOR
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fornecedor (
                id SERIAL PRIMARY KEY,
                Empresa VARCHAR(255),
                CNPJ VARCHAR(20),
                Telefone VARCHAR(20),
                Celular VARCHAR(20),
                Contato VARCHAR(255),
                Observacao TEXT,
                Situacao CHAR(1) DEFAULT 'N',
                DataCadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                DataInativacao TIMESTAMP
            )
        `);
        
        // Tabela DOCUMENTACAO
        await pool.query(`
            CREATE TABLE IF NOT EXISTS documentacao (
                id SERIAL PRIMARY KEY,
                empresa VARCHAR(255),
                cnpj VARCHAR(20),
                pgr_dataEmissao DATE,
                pgr_vencimento DATE,
                pgr_diasCorridos INTEGER,
                pgr_diasVencer INTEGER,
                pgr_status VARCHAR(50),
                pcmso_dataEmissao DATE,
                pcmso_vencimento DATE,
                pcmso_diasCorridos INTEGER,
                pcmso_diasVencer INTEGER,
                pcmso_status VARCHAR(50),
                idx_fornecedor_situacao VARCHAR(50)
            )
        `);
        
        // Tabela habilitar_cursos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS habilitar_cursos (
                id SERIAL PRIMARY KEY,
                curso VARCHAR(50) UNIQUE,
                habilitado BOOLEAN DEFAULT true
            )
        `);
        
        // Tabela configuracao_relatorio
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracao_relatorio (
                id INTEGER DEFAULT 1,
                titulo VARCHAR(255),
                logo TEXT
            )
        `);
        
        // Criar índices
        await pool.query('CREATE INDEX IF NOT EXISTS idx_ssma_nome ON ssma(Nome)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_ssma_empresa ON ssma(Empresa)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_ssma_situacao ON ssma(Situacao)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_fornecedor_empresa ON fornecedor(Empresa)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_fornecedor_situacao ON fornecedor(Situacao)');
        
        console.log('✅ Tabelas criadas/verificadas');
        console.log('⚡ Índices criados/verificados');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
        throw err;
    }
}

// Inicializar tabelas
criarTabelas().catch(console.error);


// ============ CONTROLE DE PRESENÇA EM MEMÓRIA ============
let presencaMemoria = {};
let presencaMesAtual = null;
let comentariosPresenca = {};
let ocorrenciasPresenca = {};
let backupAutomaticoFeito = {};

const PRESENCA_FILE = path.join(__dirname, 'presenca_dados.json');

function carregarDadosPresenca() {
    try {
        if (fs.existsSync(PRESENCA_FILE)) {
            const dados = JSON.parse(fs.readFileSync(PRESENCA_FILE, 'utf8'));
            presencaMemoria = dados.presenca || {};
            comentariosPresenca = dados.comentarios || {};
            ocorrenciasPresenca = dados.ocorrencias || {};
            presencaMesAtual = dados.mesAtual || getMesAnoAtual();
            console.log('📂 Dados de presença carregados');
        }
    } catch (err) {
        console.error('Erro ao carregar presença:', err.message);
    }
}

function salvarDadosPresenca() {
    try {
        const dados = {
            presenca: presencaMemoria,
            comentarios: comentariosPresenca,
            ocorrencias: ocorrenciasPresenca,
            mesAtual: presencaMesAtual,
            ultimaAtualizacao: new Date().toISOString()
        };
        fs.writeFileSync(PRESENCA_FILE, JSON.stringify(dados, null, 2), 'utf8');
    } catch (err) {
        console.error('Erro ao salvar presença:', err.message);
    }
}

carregarDadosPresenca();
setInterval(salvarDadosPresenca, 30000);

process.on('SIGINT', () => {
    console.log('💾 Salvando dados antes de encerrar...');
    salvarDadosPresenca();
    process.exit(0);
});

function getMesAnoAtual() {
    const hoje = new Date();
    return `${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
}

function getUltimoDiaDoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate();
}

async function verificarResetMes() {
    const mesAnoAtual = getMesAnoAtual();
    if (presencaMesAtual !== mesAnoAtual && presencaMesAtual) {
        console.log(`🔄 Novo mês: ${mesAnoAtual}`);
        presencaMemoria = {};
        comentariosPresenca = {};
        ocorrenciasPresenca = {};
        presencaMesAtual = mesAnoAtual;
        salvarDadosPresenca();
        console.log(`✅ Sistema pronto para ${mesAnoAtual}`);
    }
}

// ============ AUTENTICAÇÃO ============
const USERS_FILE = path.join(__dirname, 'usuarios.json');

function carregarUsuarios() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
    }
    return {
        usuarios: [
            { id: 1, login: 'master', senha: '@Senha01', tipo: 'master', nome: 'Administrador', ativo: true }
        ]
    };
}

function salvarUsuarios(dados) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(dados, null, 2), 'utf8');
}

let usuariosData = carregarUsuarios();
salvarUsuarios(usuariosData);

// ============ FUNÇÕES AUXILIARES ============
function calcularStatus(dataVencimento) {
    if (!dataVencimento) return 'NaoInformado';
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 30) return 'Renovar';
    return 'OK';
}

// ============ CONFIGURAÇÃO MULTER ============
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});


// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

app.post('/api/auth/login', (req, res) => {
    const { login, senha } = req.body;
    const usuario = usuariosData.usuarios.find(u => 
        u.login.toLowerCase() === login.toLowerCase() && u.senha === senha && u.ativo
    );
    if (usuario) {
        res.json({ 
            success: true, 
            user: { id: usuario.id, login: usuario.login, nome: usuario.nome, tipo: usuario.tipo } 
        });
    } else {
        res.json({ success: false, message: 'Login ou senha incorretos' });
    }
});

app.get('/api/auth/check', (req, res) => {
    res.json({ success: true });
});

app.get('/api/usuarios', (req, res) => {
    const lista = usuariosData.usuarios.map(u => ({
        id: u.id, login: u.login, nome: u.nome, tipo: u.tipo, ativo: u.ativo
    }));
    res.json({ success: true, data: lista });
});

app.post('/api/usuarios', (req, res) => {
    const { login, senha, nome, tipo } = req.body;
    if (!login || !senha || !nome) {
        return res.json({ success: false, message: 'Preencha todos os campos' });
    }
    const existe = usuariosData.usuarios.find(u => u.login.toLowerCase() === login.toLowerCase());
    if (existe) {
        return res.json({ success: false, message: 'Login já existe' });
    }
    const novoId = Math.max(...usuariosData.usuarios.map(u => u.id), 0) + 1;
    usuariosData.usuarios.push({
        id: novoId, login, senha, nome, tipo: tipo || 'comum', ativo: true
    });
    salvarUsuarios(usuariosData);
    res.json({ success: true, message: 'Usuário criado com sucesso' });
});

app.put('/api/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { login, senha, nome, tipo, ativo } = req.body;
    const usuario = usuariosData.usuarios.find(u => u.id === id);
    if (!usuario) {
        return res.json({ success: false, message: 'Usuário não encontrado' });
    }
    if (login) usuario.login = login;
    if (senha) usuario.senha = senha;
    if (nome) usuario.nome = nome;
    if (tipo) usuario.tipo = tipo;
    if (ativo !== undefined) usuario.ativo = ativo;
    salvarUsuarios(usuariosData);
    res.json({ success: true, message: 'Usuário atualizado' });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (id === 1) {
        return res.json({ success: false, message: 'Não é possível excluir o usuário master principal' });
    }
    usuariosData.usuarios = usuariosData.usuarios.filter(u => u.id !== id);
    salvarUsuarios(usuariosData);
    res.json({ success: true, message: 'Usuário excluído' });
});

app.use(express.static('public'));


// ============================================
// ROTAS SSMA (FUNCIONÁRIOS)
// ============================================

// GET - Listar funcionários
app.get('/api/ssma', async (req, res) => {
    try {
        const { nome, empresa, funcao, situacao, limit = 50, offset = 0 } = req.query;
        
        let sql = 'SELECT * FROM ssma WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (nome) {
            sql += ` AND LOWER(Nome) LIKE $${paramIndex}`;
            params.push(`%${nome.toLowerCase()}%`);
            paramIndex++;
        }
        if (empresa) {
            sql += ` AND LOWER(Empresa) LIKE $${paramIndex}`;
            params.push(`%${empresa.toLowerCase()}%`);
            paramIndex++;
        }
        if (funcao) {
            sql += ` AND LOWER(Funcao) LIKE $${paramIndex}`;
            params.push(`%${funcao.toLowerCase()}%`);
            paramIndex++;
        }
        if (situacao) {
            sql += ` AND Situacao = $${paramIndex}`;
            params.push(situacao);
            paramIndex++;
        }
        
        sql += ` ORDER BY Nome LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const rows = await pool.query(sql, params);
        
        // Converter foto de Buffer para base64
        const dados = rows.rows.map(row => ({
            ...row,
            Foto: row.foto ? row.foto.toString('base64') : null
        }));
        
        res.json(dados);
    } catch (err) {
        console.error('Erro ao buscar funcionários:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Contar funcionários
app.get('/api/ssma/count', async (req, res) => {
    try {
        const { nome, empresa, funcao, situacao } = req.query;
        
        let sql = 'SELECT COUNT(*) as total FROM ssma WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (nome) {
            sql += ` AND LOWER(Nome) LIKE $${paramIndex}`;
            params.push(`%${nome.toLowerCase()}%`);
            paramIndex++;
        }
        if (empresa) {
            sql += ` AND LOWER(Empresa) LIKE $${paramIndex}`;
            params.push(`%${empresa.toLowerCase()}%`);
            paramIndex++;
        }
        if (funcao) {
            sql += ` AND LOWER(Funcao) LIKE $${paramIndex}`;
            params.push(`%${funcao.toLowerCase()}%`);
            paramIndex++;
        }
        if (situacao) {
            sql += ` AND Situacao = $${paramIndex}`;
            params.push(situacao);
            paramIndex++;
        }
        
        const result = await pool.query(sql, params);
        res.json({ total: parseInt(result.rows[0].total) });
    } catch (err) {
        console.error('Erro ao contar:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Buscar por ID
app.get('/api/ssma/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM ssma WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registro não encontrado' });
        }
        
        const row = result.rows[0];
        const dados = {
            ...row,
            Foto: row.foto ? row.foto.toString('base64') : null
        };
        
        res.json(dados);
    } catch (err) {
        console.error('Erro ao buscar por ID:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST - Criar funcionário
app.post('/api/ssma', upload.single('foto'), async (req, res) => {
    try {
        const dados = req.body;
        const foto = req.file ? req.file.buffer : null;
        
        const colunas = Object.keys(dados);
        if (foto) colunas.push('Foto');
        
        const valores = Object.values(dados);
        if (foto) valores.push(foto);
        
        const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ssma (${colunas.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        
        const result = await pool.query(sql, valores);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Erro ao criar:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT - Atualizar funcionário
app.put('/api/ssma/:id', upload.single('foto'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dados = req.body;
        const foto = req.file ? req.file.buffer : null;
        
        const colunas = Object.keys(dados);
        const valores = Object.values(dados);
        
        if (foto) {
            colunas.push('Foto');
            valores.push(foto);
        }
        
        const sets = colunas.map((col, i) => `${col} = $${i + 1}`).join(', ');
        valores.push(id);
        
        const sql = `UPDATE ssma SET ${sets} WHERE id = $${valores.length}`;
        await pool.query(sql, valores);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao atualizar:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Deletar funcionário
app.delete('/api/ssma/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM ssma WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao deletar:', err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// ROTAS FORNECEDORES
// ============================================

app.get('/api/fornecedores', async (req, res) => {
    try {
        const { empresa, cnpj, situacao } = req.query;
        let sql = 'SELECT * FROM fornecedor WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (empresa) {
            sql += ` AND LOWER(Empresa) LIKE $${paramIndex}`;
            params.push(`%${empresa.toLowerCase()}%`);
            paramIndex++;
        }
        if (cnpj) {
            sql += ` AND CNPJ LIKE $${paramIndex}`;
            params.push(`%${cnpj}%`);
            paramIndex++;
        }
        if (situacao) {
            sql += ` AND Situacao = $${paramIndex}`;
            params.push(situacao);
            paramIndex++;
        }
        
        sql += ' ORDER BY Empresa';
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar fornecedores:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/fornecedores/count', async (req, res) => {
    try {
        const { situacao } = req.query;
        let sql = 'SELECT COUNT(*) as total FROM fornecedor WHERE 1=1';
        const params = [];
        
        if (situacao) {
            sql += ' AND Situacao = $1';
            params.push(situacao);
        }
        
        const result = await pool.query(sql, params);
        res.json({ total: parseInt(result.rows[0].total) });
    } catch (err) {
        console.error('Erro ao contar fornecedores:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fornecedores', async (req, res) => {
    try {
        const { Empresa, CNPJ, Telefone, Celular, Contato, Observacao, Situacao } = req.body;
        const sql = `INSERT INTO fornecedor (Empresa, CNPJ, Telefone, Celular, Contato, Observacao, Situacao) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const result = await pool.query(sql, [Empresa, CNPJ, Telefone, Celular, Contato, Observacao, Situacao || 'N']);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Erro ao criar fornecedor:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/fornecedores/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { Empresa, CNPJ, Telefone, Celular, Contato, Observacao, Situacao } = req.body;
        const sql = `UPDATE fornecedor SET Empresa=$1, CNPJ=$2, Telefone=$3, Celular=$4, Contato=$5, Observacao=$6, Situacao=$7 
                     WHERE id=$8`;
        await pool.query(sql, [Empresa, CNPJ, Telefone, Celular, Contato, Observacao, Situacao, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao atualizar fornecedor:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fornecedores/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM fornecedor WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao deletar fornecedor:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ROTAS DOCUMENTAÇÃO
// ============================================

app.get('/api/documentacao', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documentacao ORDER BY empresa');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar documentação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/documentacao/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM documentacao');
        res.json({ total: parseInt(result.rows[0].total) });
    } catch (err) {
        console.error('Erro ao contar documentação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documentacao', async (req, res) => {
    try {
        const dados = req.body;
        const colunas = Object.keys(dados);
        const valores = Object.values(dados);
        const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
        
        const sql = `INSERT INTO documentacao (${colunas.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        const result = await pool.query(sql, valores);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Erro ao criar documentação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/documentacao/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dados = req.body;
        const colunas = Object.keys(dados);
        const valores = Object.values(dados);
        const sets = colunas.map((col, i) => `${col} = $${i + 1}`).join(', ');
        valores.push(id);
        
        const sql = `UPDATE documentacao SET ${sets} WHERE id = $${valores.length}`;
        await pool.query(sql, valores);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao atualizar documentação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documentacao/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM documentacao WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao deletar documentação:', err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// ROTAS DE BACKUP E RESTAURAÇÃO
// ============================================

app.get('/api/backup/exportar', async (req, res) => {
    try {
        const funcionarios = await pool.query('SELECT * FROM ssma');
        const fornecedores = await pool.query('SELECT * FROM fornecedor');
        const documentacao = await pool.query('SELECT * FROM documentacao');
        const cursosHabilitados = await pool.query('SELECT * FROM habilitar_cursos');
        const configuracao = await pool.query('SELECT * FROM configuracao_relatorio WHERE id = 1');
        
        // Converter fotos para base64
        const funcionariosComFotos = funcionarios.rows.map(f => ({
            ...f,
            Foto: f.foto ? f.foto.toString('base64') : null
        }));
        
        const backup = {
            versao: '2.0',
            data: new Date().toISOString(),
            dados: {
                funcionarios: funcionariosComFotos,
                fornecedores: fornecedores.rows,
                documentacao: documentacao.rows,
                cursosHabilitados: cursosHabilitados.rows,
                configuracao: configuracao.rows[0] || {},
                presenca: {
                    presencaMemoria,
                    comentariosPresenca,
                    ocorrenciasPresenca,
                    presencaMesAtual
                }
            }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup_syscontrole_${new Date().toISOString().split('T')[0]}.json`);
        res.json(backup);
    } catch (err) {
        console.error('Erro ao exportar backup:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/backup/restaurar', async (req, res) => {
    try {
        const backup = req.body;
        
        if (!backup || !backup.dados) {
            return res.status(400).json({ success: false, error: 'Backup inválido' });
        }
        
        console.log('🔄 Restaurando backup...');
        
        // Limpar tabelas
        await pool.query('DELETE FROM ssma');
        await pool.query('DELETE FROM fornecedor');
        await pool.query('DELETE FROM documentacao');
        await pool.query('ALTER SEQUENCE ssma_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE fornecedor_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE documentacao_id_seq RESTART WITH 1');
        
        let restaurados = { funcionarios: 0, fornecedores: 0, documentacao: 0 };
        
        // Restaurar funcionários
        if (backup.dados.funcionarios) {
            for (const f of backup.dados.funcionarios) {
                try {
                    const colunas = Object.keys(f).filter(k => k !== 'id');
                    const valores = colunas.map(k => {
                        if (k === 'Foto' && f[k]) {
                            return Buffer.from(f[k], 'base64');
                        }
                        return f[k];
                    });
                    
                    const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
                    await pool.query(`INSERT INTO ssma (${colunas.join(', ')}) VALUES (${placeholders})`, valores);
                    restaurados.funcionarios++;
                } catch (err) {
                    console.error('Erro ao restaurar funcionário:', err);
                }
            }
        }
        
        // Restaurar fornecedores
        if (backup.dados.fornecedores) {
            for (const f of backup.dados.fornecedores) {
                try {
                    const colunas = Object.keys(f).filter(k => k !== 'id');
                    const valores = colunas.map(k => f[k]);
                    const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
                    await pool.query(`INSERT INTO fornecedor (${colunas.join(', ')}) VALUES (${placeholders})`, valores);
                    restaurados.fornecedores++;
                } catch (err) {
                    console.error('Erro ao restaurar fornecedor:', err);
                }
            }
        }
        
        // Restaurar documentação
        if (backup.dados.documentacao) {
            for (const d of backup.dados.documentacao) {
                try {
                    const colunas = Object.keys(d).filter(k => k !== 'id');
                    const valores = colunas.map(k => d[k]);
                    const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
                    await pool.query(`INSERT INTO documentacao (${colunas.join(', ')}) VALUES (${placeholders})`, valores);
                    restaurados.documentacao++;
                } catch (err) {
                    console.error('Erro ao restaurar documentação:', err);
                }
            }
        }
        
        // Restaurar presença
        if (backup.dados.presenca) {
            presencaMemoria = backup.dados.presenca.presencaMemoria || {};
            comentariosPresenca = backup.dados.presenca.comentariosPresenca || {};
            ocorrenciasPresenca = backup.dados.presenca.ocorrenciasPresenca || {};
            presencaMesAtual = backup.dados.presenca.presencaMesAtual || getMesAnoAtual();
            salvarDadosPresenca();
        }
        
        console.log('✅ Backup restaurado:', restaurados);
        res.json({ success: true, restaurados });
    } catch (err) {
        console.error('❌ Erro ao restaurar backup:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Rotas de zerar dados
app.delete('/api/backup/zerar/funcionarios', async (req, res) => {
    try {
        await pool.query('DELETE FROM ssma');
        await pool.query('ALTER SEQUENCE ssma_id_seq RESTART WITH 1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/backup/zerar/fornecedores', async (req, res) => {
    try {
        await pool.query('DELETE FROM fornecedor');
        await pool.query('ALTER SEQUENCE fornecedor_id_seq RESTART WITH 1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/backup/zerar/documentacao', async (req, res) => {
    try {
        await pool.query('DELETE FROM documentacao');
        await pool.query('ALTER SEQUENCE documentacao_id_seq RESTART WITH 1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/backup/zerar/presenca', async (req, res) => {
    try {
        presencaMemoria = {};
        comentariosPresenca = {};
        ocorrenciasPresenca = {};
        salvarDadosPresenca();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/backup/zerar/tudo', async (req, res) => {
    try {
        await pool.query('DELETE FROM ssma');
        await pool.query('DELETE FROM fornecedor');
        await pool.query('DELETE FROM documentacao');
        await pool.query('ALTER SEQUENCE ssma_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE fornecedor_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE documentacao_id_seq RESTART WITH 1');
        presencaMemoria = {};
        comentariosPresenca = {};
        ocorrenciasPresenca = {};
        salvarDadosPresenca();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Contagens para o modal de backup
app.get('/api/backup/contagens', async (req, res) => {
    try {
        const funcionarios = await pool.query('SELECT COUNT(*) as total FROM ssma');
        const fornecedores = await pool.query('SELECT COUNT(*) as total FROM fornecedor');
        const documentacao = await pool.query('SELECT COUNT(*) as total FROM documentacao');
        
        res.json({
            funcionarios: parseInt(funcionarios.rows[0].total),
            fornecedores: parseInt(fornecedores.rows[0].total),
            documentacao: parseInt(documentacao.rows[0].total),
            presenca: Object.keys(presencaMemoria).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// ROTAS AUXILIARES
// ============================================

app.get('/api/nomes', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT Nome FROM ssma WHERE Nome IS NOT NULL ORDER BY Nome');
        res.json(result.rows.map(r => r.nome));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/empresas', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT Empresa FROM ssma WHERE Empresa IS NOT NULL ORDER BY Empresa');
        res.json(result.rows.map(r => r.empresa));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/funcoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT Funcao FROM ssma WHERE Funcao IS NOT NULL ORDER BY Funcao');
        res.json(result.rows.map(r => r.funcao));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/habilitar-cursos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM habilitar_cursos ORDER BY curso');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/habilitar-cursos', async (req, res) => {
    try {
        const { cursos } = req.body;
        
        // Limpar tabela
        await pool.query('DELETE FROM habilitar_cursos');
        
        // Inserir cursos habilitados
        for (const curso of cursos) {
            await pool.query('INSERT INTO habilitar_cursos (curso, habilitado) VALUES ($1, $2)', [curso, true]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/configuracao-relatorio', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracao_relatorio WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/configuracao-relatorio', async (req, res) => {
    try {
        const { titulo, logo } = req.body;
        
        // Verificar se já existe
        const existe = await pool.query('SELECT id FROM configuracao_relatorio WHERE id = 1');
        
        if (existe.rows.length > 0) {
            await pool.query('UPDATE configuracao_relatorio SET titulo = $1, logo = $2 WHERE id = 1', [titulo, logo]);
        } else {
            await pool.query('INSERT INTO configuracao_relatorio (id, titulo, logo) VALUES (1, $1, $2)', [titulo, logo]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ROTAS DE PRESENÇA
// ============================================

app.post('/api/controle-presenca/gerar', async (req, res) => {
    try {
        await verificarResetMes();
        
        const result = await pool.query('SELECT id, Nome, Empresa, Funcao FROM ssma WHERE Situacao = $1 ORDER BY Empresa, Nome', ['N']);
        const funcionarios = result.rows;
        
        const mesAnoAtual = getMesAnoAtual();
        const [mes, ano] = mesAnoAtual.split('-');
        const diasNoMes = getUltimoDiaDoMes(parseInt(ano), parseInt(mes));
        
        if (!presencaMemoria[mesAnoAtual]) {
            presencaMemoria[mesAnoAtual] = {};
        }
        
        res.json({
            funcionarios,
            mesAnoAtual,
            diasNoMes,
            presenca: presencaMemoria[mesAnoAtual] || {},
            comentarios: comentariosPresenca[mesAnoAtual] || {},
            ocorrencias: ocorrenciasPresenca[mesAnoAtual] || []
        });
    } catch (err) {
        console.error('Erro ao gerar presença:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/controle-presenca/salvar', (req, res) => {
    try {
        const { mesAno, presenca, comentarios, ocorrencias } = req.body;
        
        presencaMemoria[mesAno] = presenca;
        comentariosPresenca[mesAno] = comentarios;
        ocorrenciasPresenca[mesAno] = ocorrencias;
        
        salvarDadosPresenca();
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar presença:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Buscar funcionários para controle de presença
app.get('/api/controle-presenca/funcionarios', async (req, res) => {
    try {
        await verificarResetMes();
        const result = await pool.query('SELECT id, Nome, Empresa, Funcao, Situacao FROM ssma WHERE Situacao = $1 ORDER BY Empresa, Nome', ['N']);
        res.json({ data: result.rows, mesAno: presencaMesAtual });
    } catch (err) {
        console.error('Erro ao buscar funcionários:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Buscar dados de presença do mês atual
app.get('/api/controle-presenca/dados', async (req, res) => {
    try {
        await verificarResetMes();
        const dadosOriginais = presencaMemoria[presencaMesAtual] || {};
        const comentarios = comentariosPresenca[presencaMesAtual] || {};
        
        // Normalizar dados para garantir formato correto
        const dados = {};
        for (const [funcId, diasFunc] of Object.entries(dadosOriginais)) {
            dados[funcId] = {};
            for (const [dia, valor] of Object.entries(diasFunc)) {
                if (typeof valor === 'object' && valor !== null) {
                    dados[funcId][dia] = valor;
                } else if (typeof valor === 'string') {
                    if (valor === '-' || valor === '.') {
                        dados[funcId][dia] = { status: '', isFolga: true };
                    } else if (valor === '') {
                        // Vazio - ignorar
                    } else {
                        dados[funcId][dia] = { status: valor.toUpperCase(), isFolga: false };
                    }
                }
            }
        }
        
        presencaMemoria[presencaMesAtual] = dados;
        res.json({ data: dados, comentarios: comentarios, mesAno: presencaMesAtual });
    } catch (err) {
        console.error('Erro ao buscar dados de presença:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST - Salvar marcação de presença
app.post('/api/controle-presenca/marcar', async (req, res) => {
    try {
        await verificarResetMes();
        const { funcionarioId, dia, status, isFolga } = req.body;
        
        if (!presencaMemoria[presencaMesAtual]) {
            presencaMemoria[presencaMesAtual] = {};
        }
        
        if (!presencaMemoria[presencaMesAtual][funcionarioId]) {
            presencaMemoria[presencaMesAtual][funcionarioId] = {};
        }
        
        if (status === '' || status === null) {
            if (isFolga) {
                presencaMemoria[presencaMesAtual][funcionarioId][dia] = { status: '', isFolga: true };
            } else {
                delete presencaMemoria[presencaMesAtual][funcionarioId][dia];
            }
        } else {
            presencaMemoria[presencaMesAtual][funcionarioId][dia] = { status: status, isFolga: false };
        }
        
        res.json({ success: true, mesAno: presencaMesAtual });
    } catch (err) {
        console.error('Erro ao marcar presença:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST - Salvar comentário de presença
app.post('/api/controle-presenca/comentario', async (req, res) => {
    try {
        await verificarResetMes();
        const { funcionarioId, dia, comentario } = req.body;
        const chave = `${funcionarioId}_${dia}`;
        
        if (!comentariosPresenca[presencaMesAtual]) {
            comentariosPresenca[presencaMesAtual] = {};
        }
        
        if (comentario && comentario.trim()) {
            comentariosPresenca[presencaMesAtual][chave] = {
                texto: comentario.trim(),
                data: new Date().toISOString()
            };
        } else {
            delete comentariosPresenca[presencaMesAtual][chave];
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar comentário:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Contar presença
app.get('/api/presenca/count', async (req, res) => {
    try {
        await verificarResetMes();
        const total = Object.keys(presencaMemoria[presencaMesAtual] || {}).length;
        res.json({ total });
    } catch (err) {
        console.error('Erro ao contar presença:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET - Listar ocorrências do mês atual
app.get('/api/ocorrencias', async (req, res) => {
    try {
        await verificarResetMes();
        const ocorrencias = ocorrenciasPresenca[presencaMesAtual] || [];
        const ordenadas = [...ocorrencias].sort((a, b) => new Date(b.data) - new Date(a.data));
        res.json({ data: ordenadas, mesAno: presencaMesAtual });
    } catch (err) {
        console.error('Erro ao listar ocorrências:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST - Criar nova ocorrência
app.post('/api/ocorrencias', async (req, res) => {
    try {
        await verificarResetMes();
        const { texto } = req.body;
        
        if (!texto || !texto.trim()) {
            return res.status(400).json({ success: false, error: 'Texto é obrigatório' });
        }
        
        if (!ocorrenciasPresenca[presencaMesAtual]) {
            ocorrenciasPresenca[presencaMesAtual] = [];
        }
        
        const novaOcorrencia = {
            id: Date.now().toString(),
            texto: texto.trim(),
            data: new Date().toISOString()
        };
        
        ocorrenciasPresenca[presencaMesAtual].push(novaOcorrencia);
        salvarDadosPresenca();
        
        res.json({ success: true, data: novaOcorrencia });
    } catch (err) {
        console.error('Erro ao criar ocorrência:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Excluir ocorrência
app.delete('/api/ocorrencias/:id', async (req, res) => {
    try {
        await verificarResetMes();
        const { id } = req.params;
        
        if (!ocorrenciasPresenca[presencaMesAtual]) {
            return res.status(404).json({ success: false, error: 'Ocorrência não encontrada' });
        }
        
        const index = ocorrenciasPresenca[presencaMesAtual].findIndex(o => o.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Ocorrência não encontrada' });
        }
        
        ocorrenciasPresenca[presencaMesAtual].splice(index, 1);
        salvarDadosPresenca();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao excluir ocorrência:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SysControle Web rodando em http://localhost:${PORT}`);
    console.log(`📊 Sistema PostgreSQL (Render.com)`);
    console.log(`🌐 Acesso na rede: http://SEU_IP:${PORT}`);
    
    // Verificar mudança de mês
    console.log(`\n🔍 Verificando mudança de mês...`);
    await verificarResetMes();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('💾 Salvando dados antes de encerrar...');
    salvarDadosPresenca();
    await pool.end();
    process.exit(0);
});
