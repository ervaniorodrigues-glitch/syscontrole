// SysControle Web - JavaScript Principal
// Sistema idêntico ao desktop, mas na web

class SysControleWeb {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.selectedRows = new Set();
        this.currentData = [];
        this.editingId = null;
        this.salvandoRegistro = false;
        this.modalHabilitarAberta = false;
        this.updateTimers = [];
        this.lastRenderedData = null; // Cache para comparação
        this.isRendering = false; // Flag para evitar renderizações simultâneas
        this.isLoading = false; // Flag para evitar carregamentos simultâneos
        this.fotoRemovida = false; // Flag para indicar remoção de foto
        this.cursosHabilitadosCache = null; // Cache para cursos habilitados
        
        // Inicializar filtros de fornecedor
        this.filtroMostrarApenasAtivos = true;
        this.filtroMostrarApenasInativos = false;
        
        // Usuário logado
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        console.log('Inicializando SysControle Web...');
        
        // Verificar login
        this.verificarLogin();

        this.bindEvents();

        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(async () => {
            // Carregar cache de cursos habilitados PRIMEIRO
            await this.carregarCacheCursos();
            // Carregar lista de empresas ativas para o dropdown
            await this.carregarEmpresasAtivas();
            // Depois carregar dados (já com cache pronto)
            this.loadData();
        }, 100);

        // Atualização automática a cada 60 segundos (não sobrecarrega)
        setInterval(() => {
            if (!this.modalHabilitarAberta && !this.isRendering) {
                this.loadData(false);
            }
        }, 60000);
    }
    
    // Carregar empresas ativas para o dropdown
    async carregarEmpresasAtivas() {
        try {
            const response = await fetch('/api/fornecedores?situacao=S');
            const fornecedores = await response.json();
            
            const datalist = document.getElementById('empresasList');
            if (datalist) {
                datalist.innerHTML = '';
                const empresasUnicas = [...new Set(fornecedores.map(f => f.Empresa))].sort();
                empresasUnicas.forEach(empresa => {
                    const option = document.createElement('option');
                    option.value = empresa;
                    datalist.appendChild(option);
                });
                console.log('✅ Empresas ativas carregadas:', empresasUnicas.length);
            }
        } catch (err) {
            console.error('Erro ao carregar empresas:', err);
        }
    }
    
    // ============ AUTENTICAÇÃO ============
    verificarLogin() {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) {
            window.location.href = '/login.html';
            return;
        }
        
        this.currentUser = JSON.parse(userStr);
        console.log('Usuário logado:', this.currentUser.nome, '(' + this.currentUser.tipo + ')');
        
        // Mostrar nome do usuário no rodapé
        setTimeout(() => {
            const elUsuario = document.getElementById('usuarioLogado');
            if (elUsuario) {
                elUsuario.textContent = `Usuário: ${this.currentUser.nome}`;
            }
        }, 100);
        
        // Aplicar restrições baseadas no tipo de usuário
        this.aplicarRestricoes();
    }
    
    aplicarRestricoes() {
        if (this.currentUser.tipo === 'comum') {
            document.body.classList.add('user-comum');
            
            // Bloquear clique no grid (linhas da tabela)
            document.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-id]');
                if (row && row.closest('#dataTable')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showToast('Visualização apenas - edição não permitida', 'info');
                    return false;
                }
            }, true);
            
            // Esconder botões de ação para usuário comum (MANTER: Buscar, Limpar, Fornecedor)
            const ocultarBotoes = () => {
                // Esconder botões master-only
                document.querySelectorAll('.btn-master-only').forEach(el => el.style.display = 'none');
                
                // Esconder botões de exportação (Excel, PDF)
                document.querySelectorAll('input[type="radio"][name*="export"], label[for*="export"]').forEach(el => {
                    el.style.display = 'none';
                });
                // Esconder área de exportação
                const exportArea = document.querySelector('.export-options, .export-buttons');
                if (exportArea) exportArea.style.display = 'none';
                
                // Esconder radio buttons de Excel/PDF
                document.querySelectorAll('input[value="excel"], input[value="pdf"]').forEach(el => {
                    el.style.display = 'none';
                    const label = el.nextElementSibling || el.parentElement;
                    if (label) label.style.display = 'none';
                });
                
                // Esconder toggle Ativo no topo
                const toggleAtivo = document.querySelector('.toggle-ativo, .ativo-toggle, #toggleAtivo');
                if (toggleAtivo) toggleAtivo.style.display = 'none';
                
                // Esconder botões de ação (NÃO esconder Buscar, Limpar, Fornecedor)
                const botoesBloquear = [
                    '#btnAdd', '#btnExcluir', '#btnInativar', '#btnAtivar',
                    '.btn-novo', '.btn-cadastrar', '.btn-salvar', '.btn-excluir',
                    '#btnSalvar', '#btnSalvarNr06', '#btnSalvarNr10', '#btnSalvarNr11',
                    '#btnSalvarNr12', '#btnSalvarNr17', '#btnSalvarNr18', '#btnSalvarNr20',
                    '#btnSalvarNr33', '#btnSalvarNr34', '#btnSalvarNr35', '#btnSalvarEpi',
                    '#btnSalvarFornecedor',
                    '.btn-upload-foto', '.btn-remover-foto',
                    '.btn-ativo', '.btn-inativo', '#btnAtivo',
                    '.toggle-situacao', '.btn-edit-row', '.btn-delete-row',
                    '.row-action', '.grid-action',
                    '#btnAtivarMultiplos', '#btnInativarMultiplos'
                ];
                
                botoesBloquear.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.display = 'none';
                    });
                });
                
                // Esconder coluna de checkbox e ações no grid
                document.querySelectorAll('.col-checkbox, .col-actions, .row-checkbox').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Esconder toggle de situação (Ativo/Inativo) no grid
                document.querySelectorAll('.situacao-toggle, .switch').forEach(el => {
                    if (el.closest('tr') || el.closest('.data-row')) {
                        el.style.display = 'none';
                    }
                });
                
                // Esconder linha de Situação e Ações no grid
                document.querySelectorAll('[class*="situacao"], [class*="acoes"], [class*="actions"]').forEach(el => {
                    if (el.querySelector('input, button, .switch, .toggle')) {
                        el.style.visibility = 'hidden';
                    }
                });
                
                // Esconder ícones de ação (lápis, lixeira, etc)
                document.querySelectorAll('.edit-icon, .delete-icon, .action-icon').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Bloquear exportação de planilha
                document.querySelectorAll('[onclick*="exportar"]').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Bloquear botões de imagem (qualquer botão com Imagem, selecionarFoto, removerFoto)
                document.querySelectorAll('[onclick*="selecionarFoto"], [onclick*="removerFoto"], [onclick*="Imagem"]').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Bloquear botões com texto específico
                document.querySelectorAll('button').forEach(btn => {
                    const texto = btn.textContent.toLowerCase();
                    if (texto.includes('salvar') || texto.includes('cadastrar') || 
                        texto.includes('excluir') || texto.includes('novo') ||
                        texto.includes('ativo') || texto.includes('imagem')) {
                        btn.style.display = 'none';
                    }
                });
                
                // Esconder spans/divs com ações no grid
                document.querySelectorAll('span, div').forEach(el => {
                    const onclick = el.getAttribute('onclick') || '';
                    if (onclick.includes('toggle') || onclick.includes('editar') || 
                        onclick.includes('excluir') || onclick.includes('inativar') ||
                        onclick.includes('ativar')) {
                        el.style.display = 'none';
                    }
                });
            };
            
            setTimeout(ocultarBotoes, 500);
            
            // Aplicar restrições quando modal abrir ou grid atualizar
            const observer = new MutationObserver(() => {
                setTimeout(ocultarBotoes, 50);
            });
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Bloquear print screen (Ctrl+P e PrintScreen)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey && e.key === 'p') || e.key === 'PrintScreen') {
                    e.preventDefault();
                    this.showToast('Ação não permitida para este usuário', 'error');
                    return false;
                }
            });
        } else {
            document.body.classList.add('user-master');
        }
    }
    
    // Verificar permissão antes de executar ação
    verificarPermissao(acao) {
        if (this.currentUser && this.currentUser.tipo === 'comum') {
            this.showToast('Ação não permitida para este usuário', 'error');
            return false;
        }
        return true;
    }
    
    logout() {
        sessionStorage.removeItem('user');
        window.location.href = '/login.html';
    }
    
    // Gerenciar usuários
    async abrirGerenciarUsuarios() {
        if (this.currentUser.tipo !== 'master') {
            this.showToast('Acesso negado', 'error');
            return;
        }
        
        document.getElementById('modalUsuarios').style.display = 'flex';
        await this.carregarListaUsuarios();
    }
    
    fecharGerenciarUsuarios() {
        document.getElementById('modalUsuarios').style.display = 'none';
    }
    
    async carregarListaUsuarios() {
        try {
            const response = await fetch('/api/usuarios');
            const result = await response.json();
            
            if (result.success) {
                const tbody = document.getElementById('listaUsuarios');
                tbody.innerHTML = result.data.map(u => `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">${u.login}</td>
                        <td style="padding: 10px;">${u.nome}</td>
                        <td style="padding: 10px; text-align: center;">
                            <span style="padding: 3px 8px; border-radius: 3px; background: ${u.tipo === 'master' ? '#4CAF50' : '#2196F3'}; color: white; font-size: 12px;">
                                ${u.tipo.toUpperCase()}
                            </span>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <span style="color: ${u.ativo ? 'green' : 'red'};">${u.ativo ? '✓ Ativo' : '✗ Inativo'}</span>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            ${u.id !== 1 ? `
                                <button onclick="syscontrole.toggleUsuario(${u.id}, ${!u.ativo})" style="padding: 5px 10px; margin: 2px; border: none; border-radius: 3px; cursor: pointer; background: ${u.ativo ? '#ff9800' : '#4CAF50'}; color: white;">
                                    ${u.ativo ? 'Desativar' : 'Ativar'}
                                </button>
                                <button onclick="syscontrole.excluirUsuario(${u.id})" style="padding: 5px 10px; margin: 2px; border: none; border-radius: 3px; cursor: pointer; background: #f44336; color: white;">
                                    Excluir
                                </button>
                            ` : '<span style="color: #999;">Protegido</span>'}
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
        }
    }
    
    async criarUsuario() {
        const login = document.getElementById('novoUserLogin').value.trim();
        const senha = document.getElementById('novoUserSenha').value;
        const nome = document.getElementById('novoUserNome').value.trim();
        const tipo = document.getElementById('novoUserTipo').value;
        
        if (!login || !senha || !nome) {
            this.showToast('Preencha todos os campos', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha, nome, tipo })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Usuário criado com sucesso', 'success');
                document.getElementById('novoUserLogin').value = '';
                document.getElementById('novoUserSenha').value = '';
                document.getElementById('novoUserNome').value = '';
                await this.carregarListaUsuarios();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao criar usuário', 'error');
        }
    }
    
    async toggleUsuario(id, ativo) {
        try {
            const response = await fetch(`/api/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ativo })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Usuário atualizado', 'success');
                await this.carregarListaUsuarios();
            }
        } catch (err) {
            this.showToast('Erro ao atualizar usuário', 'error');
        }
    }
    
    async excluirUsuario(id) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        
        try {
            const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Usuário excluído', 'success');
                await this.carregarListaUsuarios();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao excluir usuário', 'error');
        }
    }
    
    // ============ BACKUP E MANUTENÇÃO ============
    async abrirBackup() {
        if (this.currentUser.tipo !== 'master') {
            this.showToast('Acesso negado', 'error');
            return;
        }
        
        document.getElementById('modalBackup').style.display = 'flex';
        await this.carregarContagensBackup();
    }
    
    fecharBackup() {
        document.getElementById('modalBackup').style.display = 'none';
    }
    
    async carregarContagensBackup() {
        try {
            // Contar funcionários
            const resFuncionarios = await fetch('/api/ssma/count');
            const countFunc = await resFuncionarios.json();
            document.getElementById('countFuncionarios').textContent = `${countFunc.total || 0} registros`;
            
            // Contar fornecedores
            const resFornecedores = await fetch('/api/fornecedores/count');
            const countForn = await resFornecedores.json();
            document.getElementById('countFornecedores').textContent = `${countForn.total || 0} registros`;
            
            // Contar documentação
            const resDoc = await fetch('/api/documentacao/count');
            const countDoc = await resDoc.json();
            document.getElementById('countDocumentacao').textContent = `${countDoc.total || 0} registros`;
            
            // Contar presença
            const resPresenca = await fetch('/api/presenca/count');
            const countPresenca = await resPresenca.json();
            document.getElementById('countPresenca').textContent = `${countPresenca.total || 0} registros`;
        } catch (err) {
            console.error('Erro ao carregar contagens:', err);
        }
    }
    
    async fazerBackup() {
        try {
            this.showToast('Gerando backup...', 'info');
            
            const response = await fetch('/api/backup/exportar');
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro do servidor:', errorText);
                throw new Error('Servidor retornou erro: ' + response.status);
            }
            
            const backup = await response.json();
            
            if (backup.error) {
                this.showToast('Erro ao gerar backup: ' + backup.error, 'error');
                return;
            }
            
            // Criar arquivo para download
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            
            const dataAtual = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const nomeArquivo = `backup_syscontrole_${dataAtual}.json`;
            
            // Método alternativo de download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            
            // Forçar o clique
            setTimeout(() => {
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    this.showToast(`Backup "${nomeArquivo}" baixado com sucesso!`, 'success');
                }, 100);
            }, 0);
            
        } catch (err) {
            console.error('Erro ao fazer backup:', err);
            this.showToast('Erro ao fazer backup: ' + err.message, 'error');
        }
    }
    
    async restaurarBackup() {
        const fileInput = document.getElementById('arquivoBackup');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showToast('Selecione um arquivo de backup', 'error');
            return;
        }
        
        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá SUBSTITUIR todos os dados atuais pelos dados do backup.\n\nTem certeza que deseja continuar?')) {
            return;
        }
        
        if (!confirm('🔴 ÚLTIMA CONFIRMAÇÃO!\n\nTodos os dados atuais serão PERDIDOS.\n\nDeseja realmente restaurar o backup?')) {
            return;
        }
        
        try {
            this.showToast('Restaurando backup...', 'info');
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    console.log('Conteúdo do arquivo:', e.target.result.substring(0, 500));
                    const backupData = JSON.parse(e.target.result);
                    console.log('Backup parseado:', backupData);
                    
                    if (!backupData.dados) {
                        this.showToast('Arquivo não contém dados válidos', 'error');
                        return;
                    }
                    
                    const response = await fetch('/api/backup/restaurar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(backupData)
                    });
                    
                    const result = await response.json();
                    console.log('Resultado da restauração:', result);
                    
                    if (result.success) {
                        this.showToast('Backup restaurado com sucesso!', 'success');
                        await this.carregarContagensBackup();
                        this.loadData();
                    } else {
                        this.showToast('Erro ao restaurar: ' + result.error, 'error');
                    }
                } catch (parseErr) {
                    console.error('Erro ao parsear JSON:', parseErr);
                    this.showToast('Arquivo de backup inválido: ' + parseErr.message, 'error');
                }
            };
            reader.onerror = (err) => {
                console.error('Erro ao ler arquivo:', err);
                this.showToast('Erro ao ler arquivo', 'error');
            };
            reader.readAsText(file);
        } catch (err) {
            console.error('Erro ao restaurar backup:', err);
            this.showToast('Erro ao restaurar backup', 'error');
        }
    }
    
    async zerarFuncionarios() {
        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá EXCLUIR PERMANENTEMENTE todos os funcionários.\nOs IDs voltarão para zero.\n\nTem certeza?')) {
            return;
        }
        
        if (!confirm('🔴 ÚLTIMA CONFIRMAÇÃO!\n\nTodos os funcionários serão EXCLUÍDOS.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/backup/zerar/funcionarios', { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Funcionários zerados com sucesso!', 'success');
                await this.carregarContagensBackup();
                this.loadData();
            } else {
                this.showToast('Erro: ' + result.error, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao zerar funcionários', 'error');
        }
    }
    
    async zerarFornecedores() {
        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá EXCLUIR PERMANENTEMENTE todos os fornecedores.\nOs IDs voltarão para zero.\n\nTem certeza?')) {
            return;
        }
        
        if (!confirm('🔴 ÚLTIMA CONFIRMAÇÃO!\n\nTodos os fornecedores serão EXCLUÍDOS.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/backup/zerar/fornecedores', { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Fornecedores zerados com sucesso!', 'success');
                await this.carregarContagensBackup();
            } else {
                this.showToast('Erro: ' + result.error, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao zerar fornecedores', 'error');
        }
    }
    
    async zerarDocumentacao() {
        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá EXCLUIR PERMANENTEMENTE toda a documentação.\nOs IDs voltarão para zero.\n\nTem certeza?')) {
            return;
        }
        
        if (!confirm('🔴 ÚLTIMA CONFIRMAÇÃO!\n\nToda a documentação será EXCLUÍDA.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/backup/zerar/documentacao', { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Documentação zerada com sucesso!', 'success');
                await this.carregarContagensBackup();
            } else {
                this.showToast('Erro: ' + result.error, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao zerar documentação', 'error');
        }
    }
    
    async zerarTudo() {
        if (!confirm('⚠️⚠️⚠️ ATENÇÃO MÁXIMA! ⚠️⚠️⚠️\n\nIsso irá EXCLUIR PERMANENTEMENTE:\n- Todos os funcionários\n- Todos os fornecedores\n- Toda a documentação\n- Toda a lista de presença\n\nOs IDs voltarão para zero.\n\nTem CERTEZA ABSOLUTA?')) {
            return;
        }
        
        if (!confirm('🔴🔴🔴 ÚLTIMA CONFIRMAÇÃO! 🔴🔴🔴\n\nTODOS OS DADOS serão PERDIDOS PARA SEMPRE.\n\nDigite "CONFIRMAR" na próxima caixa para continuar.')) {
            return;
        }
        
        const confirmacao = prompt('Digite "CONFIRMAR" para zerar todos os dados:');
        if (confirmacao !== 'CONFIRMAR') {
            this.showToast('Operação cancelada', 'info');
            return;
        }
        
        try {
            this.showToast('Zerando todos os dados...', 'info');
            
            await fetch('/api/backup/zerar/funcionarios', { method: 'DELETE' });
            await fetch('/api/backup/zerar/fornecedores', { method: 'DELETE' });
            await fetch('/api/backup/zerar/documentacao', { method: 'DELETE' });
            await fetch('/api/backup/zerar/presenca', { method: 'DELETE' });
            
            this.showToast('Todos os dados foram zerados!', 'success');
            await this.carregarContagensBackup();
            this.loadData();
        } catch (err) {
            this.showToast('Erro ao zerar dados', 'error');
        }
    }
    
    async zerarPresenca() {
        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá EXCLUIR PERMANENTEMENTE toda a lista de presença do mês atual.\n\nTem certeza?')) {
            return;
        }
        
        if (!confirm('🔴 ÚLTIMA CONFIRMAÇÃO!\n\nToda a lista de presença será EXCLUÍDA.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/backup/zerar/presenca', { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Lista de presença zerada com sucesso!', 'success');
                await this.carregarContagensBackup();
            } else {
                this.showToast('Erro: ' + result.error, 'error');
            }
        } catch (err) {
            this.showToast('Erro ao zerar lista de presença', 'error');
        }
    }
    
    bindEvents() {
        // REGRA SUPREMA: Botões de salvar/cadastrar/alterar NUNCA recebem foco via TAB
        document.querySelectorAll('.btn-cadastrar, .btn-alterar, .btn-salvar, [id^="btnSalvar"], .btn-novo').forEach(btn => {
            btn.setAttribute('tabindex', '-1');
        });
        
        // Campos readonly NUNCA recebem foco via TAB
        document.querySelectorAll('input[readonly], .readonly-field').forEach(field => {
            field.setAttribute('tabindex', '-1');
        });
        
        // Botões da toolbar (igual ao sistema desktop)
        document.getElementById('btnBuscar').addEventListener('click', () => this.aplicarFiltros());
        document.getElementById('btnAdd').addEventListener('click', () => this.novoRegistro());
        document.getElementById('btnEditar').addEventListener('click', () => this.abrirTabelaFornecedor());
        document.getElementById('btnLimpar').addEventListener('click', () => this.limparTudo());
        
        // Configurar busca por datas
        this.setupBuscaDatas();
        
        // Toggle Ativo/Inativo
        document.getElementById('chkAtivo').addEventListener('change', (e) => this.toggleAtivoInativo(e));
        
        // Controle das abas principais (Cursos/Fornecedor)
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.target.dataset.tab;
                this.switchMainTab(tabType);
            });
        });
        
        // Controle das abas NR
        document.querySelectorAll('.nr-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const nrType = e.target.dataset.nr;
                this.switchNRTab(nrType);
            });
        });
        
        // Configurar eventos específicos das NRs
        this.setupNR06Events();
        this.setupNR10Events();
        this.setupNR11Events();
        this.setupNR12Events();
        this.setupNR17Events();
        this.setupNR18Events();
        this.setupNR20Events();
        this.setupNR33Events();
        this.setupNR34Events();
        this.setupNR35Events();
        this.setupEPIEvents();
        this.setupAllNREvents();
        
        // Configurar eventos do fornecedor
        this.setupFornecedorEvents();
        
        // Configurar eventos da documentação
        this.setupDocumentacaoEvents();
        
        // Preview da foto - após carregar, foca no campo anotações
        document.getElementById('foto').addEventListener('change', (e) => {
            this.previewFoto(e.target.files[0]);
            // Após carregar a foto, foca no campo anotações
            setTimeout(() => {
                const anotacoes = document.getElementById('anotacoes');
                if (anotacoes) {
                    anotacoes.focus();
                }
            }, 300);
        });
        
        // Formatação automática da data de emissão
        const dataEmissao = document.getElementById('dataEmissao');
        if (dataEmissao) {
            dataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente após cada digitação
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais - calcular mesmo com ano parcial
                        // Forçar recálculo completo
                        this.calcularVencimentoAutomatico(valor);
                        setTimeout(() => {
                            this.calcularDias();
                            this.atualizarStatus();
                        }, 50);
                    }
                }, 100);
            });
            dataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtual(e);
                    setTimeout(() => this.calcularDiasEStatus(), 100);
                }
            });
            // Calcular também quando sair do campo (blur)
            dataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularDiasEStatus(), 100);
            });
            // Selecionar tudo ao duplo clique
            dataEmissao.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
        
        // Cálculo automático de dias
        const vencimento = document.getElementById('vencimento');
        if (vencimento) {
            vencimento.addEventListener('change', () => this.calcularDiasEStatus());
            vencimento.addEventListener('input', () => this.calcularDiasEStatus());
            // Selecionar tudo ao duplo clique
            vencimento.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
        
        // Adicionar event listeners para todos os selects de status para atualizar cores
        const statusSelects = [
            'status', 'nr10_status', 'nr11_status', 'nr12_status', 
            'nr17_status', 'nr18_status', 'nr33_status', 'nr35_status', 'epi_status'
        ];
        
        statusSelects.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.atualizarCorStatus(e.target, e.target.value);
                });
            }
        });
        
        // Botão Ativo/Inativo não precisa de event listener aqui pois usa onclick
        
        // Busca nos campos de filtro - Enter ou botão Buscar
        ['filtroNome', 'filtroEmpresa', 'filtroFuncao'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Enter para buscar
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.currentPage = 1;
                        this.loadData(false);
                    }
                });
                
                // Também funciona com keydown (melhor suporte mobile)
                element.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.currentPage = 1;
                        this.loadData(false);
                    }
                });
                
                // Busca ao sair do campo (blur) - útil no mobile
                element.addEventListener('blur', () => {
                    // Pequeno delay para não conflitar com o botão Buscar
                    setTimeout(() => {
                        if (element.value.trim() !== '') {
                            this.currentPage = 1;
                            this.loadData(false);
                        }
                    }, 300);
                });
            }
        });
        
        // Paginação (igual ao sistema desktop)
        document.getElementById('btnFirst').addEventListener('click', () => this.irParaPagina(1));
        document.getElementById('btnPrev').addEventListener('click', () => this.irParaPagina(this.currentPage - 1));
        document.getElementById('btnNext').addEventListener('click', () => this.irParaPagina(this.currentPage + 1));
        document.getElementById('btnLast').addEventListener('click', () => this.irParaPagina(this.totalPages));
        
        // Modal events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.fecharModals());
        });
        
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.fecharModals());
        }
        
        const btnCancelarConfirm = document.getElementById('btnCancelarConfirm');
        if (btnCancelarConfirm) {
            btnCancelarConfirm.addEventListener('click', () => this.fecharModals());
        }
        
        // Form submit
        const formSSMA = document.getElementById('formSSMA');
        if (formSSMA) {
            formSSMA.addEventListener('submit', (e) => this.salvarRegistro(e));
        }
        
        // Botões Novo no formulário (todos)
        document.querySelectorAll('.btn-novo').forEach(btnNovo => {
            btnNovo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Verificar se está na aba de documentação
                const documentacaoContent = document.getElementById('content-documentacao');
                if (documentacaoContent && documentacaoContent.classList.contains('active')) {
                    // Se está na aba de documentação, apenas limpar o formulário
                    this.limparDocumentacao();
                    return;
                }
                
                // Verificar se está na aba de fornecedor
                const fornecedorTab = document.querySelector('[data-tab="fornecedor"]');
                if (fornecedorTab && fornecedorTab.classList.contains('active')) {
                    // Se está na aba de fornecedor, chamar novoFornecedor
                    this.novoFornecedor();
                } else {
                    // Caso contrário, chamar novoRegistro (para cursos)
                    this.novoRegistro();
                }
            });
        });
        
        // Toast close
        const toastClose = document.getElementById('toastClose');
        if (toastClose) {
            toastClose.addEventListener('click', () => this.hideToast());
        }
        
        // Fechar modal clicando fora
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.fecharModals();
            }
        });
        
        // Atalhos do teclado (igual ao sistema desktop)
        document.addEventListener('keydown', (e) => {
            // Navegação entre abas com setas direita/esquerda
            // SOMENTE funciona na tela de cadastro de CURSOS (NRs)
            // IGNORAR se o foco está em um campo de input, select ou textarea
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'SELECT' || 
                activeElement.tagName === 'TEXTAREA'
            );
            
            if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !isInputFocused) {
                const modal = document.getElementById('modalForm');
                if (modal && modal.style.display === 'block') {
                    // Verificar se está na aba de CURSOS (nr-tabs visível)
                    const nrTabs = document.querySelector('.nr-tabs');
                    const nrTabsVisible = nrTabs && nrTabs.style.display !== 'none';
                    
                    // Só navegar se estiver na aba de cursos
                    if (!nrTabsVisible) {
                        return; // Não fazer nada em outras abas
                    }
                    
                    e.preventDefault();
                    
                    // Pegar apenas abas habilitadas (visíveis)
                    const abasHabilitadas = Array.from(document.querySelectorAll('.nr-tab'))
                        .filter(tab => tab.style.display !== 'none')
                        .map(tab => tab.dataset.nr);
                    
                    if (abasHabilitadas.length === 0) return;
                    
                    const abaAtiva = document.querySelector('.nr-tab.active');
                    
                    if (abaAtiva) {
                        const abaAtualValue = abaAtiva.dataset.nr.trim().toLowerCase();
                        const abaAtualIndex = abasHabilitadas.indexOf(abaAtualValue);
                        
                        if (abaAtualIndex !== -1) {
                            let proximaAbaIndex;
                            
                            if (e.key === 'ArrowRight') {
                                proximaAbaIndex = (abaAtualIndex + 1) % abasHabilitadas.length;
                            } else {
                                proximaAbaIndex = (abaAtualIndex - 1 + abasHabilitadas.length) % abasHabilitadas.length;
                            }
                            
                            const proximaAba = abasHabilitadas[proximaAbaIndex];
                            this.switchNRTab(proximaAba);
                        }
                    }
                }
            }
            
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        // Verificar se está na aba de documentação
                        const docContent = document.getElementById('content-documentacao');
                        if (docContent && docContent.classList.contains('active')) {
                            this.limparDocumentacao();
                        } else {
                            this.novoRegistro();
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        this.editarRegistro();
                        break;
                    case 'Delete':
                        e.preventDefault();
                        this.excluirRegistro();
                        break;
                    case 'F5':
                        e.preventDefault();
                        this.loadData();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.fecharModals();
            }
        });
    }
    
    // Carregar dados da API (igual ao sistema desktop)
    async loadData(showLoading = true) {
        // Não carregar dados se a modal de habilitar cursos estiver aberta
        if (this.modalHabilitarAberta) {
            return;
        }
        
        // Gerar ID único para esta requisição
        const requestId = Date.now();
        this.lastRequestId = requestId;
        
        try {
            if (showLoading) {
                this.showLoading();
            }
            
            const filtros = this.getFiltros();
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...filtros
            });
            
            console.log('🔍 Requisição', requestId, '- Filtros:', JSON.stringify(filtros));
            
            const response = await fetch(`/api/ssma?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ignorar resposta se uma requisição mais recente já foi feita
            if (this.lastRequestId !== requestId) {
                console.log('⏭️ Ignorando resposta antiga:', requestId);
                return;
            }
            
            console.log('✅ Processando requisição', requestId, '- Total:', data.total);
            
            if (data && data.data) {
                this.currentData = data.data;
                this.totalPages = data.totalPages || 1;
                this.totalFiltrados = data.total || data.data.length;
                this.renderTable(data.data);
                this.updatePagination(data);
                this.updateStats(data.data, data.total);
                this.updateFixedCounters(data);
                this.updateProgressBar(data); // Passar objeto completo com totalAtivos/totalInativos
                this.updateToolbarState();
                // Atualizar contadores de vencimento de TODOS os registros
                this.buscarContadoresGlobais();
            } else {
                this.renderTable([]);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Erro ao carregar dados:', error);
            this.showToast('Erro de conexão com o servidor: ' + error.message, 'error');
            this.renderTable([]);
        }
    }
    
    // Renderizar tabela (SIMPLIFICADO)
    renderTable(data) {
        console.log('📊 renderTable chamado com', data?.length || 0, 'registros');
        
        const tbody = document.getElementById('tabelaBody');
        if (!tbody) {
            console.error('Elemento tabelaBody não encontrado!');
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="loading-cell">
                        <div style="text-align: center; padding: 40px;">
                            <span style="font-size: 48px;">📋</span>
                            <p style="margin: 10px 0; font-size: 16px; color: #6c757d;">Nenhum registro encontrado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render direto
        const html = data.map(item => this.createRowHTML(item)).join('');
        tbody.innerHTML = html;
        console.log('✅ Tabela renderizada com', data.length, 'linhas');
        
        // Reaplicar visibilidade das colunas após renderizar
        this.aplicarVisibilidadeColunasCache();
        
        // Renderizar cards mobile
        this.renderMobileCards(data);
    }
    
    // Renderizar cards para mobile
    renderMobileCards(data) {
        let container = document.getElementById('mobileCardsContainer');
        
        // Criar container se não existir
        if (!container) {
            container = document.createElement('div');
            container.id = 'mobileCardsContainer';
            container.className = 'mobile-cards-container';
            const mainTable = document.getElementById('mainTableContainer');
            if (mainTable) {
                mainTable.appendChild(container);
            }
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="mobile-empty">
                    <div class="mobile-empty-icon">📋</div>
                    <div class="mobile-empty-text">Nenhum registro encontrado</div>
                </div>
            `;
            return;
        }
        
        const cardsHTML = data.map(item => this.createMobileCardHTML(item)).join('');
        container.innerHTML = cardsHTML;
    }
    
    // Criar HTML de um card mobile
    createMobileCardHTML(item) {
        const statusASO = this.calcularStatusCurso(item.Vencimento, 'ASO');
        const statusNR06 = this.calcularStatusCurso(item.Nr06_Vencimento, 'NR06');
        const statusNR10 = this.calcularStatusCurso(item.Nr10_Vencimento, 'NR10');
        const statusNR11 = this.calcularStatusCurso(item.Nr11_Vencimento, 'NR11');
        const statusNR12 = this.calcularStatusCurso(item.NR12_Vencimento, 'NR12');
        const statusNR18 = this.calcularStatusCurso(item.NR18_Vencimento, 'NR18');
        const statusNR33 = this.calcularStatusCurso(item.NR33_Vencimento, 'NR33');
        const statusNR35 = this.calcularStatusCurso(item.NR35_Vencimento, 'NR35');
        
        const situacaoClass = item.Situacao === 'N' ? 'ativo' : 'inativo';
        const situacaoText = item.Situacao === 'N' ? 'Ativo' : 'Inativo';
        
        const fotoHTML = item.fotoUrl && item.fotoUrl !== 'null' && item.fotoUrl !== '' 
            ? `<img src="${item.fotoUrl}" class="mobile-card-foto" alt="Foto" onerror="this.src='/FotoPadrao_Sys.png';">`
            : `<div class="mobile-card-foto-placeholder">👤</div>`;
        
        return `
            <div class="mobile-card ${this.selectedRows.has(item.id) ? 'selected' : ''}" data-id="${item.id}">
                <div class="mobile-card-header" onclick="syscontrole.editarRegistroById(${item.id})">
                    ${fotoHTML}
                    <div class="mobile-card-info">
                        <div class="mobile-card-nome">${item.Nome || ''}</div>
                        <div class="mobile-card-empresa">${item.Empresa || ''}</div>
                        <div class="mobile-card-funcao">${item.Funcao || ''}</div>
                    </div>
                    <div class="mobile-card-status">
                        <span class="mobile-card-status-badge ${situacaoClass}">${situacaoText}</span>
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-cursos">
                        ${this.createMobileCursoHTML('ASO', statusASO)}
                        ${this.createMobileCursoHTML('NR-06', statusNR06)}
                        ${this.createMobileCursoHTML('NR-10', statusNR10)}
                        ${this.createMobileCursoHTML('NR-11', statusNR11)}
                        ${this.createMobileCursoHTML('NR-12', statusNR12)}
                        ${this.createMobileCursoHTML('NR-18', statusNR18)}
                        ${this.createMobileCursoHTML('NR-33', statusNR33)}
                        ${this.createMobileCursoHTML('NR-35', statusNR35)}
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <span class="mobile-card-id">ID: ${item.id}</span>
                    <div class="mobile-card-actions">
                        <button class="mobile-card-btn mobile-card-btn-editar" onclick="event.stopPropagation(); syscontrole.editarRegistroById(${item.id})">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Criar HTML de um curso no card mobile
    createMobileCursoHTML(nome, status) {
        let statusClass = 'na';
        let statusText = 'N/A';
        
        if (status === 'ok') {
            statusClass = 'ok';
            statusText = 'OK';
        } else if (status === 'renovar') {
            statusClass = 'renovar';
            statusText = '30d';
        } else if (status === 'vencido') {
            statusClass = 'vencido';
            statusText = 'Venc';
        }
        
        return `
            <div class="mobile-card-curso">
                <div class="mobile-card-curso-nome">${nome}</div>
                <div class="mobile-card-curso-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }
    
    // Criar HTML de uma linha (função auxiliar)
    createRowHTML(item) {
        const statusASO = this.calcularStatusCurso(item.Vencimento, 'ASO');
        const statusNR06 = this.calcularStatusCurso(item.Nr06_Vencimento, 'NR06');
        const statusNR10 = this.calcularStatusCurso(item.Nr10_Vencimento, 'NR10');
        const statusNR11 = this.calcularStatusCurso(item.Nr11_Vencimento, 'NR11');
        const statusNR12 = this.calcularStatusCurso(item.NR12_Vencimento, 'NR12');
        const statusNR17 = this.calcularStatusCurso(item.Nr17_Vencimento, 'NR17');
        const statusNR18 = this.calcularStatusCurso(item.NR18_Vencimento, 'NR18');
        const statusNR20 = this.calcularStatusCurso(item.Nr20_Vencimento, 'NR20');
        const statusNR33 = this.calcularStatusCurso(item.NR33_Vencimento, 'NR33');
        const statusNR34 = this.calcularStatusCurso(item.Nr34_Vencimento, 'NR34');
        const statusNR35 = this.calcularStatusCurso(item.NR35_Vencimento, 'NR35');
        const statusEPI = this.calcularStatusCurso(item.epiVencimento, 'EPI');
        
        return `
        <tr data-id="${item.id}" data-status-aso="${statusASO}" data-status-nr06="${statusNR06}" data-status-nr10="${statusNR10}" data-status-nr11="${statusNR11}" data-status-nr12="${statusNR12}" data-status-nr17="${statusNR17}" data-status-nr18="${statusNR18}" data-status-nr20="${statusNR20}" data-status-nr33="${statusNR33}" data-status-nr34="${statusNR34}" data-status-nr35="${statusNR35}" data-status-epi="${statusEPI}" ${this.selectedRows.has(item.id) ? 'class="selected"' : ''}>
            <td class="col-expand">
                <input type="checkbox" class="row-checkbox" data-id="${item.id}" onchange="syscontrole.toggleRowCheckbox(${item.id}, this)" ${this.selectedRows.has(item.id) ? 'checked' : ''}>
            </td>
            <td class="col-foto">${this.renderFoto(item.fotoUrl, item.id)}</td>
            <td class="col-nome">
                <div class="nome-principal">${item.Nome || ''}</div>
                <div class="cadastro-data">Cadastro: ${this.formatDateForDisplay(item.Cadastro) || '09/12/2025'}</div>
                <div class="situacao-linha">
                    <span class="situacao-label">Situação:</span>
                    <div class="toggle-mini-container">
                        <input type="checkbox" id="toggle-${item.id}" ${item.Situacao === 'N' ? 'checked' : ''} class="toggle-mini-input" onchange="syscontrole.toggleSituacaoLinha(${item.id}, this)">
                        <label for="toggle-${item.id}" class="toggle-mini-label">
                            <span class="toggle-mini-slider"></span>
                        </label>
                    </div>
                    <span class="situacao-text">${item.Situacao === 'N' ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div class="acoes-linha">
                    <span class="acoes-label">Ações:</span>
                    <button class="action-btn-mini action-edit" onclick="syscontrole.editarRegistroById(${item.id})" title="Editar">✏️</button>
                    <button class="action-btn-mini action-delete" onclick="syscontrole.excluirRegistroById(${item.id})" title="Excluir">🗑️</button>
                </div>
            </td>
            <td class="col-empresa">${item.Empresa || ''}</td>
            <td class="col-funcao">${item.Funcao || ''}</td>
            <td class="col-id">${item.id}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr06_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr10_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr11_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.NR12_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr17_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.NR18_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr20_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.NR33_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.Nr34_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.NR35_Vencimento)}</td>
            <td class="col-venc">${this.formatDateForDisplay(item.epiVencimento)}</td>
        </tr>
    `;
    }
    
    // Atualizar linha apenas se necessário (ZERO FLICKERING)
    updateRowIfNeeded(row, item) {
        // Esta função atualiza apenas células específicas que mudaram
        // Por enquanto, não fazemos nada - isso evita qualquer flickering
        // A tabela só é redesenhada quando há mudanças estruturais
    }
    
    // Renderizar foto
    renderFoto(fotoUrl, id) {
        if (fotoUrl && fotoUrl !== 'null' && fotoUrl !== '') {
            // Adicionar timestamp para cache-busting
            const timestamp = new Date().getTime();
            const urlComTimestamp = `${fotoUrl}?t=${timestamp}`;
            return `<img src="${urlComTimestamp}" class="foto-thumbnail" alt="Foto" ondblclick="syscontrole.mostrarZoomFoto('${urlComTimestamp}')" style="cursor: pointer;" onerror="this.src='/FotoPadrao_Sys.png';">`;
        }
        
        // Mostrar foto padrão quando não houver foto
        return `<img src="/FotoPadrao_Sys.png" class="foto-thumbnail" alt="Foto Padrão">`;
    }
    
    // Formatar data para exibição
    formatDateForDisplay(dateString) {
        if (!dateString || dateString === 'null') return '';
        
        try {
            // Se já está no formato dd/mm/aaaa, retornar direto
            if (dateString.includes('/')) {
                return dateString;
            }
            
            // Se está no formato aaaa-mm-dd, converter para dd/mm/aaaa
            if (dateString.includes('-')) {
                const partes = dateString.split('T')[0].split('-'); // Remove hora se tiver
                if (partes.length === 3) {
                    const day = partes[2].substring(0, 2); // Pega só os 2 primeiros chars (ignora hora)
                    const month = partes[1];
                    const year = partes[0];
                    
                    // Verificar se está vencido (vermelho) ou próximo do vencimento (laranja)
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = date.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let className = '';
                    if (diffDays < 0) {
                        className = 'status-vencido';
                    } else if (diffDays <= 30) {
                        className = 'status-renovar';
                    } else {
                        className = 'status-ok';
                    }
                    
                    return `<span class="${className}">${day}/${month}/${year}</span>`;
                }
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }
    
    // Renderizar badge de situação
    renderSituacaoBadge(situacao) {
        if (situacao === 'N') {
            return '<span class="situacao-ativo">Ativo</span>';
        } else {
            return '<span class="situacao-inativo">Inativo</span>';
        }
    }
    
    // Atualizar estatísticas (igual ao sistema desktop)
    updateStats(data, totalFiltrados) {
        if (this.modalHabilitarAberta) return;
        
        // Contar registros por status
        let totalOK = 0, totalRenovar = 0, totalVencido = 0;
        
        data.forEach(item => {
            // Verificar todas as datas de vencimento
            const dates = [
                item.Vencimento, item.Nr06_Vencimento, item.Nr10_Vencimento, item.Nr11_Vencimento,
                item.NR12_Vencimento, item.Nr17_Vencimento, item.NR18_Vencimento,
                item.Nr20_Vencimento, item.NR33_Vencimento, item.Nr34_Vencimento, item.NR35_Vencimento, item.epiVencimento
            ];
            
            let hasVencido = false, hasRenovar = false;
            
            dates.forEach(dateStr => {
                if (dateStr && dateStr !== 'null') {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                        hasVencido = true;
                    } else if (diffDays <= 30) {
                        hasRenovar = true;
                    }
                }
            });
            
            if (hasVencido) {
                totalVencido++;
            } else if (hasRenovar) {
                totalRenovar++;
            } else {
                totalOK++;
            }
        });
        
        // Atualizar contadores no rodapé - usar total filtrado (todas as páginas)
        const recordCount = document.querySelector('.record-count');
        const total = totalFiltrados || data.length;
        
        if (recordCount) recordCount.textContent = `👤 ${total} Localizados`;
    }
    
    // Atualizar contadores fixos de Ativo/Inativo (não acompanham filtros)
    updateFixedCounters(data) {
        if (this.modalHabilitarAberta) return;
        
        // Usar os dados que já foram carregados da API
        if (data && data.totalAtivos !== undefined && data.totalInativos !== undefined) {
            const activeCount = document.querySelector('.active-count');
            const canceledCount = document.querySelector('.canceled-count');
            
            if (activeCount) activeCount.textContent = `${data.totalAtivos} Ativo`;
            if (canceledCount) canceledCount.textContent = `${data.totalInativos} Cancelado`;
        }
    }
    
    // Atualizar paginação (igual ao sistema desktop)
    updatePagination(data) {
        console.log('updatePagination chamado com:', data);
        
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.value = `Pág ${data.page}/${data.totalPages}`;
        }
        
        // Atualizar botões
        const btnFirst = document.getElementById('btnFirst');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnLast = document.getElementById('btnLast');
        
        console.log(`Página atual: ${data.page}, Total de páginas: ${data.totalPages}`);
        
        btnFirst.disabled = data.page <= 1;
        btnPrev.disabled = data.page <= 1;
        btnNext.disabled = data.page >= data.totalPages;
        btnLast.disabled = data.page >= data.totalPages;
        
        console.log(`Botões: First=${btnFirst.disabled}, Prev=${btnPrev.disabled}, Next=${btnNext.disabled}, Last=${btnLast.disabled}`);
    }
    
    // Seleção de linhas (igual ao sistema desktop)
    selectRow(id, event) {
        if (event.target.tagName === 'BUTTON' || event.target.tagName === 'IMG') {
            return; // Não selecionar se clicou no botão ou imagem
        }
        
        const row = document.querySelector(`tr[data-id="${id}"]`);
        
        if (event.ctrlKey) {
            // Seleção múltipla
            this.toggleRowSelection(id, !this.selectedRows.has(id));
        } else {
            // Seleção única
            this.clearSelection();
            this.toggleRowSelection(id, true);
        }
        
        this.updateToolbarState();
    }
    
    toggleRowSelection(id, selected) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        
        if (selected) {
            this.selectedRows.add(id);
            if (row) row.classList.add('selected');
        } else {
            this.selectedRows.delete(id);
            if (row) row.classList.remove('selected');
        }
        
        this.updateToolbarState();
    }
    
    clearSelection() {
        this.selectedRows.clear();
        document.querySelectorAll('tr.selected').forEach(row => {
            row.classList.remove('selected');
        });
        this.updateToolbarState();
    }
    
    updateToolbarState() {
        const hasSelection = this.selectedRows.size > 0;
        const singleSelection = this.selectedRows.size === 1;
        
        // Botão Fornecedor sempre habilitado (não precisa de seleção)
        const btnEditar = document.getElementById('btnEditar');
        if (btnEditar) btnEditar.disabled = false;
        
        // Mostrar/ocultar botões de ativar/inativar múltiplos baseado no filtro
        const btnAtivarMultiplos = document.getElementById('btnAtivarMultiplos');
        const btnInativarMultiplos = document.getElementById('btnInativarMultiplos');
        const chkAtivo = document.getElementById('chkAtivo');
        
        if (hasSelection && chkAtivo) {
            // Se está vendo ativos (checked = true), mostrar só "Inativar"
            if (chkAtivo.checked) {
                if (btnAtivarMultiplos) btnAtivarMultiplos.style.display = 'none';
                if (btnInativarMultiplos) btnInativarMultiplos.style.display = 'inline-block';
            }
            // Se está vendo inativos (checked = false), mostrar só "Ativar"
            else {
                if (btnAtivarMultiplos) btnAtivarMultiplos.style.display = 'inline-block';
                if (btnInativarMultiplos) btnInativarMultiplos.style.display = 'none';
            }
        } else {
            // Sem seleção, ocultar ambos
            if (btnAtivarMultiplos) btnAtivarMultiplos.style.display = 'none';
            if (btnInativarMultiplos) btnInativarMultiplos.style.display = 'none';
        }
    }
    
    // Gerenciar checkbox de seleção de linha
    toggleRowCheckbox(id, checkbox) {
        const isChecked = checkbox.checked;
        const row = document.querySelector(`tr[data-id="${id}"]`);
        
        if (isChecked) {
            this.selectedRows.add(id);
            if (row) row.classList.add('selected');
        } else {
            this.selectedRows.delete(id);
            if (row) row.classList.remove('selected');
        }
        
        this.updateToolbarState();
    }
    
    // Ativar/Inativar múltiplos registros
    async ativarInativarMultiplos(ativar) {
        if (this.selectedRows.size === 0) {
            this.showToast('Selecione pelo menos um registro', 'warning');
            return;
        }
        
        const action = ativar ? 'ativar' : 'inativar';
        const message = `Tem certeza que deseja ${action} ${this.selectedRows.size} registro(s)?`;
        
        if (!confirm(message)) {
            return;
        }
        
        try {
            let sucessos = 0;
            let erros = 0;
            
            for (const id of this.selectedRows) {
                try {
                    const response = await fetch(`/api/ssma/${id}/toggle-situacao`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            situacao: ativar ? 'N' : 'S',
                            dataInativacao: ativar ? null : new Date().toISOString()
                        })
                    });
                    
                    if (response.ok) {
                        sucessos++;
                        // Remover linha da tabela
                        const row = document.querySelector(`tr[data-id="${id}"]`);
                        if (row) {
                            row.style.transition = 'opacity 0.3s ease';
                            row.style.opacity = '0';
                            setTimeout(() => row.remove(), 300);
                        }
                    } else {
                        erros++;
                    }
                } catch (error) {
                    erros++;
                }
            }
            
            this.selectedRows.clear();
            this.showToast(`${sucessos} registro(s) ${action}do(s) com sucesso!`, 'success');
            
            if (erros > 0) {
                this.showToast(`${erros} erro(s) ao ${action}`, 'warning');
            }
            
            // Atualizar dados
            setTimeout(() => {
                this.loadData();
            }, 500);
            
        } catch (error) {
            console.error('Erro:', error);
            this.showToast('Erro ao processar ação', 'error');
        }
    }
    
    // Filtros (igual ao sistema desktop)
    getFiltros() {
        const filtros = {};
        
        const filtroNome = document.getElementById('filtroNome');
        if (filtroNome) filtros.nome = filtroNome.value.trim();
        
        const filtroEmpresa = document.getElementById('filtroEmpresa');
        if (filtroEmpresa) filtros.empresa = filtroEmpresa.value.trim();
        
        const filtroFuncao = document.getElementById('filtroFuncao');
        if (filtroFuncao) filtros.funcao = filtroFuncao.value.trim();
        
        // Filtros de data de cadastro (input type="date" já vem no formato YYYY-MM-DD)
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');
        
        if (dataInicio && dataInicio.value) {
            filtros.dataInicio = dataInicio.value;
            
            // Se não tem data fim, usar a mesma data (busca exata)
            if (!dataFim || !dataFim.value) {
                filtros.dataFim = dataInicio.value;
            }
        }
        if (dataFim && dataFim.value) {
            filtros.dataFim = dataFim.value;
        }
        
        // Filtro de situação baseado no toggle
        // N = ATIVO, S = CANCELADO
        const chkAtivo = document.getElementById('chkAtivo');
        if (chkAtivo) {
            filtros.situacao = chkAtivo.checked ? 'N' : 'S';
        }
        
        // Filtros de status de cursos (do rodapé)
        const filterASO = document.getElementById('filter-aso')?.value;
        const filterNR06 = document.getElementById('filter-nr06')?.value;
        const filterNR10 = document.getElementById('filter-nr10')?.value;
        const filterNR11 = document.getElementById('filter-nr11')?.value;
        const filterNR12 = document.getElementById('filter-nr12')?.value;
        const filterNR17 = document.getElementById('filter-nr17')?.value;
        const filterNR18 = document.getElementById('filter-nr18')?.value;
        const filterNR20 = document.getElementById('filter-nr20')?.value;
        const filterNR33 = document.getElementById('filter-nr33')?.value;
        const filterNR34 = document.getElementById('filter-nr34')?.value;
        const filterNR35 = document.getElementById('filter-nr35')?.value;
        const filterEPI = document.getElementById('filter-epi')?.value;
        
        if (filterASO) filtros.statusASO = filterASO;
        if (filterNR06) filtros.statusNR06 = filterNR06;
        if (filterNR10) filtros.statusNR10 = filterNR10;
        if (filterNR11) filtros.statusNR11 = filterNR11;
        if (filterNR12) filtros.statusNR12 = filterNR12;
        if (filterNR17) filtros.statusNR17 = filterNR17;
        if (filterNR18) filtros.statusNR18 = filterNR18;
        if (filterNR20) filtros.statusNR20 = filterNR20;
        if (filterNR33) filtros.statusNR33 = filterNR33;
        if (filterNR34) filtros.statusNR34 = filterNR34;
        if (filterNR35) filtros.statusNR35 = filterNR35;
        if (filterEPI) filtros.statusEPI = filterEPI;
        
        return filtros;
    }
    
    aplicarFiltros() {
        this.currentPage = 1;
        this.loadData();
    }
    
    // Toggle entre Ativo/Inativo
    toggleAtivoInativo(event) {
        const isAtivo = event.target.checked;
        const toggleText = document.querySelector('.toggle-text');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (isAtivo) {
            // Estado Ativo (Verde)
            toggleText.textContent = 'Ativo';
            progressFill.classList.remove('inactive');
            progressText.classList.remove('inactive');
        } else {
            // Estado Inativo (Vermelho)
            toggleText.textContent = 'Inativo';
            progressFill.classList.add('inactive');
            progressText.classList.add('inactive');
        }
        
        // Limpar seleções para não atrapalhar a leitura
        this.selectedRows.clear();
        
        // Recarregar dados com novo filtro
        this.currentPage = 1;
        this.loadData();
    }
    
    // Limpar todos os campos e resetar para ativos
    limparTudo() {
        // Limpar campos de filtro
        const filtroNome = document.getElementById('filtroNome');
        const filtroEmpresa = document.getElementById('filtroEmpresa');
        const filtroFuncao = document.getElementById('filtroFuncao');
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');
        
        if (filtroNome) filtroNome.value = '';
        if (filtroEmpresa) filtroEmpresa.value = '';
        if (filtroFuncao) filtroFuncao.value = '';
        if (dataInicio) dataInicio.value = '';
        if (dataFim) dataFim.value = '';
        
        // Resetar filtros de status do rodapé para "Todos"
        const filtrosCursos = ['filter-aso', 'filter-nr06', 'filter-nr10', 'filter-nr11', 'filter-nr12', 
                               'filter-nr17', 'filter-nr18', 'filter-nr20', 'filter-nr33', 'filter-nr34', 
                               'filter-nr35', 'filter-epi'];
        filtrosCursos.forEach(id => {
            const select = document.getElementById(id);
            if (select) select.value = '';
        });
        
        // Resetar toggle para Ativo (checked = true)
        const chkAtivo = document.getElementById('chkAtivo');
        const toggleText = document.querySelector('.toggle-text');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (chkAtivo && !chkAtivo.checked) {
            chkAtivo.checked = true;
            if (toggleText) toggleText.textContent = 'Ativo';
            if (progressFill) progressFill.classList.remove('inactive');
            if (progressText) progressText.classList.remove('inactive');
        }
        
        // Resetar paginação
        this.currentPage = 1;
        this.selectedRows.clear();
        
        // Recarregar dados
        this.loadData();

        // Reaplicar visibilidade das colunas (mantém colunas ocultas conforme configuração)
        setTimeout(() => {
            this.atualizarVisibilidadeCursosRodape();
        }, 200);
        this.showToast('Filtros limpos! Mostrando apenas registros ativos.', 'success');
    }
    
    // Toggle de situação na linha da tabela
    async toggleSituacaoLinha(id, toggleElement) {
        const isAtivo = toggleElement.checked;
        const situacaoText = toggleElement.closest('.situacao-linha').querySelector('.situacao-text');
        
        // Confirmar ação
        const action = isAtivo ? 'ativar' : 'inativar';
        const message = `Tem certeza que deseja ${action} este funcionário?`;
        
        if (!confirm(message)) {
            // Reverter toggle se cancelar
            toggleElement.checked = !isAtivo;
            return;
        }
        
        try {
            // Atualizar texto imediatamente
            situacaoText.textContent = isAtivo ? 'Ativo' : 'Inativo';
            
            // Salvar no banco
            const response = await fetch(`/api/ssma/${id}/toggle-situacao`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    situacao: isAtivo ? 'N' : 'S',
                    dataInativacao: isAtivo ? null : new Date().toISOString()
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast(`Funcionário ${action}do com sucesso!`, 'success');
                
                // Remover linha da tabela imediatamente
                const row = toggleElement.closest('tr');
                if (row) {
                    row.style.transition = 'opacity 0.3s ease';
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                    }, 300);
                }
                
                // Atualizar estatísticas e barra de progresso
                setTimeout(() => {
                    this.updateProgressBar(this.currentData);
                }, 500);
            } else {
                throw new Error(result.error || 'Erro ao alterar situação');
            }
            
        } catch (error) {
            console.error('Erro ao alterar situação:', error);
            this.showToast('Erro ao alterar situação: ' + error.message, 'error');
            
            // Reverter mudanças em caso de erro
            toggleElement.checked = !isAtivo;
            situacaoText.textContent = !isAtivo ? 'Ativo' : 'Inativo';
        }
    }
    
    // Atualizar barra de progresso baseada no toggle
    updateProgressBar(data) {
        // Usar os dados que já foram carregados da API
        if (data && data.totalAtivos !== undefined && data.totalInativos !== undefined) {
            const totalRegistros = data.totalAtivos + data.totalInativos;
            const totalAtivos = data.totalAtivos;
            const totalInativos = data.totalInativos;
            
            const chkAtivo = document.getElementById('chkAtivo');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            if (chkAtivo && progressFill && progressText) {
                let porcentagem;
                
                if (chkAtivo.checked) {
                    // Mostrando ativos - calcular % de ativos
                    porcentagem = totalRegistros > 0 ? Math.round((totalAtivos / totalRegistros) * 100) : 0;
                } else {
                    // Mostrando inativos - calcular % de inativos
                    porcentagem = totalRegistros > 0 ? Math.round((totalInativos / totalRegistros) * 100) : 0;
                }
                
                progressFill.style.width = `${porcentagem}%`;
                progressText.textContent = `${porcentagem}%`;
            }
        }
    }
    
    // Paginação
    irParaPagina(page) {
        console.log(`Tentando ir para página ${page}, totalPages: ${this.totalPages}, currentPage: ${this.currentPage}`);
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            console.log(`Carregando página ${page}`);
            this.loadData();
        } else {
            console.log(`Página ${page} fora do intervalo válido (1-${this.totalPages})`);
        }
    }
    
    // CRUD Operations (igual ao sistema desktop)
    async novoRegistro() {
        console.log('=== FUNÇÃO NOVO REGISTRO CHAMADA ===');
        // RESETAR this.editingId para null quando criar novo registro
        this.editingId = null;
        this.currentEditingData = null; // Limpar dados de edição
        this.fotoRemovida = false; // Resetar flag de remoção de foto
        
        // Recarregar empresas ativas para o dropdown
        await this.carregarEmpresasAtivas();
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Novo Registro';
        
        // GARANTIR que a aba Cursos está visível (pode ter sido escondida pelo Fornecedor)
        this.switchMainTab('cursos');
        
        // Limpar ID embaixo do logo em TODAS as abas
        const logoIds = ['logoId', 'logoIdNr06', 'logoIdNr10', 'logoIdNr11', 'logoIdNr12', 'logoIdNr17', 'logoIdNr18', 'logoIdNr20', 'logoIdNr33', 'logoIdNr34', 'logoIdNr35', 'logoIdEpi'];
        logoIds.forEach(logoIdElement => {
            const element = document.getElementById(logoIdElement);
            if (element) element.textContent = 'ID: -';
        });
        
        // Limpar formulário principal
        const formSSMA = document.getElementById('formSSMA');
        if (formSSMA) formSSMA.reset();
        
        const registroId = document.getElementById('registroId');
        if (registroId) registroId.value = '';
        
        // Limpar TODOS os campos de TODAS as abas
        this.limparTodosOsCampos();
        
        // DEFINIR VALORES PADRÃO conforme regra
        // Ambientação padrão: SIM
        const ambSim = document.getElementById('ambSim');
        if (ambSim) ambSim.checked = true;
        
        // Gênero padrão: Masculino
        const generoSelect = document.getElementById('genero');
        if (generoSelect) generoSelect.value = 'M';
        
        // Configurar botão para novo cadastro (muda de "Alterar" para "Cadastrar")
        this.configurarBotaoSalvar(false);
        
        // Abrir modal
        this.showModal('modalForm', true); // true = skipReset para evitar conflito
        
        // Atualizar abas e garantir que ASO está ativa
        await this.atualizarAbasNRFormulario();
        
        // Dar foco no primeiro campo (Nome) após abrir o modal
        setTimeout(() => {
            const nomeField = document.getElementById('nome');
            if (nomeField) {
                nomeField.focus();
                nomeField.select();
            }
        }, 100);
    }
    
    // Função para limpar todos os campos de todas as abas
    limparTodosOsCampos() {
        console.log('=== INICIANDO LIMPEZA DE TODOS OS CAMPOS ===');
        
        // Campos da aba ASO
        const camposASO = [
            'nome', 'empresa', 'funcao', 'dataEmissao', 'vencimento', 
            'diasCorridos', 'diasVencer', 'status', 'genero', 'anotacoes',
            'dataCadastro', 'dataInativacao'
        ];
        
        // Campos das NRs (06, 10, 11, 12, 17, 18, 20, 33, 34, 35)
        const nrs = ['nr06', 'nr10', 'nr11', 'nr12', 'nr17', 'nr18', 'nr20', 'nr33', 'nr34', 'nr35'];
        const camposNR = ['_nome', '_empresa', '_funcao', '_dataEmissao', '_vencimento', '_diasCorridos', '_diasVencer', '_status'];
        
        // Campos da aba EPI
        const camposEPI = [
            'epi_nome', 'epi_empresa', 'epi_funcao', 'epi_dataEmissao', 
            'epi_vencimento', 'epi_diasCorridos', 'epi_diasVencer', 'epi_status'
        ];
        
        // Limpar campos ASO
        camposASO.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                if (elemento.type === 'checkbox' || elemento.type === 'radio') {
                    elemento.checked = false;
                } else {
                    elemento.value = '';
                }
                console.log(`Campo ${campo} limpo`);
            }
        });
        
        // Limpar campos das NRs
        nrs.forEach(nr => {
            camposNR.forEach(sufixo => {
                const campo = nr + sufixo;
                const elemento = document.getElementById(campo);
                if (elemento) {
                    if (elemento.type === 'checkbox' || elemento.type === 'radio') {
                        elemento.checked = false;
                    } else {
                        elemento.value = '';
                    }
                    console.log(`Campo ${campo} limpo`);
                }
            });
        });
        
        // Limpar campos EPI
        camposEPI.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                if (elemento.type === 'checkbox' || elemento.type === 'radio') {
                    elemento.checked = false;
                } else {
                    elemento.value = '';
                }
                console.log(`Campo ${campo} limpo`);
            }
        });
        
        // Resetar radio buttons de Ambientação
        const ambSim = document.getElementById('ambSim');
        const ambNao = document.getElementById('ambNao');
        if (ambSim) ambSim.checked = false;
        if (ambNao) ambNao.checked = false;
        
        // Resetar botão de status para padrão (Ativo)
        const btnStatus = document.getElementById('btnStatus');
        if (btnStatus) {
            btnStatus.className = 'btn-status ativo';
            const statusIcon = btnStatus.querySelector('.status-icon');
            const statusText = btnStatus.querySelector('.status-text');
            if (statusIcon) statusIcon.textContent = '●';
            if (statusText) statusText.textContent = 'Ativo';
        }
        
        // Definir data de cadastro como hoje
        const dataCadastro = document.getElementById('dataCadastro');
        if (dataCadastro) {
            const hoje = new Date();
            const dataFormatada = hoje.toLocaleDateString('pt-BR');
            dataCadastro.value = dataFormatada;
        }
        
        // Limpar preview da foto e input file
        const fotoInput = document.getElementById('foto');
        if (fotoInput) {
            fotoInput.value = '';
            console.log('Input de foto limpo');
        }
        
        const fotoPreview = document.getElementById('fotoPreview');
        const fotoPlaceholder = document.getElementById('fotoPlaceholder');
        if (fotoPreview) {
            // Mostrar foto padrão ao limpar
            fotoPreview.src = '/FotoPadrao_Sys.png';
            fotoPreview.style.display = 'block';
            console.log('Foto padrão carregada');
        }
        
        if (fotoPlaceholder) {
            fotoPlaceholder.style.display = 'none';
        }
        
        // Também limpar o placeholder grande se existir
        const fotoPlaceholderLarge = document.querySelector('.foto-placeholder-large');
        if (fotoPlaceholderLarge) {
            fotoPlaceholderLarge.style.display = 'none';
            console.log('Placeholder grande da foto escondido');
        }
        
        console.log('Todos os campos foram limpos para novo registro');
    }
    
    // Função para trocar entre as abas das NRs
    // Configurar botão Salvar conforme o contexto
    configurarBotaoSalvar(isEdit) {
        console.log('configurarBotaoSalvar - isEdit:', isEdit);
        
        // Atualizar TODOS os botões de salvar (um para cada aba)
        const botoes = ['btnSalvar', 'btnSalvarNr06', 'btnSalvarNr10', 'btnSalvarNr11', 'btnSalvarNr12', 'btnSalvarNr17', 'btnSalvarNr18', 'btnSalvarNr20', 'btnSalvarNr33', 'btnSalvarNr34', 'btnSalvarNr35', 'btnSalvarEpi'];
        
        botoes.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (isEdit) {
                    // Modo edição - botão laranja "Alterar"
                    btn.className = 'btn-form btn-alterar';
                    btn.textContent = 'Alterar';
                } else {
                    // Modo novo - botão verde "Cadastrar"
                    btn.className = 'btn-form btn-cadastrar';
                    btn.textContent = 'Cadastrar';
                }
            }
        });
        
        if (isEdit) {
            console.log('Todos os botões configurados como ALTERAR');
        } else {
            console.log('Todos os botões configurados como CADASTRAR');
        }
    }
    
    editarRegistro() {
        if (this.selectedRows.size !== 1) {
            this.showToast('Selecione exatamente um registro para editar', 'warning');
            return;
        }
        
        const id = Array.from(this.selectedRows)[0];
        this.editarRegistroById(id);
    }
    
    async editarRegistroById(id) {
        console.log('Editando registro ID:', id);
        try {
            // Resetar flag de remoção de foto ao carregar novo registro
            this.fotoRemovida = false;
            
            const response = await fetch(`/api/ssma/${id}`);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos para edição:', data);
            
            this.editingId = id;
            console.log('editingId setado para:', this.editingId);
            this.currentEditingData = data; // Armazenar dados para uso nas abas
            
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) modalTitle.textContent = 'Editar Registro';
            
            // GARANTIR que a aba Cursos está visível (pode ter sido escondida pelo Fornecedor)
            this.switchMainTab('cursos');
            
            // Limpar input de foto para permitir selecionar nova foto
            const fotoInput = document.getElementById('foto');
            if (fotoInput) {
                fotoInput.value = '';
                console.log('✅ Input de foto limpo para edição');
            }
            
            // LIMPAR TODOS OS CAMPOS ANTES DE PREENCHER
            this.limparTodosOsCampos();
            
            // Abrir modal primeiro
            this.showModal('modalForm');
            
            // Atualizar visibilidade das abas NR
            await this.atualizarAbasNRFormulario();
            
            // Aguardar um pouco para o modal estar totalmente carregado
            setTimeout(() => {
                this.preencherFormulario(data);
                // Configurar botão para edição APÓS preencher o formulário
                this.configurarBotaoSalvar(true);
                // Garantir que a primeira aba habilitada está ativa após preencher
                this.irParaPrimeiraAbaHabilitada();
            }, 100);
            
        } catch (error) {
            console.error('Erro ao carregar registro:', error);
            this.showToast('Erro de conexão com o servidor: ' + error.message, 'error');
        }
    }
    
    preencherFormulario(data) {
        console.log('=== PREENCHENDO FORMULÁRIO ===');
        console.log('Dados completos:', data);
        console.log('Nome:', data.Nome);
        console.log('Empresa:', data.Empresa);
        console.log('Funcao:', data.Funcao);
        
        try {
            // Preencher ID embaixo do logo em TODAS as abas
            const idText = data.id ? `ID: ${data.id}` : 'ID: -';
            const logoIds = ['logoId', 'logoIdNr06', 'logoIdNr10', 'logoIdNr11', 'logoIdNr12', 'logoIdNr17', 'logoIdNr18', 'logoIdNr20', 'logoIdNr33', 'logoIdNr34', 'logoIdNr35', 'logoIdEpi'];
            
            logoIds.forEach(logoIdElement => {
                const element = document.getElementById(logoIdElement);
                if (element) {
                    element.textContent = idText;
                }
            });
            
            // Se o ID está vazio, é um novo cadastro - botão deve ser "Cadastrar"
            // Se o ID tem valor, é uma edição - botão deve ser "Alterar"
            if (!data.id) {
                this.editingId = null;
                this.configurarBotaoSalvar(false); // false = Cadastrar
            } else {
                this.editingId = data.id;
                this.configurarBotaoSalvar(true); // true = Alterar
            }
            
            // Verificar se os campos existem no DOM
            console.log('Campo nome existe:', !!document.getElementById('nome'));
            console.log('Campo empresa existe:', !!document.getElementById('empresa'));
            console.log('Campo funcao existe:', !!document.getElementById('funcao'));
            
            // Preencher campos principais
            this.preencherCampo('nome', data.Nome, true); // true = é select
            this.preencherCampo('empresa', data.Empresa, true);
            this.preencherCampo('funcao', data.Funcao, true);
            
            // Preencher campos ocultos para manter dados
            this.preencherCampo('hiddenNome', data.Nome);
            this.preencherCampo('hiddenEmpresa', data.Empresa);
            this.preencherCampo('hiddenFuncao', data.Funcao);
            this.preencherCampo('hiddenSituacao', data.Situacao);
            
            // Preencher campos readonly das NRs
            this.preencherCampo('nr06_nome', data.Nome);
            this.preencherCampo('nr06_empresa', data.Empresa);
            this.preencherCampo('nr06_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-06 se existirem
            if (data.Nr06_DataEmissao) {
                this.preencherCampo('nr06_dataEmissao', this.formatISOToBR(data.Nr06_DataEmissao));
            }
            if (data.Nr06_Vencimento) {
                this.preencherCampo('nr06_vencimento', this.formatDateForInput(data.Nr06_Vencimento));
            }
            if (data.Nr06_Status) {
                this.preencherCampo('nr06_status', data.Nr06_Status);
            }
            
            // Calcular campos da NR-06 se tem data de emissão
            if (data.Nr06_DataEmissao) {
                setTimeout(() => this.calcularNR06(), 100);
            }
            
            this.preencherCampo('nr10_nome', data.Nome);
            this.preencherCampo('nr10_empresa', data.Empresa);
            this.preencherCampo('nr10_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-10 se existirem
            if (data.Nr10_DataEmissao) {
                this.preencherCampo('nr10_dataEmissao', this.formatISOToBR(data.Nr10_DataEmissao));
            }
            if (data.Nr10_Vencimento) {
                this.preencherCampo('nr10_vencimento', this.formatDateForInput(data.Nr10_Vencimento));
            }
            if (data.Nr10_Status) {
                this.preencherCampo('nr10_status', data.Nr10_Status);
            }
            
            // Calcular campos da NR-10 se tem data de emissão
            if (data.Nr10_DataEmissao) {
                setTimeout(() => this.calcularNR10(), 100);
            }
            
            this.preencherCampo('nr11_nome', data.Nome);
            this.preencherCampo('nr11_empresa', data.Empresa);
            this.preencherCampo('nr11_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-11 se existirem
            if (data.Nr11_DataEmissao) {
                this.preencherCampo('nr11_dataEmissao', this.formatISOToBR(data.Nr11_DataEmissao));
            }
            if (data.Nr11_Vencimento) {
                this.preencherCampo('nr11_vencimento', this.formatDateForInput(data.Nr11_Vencimento));
            }
            if (data.Nr11_Status) {
                this.preencherCampo('nr11_status', data.Nr11_Status);
            }
            
            // Calcular campos da NR-11 se tem data de emissão
            if (data.Nr11_DataEmissao) {
                setTimeout(() => this.calcularNR11(), 100);
            }
            
            this.preencherCampo('nr12_nome', data.Nome);
            this.preencherCampo('nr12_empresa', data.Empresa);
            this.preencherCampo('nr12_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-12 se existirem
            if (data.Nr12_DataEmissao) {
                this.preencherCampo('nr12_dataEmissao', this.formatISOToBR(data.Nr12_DataEmissao));
            }
            if (data.NR12_Vencimento) {
                this.preencherCampo('nr12_vencimento', this.formatDateForInput(data.NR12_Vencimento));
            }
            if (data.Nr12_Status) {
                this.preencherCampo('nr12_status', data.Nr12_Status);
            }
            if (data.Nr12_Ferramenta) {
                this.preencherCampo('nr12_ferramenta', data.Nr12_Ferramenta);
            }
            
            // Calcular campos da NR-12 se tem data de emissão
            if (data.Nr12_DataEmissao) {
                setTimeout(() => this.calcularNR12(), 100);
            }
            
            this.preencherCampo('nr17_nome', data.Nome);
            this.preencherCampo('nr17_empresa', data.Empresa);
            this.preencherCampo('nr17_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-17 se existirem
            if (data.Nr17_DataEmissao) {
                this.preencherCampo('nr17_dataEmissao', this.formatISOToBR(data.Nr17_DataEmissao));
            }
            if (data.Nr17_Vencimento) {
                this.preencherCampo('nr17_vencimento', this.formatDateForInput(data.Nr17_Vencimento));
            }
            if (data.Nr17_Status) {
                this.preencherCampo('nr17_status', data.Nr17_Status);
            }
            
            // Calcular campos da NR-17 se tem data de emissão
            if (data.Nr17_DataEmissao) {
                setTimeout(() => this.calcularNR17(), 100);
            }
            
            this.preencherCampo('nr18_nome', data.Nome);
            this.preencherCampo('nr18_empresa', data.Empresa);
            this.preencherCampo('nr18_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-18 se existirem
            if (data.Nr18_DataEmissao) {
                this.preencherCampo('nr18_dataEmissao', this.formatISOToBR(data.Nr18_DataEmissao));
            }
            if (data.NR18_Vencimento) {
                this.preencherCampo('nr18_vencimento', this.formatDateForInput(data.NR18_Vencimento));
            }
            if (data.Nr18_Status) {
                this.preencherCampo('nr18_status', data.Nr18_Status);
            }
            
            // Calcular campos da NR-18 se tem data de emissão
            if (data.Nr18_DataEmissao) {
                setTimeout(() => this.calcularNR18(), 100);
            }
            
            this.preencherCampo('nr20_nome', data.Nome);
            this.preencherCampo('nr20_empresa', data.Empresa);
            this.preencherCampo('nr20_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-20 se existirem
            if (data.Nr20_DataEmissao) {
                this.preencherCampo('nr20_dataEmissao', this.formatISOToBR(data.Nr20_DataEmissao));
            }
            if (data.Nr20_Vencimento) {
                this.preencherCampo('nr20_vencimento', this.formatDateForInput(data.Nr20_Vencimento));
            }
            if (data.Nr20_Status) {
                this.preencherCampo('nr20_status', data.Nr20_Status);
            }
            
            // Calcular campos da NR-20 se tem data de emissão
            if (data.Nr20_DataEmissao) {
                setTimeout(() => this.calcularNR20(), 100);
            }
            
            this.preencherCampo('nr33_nome', data.Nome);
            this.preencherCampo('nr33_empresa', data.Empresa);
            this.preencherCampo('nr33_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-33 se existirem
            if (data.Nr33_DataEmissao) {
                this.preencherCampo('nr33_dataEmissao', this.formatISOToBR(data.Nr33_DataEmissao));
            }
            if (data.NR33_Vencimento) {
                this.preencherCampo('nr33_vencimento', this.formatDateForInput(data.NR33_Vencimento));
            }
            if (data.Nr33_Status) {
                this.preencherCampo('nr33_status', data.Nr33_Status);
            }
            
            // Calcular campos da NR-33 se tem data de emissão
            if (data.Nr33_DataEmissao) {
                setTimeout(() => this.calcularNR33(), 100);
            }
            
            this.preencherCampo('nr34_nome', data.Nome);
            this.preencherCampo('nr34_empresa', data.Empresa);
            this.preencherCampo('nr34_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-34 se existirem
            if (data.Nr34_DataEmissao) {
                this.preencherCampo('nr34_dataEmissao', this.formatISOToBR(data.Nr34_DataEmissao));
            }
            if (data.Nr34_Vencimento) {
                this.preencherCampo('nr34_vencimento', this.formatDateForInput(data.Nr34_Vencimento));
            }
            if (data.Nr34_Status) {
                this.preencherCampo('nr34_status', data.Nr34_Status);
            }
            
            // Calcular campos da NR-34 se tem data de emissão
            if (data.Nr34_DataEmissao) {
                setTimeout(() => this.calcularNR34(), 100);
            }
            
            this.preencherCampo('nr35_nome', data.Nome);
            this.preencherCampo('nr35_empresa', data.Empresa);
            this.preencherCampo('nr35_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-35 se existirem
            if (data.Nr35_DataEmissao) {
                this.preencherCampo('nr35_dataEmissao', this.formatISOToBR(data.Nr35_DataEmissao));
            }
            if (data.NR35_Vencimento) {
                this.preencherCampo('nr35_vencimento', this.formatDateForInput(data.NR35_Vencimento));
            }
            if (data.Nr35_Status) {
                this.preencherCampo('nr35_status', data.Nr35_Status);
            }
            
            // Calcular campos da NR-35 se tem data de emissão
            if (data.Nr35_DataEmissao) {
                setTimeout(() => this.calcularNR35(), 100);
            }
            
            this.preencherCampo('epi_nome', data.Nome);
            this.preencherCampo('epi_empresa', data.Empresa);
            this.preencherCampo('epi_funcao', data.Funcao);
            
            // Preencher dados específicos da EPI se existirem
            if (data.Epi_DataEmissao) {
                this.preencherCampo('epi_dataEmissao', this.formatISOToBR(data.Epi_DataEmissao));
            }
            if (data.epiVencimento) {
                this.preencherCampo('epi_vencimento', this.formatDateForInput(data.epiVencimento));
            }
            if (data.EpiStatus) {
                this.preencherCampo('epi_status', data.EpiStatus);
            }
            
            // Calcular campos da EPI se tem data de emissão
            if (data.Epi_DataEmissao) {
                setTimeout(() => this.calcularEPI(), 100);
            }
            
            // Preencher datas
            this.preencherCampo('dataEmissao', this.formatDateToBR(data.Cadastro) || '09/12/2025');
            this.preencherCampo('vencimento', this.formatDateForInput(data.Vencimento));
            
            // Preencher campos de controle
            this.preencherCampo('idField', data.id);
            this.preencherCampo('status', data.Status || 'OK');
            this.preencherCampo('genero', data.Genero || 'M');
            
            // Preencher campo Ambientação (radio buttons)
            this.preencherAmbientacao(data.Ambientacao);
            
            // Preencher anotações do banco de dados
            const anotacoes = document.getElementById('anotacoes');
            if (anotacoes) {
                const anotacoesDB = data.Anotacoes || '';
                anotacoes.value = anotacoesDB;
                this.preencherCampo('hiddenAnotacoes', anotacoesDB);
                console.log('Anotações carregadas:', anotacoesDB);
            }
            
            // Preencher datas de controle
            this.preencherCampo('dataCadastro', this.formatDateToBR(data.Cadastro) || '09/12/2025');
            this.preencherCampo('dataInativacao', data.DataInativacao ? this.formatDateToBR(data.DataInativacao) : '');
            
            // Configurar botão de status
            this.configurarBotaoStatus(data.Situacao);
            
            // Carregar foto se existir
            this.carregarFotoFormulario(data);
            
            // Calcular dias após preencher
            setTimeout(() => this.calcularDiasEStatus(), 100);
            
            console.log('Formulário preenchido com sucesso');
            
        } catch (error) {
            console.error('Erro ao preencher formulário:', error);
        }
    }
    
    // Método auxiliar para preencher campos
    preencherCampo(id, valor, isSelect = false) {
        const campo = document.getElementById(id);
        if (campo && valor !== undefined && valor !== null) {
            // Todos os campos são inputs ou selects, não precisa de lógica especial
            campo.value = valor;
            console.log(`Campo ${id} preenchido:`, valor);
        }
    }
    
    // Preencher campo de ambientação (radio buttons)
    preencherAmbientacao(valor) {
        console.log('Preenchendo ambientação:', valor);
        
        // Verificar se é "S" (Sim) ou "N" (Não)
        if (valor === 'S' || valor === 'Sim' || valor === true) {
            const radioSim = document.querySelector('input[name="ambientacao"][value="S"]');
            if (radioSim) {
                radioSim.checked = true;
                console.log('Ambientação marcada como SIM');
            }
        } else if (valor === 'N' || valor === 'Não' || valor === false) {
            const radioNao = document.querySelector('input[name="ambientacao"][value="N"]');
            if (radioNao) {
                radioNao.checked = true;
                console.log('Ambientação marcada como NÃO');
            }
        }
    }
    
    // Configurar botão de status
    configurarBotaoStatus(situacao) {
        const btnStatus = document.getElementById('btnStatus');
        const statusText = document.querySelector('.status-text');
        
        if (btnStatus && statusText) {
            if (situacao === 'N') {
                btnStatus.className = 'btn-status ativo';
                statusText.textContent = 'Ativo';
            } else {
                btnStatus.className = 'btn-status cancelado';
                statusText.textContent = 'Cancelado';
            }
        }
    }
    
    // Carregar foto no formulário
    carregarFotoFormulario(data) {
        const fotoPreview = document.getElementById('fotoPreview');
        const fotoPlaceholder = document.getElementById('fotoPlaceholder');
        
        console.log('Carregando foto para ID:', data.id);
        console.log('Dados da foto:', data.Foto ? 'Existe' : 'Não existe');
        
        if (fotoPreview && fotoPlaceholder) {
            if (data.Foto && data.id) {
                // Usar o endpoint de foto
                const fotoUrl = `/api/foto/${data.id}`;
                fotoPreview.src = fotoUrl;
                fotoPreview.style.display = 'block';
                fotoPlaceholder.style.display = 'none';
                console.log('Foto carregada do endpoint:', fotoUrl);
            } else {
                // Carregar foto padrão quando não houver foto
                fotoPreview.src = '/FotoPadrao_Sys.png';
                fotoPreview.style.display = 'block';
                fotoPlaceholder.style.display = 'none';
                console.log('Foto padrão carregada');
            }
        } else {
            console.log('Elementos de foto não encontrados no DOM');
        }
    }
    
    formatDateForInput(dateString) {
        if (!dateString || dateString === 'null') return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }
    
    // Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
    formatISOToBR(dateString) {
        if (!dateString || dateString === 'null') return '';
        try {
            // Se já está no formato brasileiro, retornar
            if (dateString.includes('/')) return dateString;
            
            // Converter de yyyy-mm-dd para dd/mm/yyyy
            const parts = dateString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return '';
        } catch (error) {
            return '';
        }
    }
    
    // Formatar data para exibição brasileira (dd/mm/yyyy)
    formatDateForDisplayBR(dateString) {
        if (!dateString || dateString === 'null') return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            return '';
        }
    }
    
    // Formatar data para formato brasileiro (usado no campo de emissão)
    formatDateToBR(dateString) {
        if (!dateString || dateString === 'null') return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            return '';
        }
    }
    
    async salvarRegistro(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Proteção contra múltiplos submits
        if (this.salvandoRegistro) {
            console.warn('⚠️ Já está salvando um registro, aguarde...');
            return;
        }
        this.salvandoRegistro = true;
        
        // Desabilitar botão de submit
        const btnSalvar = document.getElementById('btnSalvar');
        if (btnSalvar) {
            btnSalvar.disabled = true;
            btnSalvar.style.opacity = '0.5';
        }
        
        try {
            const isEdit = this.editingId !== null;
            
            // Validação: se tá tentando alterar mas editingId é null, mostrar erro
            const btnText = event.submitter?.textContent || '';
            if (!isEdit && btnText.includes('Alterar')) {
                this.showToast('Erro: Nenhum registro selecionado para alteração. Clique em editar um registro primeiro.', 'error');
                return;
            }
            
            // Validação: se tá tentando cadastrar mas editingId não é null, mostrar erro
            if (isEdit && btnText.includes('Cadastrar')) {
                this.showToast('Erro: Você está editando um registro. Clique em "Novo" para criar um novo registro.', 'error');
                return;
            }
            
            // ============ VALIDAÇÃO DINÂMICA BASEADA NAS ABAS VISÍVEIS ============
            // Regra: Obriga preencher pelo menos UM curso habilitado para salvar
            // Verifica diretamente quais abas estão VISÍVEIS no DOM
            
            // Mapeamento de abas para campos
            const abasConfig = {
                'aso': { emissao: 'dataEmissao', vencimento: 'vencimento', nome: 'ASO' },
                'nr06': { emissao: 'nr06_dataEmissao', vencimento: 'nr06_vencimento', nome: 'NR-06' },
                'nr10': { emissao: 'nr10_dataEmissao', vencimento: 'nr10_vencimento', nome: 'NR-10' },
                'nr11': { emissao: 'nr11_dataEmissao', vencimento: 'nr11_vencimento', nome: 'NR-11' },
                'nr12': { emissao: 'nr12_dataEmissao', vencimento: 'nr12_vencimento', nome: 'NR-12' },
                'nr17': { emissao: 'nr17_dataEmissao', vencimento: 'nr17_vencimento', nome: 'NR-17' },
                'nr18': { emissao: 'nr18_dataEmissao', vencimento: 'nr18_vencimento', nome: 'NR-18' },
                'nr20': { emissao: 'nr20_dataEmissao', vencimento: 'nr20_vencimento', nome: 'NR-20' },
                'nr33': { emissao: 'nr33_dataEmissao', vencimento: 'nr33_vencimento', nome: 'NR-33' },
                'nr34': { emissao: 'nr34_dataEmissao', vencimento: 'nr34_vencimento', nome: 'NR-34' },
                'nr35': { emissao: 'nr35_dataEmissao', vencimento: 'nr35_vencimento', nome: 'NR-35' },
                'epi': { emissao: 'epi_dataEmissao', vencimento: 'epi_vencimento', nome: 'EPI' }
            };
            
            // Verificar quais abas estão VISÍVEIS (habilitadas) - olhando diretamente no DOM
            const abasVisiveis = [];
            document.querySelectorAll('.nr-tab').forEach(tab => {
                const abaId = tab.dataset.nr;
                const isVisible = tab.style.display !== 'none' && !tab.classList.contains('hidden');
                if (isVisible && abaId) {
                    abasVisiveis.push(abaId.toLowerCase());
                }
            });
            
            console.log('🔍 Abas VISÍVEIS no DOM:', abasVisiveis);
            
            // Separar ASO das outras NRs
            const asoVisivel = abasVisiveis.includes('aso');
            const nrsVisiveis = abasVisiveis.filter(aba => aba !== 'aso');
            
            console.log('🔍 ASO visível:', asoVisivel);
            console.log('🔍 NRs visíveis:', nrsVisiveis);
            
            // Ordem de prioridade para NRs (NR-18 primeiro)
            const ordemPrioridade = ['nr18', 'nr06', 'nr10', 'nr11', 'nr12', 'nr17', 'nr20', 'nr33', 'nr34', 'nr35', 'epi'];
            
            // Encontrar a primeira NR visível na ordem de prioridade
            let cursoObrigatorio = null;
            for (const nr of ordemPrioridade) {
                if (nrsVisiveis.includes(nr)) {
                    cursoObrigatorio = nr;
                    break;
                }
            }
            
            // Se não tem NR visível, mas tem ASO, ASO é obrigatório
            if (!cursoObrigatorio && asoVisivel) {
                cursoObrigatorio = 'aso';
            }
            
            console.log('🔍 Curso OBRIGATÓRIO:', cursoObrigatorio);
            
            // Validar o curso obrigatório
            if (cursoObrigatorio && abasConfig[cursoObrigatorio]) {
                const config = abasConfig[cursoObrigatorio];
                const dataEmissao = document.getElementById(config.emissao)?.value?.trim() || '';
                const vencimento = document.getElementById(config.vencimento)?.value?.trim() || '';
                
                console.log(`🔍 Validando ${config.nome}: emissão="${dataEmissao}", vencimento="${vencimento}"`);
                
                if (!dataEmissao || !vencimento) {
                    this.showToast(`ERRO: ${config.nome} é OBRIGATÓRIO! Preencha a Data de Emissão e Vencimento antes de salvar.`, 'error');
                    
                    // Mudar para aba do curso obrigatório
                    this.switchNRTab(cursoObrigatorio);
                    
                    // Focar no campo que está vazio
                    setTimeout(() => {
                        if (!dataEmissao) {
                            const campoEmissao = document.getElementById(config.emissao);
                            if (campoEmissao) campoEmissao.focus();
                        } else if (!vencimento) {
                            const campoVencimento = document.getElementById(config.vencimento);
                            if (campoVencimento) campoVencimento.focus();
                        }
                    }, 100);
                    
                    return;
                }
            }
            // ============ FIM VALIDAÇÃO DINÂMICA ============
            
            // Preparar dados em JSON
            const dados = {
                nome: document.getElementById('nome')?.value || '',
                empresa: document.getElementById('empresa')?.value || '',
                funcao: document.getElementById('funcao')?.value || '',
                vencimento: document.getElementById('vencimento')?.value || '',
                anotacoes: document.getElementById('anotacoes')?.value || '',
                situacao: isEdit ? (document.querySelector('.btn-status.ativo') ? 'N' : 'S') : 'N',
                ambientacao: document.querySelector('input[name="ambientacao"]:checked')?.value || 'N',
                nr06_dataEmissao: document.getElementById('nr06_dataEmissao')?.value || '',
                nr06_vencimento: document.getElementById('nr06_vencimento')?.value || '',
                nr06_status: document.getElementById('nr06_status')?.value || '',
                nr10_dataEmissao: document.getElementById('nr10_dataEmissao')?.value || '',
                nr10_vencimento: document.getElementById('nr10_vencimento')?.value || '',
                nr10_status: document.getElementById('nr10_status')?.value || '',
                nr11_dataEmissao: document.getElementById('nr11_dataEmissao')?.value || '',
                nr11_vencimento: document.getElementById('nr11_vencimento')?.value || '',
                nr11_status: document.getElementById('nr11_status')?.value || '',
                nr12_dataEmissao: document.getElementById('nr12_dataEmissao')?.value || '',
                nr12_vencimento: document.getElementById('nr12_vencimento')?.value || '',
                nr12_status: document.getElementById('nr12_status')?.value || '',
                nr17_dataEmissao: document.getElementById('nr17_dataEmissao')?.value || '',
                nr17_vencimento: document.getElementById('nr17_vencimento')?.value || '',
                nr17_status: document.getElementById('nr17_status')?.value || '',
                nr18_dataEmissao: document.getElementById('nr18_dataEmissao')?.value || '',
                nr18_vencimento: document.getElementById('nr18_vencimento')?.value || '',
                nr18_status: document.getElementById('nr18_status')?.value || '',
                nr20_dataEmissao: document.getElementById('nr20_dataEmissao')?.value || '',
                nr20_vencimento: document.getElementById('nr20_vencimento')?.value || '',
                nr20_status: document.getElementById('nr20_status')?.value || '',
                nr33_dataEmissao: document.getElementById('nr33_dataEmissao')?.value || '',
                nr33_vencimento: document.getElementById('nr33_vencimento')?.value || '',
                nr33_status: document.getElementById('nr33_status')?.value || '',
                nr34_dataEmissao: document.getElementById('nr34_dataEmissao')?.value || '',
                nr34_vencimento: document.getElementById('nr34_vencimento')?.value || '',
                nr34_status: document.getElementById('nr34_status')?.value || '',
                nr35_dataEmissao: document.getElementById('nr35_dataEmissao')?.value || '',
                nr35_vencimento: document.getElementById('nr35_vencimento')?.value || '',
                nr35_status: document.getElementById('nr35_status')?.value || '',
                epi_dataEmissao: document.getElementById('epi_dataEmissao')?.value || '',
                epi_vencimento: document.getElementById('epi_vencimento')?.value || '',
                epi_status: document.getElementById('epi_status')?.value || '',
                fotoBase64: '', // Inicializar vazio, será preenchido se houver arquivo
                removerFoto: this.fotoRemovida // Flag para remover foto
            };
            
            // Converter foto para base64 se existir (COM COMPRESSÃO)
            const fotoInput = document.getElementById('foto');
            if (fotoInput && fotoInput.files && fotoInput.files[0]) {
                const file = fotoInput.files[0];
                console.log('📸 Foto selecionada:', file.name, 'Tamanho:', (file.size / 1024).toFixed(2), 'KB');
                
                // Comprimir imagem antes de enviar
                const fotoBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            // Criar canvas para redimensionar
                            const canvas = document.createElement('canvas');
                            const MAX_SIZE = 400; // Tamanho máximo
                            let width = img.width;
                            let height = img.height;
                            
                            // Redimensionar mantendo proporção
                            if (width > height && width > MAX_SIZE) {
                                height = (height * MAX_SIZE) / width;
                                width = MAX_SIZE;
                            } else if (height > MAX_SIZE) {
                                width = (width * MAX_SIZE) / height;
                                height = MAX_SIZE;
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Converter para base64 com qualidade 0.7
                            const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                            console.log('⚡ Foto comprimida:', (base64.length / 1024).toFixed(2), 'KB');
                            resolve(base64);
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                dados.fotoBase64 = fotoBase64;
                console.log('✅ Foto pronta para envio');
            }
            
            console.log('=== SALVANDO REGISTRO ===');
            console.log('isEdit:', isEdit);
            console.log('this.editingId:', this.editingId);
            console.log('Modo:', isEdit ? 'EDIÇÃO' : 'NOVO');
            
            const url = isEdit ? `/api/ssma/${this.editingId}` : '/api/ssma';
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log('URL:', url);
            console.log('Method:', method);
            console.log('Dados sendo enviados:', JSON.stringify(dados, null, 2));
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });
            
            const data = await response.json();
            console.log('Resposta do servidor:', data);
            
            if (response.ok) {
                this.showToast(data.message || 'Registro salvo com sucesso!', 'success');
                
                // Limpar input de foto após salvar com sucesso
                const fotoInput = document.getElementById('foto');
                if (fotoInput) {
                    fotoInput.value = '';
                    console.log('✅ Input de foto limpo após salvar');
                }
                
                // Forçar atualização IMEDIATA da foto com cache-busting (antes de recarregar tudo)
                if (isEdit) {
                    const timestamp = new Date().getTime();
                    const fotoImg = document.querySelector(`tr[data-id="${this.editingId}"] img.foto-thumbnail`);
                    if (fotoImg) {
                        fotoImg.src = `/api/foto/${this.editingId}?t=${timestamp}`;
                        console.log('🖼️ Foto atualizada IMEDIATAMENTE com cache-busting');
                    }
                }
                
                // Fechar modal PRIMEIRO para evitar tremor visual
                this.fecharModals();
                
                // Recarregar dados para atualizar todas as colunas (incluindo NRs)
                setTimeout(() => {
                    this.loadData(false);
                    this.clearSelection();
                }, 100);

            } else {
                console.error('Erro do servidor:', data);
                console.error('Status HTTP:', response.status);
                console.error('Resposta completa:', JSON.stringify(data, null, 2));
                
                // Verificar se é erro de duplicata
                if (response.status === 409) {
                    this.mostrarImagemDuplicata('/Cadastro-ja-Existe.jpg', data.error);
                    console.warn('⚠️ Tentativa de cadastro duplicado bloqueada:', data);
                } else {
                    const errorMsg = data.error || 'Erro ao salvar registro';
                    console.error('Mensagem de erro:', errorMsg);
                    this.showToast(errorMsg, 'error');
                }
            }
        } catch (error) {
            console.error('Erro ao salvar registro:', error);
            this.showToast('Erro de conexão com o servidor', 'error');
        } finally {
            this.salvandoRegistro = false;
            
            // Reabilitar botão de submit
            const btnSalvar = document.getElementById('btnSalvar');
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.style.opacity = '1';
            }
        }
    }
    
    async excluirRegistroById(id) {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                const response = await fetch(`/api/ssma/${id}`, { method: 'DELETE' });
                const data = await response.json();
                
                if (response.ok) {
                    this.showToast('Registro excluído com sucesso!', 'success');
                    this.loadData();
                    this.clearSelection();
                } else {
                    this.showToast(data.error || 'Erro ao excluir registro', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir registro:', error);
                this.showToast('Erro de conexão com o servidor', 'error');
            }
        }
    }
    
    // Controle das abas NR
    switchNRTab(nrType) {
        // Verificar se a aba solicitada está habilitada (visível)
        const tabElement = document.querySelector(`.nr-tab[data-nr="${nrType}"]`);
        if (tabElement && tabElement.style.display === 'none') {
            // Aba desabilitada, ir para a primeira aba habilitada
            console.log(`Aba ${nrType} está desabilitada, buscando primeira habilitada`);
            const primeiraHabilitada = document.querySelector('.nr-tab:not([style*="display: none"])');
            if (primeiraHabilitada) {
                const primeiroNrType = primeiraHabilitada.dataset.nr;
                if (primeiroNrType !== nrType) {
                    this.switchNRTab(primeiroNrType);
                }
            }
            return;
        }
        
        // Remover classe active de todas as abas
        document.querySelectorAll('.nr-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Ocultar todos os conteúdos
        document.querySelectorAll('.nr-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // Ativar aba selecionada
        const selectedTab = document.querySelector(`[data-nr="${nrType}"]`);
        const contentElement = document.getElementById(`content-${nrType}`);
        
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        if (contentElement) {
            contentElement.classList.add('active');
            contentElement.style.display = 'flex';
        }
        
        // Verificar o ID na tela e replicar o botão
        const logoId = document.getElementById('logoId');
        if (logoId) {
            const idText = logoId.textContent.trim();
            if (idText.includes('-') || idText === 'ID:') {
                this.configurarBotaoSalvar(false);
            } else {
                this.configurarBotaoSalvar(true);
            }
        }
        
        // Controlar visibilidade da seção de foto - SEMPRE VISÍVEL EM TODAS AS ABAS
        const photoSection = document.querySelector('.photo-section');
        const photoButtons = document.querySelector('.photo-buttons');
        
        if (photoSection && photoButtons) {
            // Mostrar seção de foto em TODAS as abas
            photoSection.style.display = 'flex';
            photoButtons.style.display = 'flex';
        }
        
        // Se mudou para uma das NRs, configurar campos e dar foco
        if (nrType === 'nr10') {
            this.setupNR10Tab();
        } else if (nrType === 'nr11') {
            this.setupNR11Tab();
        } else if (nrType === 'nr12') {
            this.setupNR12Tab();
        } else if (nrType === 'nr17') {
            this.setupNR17Tab();
        } else if (nrType === 'nr18') {
            this.setupNR18Tab();
        } else if (nrType === 'nr33') {
            this.setupNR33Tab();
        } else if (nrType === 'nr35') {
            this.setupNR35Tab();
        } else if (nrType === 'epi') {
            this.setupEPITab();
        }
    }
    
    // Abrir tabela de fornecedor
    abrirTabelaFornecedor() {
        // Resetar editingId
        this.editingId = null;
        this.currentEditingData = null;
        
        // Mudar título do modal
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Fornecedor';
        
        // Mudar para aba Fornecedor ANTES de abrir o modal
        this.switchMainTab('fornecedor');
        
        // Abrir o modal SEM resetar (skipReset = true)
        this.showModal('modalForm', true);
        
        // Carregar dados dos fornecedores com delay mínimo (10ms)
        setTimeout(() => {
            this.carregarGridFornecedores();
            this.carregarDropdownsFornecedor();
            this.mostrarBuscaEmpresa();
            
            // Dar foco no primeiro campo
            const empresaField = document.getElementById('fornecedor_empresa');
            if (empresaField) empresaField.focus();
        }, 10);
    }
    
    // Função para trocar entre as abas principais (Cursos/Fornecedor)
    switchMainTab(tabType) {
        if (tabType === 'fornecedor') {
            // OCULTAR TUDO DE CURSOS
            // Ocultar aba "Cursos" do botão
            const btnCursos = document.querySelector('[data-tab="cursos"]');
            if (btnCursos) btnCursos.style.display = 'none';
            
            // Ativar aba Fornecedor
            const btnFornecedor = document.querySelector('[data-tab="fornecedor"]');
            if (btnFornecedor) {
                btnFornecedor.style.display = 'block';
                btnFornecedor.classList.add('active');
            }
            
            // Desativar aba Documentação
            const btnDocumentacao = document.querySelector('[data-tab="documentacao"]');
            if (btnDocumentacao) {
                btnDocumentacao.classList.remove('active');
            }
            
            // Ocultar todas as abas NR (ASO, NR-10, etc.) e seus conteúdos
            document.querySelectorAll('.nr-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            document.querySelector('.nr-tabs').style.display = 'none';
            
            // Ocultar conteúdo da documentação
            const contentDocumentacao = document.getElementById('content-documentacao');
            if (contentDocumentacao) {
                contentDocumentacao.classList.remove('active');
                contentDocumentacao.style.display = 'none';
            }
            
            // Mostrar aba fornecedor
            const contentFornecedor = document.getElementById('content-fornecedor');
            if (contentFornecedor) {
                contentFornecedor.classList.add('active');
                contentFornecedor.style.display = 'block';
            }
            
            // Ocultar área da foto
            document.querySelector('.photo-section').style.display = 'none';
            
            // Carregar dados dos fornecedores (sem delay)
            this.carregarGridFornecedores();
            this.carregarDropdownsFornecedor();
            this.mostrarBuscaEmpresa();
            
        } else if (tabType === 'documentacao') {
            // MOSTRAR DOCUMENTAÇÃO
            // Ocultar aba "Cursos" do botão
            const btnCursos = document.querySelector('[data-tab="cursos"]');
            if (btnCursos) btnCursos.style.display = 'none';
            
            // Mostrar aba Documentação
            const btnDocumentacao = document.querySelector('[data-tab="documentacao"]');
            if (btnDocumentacao) {
                btnDocumentacao.style.display = 'block';
                btnDocumentacao.classList.add('active');
            }
            
            // Desativar aba Fornecedor
            const btnFornecedor = document.querySelector('[data-tab="fornecedor"]');
            if (btnFornecedor) {
                btnFornecedor.style.display = 'block';
                btnFornecedor.classList.remove('active');
            }
            
            // Ocultar todas as abas NR e seus conteúdos
            document.querySelectorAll('.nr-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            document.querySelector('.nr-tabs').style.display = 'none';
            
            // Mostrar aba documentação
            const contentDocumentacao = document.getElementById('content-documentacao');
            if (contentDocumentacao) {
                contentDocumentacao.classList.add('active');
                contentDocumentacao.style.display = 'block';
            }
            
            // Ocultar aba fornecedor
            const contentFornecedor = document.getElementById('content-fornecedor');
            if (contentFornecedor) {
                contentFornecedor.classList.remove('active');
                contentFornecedor.style.display = 'none';
            }
            
            // Ocultar área da foto
            document.querySelector('.photo-section').style.display = 'none';
            
            // Dar foco no campo Data Emissão PGR
            setTimeout(() => {
                const campoPgr = document.getElementById('doc_pgr_emissao');
                if (campoPgr) campoPgr.focus();
            }, 100);
            
        } else if (tabType === 'cursos') {
            // MOSTRAR TUDO DE CURSOS
            // Mostrar aba "Cursos" do botão
            const btnCursos = document.querySelector('[data-tab="cursos"]');
            if (btnCursos) {
                btnCursos.style.display = 'block';
                btnCursos.classList.add('active');
            }
            
            // Mostrar aba Fornecedor (mas não ativa)
            const btnFornecedor = document.querySelector('[data-tab="fornecedor"]');
            if (btnFornecedor) {
                btnFornecedor.style.display = 'block';
                btnFornecedor.classList.remove('active');
            }
            
            // Mostrar aba Documentação (mas não ativa)
            const btnDocumentacao = document.querySelector('[data-tab="documentacao"]');
            if (btnDocumentacao) {
                btnDocumentacao.style.display = 'block';
                btnDocumentacao.classList.remove('active');
            }
            
            // Mostrar abas NR e restaurar display
            document.querySelector('.nr-tabs').style.display = 'flex';
            document.querySelector('.photo-section').style.display = 'flex';
            
            // Restaurar display das abas NR
            document.querySelectorAll('.nr-content').forEach(content => {
                content.style.display = '';
            });
            
            // Ocultar abas fornecedor e documentação
            const contentFornecedor = document.getElementById('content-fornecedor');
            if (contentFornecedor) {
                contentFornecedor.classList.remove('active');
                contentFornecedor.style.display = 'none';
            }
            
            const contentDocumentacao = document.getElementById('content-documentacao');
            if (contentDocumentacao) {
                contentDocumentacao.classList.remove('active');
                contentDocumentacao.style.display = 'none';
            }
            
            // Voltar para primeira aba habilitada
            this.irParaPrimeiraAbaHabilitada();
        }
    }
    
    // Configurar busca por datas com calendário
    setupBuscaDatas() {
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');
        
        if (!dataInicio || !dataFim) return;
        
        // Buscar quando selecionar data no calendário
        dataInicio.addEventListener('change', () => {
            console.log('📅 Data início selecionada:', dataInicio.value);
            if (dataInicio.value) {
                this.currentPage = 1;
                this.loadData(false);
            }
        });
        
        dataFim.addEventListener('change', () => {
            console.log('📅 Data fim selecionada:', dataFim.value);
            if (dataFim.value && dataInicio.value) {
                this.currentPage = 1;
                this.loadData(false);
            }
        });
    }
    
    // Buscar por intervalo de datas (mantido para compatibilidade)
    async buscarPorDatas() {
        this.currentPage = 1;
        this.loadData(false);
    }
    
    // Configurar eventos da NR-06 (vencimento 1 ano)
    setupNR06Events() {
        const nr06DataEmissao = document.getElementById('nr06_dataEmissao');
        if (nr06DataEmissao) {
            nr06DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 10) { // dd/mm/aaaa
                        this.calcularNR06();
                    }
                }, 100);
            });
            
            nr06DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR06(e);
                    setTimeout(() => {
                        this.calcularNR06();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr06DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularNR06(), 100);
            });
            // Selecionar tudo ao duplo clique
            nr06DataEmissao.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
    }
    
    // Configurar eventos da NR-10
    setupNR10Events() {
        const nr10DataEmissao = document.getElementById('nr10_dataEmissao');
        if (nr10DataEmissao) {
            nr10DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR10();
                    }
                }, 100);
            });
            
            nr10DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR10(e);
                    setTimeout(() => {
                        this.calcularNR10();
                        // Após completar cálculo, ir para NR-11
                        if (e.target.value.length >= 8) {
                            this.switchNRTab('nr11');
                        }
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr10DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularNR10(), 100);
            });
            // Selecionar tudo ao duplo clique
            nr10DataEmissao.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
    }
    
    // Configurar eventos da NR-11 (igual ao NR-10)
    setupNR11Events() {
        const nr11DataEmissao = document.getElementById('nr11_dataEmissao');
        if (nr11DataEmissao) {
            nr11DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR11();
                    }
                }, 100);
            });
            
            nr11DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR11(e);
                    setTimeout(() => {
                        this.calcularNR11();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr11DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR11();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-12 (igual ao NR-10 e NR-11)
    setupNR12Events() {
        const nr12DataEmissao = document.getElementById('nr12_dataEmissao');
        if (nr12DataEmissao) {
            nr12DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR12();
                    }
                }, 100);
            });
            
            nr12DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR12(e);
                    setTimeout(() => {
                        this.calcularNR12();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr12DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR12();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-17 (igual ao NR-10 e NR-11)
    setupNR17Events() {
        const nr17DataEmissao = document.getElementById('nr17_dataEmissao');
        if (nr17DataEmissao) {
            nr17DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR17();
                    }
                }, 100);
            });
            
            nr17DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR17(e);
                    setTimeout(() => {
                        this.calcularNR17();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr17DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR17();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-18 (igual ao NR-10, NR-11 e NR-17)
    setupNR18Events() {
        const nr18DataEmissao = document.getElementById('nr18_dataEmissao');
        if (nr18DataEmissao) {
            nr18DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR18();
                    }
                }, 100);
            });
            
            nr18DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR18(e);
                    setTimeout(() => {
                        this.calcularNR18();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr18DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR18();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-20 (vencimento 2 anos)
    setupNR20Events() {
        const nr20DataEmissao = document.getElementById('nr20_dataEmissao');
        if (nr20DataEmissao) {
            nr20DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR20();
                    }
                }, 100);
            });
            
            nr20DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR20(e);
                    setTimeout(() => {
                        this.calcularNR20();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr20DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR20();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-33 (igual ao NR-11)
    setupNR33Events() {
        const nr33DataEmissao = document.getElementById('nr33_dataEmissao');
        if (nr33DataEmissao) {
            nr33DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR33();
                    }
                }, 100);
            });
            
            nr33DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR33(e);
                    setTimeout(() => {
                        this.calcularNR33();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr33DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR33();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-34 (vencimento 1 ano)
    setupNR34Events() {
        const nr34DataEmissao = document.getElementById('nr34_dataEmissao');
        if (nr34DataEmissao) {
            nr34DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR34();
                    }
                }, 100);
            });
            
            nr34DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR34(e);
                    setTimeout(() => {
                        this.calcularNR34();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr34DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR34();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da NR-35 (igual ao NR-11)
    setupNR35Events() {
        const nr35DataEmissao = document.getElementById('nr35_dataEmissao');
        if (nr35DataEmissao) {
            nr35DataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente conforme digita
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais
                        this.calcularNR35();
                    }
                }, 100);
            });
            
            nr35DataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualNR35(e);
                    setTimeout(() => {
                        this.calcularNR35();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr35DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR35();
                }, 100);
            });
        }
    }
    
    // Configurar eventos da EPI (igual ao NR-11)
    setupEPIEvents() {
        const epiDataEmissao = document.getElementById('epi_dataEmissao');
        if (epiDataEmissao) {
            epiDataEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente após cada digitação
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais - calcular mesmo com ano parcial
                        this.calcularEPI();
                    }
                }, 100);
            });
            epiDataEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualEPI(e);
                    setTimeout(() => this.calcularEPI(), 100);
                }
            });
            // Calcular também quando sair do campo (blur)
            epiDataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularEPI(), 100);
            });
        }
    }
    
    // Configurar eventos para todas as outras NRs
    setupAllNREvents() {
        const nrIds = ['epi_emissao'];
        
        nrIds.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                // Formatação automática
                campo.addEventListener('input', (e) => {
                    this.formatarDataEmissao(e);
                });
                
                // Completar ano com Tab
                campo.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        this.completarAnoGenerico(e);
                    }
                });
            }
        });
    }
    
    // Configurar eventos do fornecedor
    setupFornecedorEvents() {
        // Formatação automática do CNPJ
        const cnpjField = document.getElementById('fornecedor_cnpj');
        if (cnpjField) {
            cnpjField.addEventListener('input', (e) => {
                this.formatarCNPJ(e.target);
            });
        }
        
        // Formatação automática do telefone
        const telefoneField = document.getElementById('fornecedor_telefone');
        if (telefoneField) {
            telefoneField.addEventListener('input', (e) => {
                this.formatarTelefone(e.target);
            });
        }
        
        // Formatação automática do celular
        const celularField = document.getElementById('fornecedor_celular');
        if (celularField) {
            celularField.addEventListener('input', (e) => {
                this.formatarTelefone(e.target);
            });
        }
        
        // Busca em tempo real
        const buscaEmpresa = document.getElementById('busca_empresa');
        if (buscaEmpresa) {
            buscaEmpresa.addEventListener('input', () => {
                this.buscarFornecedor();
            });
        }
        
        const buscaCnpj = document.getElementById('busca_cnpj');
        if (buscaCnpj) {
            buscaCnpj.addEventListener('input', () => {
                this.buscarFornecedor();
            });
        }
    }
    
    // Armazenar dados para busca
    comboDocumentacaoDados = [];
    
    // Carregar combo com fornecedores ou documentações
    async carregarComboDocumentacao() {
        const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
        const datalist = document.getElementById('doc_lista_busca');
        const tipo = document.querySelector('input[name="doc_type"]:checked').value;
        
        datalist.innerHTML = '';
        document.getElementById('doc_combo_busca').value = '';
        
        try {
            let dados = [];
            
            if (tipo === 'novo') {
                // Carregar fornecedores ativos
                const res = await fetch('/api/fornecedores?situacao=S');
                if (!res.ok) throw new Error('Erro ao carregar fornecedores');
                dados = await res.json();
            } else {
                // Carregar documentações cadastradas
                const res = await fetch('/api/documentacao');
                if (!res.ok) throw new Error('Erro ao carregar documentações');
                dados = await res.json();
            }
            
            // Armazenar dados (removendo duplicados por CNPJ)
            const cnpjsVistos = new Set();
            this.comboDocumentacaoDados = dados.filter(item => {
                const cnpj = item.CNPJ || item.cnpj;
                if (cnpjsVistos.has(cnpj)) return false;
                cnpjsVistos.add(cnpj);
                return true;
            });
            
            // Preencher datalist baseado no tipo selecionado (sem duplicados)
            const valoresVistos = new Set();
            this.comboDocumentacaoDados.forEach(item => {
                const valor = searchType === 'empresa' 
                    ? (item.Empresa || item.empresa) 
                    : (item.CNPJ || item.cnpj);
                
                if (!valoresVistos.has(valor)) {
                    valoresVistos.add(valor);
                    const option = document.createElement('option');
                    option.value = valor;
                    datalist.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar combo:', error);
        }
    }
    
    // Filtrar combo conforme digita
    filtrarComboDocumentacao() {
        const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
        const input = document.getElementById('doc_combo_busca');
        const datalist = document.getElementById('doc_lista_busca');
        const valor = input.value.toLowerCase();
        
        datalist.innerHTML = '';
        
        this.comboDocumentacaoDados.forEach(item => {
            let texto = searchType === 'empresa' ? (item.Empresa || item.empresa) : (item.CNPJ || item.cnpj);
            if (texto.toLowerCase().includes(valor)) {
                const option = document.createElement('option');
                option.value = texto;
                datalist.appendChild(option);
            }
        });
    }
    
    // Selecionar do combo
    async selecionarDoComboDocumentacao() {
        const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
        const tipo = document.querySelector('input[name="doc_type"]:checked').value;
        const valor = document.getElementById('doc_combo_busca').value;
        
        if (!valor) return;
        
        // Procurar o item nos dados
        const item = this.comboDocumentacaoDados.find(d => {
            if (searchType === 'empresa') {
                return (d.Empresa || d.empresa) === valor;
            } else {
                return (d.CNPJ || d.cnpj) === valor;
            }
        });
        
        if (item) {
            const empresa = item.Empresa || item.empresa;
            const cnpj = item.CNPJ || item.cnpj;
            
            document.getElementById('doc_empresa').value = empresa;
            document.getElementById('doc_cnpj').value = cnpj;
            
            // Verificar se já existe documentação cadastrada para este CNPJ
            try {
                const res = await fetch(`/api/documentacao/cnpj/${encodeURIComponent(cnpj)}`);
                if (res.ok) {
                    const doc = await res.json();
                    if (doc && doc.id) {
                        // Preencher todos os campos com os dados existentes
                        document.getElementById('registroId').value = doc.id;
                        document.getElementById('doc_pgr_emissao').value = doc.pgr_emissao || '';
                        document.getElementById('doc_pgr_vencimento').value = doc.pgr_vencimento || '';
                        document.getElementById('doc_pgr_dias_corridos').value = doc.pgr_dias_corridos || '';
                        document.getElementById('doc_pgr_dias_vencer').value = doc.pgr_dias_vencer || '';
                        document.getElementById('doc_pgr_status').value = doc.pgr_status || '-';
                        document.getElementById('doc_pcmso_emissao').value = doc.pcmso_emissao || '';
                        document.getElementById('doc_pcmso_vencimento').value = doc.pcmso_vencimento || '';
                        document.getElementById('doc_pcmso_dias_corridos').value = doc.pcmso_dias_corridos || '';
                        document.getElementById('doc_pcmso_dias_vencer').value = doc.pcmso_dias_vencer || '';
                        document.getElementById('doc_pcmso_status').value = doc.pcmso_status || '-';
                        
                        // Atualizar ID no logo
                        const logoId = document.querySelector('.doc-logo-id');
                        if (logoId) logoId.textContent = 'ID: ' + doc.id;
                        
                        // Recalcular dias
                        this.calcularDiasDocumentacao('pgr');
                        this.calcularDiasDocumentacao('pcmso');
                        
                        // Atualizar botão para "Alterar"
                        this.atualizarBotaoDocumentacao();
                    }
                }
            } catch (error) {
                console.log('Nenhuma documentação existente para este CNPJ');
            }
        }
    }
    
    // Calcular status de documentação baseado na data de vencimento
    calcularStatusDocumento(vencimento) {
        if (!vencimento) return 'NaoInformado';
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let dataVenc;
        if (vencimento.includes('/')) {
            const [dia, mes, ano] = vencimento.split('/');
            dataVenc = new Date(ano, mes - 1, dia);
        } else {
            dataVenc = new Date(vencimento);
        }
        dataVenc.setHours(0, 0, 0, 0);
        
        const diffTime = dataVenc - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'Renovar';
        return 'OK';
    }
    
    // Carregar grid de documentações cadastradas
    carregarEmpresasDocumentacao() {
        const grid = document.getElementById('docEmpresasGrid');
        if (!grid) {
            console.error('Grid não encontrado');
            return;
        }
        
        grid.innerHTML = '<div class="doc-empresa-item" style="cursor: default; color: #999;">Carregando...</div>';
        
        // Carregar documentações cadastradas
        fetch('/api/documentacao')
            .then(res => {
                if (!res.ok) throw new Error('Erro na resposta: ' + res.status);
                return res.json();
            })
            .then(documentacoes => {
                console.log('Documentações carregadas:', documentacoes);
                grid.innerHTML = '';
                
                // Contadores para o rodapé
                let pgrVencido = 0, pgrRenovar = 0;
                let pcmsoVencido = 0, pcmsoRenovar = 0;
                
                if (!documentacoes || documentacoes.length === 0) {
                    grid.innerHTML = '<div class="doc-empresa-item" style="cursor: default; color: #999;">Nenhum cadastro</div>';
                    this.atualizarContadoresDocumentacao(0, 0, 0, 0);
                    return;
                }
                
                documentacoes.forEach(doc => {
                    // Calcular status PGR e PCMSO
                    const statusPGR = this.calcularStatusDocumento(doc.pgr_vencimento);
                    const statusPCMSO = this.calcularStatusDocumento(doc.pcmso_vencimento);
                    
                    // Contar para rodapé
                    if (statusPGR === 'Vencido') pgrVencido++;
                    if (statusPGR === 'Renovar') pgrRenovar++;
                    if (statusPCMSO === 'Vencido') pcmsoVencido++;
                    if (statusPCMSO === 'Renovar') pcmsoRenovar++;
                    
                    // Determinar cor do item (pior status entre PGR e PCMSO)
                    let corItem = '#000'; // Preto padrão (OK)
                    if (statusPGR === 'Vencido' || statusPCMSO === 'Vencido') {
                        corItem = '#e81123'; // Vermelho
                    } else if (statusPGR === 'Renovar' || statusPCMSO === 'Renovar') {
                        corItem = '#ff9500'; // Laranja
                    }
                    
                    const item = document.createElement('div');
                    item.className = 'doc-empresa-item';
                    item.textContent = doc.empresa;
                    item.style.cursor = 'pointer';
                    item.style.color = corItem;
                    item.dataset.statusPgr = statusPGR.toLowerCase();
                    item.dataset.statusPcmso = statusPCMSO.toLowerCase();
                    item.onclick = () => this.selecionarDocumentacaoDoGrid(doc);
                    grid.appendChild(item);
                });
                
                // Atualizar contadores do rodapé
                this.atualizarContadoresDocumentacao(pgrVencido, pgrRenovar, pcmsoVencido, pcmsoRenovar);
            })
            .catch(err => {
                console.error('Erro ao carregar documentações:', err);
                grid.innerHTML = '<div class="doc-empresa-item" style="cursor: default; color: red;">Erro ao carregar</div>';
            });
    }
    
    // Atualizar contadores do rodapé de documentação
    atualizarContadoresDocumentacao(pgrVencido, pgrRenovar, pcmsoVencido, pcmsoRenovar) {
        const pgrVencidoEl = document.getElementById('pgr-vencido');
        const pgrRenovarEl = document.getElementById('pgr-renovar');
        const pcmsoVencidoEl = document.getElementById('pcmso-vencido');
        const pcmsoRenovarEl = document.getElementById('pcmso-renovar');
        
        if (pgrVencidoEl) pgrVencidoEl.textContent = pgrVencido;
        if (pgrRenovarEl) pgrRenovarEl.textContent = pgrRenovar;
        if (pcmsoVencidoEl) pcmsoVencidoEl.textContent = pcmsoVencido;
        if (pcmsoRenovarEl) pcmsoRenovarEl.textContent = pcmsoRenovar;
    }
    
    // Filtrar grid de documentação
    filtrarGridDocumentacao() {
        const filtroPGR = document.getElementById('filter-pgr')?.value?.toLowerCase() || '';
        const filtroPCMSO = document.getElementById('filter-pcmso')?.value?.toLowerCase() || '';
        
        const items = document.querySelectorAll('#docEmpresasGrid .doc-empresa-item[data-status-pgr]');
        
        items.forEach(item => {
            const statusPgr = item.dataset.statusPgr || '';
            const statusPcmso = item.dataset.statusPcmso || '';
            
            let mostrar = true;
            
            // Se ambos filtros estão vazios, mostrar todos
            if (!filtroPGR && !filtroPCMSO) {
                mostrar = true;
            } else {
                // Se tem filtro PGR, verificar
                if (filtroPGR) {
                    mostrar = (statusPgr === filtroPGR);
                }
                // Se tem filtro PCMSO, verificar (AND com PGR se ambos ativos)
                if (filtroPCMSO && mostrar) {
                    mostrar = (statusPcmso === filtroPCMSO);
                } else if (filtroPCMSO && !filtroPGR) {
                    mostrar = (statusPcmso === filtroPCMSO);
                }
            }
            
            item.style.display = mostrar ? '' : 'none';
        });
        
        console.log('Filtro aplicado - PGR:', filtroPGR, 'PCMSO:', filtroPCMSO);
    }
    
    // Selecionar documentação do grid
    selecionarDocumentacaoDoGrid(doc) {
        document.getElementById('doc_empresa').value = doc.empresa;
        document.getElementById('doc_cnpj').value = doc.cnpj;
        document.getElementById('doc_pgr_emissao').value = doc.pgr_emissao || '';
        document.getElementById('doc_pgr_vencimento').value = doc.pgr_vencimento || '';
        document.getElementById('doc_pgr_dias_corridos').value = doc.pgr_dias_corridos || '';
        document.getElementById('doc_pgr_dias_vencer').value = doc.pgr_dias_vencer || '';
        document.getElementById('doc_pgr_status').value = doc.pgr_status || '-';
        document.getElementById('doc_pcmso_emissao').value = doc.pcmso_emissao || '';
        document.getElementById('doc_pcmso_vencimento').value = doc.pcmso_vencimento || '';
        document.getElementById('doc_pcmso_dias_corridos').value = doc.pcmso_dias_corridos || '';
        document.getElementById('doc_pcmso_dias_vencer').value = doc.pcmso_dias_vencer || '';
        document.getElementById('doc_pcmso_status').value = doc.pcmso_status || '-';
        document.getElementById('registroId').value = doc.id;
        
        // Atualizar ID no logo
        const logoId = document.querySelector('.doc-logo-id');
        if (logoId) {
            logoId.textContent = 'ID: ' + doc.id;
        }
        
        // Buscar situação do fornecedor pela empresa
        this.buscarSituacaoFornecedor(doc.empresa);
        
        // Recalcular dias e status
        this.calcularDiasDocumentacao('pgr');
        this.calcularDiasDocumentacao('pcmso');
        
        // Atualizar botão para "Alterar"
        this.atualizarBotaoDocumentacao();
        
        // Marcar item como selecionado
        document.querySelectorAll('.doc-empresa-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.classList.add('selected');
    }
    
    // Buscar situação do fornecedor na tabela FORNECEDOR
    async buscarSituacaoFornecedor(empresa) {
        const badge = document.getElementById('doc_fornecedor_situacao');
        if (!badge) return;
        
        if (!empresa) {
            badge.textContent = '-';
            badge.className = 'fornecedor-situacao-badge indefinido';
            return;
        }
        
        try {
            // Buscar TODOS os fornecedores (sem filtro de situação)
            const response = await fetch('/api/fornecedores');
            const result = await response.json();
            
            // A API retorna array direto ou { data: [...] }
            const fornecedores = Array.isArray(result) ? result : (result.data || []);
            
            console.log('🔍 Buscando fornecedor:', empresa);
            console.log('🔍 Fornecedores encontrados:', fornecedores.length);
            
            if (fornecedores.length > 0) {
                // Busca flexível - comparar ignorando case e espaços extras
                const empresaNormalizada = empresa.trim().toLowerCase();
                const fornecedor = fornecedores.find(f => {
                    const nomeNormalizado = (f.Empresa || '').trim().toLowerCase();
                    return nomeNormalizado === empresaNormalizada || 
                           nomeNormalizado.includes(empresaNormalizada) ||
                           empresaNormalizada.includes(nomeNormalizado);
                });
                
                if (fornecedor) {
                    console.log('✅ Fornecedor encontrado:', fornecedor.Empresa, 'Situação:', fornecedor.Situacao);
                    if (fornecedor.Situacao === 'S') {
                        badge.textContent = '✓ Ativo';
                        badge.className = 'fornecedor-situacao-badge ativo';
                    } else {
                        badge.textContent = '✗ Inativo';
                        badge.className = 'fornecedor-situacao-badge inativo';
                    }
                } else {
                    console.log('❌ Fornecedor não encontrado para:', empresa);
                    badge.textContent = '? Não cadastrado';
                    badge.className = 'fornecedor-situacao-badge indefinido';
                }
            } else {
                badge.textContent = '? Sem fornecedores';
                badge.className = 'fornecedor-situacao-badge indefinido';
            }
        } catch (err) {
            console.error('Erro ao buscar situação do fornecedor:', err);
            badge.textContent = '? Erro';
            badge.className = 'fornecedor-situacao-badge indefinido';
        }
    }
    
    // Excluir documentação
    async excluirDocumentacao() {
        const registroId = document.getElementById('registroId')?.value;
        
        if (!registroId) {
            this.showToast('Selecione um registro para excluir', 'error');
            return;
        }
        
        if (!confirm('Tem certeza que deseja EXCLUIR este registro de documentação?\n\nEsta ação não pode ser desfeita!')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/documentacao/${registroId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Documentação excluída com sucesso!', 'success');
                this.limparDocumentacao();
                this.carregarEmpresasDocumentacao();
            } else {
                this.showToast(result.error || 'Erro ao excluir documentação', 'error');
            }
        } catch (err) {
            console.error('Erro ao excluir documentação:', err);
            this.showToast('Erro ao excluir documentação', 'error');
        }
    }
    
    // Selecionar empresa do grid
    selecionarEmpresaDocumentacao(doc) {
        document.getElementById('doc_empresa').value = doc.empresa;
        document.getElementById('doc_cnpj').value = doc.cnpj;
        document.getElementById('doc_pgr_emissao').value = doc.pgr_emissao || '';
        document.getElementById('doc_pgr_vencimento').value = doc.pgr_vencimento || '';
        document.getElementById('doc_pgr_status').value = doc.pgr_status || '-';
        document.getElementById('doc_pgr_dias_corridos').value = doc.pgr_dias_corridos || '';
        document.getElementById('doc_pgr_dias_vencer').value = doc.pgr_dias_vencer || '';
        document.getElementById('doc_pcmso_emissao').value = doc.pcmso_emissao || '';
        document.getElementById('doc_pcmso_vencimento').value = doc.pcmso_vencimento || '';
        document.getElementById('doc_pcmso_status').value = doc.pcmso_status || '-';
        document.getElementById('doc_pcmso_dias_corridos').value = doc.pcmso_dias_corridos || '';
        document.getElementById('doc_pcmso_dias_vencer').value = doc.pcmso_dias_vencer || '';
        document.getElementById('registroId').value = doc.id;
        
        // Atualizar botão para "Alterar"
        this.atualizarBotaoDocumentacao();
        
        // Marcar item como selecionado
        document.querySelectorAll('.doc-empresa-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.classList.add('selected');
    }
    
    // Configurar eventos da aba Documentação
    setupDocumentacaoEvents() {
        // Carregar combo inicial (Empresa está selecionado por padrão)
        this.carregarComboDocumentacao();
        
        // Carregar grid de empresas
        this.carregarEmpresasDocumentacao();
        
        const buscaFornecedor = document.getElementById('doc_busca_fornecedor');
        if (buscaFornecedor) {
            buscaFornecedor.addEventListener('input', () => {
                this.buscarFornecedorDocumentacao();
            });
        }
        
        // Busca de fornecedores - mostrar sugestões ao focar
        const buscaInput = document.getElementById('doc_busca_fornecedor');
        if (buscaInput) {
            buscaInput.addEventListener('focus', () => {
                const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
                this.mostrarSugestoesDocumentacao(searchType);
            });
            
            buscaInput.addEventListener('change', () => {
                const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
                this.buscarFornecedorDocumentacao();
            });
        }
        
        // PGR - Configurar igual à tabela de cursos
        const pgrEmissao = document.getElementById('doc_pgr_emissao');
        if (pgrEmissao) {
            pgrEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente após cada digitação
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais - calcular mesmo com ano parcial
                        this.calcularVencimentoPGR();
                        setTimeout(() => {
                            this.calcularDiasDocumentacao('pgr');
                        }, 50);
                    }
                }, 100);
            });
            pgrEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualDocPGR(e);
                    setTimeout(() => this.calcularDiasDocumentacao('pgr'), 100);
                }
            });
            pgrEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularDiasDocumentacao('pgr'), 100);
            });
            pgrEmissao.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
        
        // PCMSO - Configurar igual à tabela de cursos
        const pcmsoEmissao = document.getElementById('doc_pcmso_emissao');
        if (pcmsoEmissao) {
            pcmsoEmissao.addEventListener('input', (e) => {
                this.formatarDataEmissao(e);
                // Calcular imediatamente após cada digitação
                setTimeout(() => {
                    const valor = e.target.value;
                    if (valor.length >= 6) { // dd/mm/a ou mais - calcular mesmo com ano parcial
                        this.calcularVencimentoPCMSO();
                        setTimeout(() => {
                            this.calcularDiasDocumentacao('pcmso');
                        }, 50);
                    }
                }, 100);
            });
            pcmsoEmissao.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.completarAnoAtualDocPCMSO(e);
                    setTimeout(() => this.calcularDiasDocumentacao('pcmso'), 100);
                }
            });
            pcmsoEmissao.addEventListener('blur', (e) => {
                setTimeout(() => this.calcularDiasDocumentacao('pcmso'), 100);
            });
            pcmsoEmissao.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        }
    }
    
    mudarTipoDocumentacao() {
        const tipo = document.querySelector('input[name="doc_type"]:checked').value;
        
        if (tipo === 'novo') {
            // Limpar grid quando mudar para "Novo"
            document.getElementById('docEmpresasGrid').innerHTML = '';
        } else {
            // Carregar grid quando mudar para "Editar"
            setTimeout(() => this.carregarEmpresasDocumentacao(), 100);
        }
        
        // Carregar combo
        this.carregarComboDocumentacao();
        
        // Limpar busca ao mudar tipo
        document.getElementById('doc_combo_busca').value = '';
        this.limparDocumentacao();
    }
    
    async buscarFornecedorDocumentacao() {
        const tipo = document.querySelector('input[name="doc_type"]:checked').value;
        const searchType = document.querySelector('input[name="doc_search_type"]:checked').value;
        const searchTerm = document.getElementById('doc_busca_fornecedor').value.toLowerCase();
        
        // Se estiver vazio, mostrar sugestões
        if (!searchTerm) {
            this.mostrarSugestoesDocumentacao(searchType);
            return;
        }
        
        try {
            if (tipo === 'novo') {
                // Buscar em fornecedores ATIVOS do banco de dados
                const response = await fetch('/api/fornecedores?situacao=S');
                if (!response.ok) throw new Error('Erro ao carregar fornecedores');
                const fornecedores = await response.json();
                let resultado = fornecedores.find(f => {
                    if (searchType === 'empresa') {
                        return f.Empresa.toLowerCase().includes(searchTerm);
                    } else {
                        return f.CNPJ.includes(searchTerm);
                    }
                });
                if (resultado) {
                    document.getElementById('doc_empresa').value = resultado.Empresa;
                    // Formatar CNPJ
                    let cnpj = resultado.CNPJ.replace(/\D/g, '');
                    cnpj = cnpj.replace(/^(\d{2})(\d)/, '$1.$2');
                    cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    cnpj = cnpj.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2');
                    document.getElementById('doc_cnpj').value = cnpj;
                    // Limpar ID para novo cadastro
                    document.getElementById('registroId').value = '';
                    this.atualizarBotaoDocumentacao();
                }
            } else {
                // Buscar em documentação já salva
                const response = await fetch('/api/documentacao');
                if (!response.ok) throw new Error('Erro ao carregar documentação');
                const documentacoes = await response.json();
                let resultado = documentacoes.find(d => {
                    if (searchType === 'empresa') {
                        return d.empresa.toLowerCase().includes(searchTerm);
                    } else {
                        return d.cnpj.includes(searchTerm);
                    }
                });
                if (resultado) {
                    document.getElementById('doc_empresa').value = resultado.empresa;
                    document.getElementById('doc_cnpj').value = resultado.cnpj;
                    document.getElementById('doc_pgr_emissao').value = resultado.pgr_emissao || '';
                    document.getElementById('doc_pgr_vencimento').value = resultado.pgr_vencimento || '';
                    document.getElementById('doc_pgr_status').value = resultado.pgr_status || '-';
                    document.getElementById('doc_pcmso_emissao').value = resultado.pcmso_emissao || '';
                    document.getElementById('doc_pcmso_vencimento').value = resultado.pcmso_vencimento || '';
                    document.getElementById('doc_pcmso_status').value = resultado.pcmso_status || '-';
                    document.getElementById('registroId').value = resultado.id || '';
                    this.atualizarBotaoDocumentacao();
                    // Recalcular dias
                    this.calcularDiasDocumentacao('pgr');
                    this.calcularDiasDocumentacao('pcmso');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar:', error);
        }
    }
    
    atualizarBotaoDocumentacao() {
        const btn = document.getElementById('btnSalvarDocumentacao');
        const registroId = document.getElementById('registroId').value;
        
        // Se tem ID, é alteração
        if (registroId) {
            btn.textContent = 'Alterar';
            btn.style.background = '#ff9500';
            btn.style.borderColor = '#e6851a';
        } else {
            btn.textContent = 'Cadastrar';
            btn.style.background = '#4a90e2';
            btn.style.borderColor = '#357abd';
        }
    }
    
    limparDocumentacao() {
        document.getElementById('doc_empresa').value = '';
        document.getElementById('doc_cnpj').value = '';
        document.getElementById('doc_combo_busca').value = '';
        document.getElementById('doc_pgr_emissao').value = '';
        document.getElementById('doc_pgr_vencimento').value = '';
        document.getElementById('doc_pgr_dias_corridos').value = '';
        document.getElementById('doc_pgr_dias_vencer').value = '';
        document.getElementById('doc_pgr_status').value = '-';
        document.getElementById('doc_pcmso_emissao').value = '';
        document.getElementById('doc_pcmso_vencimento').value = '';
        document.getElementById('doc_pcmso_dias_corridos').value = '';
        document.getElementById('doc_pcmso_dias_vencer').value = '';
        document.getElementById('doc_pcmso_status').value = '-';
        document.getElementById('registroId').value = '';
        
        // Limpar badge de situação do fornecedor
        const badge = document.getElementById('doc_fornecedor_situacao');
        if (badge) {
            badge.textContent = '-';
            badge.className = 'fornecedor-situacao-badge indefinido';
        }
        
        // Resetar para "Novo"
        document.getElementById('doc_type_novo').checked = true;
        
        // Resetar ID no logo
        const logoId = document.querySelector('.doc-logo-id');
        if (logoId) {
            logoId.textContent = 'ID: -';
        }
        
        // Recarregar grid (não limpar!)
        this.carregarEmpresasDocumentacao();
        
        // Desmarcar itens do grid
        document.querySelectorAll('.doc-empresa-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.atualizarBotaoDocumentacao();
        
        // Dar foco no campo Data Emissão PGR
        setTimeout(() => {
            const campoPgr = document.getElementById('doc_pgr_emissao');
            if (campoPgr) {
                campoPgr.focus();
            }
        }, 100);
    }
    
    // Navegação TAB na documentação
    navegarDocumentacao(event, tipo) {
        if (event.key !== 'Tab') return;
        
        event.preventDefault();
        
        if (tipo === 'pgr') {
            // De PGR vai para PCMSO
            const campoPcmso = document.getElementById('doc_pcmso_emissao');
            if (campoPcmso) {
                campoPcmso.focus();
                campoPcmso.select();
            }
        } else if (tipo === 'pcmso') {
            // De PCMSO volta para PGR (circular)
            const campoPgr = document.getElementById('doc_pgr_emissao');
            if (campoPgr) {
                campoPgr.focus();
                campoPgr.select();
            }
        }
    }
    
    async salvarDocumentacao() {
        const registroId = document.getElementById('registroId').value;
        const empresa = document.getElementById('doc_empresa').value;
        const cnpj = document.getElementById('doc_cnpj').value;
        const pgr_emissao = document.getElementById('doc_pgr_emissao').value;
        const pgr_vencimento = document.getElementById('doc_pgr_vencimento').value;
        const pgr_status = document.getElementById('doc_pgr_status').value;
        const pcmso_emissao = document.getElementById('doc_pcmso_emissao').value;
        const pcmso_vencimento = document.getElementById('doc_pcmso_vencimento').value;
        const pcmso_status = document.getElementById('doc_pcmso_status').value;
        const ativo = document.getElementById('toggleDocStatus') ? (document.getElementById('toggleDocStatus').checked ? 'S' : 'N') : 'S';
        
        if (!empresa || !cnpj) {
            alert('Por favor, selecione um fornecedor');
            return;
        }
        
        const dados = {
            empresa,
            cnpj,
            pgr_emissao,
            pgr_vencimento,
            pgr_status,
            pcmso_emissao,
            pcmso_vencimento,
            pcmso_status,
            ativo
        };
        
        try {
            const url = registroId ? `/api/documentacao/${registroId}` : '/api/documentacao';
            const method = registroId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) throw new Error('Erro ao salvar');
            const resultado = await response.json();
            
            if (!registroId) {
                document.getElementById('registroId').value = resultado.id;
                this.atualizarBotaoDocumentacao();
            }
            
            alert(registroId ? 'Registro alterado com sucesso!' : 'Registro cadastrado com sucesso!');
            
            // Limpar campos após salvar
            this.limparDocumentacao();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar registro');
        }
    }
    
    calcularVencimentoPGR() {
        const emissaoEl = document.getElementById('doc_pgr_emissao');
        const vencimentoEl = document.getElementById('doc_pgr_vencimento');
        if (!emissaoEl || !emissaoEl.value) return;
        
        try {
            const parts = emissaoEl.value.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            // Validar se tem pelo menos 2 dígitos no ano
            if (ano.length < 2) return;
            
            const dataEmissao = new Date(ano, mes - 1, dia);
            
            // Verificar se a data é válida
            if (isNaN(dataEmissao.getTime())) return;
            
            // Adicionar 2 anos para PGR
            const dataVencimento = new Date(dataEmissao);
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 2);
            
            // Formatar para input date (yyyy-mm-dd)
            const vencFormatado = dataVencimento.toISOString().split('T')[0];
            vencimentoEl.value = vencFormatado;
            
            this.calcularDiasDocumentacao('pgr');
        } catch (error) {
            console.error('Erro ao calcular vencimento PGR:', error);
        }
    }
    
    calcularVencimentoPCMSO() {
        const emissaoEl = document.getElementById('doc_pcmso_emissao');
        const vencimentoEl = document.getElementById('doc_pcmso_vencimento');
        if (!emissaoEl || !emissaoEl.value) return;
        
        try {
            const parts = emissaoEl.value.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            // Validar se tem pelo menos 2 dígitos no ano
            if (ano.length < 2) return;
            
            const dataEmissao = new Date(ano, mes - 1, dia);
            
            // Verificar se a data é válida
            if (isNaN(dataEmissao.getTime())) return;
            
            // Adicionar 1 ano para PCMSO
            const dataVencimento = new Date(dataEmissao);
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
            
            // Formatar para input date (yyyy-mm-dd)
            const vencFormatado = dataVencimento.toISOString().split('T')[0];
            vencimentoEl.value = vencFormatado;
            
            this.calcularDiasDocumentacao('pcmso');
        } catch (error) {
            console.error('Erro ao calcular vencimento PCMSO:', error);
        }
    }
    
    calcularDiasDocumentacao(tipo) {
        const emissaoEl = document.getElementById(`doc_${tipo}_emissao`);
        const vencimentoEl = document.getElementById(`doc_${tipo}_vencimento`);
        const diasCorridosEl = document.getElementById(`doc_${tipo}_dias_corridos`);
        const diasVencerEl = document.getElementById(`doc_${tipo}_dias_vencer`);
        const statusEl = document.getElementById(`doc_${tipo}_status`);
        
        if (!emissaoEl.value || !vencimentoEl.value) return;
        
        const [dia, mes, ano] = emissaoEl.value.split('/');
        const dataEmissao = new Date(ano, mes - 1, dia);
        const dataVencimento = new Date(vencimentoEl.value);
        const hoje = new Date();
        
        const diasCorridos = Math.floor((dataVencimento - dataEmissao) / (1000 * 60 * 60 * 24));
        diasCorridosEl.value = diasCorridos;
        
        const diasVencer = Math.floor((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
        diasVencerEl.value = diasVencer;
        
        // Atualizar status automaticamente
        if (statusEl) {
            let novoStatus = '';
            if (diasVencer < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencer <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            statusEl.value = novoStatus;
            this.atualizarCorStatusDocumentacao(statusEl, novoStatus);
        }
    }
    
    // Completar com ano atual quando pressionar Tab - PGR
    completarAnoAtualDocPGR(event) {
        setTimeout(() => {
            let value = event.target.value;
            
            // Só completar se tem apenas dd/mm (5 caracteres) e não tem ano
            if (value.length === 5 && value.includes('/') && !value.includes('/', 3)) {
                const anoAtual = new Date().getFullYear();
                event.target.value = value + '/' + anoAtual;
                
                // Calcular vencimento automaticamente
                this.calcularVencimentoPGR();
                this.calcularDiasDocumentacao('pgr');
            }
        }, 10);
    }
    
    // Completar com ano atual quando pressionar Tab - PCMSO
    completarAnoAtualDocPCMSO(event) {
        setTimeout(() => {
            let value = event.target.value;
            
            // Só completar se tem apenas dd/mm (5 caracteres) e não tem ano
            if (value.length === 5 && value.includes('/') && !value.includes('/', 3)) {
                const anoAtual = new Date().getFullYear();
                event.target.value = value + '/' + anoAtual;
                
                // Calcular vencimento automaticamente
                this.calcularVencimentoPCMSO();
                this.calcularDiasDocumentacao('pcmso');
            }
        }, 10);
    }
    
    // Atualizar cor do status na documentação
    atualizarCorStatusDocumentacao(statusEl, status) {
        if (!statusEl) return;
        
        // Remover todas as classes
        statusEl.classList.remove('status-ok', 'status-renovar', 'status-vencido');
        
        // Adicionar cor baseada no status
        if (status === 'OK') {
            statusEl.style.color = '#32cd32';
            statusEl.classList.add('status-ok');
        } else if (status === 'Renovar') {
            statusEl.style.color = '#ff9500';
            statusEl.classList.add('status-renovar');
        } else if (status === 'Vencido') {
            statusEl.style.color = '#e81123';
            statusEl.classList.add('status-vencido');
        }
    }
    
    // Configurar aba NR-10 quando ativada
    setupNR10Tab() {
        // Copiar dados do ASO para NR-10 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        const asoFoto = document.getElementById('fotoPreview');
        
        const nr10Nome = document.getElementById('nr10_nome');
        const nr10Empresa = document.getElementById('nr10_empresa');
        const nr10Funcao = document.getElementById('nr10_funcao');
        const nr10Foto = document.getElementById('nr10_fotoPreview');
        const nr10Placeholder = document.getElementById('nr10_fotoPlaceholder');
        
        if (asoNome && nr10Nome) {
            nr10Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr10Empresa) {
            nr10Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr10Funcao) {
            nr10Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Copiar foto - verificar se estamos editando um registro
        if (nr10Foto && nr10Placeholder) {
            if (this.editingId && this.currentEditingData && this.currentEditingData.fotoUrl) {
                // Se estamos editando e tem foto, usar a foto do registro
                nr10Foto.src = this.currentEditingData.fotoUrl;
                nr10Foto.style.display = 'block';
                nr10Placeholder.style.display = 'none';
                console.log('Foto do registro carregada na NR-10:', this.currentEditingData.fotoUrl);
            } else if (asoFoto && asoFoto.src && asoFoto.src !== '' && asoFoto.style.display !== 'none') {
                // Senão, copiar do ASO se existir
                nr10Foto.src = asoFoto.src;
                nr10Foto.style.display = 'block';
                nr10Placeholder.style.display = 'none';
                console.log('Foto copiada do ASO para NR-10:', asoFoto.src);
            } else {
                // Se não tem foto, mostrar placeholder
                nr10Foto.style.display = 'none';
                nr10Placeholder.style.display = 'flex';
                console.log('Nenhuma foto encontrada - mostrando placeholder');
            }
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-11 quando ativada (igual ao NR-10)
    setupNR11Tab() {
        // Copiar dados do ASO para NR-11 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr11Nome = document.getElementById('nr11_nome');
        const nr11Empresa = document.getElementById('nr11_empresa');
        const nr11Funcao = document.getElementById('nr11_funcao');
        
        if (asoNome && nr11Nome) {
            nr11Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr11Empresa) {
            nr11Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr11Funcao) {
            nr11Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        console.log('setupNR11Tab - editingId:', this.editingId);
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-12 quando ativada (igual ao NR-10 e NR-11)
    setupNR12Tab() {
        // Copiar dados do ASO para NR-12 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr12Nome = document.getElementById('nr12_nome');
        const nr12Empresa = document.getElementById('nr12_empresa');
        const nr12Funcao = document.getElementById('nr12_funcao');
        
        if (asoNome && nr12Nome) {
            nr12Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr12Empresa) {
            nr12Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr12Funcao) {
            nr12Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-17 quando ativada (igual ao NR-10 e NR-11)
    setupNR17Tab() {
        // Copiar dados do ASO para NR-17 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr17Nome = document.getElementById('nr17_nome');
        const nr17Empresa = document.getElementById('nr17_empresa');
        const nr17Funcao = document.getElementById('nr17_funcao');
        
        if (asoNome && nr17Nome) {
            nr17Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr17Empresa) {
            nr17Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr17Funcao) {
            nr17Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-18 quando ativada (igual ao NR-10, NR-11 e NR-17)
    setupNR18Tab() {
        // Copiar dados do ASO para NR-18 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr18Nome = document.getElementById('nr18_nome');
        const nr18Empresa = document.getElementById('nr18_empresa');
        const nr18Funcao = document.getElementById('nr18_funcao');
        
        if (asoNome && nr18Nome) {
            nr18Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr18Empresa) {
            nr18Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr18Funcao) {
            nr18Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-33 quando ativada (igual ao NR-11)
    setupNR33Tab() {
        // Copiar dados do ASO para NR-33 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr33Nome = document.getElementById('nr33_nome');
        const nr33Empresa = document.getElementById('nr33_empresa');
        const nr33Funcao = document.getElementById('nr33_funcao');
        
        if (asoNome && nr33Nome) {
            nr33Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr33Empresa) {
            nr33Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr33Funcao) {
            nr33Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba NR-35 quando ativada (igual ao NR-11)
    setupNR35Tab() {
        // Copiar dados do ASO para NR-35 (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const nr35Nome = document.getElementById('nr35_nome');
        const nr35Empresa = document.getElementById('nr35_empresa');
        const nr35Funcao = document.getElementById('nr35_funcao');
        
        if (asoNome && nr35Nome) {
            nr35Nome.value = asoNome.options[asoNome.selectedIndex]?.text || asoNome.value || '';
        }
        
        if (asoEmpresa && nr35Empresa) {
            nr35Empresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || asoEmpresa.value || '';
        }
        
        if (asoFuncao && nr35Funcao) {
            nr35Funcao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || asoFuncao.value || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Configurar aba EPI quando ativada (igual ao NR-11)
    setupEPITab() {
        // Copiar dados do ASO para EPI (readonly)
        const asoNome = document.getElementById('nome');
        const asoEmpresa = document.getElementById('empresa');
        const asoFuncao = document.getElementById('funcao');
        
        const epiNome = document.getElementById('epi_nome');
        const epiEmpresa = document.getElementById('epi_empresa');
        const epiFuncao = document.getElementById('epi_funcao');
        
        if (asoNome && epiNome) {
            epiNome.value = asoNome.options[asoNome.selectedIndex]?.text || '';
        }
        if (asoEmpresa && epiEmpresa) {
            epiEmpresa.value = asoEmpresa.options[asoEmpresa.selectedIndex]?.text || '';
        }
        if (asoFuncao && epiFuncao) {
            epiFuncao.value = asoFuncao.options[asoFuncao.selectedIndex]?.text || '';
        }
        
        // Reconfigurar botão conforme o contexto (novo ou edição)
        this.configurarBotaoSalvar(!!this.editingId);
    }
    
    // Completar ano atual para NR-06 quando pressionar Tab
    completarAnoAtualNR06(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-10 quando pressionar Tab
    completarAnoAtualNR10(event) {
        setTimeout(() => {
            let value = event.target.value;
            
            // Só completar se tem apenas dd/mm (5 caracteres) e não tem ano
            if (value.length === 5 && value.includes('/') && !value.includes('/', 3)) {
                const anoAtual = new Date().getFullYear();
                event.target.value = value + '/' + anoAtual;
                
                // Calcular vencimento NR-10 (2 anos após emissão)
                this.calcularVencimentoNR10(event.target.value);
            }
        }, 10);
    }
    
    // Calcular vencimento NR-10 (2 anos após emissão)
    calcularVencimentoNR10(dataEmissaoStr) {
        const vencimento = document.getElementById('nr10_vencimento');
        if (!vencimento || !dataEmissaoStr) return;
        
        try {
            const [dia, mes, ano] = dataEmissaoStr.split('/');
            const dataEmissao = new Date(ano, mes - 1, dia);
            
            // Adicionar 2 anos para NR-10
            const dataVencimento = new Date(dataEmissao);
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 2);
            
            // Formatar para input date (yyyy-mm-dd)
            const vencFormatado = dataVencimento.toISOString().split('T')[0];
            vencimento.value = vencFormatado;
            
            console.log('Vencimento NR-10 calculado:', vencFormatado);
        } catch (error) {
            console.error('Erro ao calcular vencimento NR-10:', error);
        }
    }
    
    // Calcular dias e status para NR-10
    calcularNR10() {
        const dataEmissao = document.getElementById('nr10_dataEmissao');
        const vencimento = document.getElementById('nr10_vencimento');
        const diasCorridos = document.getElementById('nr10_diasCorridos');
        const diasVencer = document.getElementById('nr10_diasVencer');
        const status = document.getElementById('nr10_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 10) {
            return;
        }
        
        try {
            // Converter data de emissão
            const [dia, mes, ano] = emissaoValue.split('/');
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            const vencimentoFormatado = vencimentoDate.toISOString().split('T')[0];
            vencimento.value = vencimentoFormatado;
            vencimento.dispatchEvent(new Event('change', { bubbles: true }));
            vencimento.dispatchEvent(new Event('input', { bubbles: true }));
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasCorridos.dispatchEvent(new Event('change', { bubbles: true }));
            
            diasVencer.value = diasVencerCalc;
            diasVencer.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-10:', error);
        }
    }
    
    // Completar ano atual para NR-11 quando pressionar Tab
    completarAnoAtualNR11(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-12 quando pressionar Tab
    completarAnoAtualNR12(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-17 quando pressionar Tab
    completarAnoAtualNR17(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-18 quando pressionar Tab
    completarAnoAtualNR18(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-20 quando pressionar Tab
    completarAnoAtualNR20(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-33 quando pressionar Tab
    completarAnoAtualNR33(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-34 quando pressionar Tab
    completarAnoAtualNR34(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para NR-35 quando pressionar Tab
    completarAnoAtualNR35(event) {
        this.completarAnoGenerico(event);
    }
    
    // Completar ano atual para EPI quando pressionar Tab
    completarAnoAtualEPI(event) {
        this.completarAnoGenerico(event);
    }
    
    // Função genérica para completar ano (usada por todas as NRs)
    completarAnoGenerico(event) {
        setTimeout(() => {
            const input = event.target;
            let valor = input.value;
            
            // Só completar se tem apenas dd/mm (5 caracteres) e não tem ano
            if (valor.length === 5 && valor.includes('/') && !valor.includes('/', 3)) {
                const anoAtual = new Date().getFullYear();
                valor = valor + '/' + anoAtual;
                input.value = valor;
            }
        }, 10);
    }
    
    // Calcular dias e status para NR-11 (igual ao NR-10)
    calcularNR11() {
        const dataEmissao = document.getElementById('nr11_dataEmissao');
        const vencimento = document.getElementById('nr11_vencimento');
        const diasCorridos = document.getElementById('nr11_diasCorridos');
        const diasVencer = document.getElementById('nr11_diasVencer');
        const status = document.getElementById('nr11_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 10) {
            return;
        }
        
        try {
            // Converter data de emissão
            const [dia, mes, ano] = emissaoValue.split('/');
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            const vencimentoFormatado = vencimentoDate.toISOString().split('T')[0];
            vencimento.value = vencimentoFormatado;
            vencimento.dispatchEvent(new Event('change', { bubbles: true }));
            vencimento.dispatchEvent(new Event('input', { bubbles: true }));
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasCorridos.dispatchEvent(new Event('change', { bubbles: true }));
            
            diasVencer.value = diasVencerCalc;
            diasVencer.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-11:', error);
        }
    }
    
    // Calcular dias e status para NR-12 (igual ao NR-11)
    calcularNR12() {
        const dataEmissao = document.getElementById('nr12_dataEmissao');
        const vencimento = document.getElementById('nr12_vencimento');
        const diasCorridos = document.getElementById('nr12_diasCorridos');
        const diasVencer = document.getElementById('nr12_diasVencer');
        const status = document.getElementById('nr12_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-12:', error);
        }
    }
    
    // Calcular dias e status para NR-17 (igual ao NR-11)
    calcularNR17() {
        const dataEmissao = document.getElementById('nr17_dataEmissao');
        const vencimento = document.getElementById('nr17_vencimento');
        const diasCorridos = document.getElementById('nr17_diasCorridos');
        const diasVencer = document.getElementById('nr17_diasVencer');
        const status = document.getElementById('nr17_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-17:', error);
        }
    }
    
    // Calcular dias e status para NR-18 (igual ao NR-11 e NR-17)
    calcularNR18() {
        const dataEmissao = document.getElementById('nr18_dataEmissao');
        const vencimento = document.getElementById('nr18_vencimento');
        const diasCorridos = document.getElementById('nr18_diasCorridos');
        const diasVencer = document.getElementById('nr18_diasVencer');
        const status = document.getElementById('nr18_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-18:', error);
        }
    }
    
    // Calcular dias e status para NR-33 (igual ao NR-11)
    calcularNR33() {
        const dataEmissao = document.getElementById('nr33_dataEmissao');
        const vencimento = document.getElementById('nr33_vencimento');
        const diasCorridos = document.getElementById('nr33_diasCorridos');
        const diasVencer = document.getElementById('nr33_diasVencer');
        const status = document.getElementById('nr33_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-33:', error);
        }
    }
    
    // Calcular dias e status para NR-35 (igual ao NR-11)
    calcularNR35() {
        const dataEmissao = document.getElementById('nr35_dataEmissao');
        const vencimento = document.getElementById('nr35_vencimento');
        const diasCorridos = document.getElementById('nr35_diasCorridos');
        const diasVencer = document.getElementById('nr35_diasVencer');
        const status = document.getElementById('nr35_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-35:', error);
        }
    }
    
    // Calcular dias e status para NR-06 (vencimento 1 ano após emissão)
    calcularNR06() {
        const dataEmissao = document.getElementById('nr06_dataEmissao');
        const vencimento = document.getElementById('nr06_vencimento');
        const diasCorridos = document.getElementById('nr06_diasCorridos');
        const diasVencer = document.getElementById('nr06_diasVencer');
        const status = document.getElementById('nr06_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 10) {
            return;
        }
        
        try {
            // Converter data de emissão
            const [dia, mes, ano] = emissaoValue.split('/');
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (1 ano após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 1);
            
            // Preencher campo vencimento
            const vencimentoFormatado = vencimentoDate.toISOString().split('T')[0];
            vencimento.value = vencimentoFormatado;
            vencimento.dispatchEvent(new Event('change', { bubbles: true }));
            vencimento.dispatchEvent(new Event('input', { bubbles: true }));
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasCorridos.dispatchEvent(new Event('change', { bubbles: true }));
            
            diasVencer.value = diasVencerCalc;
            diasVencer.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-06:', error);
        }
    }
    
    // Calcular dias e status para NR-20 (vencimento 2 anos após emissão)
    calcularNR20() {
        const dataEmissao = document.getElementById('nr20_dataEmissao');
        const vencimento = document.getElementById('nr20_vencimento');
        const diasCorridos = document.getElementById('nr20_diasCorridos');
        const diasVencer = document.getElementById('nr20_diasVencer');
        const status = document.getElementById('nr20_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            const vencimentoFormatado = vencimentoDate.toISOString().split('T')[0];
            vencimento.value = vencimentoFormatado;
            vencimento.dispatchEvent(new Event('change', { bubbles: true }));
            vencimento.dispatchEvent(new Event('input', { bubbles: true }));
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasCorridos.dispatchEvent(new Event('change', { bubbles: true }));
            
            diasVencer.value = diasVencerCalc;
            diasVencer.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-20:', error);
        }
    }
    
    // Calcular dias e status para NR-34 (vencimento 2 anos após emissão)
    calcularNR34() {
        const dataEmissao = document.getElementById('nr34_dataEmissao');
        const vencimento = document.getElementById('nr34_vencimento');
        const diasCorridos = document.getElementById('nr34_diasCorridos');
        const diasVencer = document.getElementById('nr34_diasVencer');
        const status = document.getElementById('nr34_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (2 anos após emissão)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
            
            // Preencher campo vencimento
            const vencimentoFormatado = vencimentoDate.toISOString().split('T')[0];
            vencimento.value = vencimentoFormatado;
            vencimento.dispatchEvent(new Event('change', { bubbles: true }));
            vencimento.dispatchEvent(new Event('input', { bubbles: true }));
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasCorridos.dispatchEvent(new Event('change', { bubbles: true }));
            
            diasVencer.value = diasVencerCalc;
            diasVencer.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo NR-34:', error);
        }
    }
    
    // Calcular dias e status para EPI (vencimento é 4 meses após emissão)
    calcularEPI() {
        const dataEmissao = document.getElementById('epi_dataEmissao');
        const vencimento = document.getElementById('epi_vencimento');
        const diasCorridos = document.getElementById('epi_diasCorridos');
        const diasVencer = document.getElementById('epi_diasVencer');
        const status = document.getElementById('epi_status');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer || !status) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        
        if (!emissaoValue || emissaoValue.length < 6) {
            return;
        }
        
        try {
            // Converter data de emissão
            const parts = emissaoValue.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            
            if (isNaN(dataEmissaoDate.getTime())) {
                return;
            }
            
            // Calcular vencimento (4 meses após emissão para EPI)
            const vencimentoDate = new Date(dataEmissaoDate);
            vencimentoDate.setMonth(vencimentoDate.getMonth() + 4);
            
            // Preencher campo vencimento
            vencimento.value = vencimentoDate.toISOString().split('T')[0];
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Calcular status
            let novoStatus = '';
            if (diasVencerCalc < 0) {
                novoStatus = 'Vencido';
            } else if (diasVencerCalc <= 30) {
                novoStatus = 'Renovar';
            } else {
                novoStatus = 'OK';
            }
            
            status.value = novoStatus;
            this.atualizarCorStatus(status, novoStatus);
            
        } catch (error) {
            console.error('Erro no cálculo EPI:', error);
        }
    }
    
    // Preview da foto
    previewFoto(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('fotoPreview');
                const placeholder = document.getElementById('fotoPlaceholder');
                
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Remover foto
    removerFoto() {
        const preview = document.getElementById('fotoPreview');
        const placeholder = document.getElementById('fotoPlaceholder');
        const fileInput = document.getElementById('foto');
        
        // Mostrar foto padrão ao remover
        preview.src = '/FotoPadrao_Sys.png';
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        fileInput.value = '';
        
        // Marcar que a foto foi removida para salvar no banco
        this.fotoRemovida = true;
        console.log('✅ Foto marcada para remoção');
    }
    
    // Formatar data de emissão automaticamente (dd/mm/aaaa)
    // Selecionar todo o texto ao duplo clique
    selecionarTodoTexto(event) {
        event.target.select();
    }
    
    formatarDataEmissao(event) {
        let value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        
        // Se o campo está vazio, deixar vazio (permitir apagar)
        if (value.length === 0) {
            event.target.value = '';
            return;
        }
        
        // Permitir até 8 dígitos (ddmmaaaa)
        if (value.length > 8) {
            value = value.substring(0, 8);
        }
        
        // Formatar conforme o usuário digita
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        if (value.length >= 6) {
            value = value.substring(0, 5) + '/' + value.substring(5);
        }
        
        event.target.value = value;
    }
    
    // Completar com ano atual quando pressionar Tab
    completarAnoAtual(event) {
        // Aguardar um pouco para o valor estar atualizado
        setTimeout(() => {
            let value = event.target.value;
            
            // Só completar se tem apenas dd/mm (5 caracteres) e não tem ano
            if (value.length === 5 && value.includes('/') && !value.includes('/', 3)) {
                const anoAtual = new Date().getFullYear();
                event.target.value = value + '/' + anoAtual;
                
                // Calcular vencimento automaticamente (1 ano após emissão)
                this.calcularVencimentoAutomatico(event.target.value);
                this.calcularDiasEStatus();
            }
        }, 10);
    }
    
    // Calcular vencimento automaticamente (1 ano após a data de emissão)
    calcularVencimentoAutomatico(dataEmissaoStr) {
        const vencimento = document.getElementById('vencimento');
        if (!vencimento || !dataEmissaoStr) return;
        
        try {
            const parts = dataEmissaoStr.split('/');
            if (parts.length !== 3) return;
            
            let [dia, mes, ano] = parts;
            
            // Se ano tem apenas 2 dígitos, assumir 20xx
            if (ano.length === 2) {
                ano = '20' + ano;
            }
            
            // Validar se tem pelo menos 2 dígitos no ano
            if (ano.length < 2) return;
            
            const dataEmissao = new Date(ano, mes - 1, dia);
            
            // Verificar se a data é válida
            if (isNaN(dataEmissao.getTime())) return;
            
            // Adicionar 1 ano
            const dataVencimento = new Date(dataEmissao);
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
            
            // Formatar para input date (yyyy-mm-dd)
            const vencFormatado = dataVencimento.toISOString().split('T')[0];
            vencimento.value = vencFormatado;
            
            console.log('Vencimento calculado automaticamente:', vencFormatado);
        } catch (error) {
            console.error('Erro ao calcular vencimento:', error);
        }
    }
    
    // Calcular dias e status automaticamente
    calcularDiasEStatus() {
        this.calcularDias();
        this.atualizarStatus();
    }
    
    // Atualizar status automaticamente baseado nos dias a vencer
    atualizarStatus() {
        const diasVencer = document.getElementById('diasVencer');
        const status = document.getElementById('status');
        
        if (!diasVencer || !status) return;
        
        const diasVencerValue = parseInt(diasVencer.value);
        if (isNaN(diasVencerValue)) return;
        
        this.atualizarStatusPorDias(diasVencerValue);
    }
    
    // Atualizar status baseado nos dias a vencer
    atualizarStatusPorDias(diasVencer) {
        const statusSelect = document.getElementById('status');
        if (!statusSelect) return;
        
        let novoStatus = '';
        if (diasVencer < 0) {
            novoStatus = 'Vencido';
        } else if (diasVencer <= 30) {
            novoStatus = 'Renovar';
        } else {
            novoStatus = 'OK';
        }
        
        // Atualizar o select
        statusSelect.value = novoStatus;
        
        // Atualizar a classe CSS para a cor
        this.atualizarCorStatus(statusSelect, novoStatus);
        
        console.log('Status atualizado automaticamente:', novoStatus, 'Dias a vencer:', diasVencer);
    }
    
    // Função genérica para atualizar a cor de qualquer status
    atualizarCorStatus(statusElement, statusValue) {
        if (!statusElement) return;
        
        // Remover todas as classes de status
        statusElement.classList.remove('status-ok', 'status-renovar', 'status-vencido');
        
        // Adicionar a classe correta baseada no valor
        const statusLower = statusValue.toLowerCase();
        if (statusLower === 'ok') {
            statusElement.classList.add('status-ok');
        } else if (statusLower === 'renovar') {
            statusElement.classList.add('status-renovar');
        } else if (statusLower === 'vencido') {
            statusElement.classList.add('status-vencido');
        }
    }

    // Calcular dias corridos e dias a vencer automaticamente
    calcularDias() {
        const dataEmissao = document.getElementById('dataEmissao');
        const vencimento = document.getElementById('vencimento');
        const diasCorridos = document.getElementById('diasCorridos');
        const diasVencer = document.getElementById('diasVencer');
        
        if (!dataEmissao || !vencimento || !diasCorridos || !diasVencer) {
            return;
        }
        
        const emissaoValue = dataEmissao.value;
        const vencimentoValue = vencimento.value;
        
        // Se só tem data de emissão, calcular vencimento automaticamente e depois calcular dias
        if (emissaoValue && !vencimentoValue && emissaoValue.length >= 6) {
            // Tentar calcular vencimento mesmo com data parcial
            this.calcularVencimentoAutomatico(emissaoValue);
            // Aguardar um pouco para o vencimento ser preenchido e recalcular tudo
            setTimeout(() => {
                this.calcularDias();
                this.atualizarStatus(); // Atualizar status também
            }, 150);
            return;
        }
        
        if (!emissaoValue || !vencimentoValue) {
            diasCorridos.value = '';
            diasVencer.value = '';
            return;
        }
        
        try {
            let dataEmissaoDate, vencimentoDate;
            
            // Converter data de emissão (formato brasileiro dd/mm/yyyy)
            if (emissaoValue.includes('/')) {
                const parts = emissaoValue.split('/');
                if (parts.length === 3 && parts[2].length >= 2) { // Pelo menos 2 dígitos no ano
                    let [dia, mes, ano] = parts;
                    
                    // Se ano tem apenas 2 dígitos, assumir 20xx
                    if (ano.length === 2) {
                        ano = '20' + ano;
                    }
                    
                    dataEmissaoDate = new Date(ano, mes - 1, dia);
                } else {
                    return; // Data incompleta
                }
            } else {
                dataEmissaoDate = new Date(emissaoValue);
            }
            
            // Converter vencimento (formato ISO yyyy-mm-dd)
            vencimentoDate = new Date(vencimentoValue);
            
            if (isNaN(dataEmissaoDate.getTime()) || isNaN(vencimentoDate.getTime())) {
                return;
            }
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Calcular dias corridos (da emissão até hoje)
            const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
            const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
            
            // Calcular dias a vencer (de hoje até o vencimento)
            const diffHojeVencimento = vencimentoDate.getTime() - hoje.getTime();
            const diasVencerCalc = Math.ceil(diffHojeVencimento / (1000 * 60 * 60 * 24));
            
            // Preencher campos
            diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
            diasVencer.value = diasVencerCalc;
            
            // Atualizar status automaticamente baseado nos dias a vencer
            this.atualizarStatusPorDias(diasVencerCalc);
            
        } catch (error) {
            console.error('Erro no cálculo de dias:', error);
        }
    }
    
    // Calcular apenas com data de emissão (enquanto digita)
    calcularApenasComEmissao(emissaoValue) {
        const diasCorridos = document.getElementById('diasCorridos');
        
        if (!emissaoValue.includes('/') || emissaoValue.length < 8) {
            return; // Data ainda incompleta
        }
        
        try {
            const parts = emissaoValue.split('/');
            if (parts.length === 3) {
                const [dia, mes, ano] = parts;
                const dataEmissaoDate = new Date(ano, mes - 1, dia);
                
                if (!isNaN(dataEmissaoDate.getTime())) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    
                    const diffEmissaoHoje = hoje.getTime() - dataEmissaoDate.getTime();
                    const diasCorridosCalc = Math.floor(diffEmissaoHoje / (1000 * 60 * 60 * 24));
                    
                    diasCorridos.value = diasCorridosCalc >= 0 ? diasCorridosCalc : 0;
                }
            }
        } catch (error) {
            console.error('Erro no cálculo com emissão:', error);
        }
    }
    
    // Atualizar status automaticamente baseado nos dias a vencer
    atualizarStatus() {
        const diasVencer = document.getElementById('diasVencer');
        const status = document.getElementById('status');
        
        if (!diasVencer || !status || !diasVencer.value) {
            return;
        }
        
        const dias = parseInt(diasVencer.value);
        let novoStatus = '';
        
        if (dias < 0) {
            novoStatus = 'Vencido';
        } else if (dias <= 30) {
            novoStatus = 'Renovar';
        } else {
            novoStatus = 'OK';
        }
        
        // Atualizar o select de status
        status.value = novoStatus;
        
        // Aplicar cor visual no campo
        status.className = 'status-' + novoStatus.toLowerCase();
        
        console.log('Status atualizado para:', novoStatus, 'baseado em', dias, 'dias');
    }

    // Controlar botão Status (Ativo/Cancelado)
    async toggleStatus() {
        const btnStatus = document.getElementById('btnStatus');
        const statusText = document.querySelector('.status-text');
        const dataInativacao = document.getElementById('dataInativacao');
        const isCancelado = btnStatus.classList.contains('cancelado');
        
        // Verificar se estamos editando um registro
        if (!this.editingId) {
            this.showToast('Selecione um registro para alterar o status', 'warning');
            return;
        }
        
        // Determinar a ação
        const action = isCancelado ? 'ativar' : 'cancelar';
        const message = `Tem certeza que deseja ${action} este funcionário?`;
        
        // Mostrar confirmação
        if (confirm(message)) {
            try {
                let novaSituacao, novaDataInativacao = null;
                
                if (isCancelado) {
                    // Ativar funcionário
                    novaSituacao = 'S';
                    btnStatus.classList.remove('cancelado');
                    btnStatus.classList.add('ativo');
                    statusText.textContent = 'Ativo';
                    dataInativacao.value = ''; // Limpar data de inativação
                } else {
                    // Cancelar funcionário
                    novaSituacao = 'N';
                    btnStatus.classList.remove('ativo');
                    btnStatus.classList.add('cancelado');
                    statusText.textContent = 'Cancelado';
                    // Definir data de inativação como hoje
                    const hoje = new Date();
                    novaDataInativacao = hoje.toISOString();
                    const dataFormatada = hoje.toLocaleDateString('pt-BR');
                    dataInativacao.value = dataFormatada;
                }
                
                // Salvar no banco via API
                const response = await fetch(`/api/ssma/${this.editingId}/toggle-situacao`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        situacao: novaSituacao,
                        dataInativacao: novaDataInativacao
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    this.showToast(`Funcionário ${isCancelado ? 'ativado' : 'cancelado'} com sucesso!`, 'success');
                    
                    // Atualizar a tabela automaticamente
                    setTimeout(() => {
                        this.loadData();
                    }, 500);
                } else {
                    throw new Error(result.error || 'Erro ao alterar status');
                }
                
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                this.showToast('Erro ao alterar status: ' + error.message, 'error');
                
                // Reverter mudanças visuais em caso de erro
                if (isCancelado) {
                    btnStatus.classList.add('cancelado');
                    btnStatus.classList.remove('ativo');
                    statusText.textContent = 'Cancelado';
                } else {
                    btnStatus.classList.add('ativo');
                    btnStatus.classList.remove('cancelado');
                    statusText.textContent = 'Ativo';
                    dataInativacao.value = '';
                }
            }
        }
    }

    // Funções específicas para Fornecedor
    novoFornecedor() {
        // Limpar todos os campos do fornecedor
        const empresaField = document.getElementById('fornecedor_empresa');
        const cnpjField = document.getElementById('fornecedor_cnpj');
        
        if (empresaField) empresaField.value = '';
        if (cnpjField) cnpjField.value = '';
        
        document.getElementById('fornecedor_telefone').value = '';
        document.getElementById('fornecedor_celular').value = '';
        document.getElementById('fornecedor_contato').value = '';
        document.getElementById('fornecedor_observacao').value = '';
        
        // Resetar ID de edição
        this.editingFornecedorId = null;
        
        // Limpar seleção da tabela
        this.clearFornecedorSelection();
        
        // Resetar botão para "Salvar"
        const btnSalvar = document.getElementById('btnSalvarFornecedor');
        if (btnSalvar) {
            btnSalvar.textContent = 'Salvar';
            btnSalvar.onclick = () => this.salvarFornecedor();
        }
        
        // Dar foco no primeiro campo
        setTimeout(() => {
            if (empresaField) empresaField.focus();
        }, 100);
        
        this.showToast('Novo fornecedor iniciado', 'success');
    }
    
    async salvarFornecedor() {
        console.log('=== SALVANDO FORNECEDOR ===');
        
        const empresaField = document.getElementById('fornecedor_empresa');
        const cnpjField = document.getElementById('fornecedor_cnpj');
        
        if (!empresaField || !cnpjField) {
            console.error('Campos não encontrados!');
            this.showToast('Erro: campos não encontrados', 'error');
            return;
        }
        
        const empresa = empresaField.value.trim();
        const cnpj = cnpjField.value.trim();
        
        const telefone = document.getElementById('fornecedor_telefone').value.trim();
        const celular = document.getElementById('fornecedor_celular').value.trim();
        const contato = document.getElementById('fornecedor_contato').value.trim();
        const observacao = document.getElementById('fornecedor_observacao').value.trim();
        
        console.log('Empresa:', empresa);
        console.log('CNPJ:', cnpj);
        console.log('Telefone:', telefone);
        console.log('Celular:', celular);
        console.log('Contato:', contato);
        
        // Validação
        if (!empresa) {
            console.error('Empresa vazia!');
            this.showToast('Empresa é obrigatória', 'error');
            empresaField.focus();
            return;
        }
        
        const fornecedorData = {
            empresa,
            cnpj,
            telefone,
            celular,
            contato,
            observacao
        };
        
        console.log('Dados a enviar:', fornecedorData);
        
        try {
            const response = await fetch('/api/fornecedores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fornecedorData)
            });
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Resultado:', result);
                this.showToast('Fornecedor criado com sucesso!', 'success');
                
                // Recarregar grid de fornecedores
                await this.carregarGridFornecedores();
                
                // Recarregar dropdowns
                await this.carregarDropdownsFornecedor();
                
                // Limpar formulário após salvar
                this.novoFornecedor();
                
            } else {
                const error = await response.json();
                console.error('Erro na resposta:', error);
                this.showToast(`Erro ao salvar fornecedor: ${error.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Erro ao salvar fornecedor:', error);
            this.showToast('Erro ao salvar fornecedor: ' + error.message, 'error');
        }
    }
    
    async alterarFornecedor() {
        const empresaField = document.getElementById('fornecedor_empresa');
        const cnpjField = document.getElementById('fornecedor_cnpj');
        
        const id = this.editingFornecedorId;
        if (!id) {
            this.showToast('ID do fornecedor não encontrado', 'error');
            return;
        }
        
        const empresa = empresaField.value.trim();
        const cnpj = cnpjField.value.trim();
        
        const telefone = document.getElementById('fornecedor_telefone').value.trim();
        const celular = document.getElementById('fornecedor_celular').value.trim();
        const contato = document.getElementById('fornecedor_contato').value.trim();
        const observacao = document.getElementById('fornecedor_observacao').value.trim();
        
        // Validação
        if (!empresa) {
            this.showToast('Empresa é obrigatória', 'error');
            empresaField.focus();
            return;
        }
        
        const fornecedorData = {
            empresa,
            cnpj,
            telefone,
            celular,
            contato,
            observacao
        };
        
        console.log('Alterando fornecedor:', fornecedorData);
        
        try {
            const response = await fetch(`/api/fornecedores/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fornecedorData)
            });
            
            if (response.ok) {
                this.showToast('Fornecedor alterado com sucesso!', 'success');
                
                // Recarregar grid de fornecedores
                await this.carregarGridFornecedores();
                
                // Recarregar dropdowns
                await this.carregarDropdownsFornecedor();
                
                // Limpar formulário após alterar
                this.novoFornecedor();
                
            } else {
                const error = await response.json();
                this.showToast(`Erro ao alterar fornecedor: ${error.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Erro ao alterar fornecedor:', error);
            this.showToast('Erro ao alterar fornecedor: ' + error.message, 'error');
        }
    }
    
    formatarDataBreve(data) {
        if (!data) return '';
        // Se for string no formato YYYY-MM-DD HH:MM:SS ou ISO
        if (typeof data === 'string') {
            // Trata formato ISO (2025-12-12T18:19:27.814Z)
            if (data.includes('T')) {
                const partes = data.split('T')[0].split('-');
                if (partes.length === 3) {
                    const ano = partes[0].slice(-2);
                    const mes = partes[1];
                    const dia = partes[2];
                    return `${dia}/${mes}/${ano}`;
                }
            }
            // Trata formato YYYY-MM-DD HH:MM:SS
            const partes = data.split(' ')[0].split('-');
            if (partes.length === 3) {
                const ano = partes[0].slice(-2);
                const mes = partes[1];
                const dia = partes[2];
                return `${dia}/${mes}/${ano}`;
            }
        }
        return data;
    }

    async carregarDropdownsFornecedor() {
        // Função mantida para compatibilidade, mas não faz nada
        // Os campos agora são inputs de texto, não selects
    }
    
    alternarFiltroSituacao(mostrarAtivos) {
        // Atualizar texto do toggle
        const textoFiltro = document.getElementById('texto-filtro-situacao');
        if (textoFiltro) {
            textoFiltro.textContent = mostrarAtivos ? 'Ativos' : 'Inativos';
        }
        
        // Armazenar o estado do filtro
        this.filtroMostrarApenasAtivos = mostrarAtivos;
        this.filtroMostrarApenasInativos = !mostrarAtivos;
        
        // Recarregar grid com o novo filtro
        this.carregarGridFornecedores();
    }
    
    selecionarFornecedor(id) {
        // Remover seleção anterior
        document.querySelectorAll('#fornecedorGridBody .grid-row').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Selecionar nova linha
        const row = document.querySelector(`#fornecedorGridBody .grid-row[data-id="${id}"]`);
        if (row) {
            row.classList.add('selected');
        }
        
        // Carregar dados do fornecedor para edição
        this.editarFornecedor(id);
    }
    
    clearFornecedorSelection() {
        document.querySelectorAll('#fornecedorGridBody .grid-row').forEach(row => {
            row.classList.remove('selected');
        });
    }
    
    async editarFornecedor(id) {
        try {
            const response = await fetch(`/api/fornecedores/${id}`);
            if (response.ok) {
                const fornecedor = await response.json();
                
                // Preencher campos
                const empresaField = document.getElementById('fornecedor_empresa');
                const cnpjField = document.getElementById('fornecedor_cnpj');
                
                if (empresaField) {
                    empresaField.value = fornecedor.Empresa || '';
                }
                
                if (cnpjField) {
                    cnpjField.value = fornecedor.CNPJ || '';
                }
                
                document.getElementById('fornecedor_telefone').value = fornecedor.Telefone || '';
                document.getElementById('fornecedor_celular').value = fornecedor.Celular || '';
                document.getElementById('fornecedor_contato').value = fornecedor.Contato || '';
                document.getElementById('fornecedor_observacao').value = fornecedor.Observacao || '';
                
                // Marcar como editando
                this.editingFornecedorId = id;
                
                // Mudar botão para "Alterar"
                const btnSalvar = document.getElementById('btnSalvarFornecedor');
                if (btnSalvar) {
                    btnSalvar.textContent = 'Alterar';
                    btnSalvar.onclick = () => this.alterarFornecedor();
                }
                
            } else {
                this.showToast('Erro ao carregar fornecedor', 'error');
            }
        } catch (error) {
            console.error('Erro ao editar fornecedor:', error);
            this.showToast('Erro ao carregar fornecedor: ' + error.message, 'error');
        }
    }
    
    async excluirFornecedor(id) {
        if (!confirm('Tem certeza que deseja excluir este fornecedor?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/fornecedores/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Fornecedor excluído com sucesso!', 'success');
                await this.carregarGridFornecedores();
                await this.carregarDropdownsFornecedor();
                this.novoFornecedor();
            } else {
                const error = await response.json();
                this.showToast(`Erro ao excluir fornecedor: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir fornecedor:', error);
            this.showToast('Erro ao excluir fornecedor: ' + error.message, 'error');
        }
    }
    
    async toggleFornecedorSituacao(id, isAtivo) {
        console.log(`Toggle fornecedor ${id}, isAtivo: ${isAtivo}`);
        
        try {
            const payload = {
                Situacao: isAtivo ? 'S' : 'N'
            };
            
            console.log('Enviando payload:', payload);
            
            const response = await fetch(`/api/fornecedores/${id}/toggle-situacao`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                // Recarregar grid para refletir a mudança
                await this.carregarGridFornecedores();
                this.showToast(`Fornecedor ${isAtivo ? 'ativado' : 'inativado'} com sucesso!`, 'success');
            } else {
                const error = await response.json();
                console.error('Erro na resposta:', error);
                this.showToast(`Erro ao alterar situação: ${error.error}`, 'error');
                // Reverter o toggle
                await this.carregarGridFornecedores();
            }
        } catch (error) {
            console.error('Erro ao alterar situação do fornecedor:', error);
            this.showToast('Erro ao alterar situação: ' + error.message, 'error');
            // Reverter o toggle
            await this.carregarGridFornecedores();
        }
    }
    
    
    buscarFornecedor() {
        const buscaEmpresa = document.getElementById('busca_empresa')?.value.toLowerCase() || '';
        const buscaCnpj = document.getElementById('busca_cnpj')?.value.toLowerCase() || '';
        
        const rows = document.querySelectorAll('#fornecedorGridBody .grid-row[data-id]');
        let localizados = 0;
        
        rows.forEach(row => {
            const empresa = row.children[0].textContent.toLowerCase();
            const cnpj = row.children[1].textContent.toLowerCase();
            
            const matchEmpresa = !buscaEmpresa || empresa.includes(buscaEmpresa);
            const matchCnpj = !buscaCnpj || cnpj.includes(buscaCnpj);
            
            if (matchEmpresa && matchCnpj) {
                row.style.display = 'flex';
                localizados++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Atualizar apenas o contador de LOCALIZADOS (visíveis no grid)
        this.atualizarLocalizadosNoGrid();
    }
    
    mostrarBuscaEmpresa() {
        const inputEmpresa = document.getElementById('busca_empresa');
        const inputCnpj = document.getElementById('busca_cnpj');
        
        if (inputEmpresa) inputEmpresa.style.display = 'block';
        if (inputCnpj) inputCnpj.style.display = 'none';
        
        // Limpar busca por CNPJ
        if (inputCnpj) inputCnpj.value = '';
        
        // Atualizar botões
        document.querySelectorAll('.search-tabs .tab-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === 0);
        });
        
        this.buscarFornecedor();
    }
    
    mostrarBuscaCNPJ() {
        const inputEmpresa = document.getElementById('busca_empresa');
        const inputCnpj = document.getElementById('busca_cnpj');
        
        if (inputEmpresa) inputEmpresa.style.display = 'none';
        if (inputCnpj) inputCnpj.style.display = 'block';
        
        // Limpar busca por Empresa
        if (inputEmpresa) inputEmpresa.value = '';
        
        // Atualizar botões
        document.querySelectorAll('.search-tabs .tab-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === 1);
        });
        
        this.buscarFornecedor();
    }
    
    // Capitalizar nome (primeira letra de cada palavra maiúscula) em tempo real
    capitalizarNome(input) {
        const cursorPos = input.selectionStart;
        let value = input.value;
        
        // Converter para minúsculas primeiro
        value = value.toLowerCase();
        
        // Capitalizar primeira letra de cada palavra (funciona com acentos)
        value = value.replace(/(?:^|\s)\S/g, char => char.toUpperCase());
        
        input.value = value;
        
        // Manter posição do cursor
        input.setSelectionRange(cursorPos, cursorPos);
    }
    
    // Formatação automática de CNPJ
    formatarCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length <= 14) {
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        input.value = value;
    }
    
    // Formatação automática de telefone
    formatarTelefone(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length <= 10) {
            // Telefone fixo: (11) 0000-0000
            value = value.replace(/^(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            // Celular: (11) 90000-0000
            value = value.replace(/^(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        input.value = value;
    }

    // UI Helpers
    // Configurar duplo clique em todos os campos editáveis
    configurarDuploClique() {
        // Selecionar todos os inputs e textareas
        const campos = document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], textarea');
        campos.forEach(campo => {
            // Remover listener anterior se existir
            campo.removeEventListener('dblclick', this.selecionarTodoTexto.bind(this));
            // Adicionar novo listener
            campo.addEventListener('dblclick', (e) => this.selecionarTodoTexto(e));
        });
    }
    
    showModal(modalId, skipReset = false) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Iniciar com opacidade 0 para fade-in suave
            modal.style.opacity = '0';
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Aplicar fade-in após um frame para garantir que display:block foi aplicado
            requestAnimationFrame(() => {
                modal.style.transition = 'opacity 0.2s ease-in';
                modal.style.opacity = '1';
            });
            
            // Resetar para primeira aba habilitada quando abrir o modal (exceto se for fornecedor)
            if (modalId === 'modalForm' && !skipReset) {
                // Garantir que a aba "Cursos" está ativa
                this.switchMainTab('cursos');
                
                // Atualizar visibilidade das abas NR baseado nas configurações
                // Isso já vai ativar a primeira aba habilitada
                this.atualizarAbasNRFormulario();
                
                // Configurar duplo clique em todos os campos
                setTimeout(() => {
                    this.configurarDuploClique();
                }, 50);
                
                // Se não está editando, configurar como novo cadastro
                if (!this.editingId) {
                    this.configurarBotaoSalvar(false);
                    
                    // Focar no campo Nome após abrir o modal
                    setTimeout(() => {
                        const campoNome = document.getElementById('nome');
                        if (campoNome) campoNome.focus();
                        
                        // Selecionar "Sim" no radio button Ambientação por padrão
                        const ambSim = document.getElementById('ambSim');
                        if (ambSim) ambSim.checked = true;
                    }, 100);
                }
            }
        }
    }
    
    // Atualizar visibilidade das abas NR no formulário baseado nas configurações de habilitação
    async atualizarAbasNRFormulario() {
        try {
            // Buscar configuração atualizada (não usar cache para garantir dados frescos)
            const response = await fetch('/api/habilitar-cursos');
            if (!response.ok) return;
            const cursos = await response.json();
            this.cursosHabilitadosCache = cursos;
            
            // Mapeamento de curso para data-nr da aba (incluindo ASO)
            const mapeamento = {
                'ASO': 'aso',
                'NR-06': 'nr06',
                'NR-10': 'nr10',
                'NR-11': 'nr11',
                'NR-12': 'nr12',
                'NR-17': 'nr17',
                'NR-18': 'nr18',
                'NR-20': 'nr20',
                'NR-33': 'nr33',
                'NR-34': 'nr34',
                'NR-35': 'nr35',
                'EPI': 'epi'
            };
            
            // PRIMEIRO: Ocultar TODAS as abas e conteúdos
            document.querySelectorAll('.nr-tab').forEach(tab => {
                tab.style.display = 'none';
                tab.classList.remove('active');
            });
            
            document.querySelectorAll('.nr-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // SEGUNDO: Mostrar apenas as abas habilitadas e encontrar a primeira
            let primeiraAbaHabilitada = null;
            
            cursos.forEach(curso => {
                const nomeCurso = curso.nome || curso.curso;
                const dataNr = mapeamento[nomeCurso];
                
                if (dataNr && curso.habilitado === 1) {
                    // Mostrar a aba
                    const tab = document.querySelector(`.nr-tab[data-nr="${dataNr}"]`);
                    if (tab) {
                        tab.style.display = '';
                        
                        // Guardar a primeira aba habilitada
                        if (!primeiraAbaHabilitada) {
                            primeiraAbaHabilitada = dataNr;
                        }
                    }
                }
            });
            
            // TERCEIRO: Ativar a primeira aba habilitada
            if (primeiraAbaHabilitada) {
                const tab = document.querySelector(`.nr-tab[data-nr="${primeiraAbaHabilitada}"]`);
                const content = document.getElementById(`content-${primeiraAbaHabilitada}`);
                
                if (tab) {
                    tab.classList.add('active');
                }
                
                if (content) {
                    content.classList.add('active');
                    content.style.display = 'flex';
                }
            }
            
        } catch (error) {
            console.error('Erro ao atualizar abas NR:', error);
        }
    }
    
    // Ir para a primeira aba habilitada
    irParaPrimeiraAbaHabilitada() {
        const primeiraHabilitada = document.querySelector('.nr-tab:not([style*="display: none"])');
        if (primeiraHabilitada) {
            const nrType = primeiraHabilitada.dataset.nr;
            this.switchNRTab(nrType);
        }
    }
    
    fecharModals() {
        // Limpar seleção e resetar estado de edição
        this.selectedRows.clear();
        this.editingId = null;
        this.currentEditingData = null;
        
        // Fechar modais com transição suave para evitar tremor
        const modals = document.querySelectorAll('.modal');
        
        // Aplicar transição e fade-out
        modals.forEach(modal => {
            modal.style.transition = 'opacity 0.2s ease-out';
            modal.style.opacity = '0';
        });
        
        // Aguardar transição completar antes de ocultar completamente
        setTimeout(() => {
            modals.forEach(modal => {
                modal.style.display = 'none';
                modal.style.opacity = '1'; // Resetar para próxima abertura
                modal.style.transition = '';
            });
            document.body.style.overflow = 'auto';
        }, 200);
    }
    
    showToast(message, type = 'success') {
        // NÃO MOSTRAR mensagens de sucesso, apenas erros e avisos
        if (type === 'success') {
            console.log('✅', message); // Apenas log no console
            return;
        }
        
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'flex';
            
            // Auto hide após 10 segundos (aumentado para dar mais tempo de leitura)
            setTimeout(() => {
                this.hideToast();
            }, 10000);
        }
    }
    
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'none';
        }
    }
    
    mostrarImagemDuplicata(imagemUrl, mensagem) {
        // Criar modal com só a imagem
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            max-width: 500px;
        `;
        
        const img = document.createElement('img');
        img.src = imagemUrl;
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            margin-bottom: 15px;
            cursor: pointer;
        `;
        
        const texto = document.createElement('p');
        texto.textContent = mensagem;
        texto.style.cssText = `
            font-size: 13px;
            color: #666;
            margin: 0;
            line-height: 1.5;
        `;
        
        // Fechar ao clicar na imagem ou fora
        img.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        container.appendChild(img);
        container.appendChild(texto);
        modal.appendChild(container);
        document.body.appendChild(modal);
        
        // Auto fechar após 5 segundos
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 5000);
    }
    
    mostrarZoomFoto(fotoUrl) {
        // Criar modal com zoom da foto
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            cursor: pointer;
            border-radius: 5px;
        `;
        
        // Fechar ao clicar na imagem ou fora
        img.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        modal.appendChild(img);
        document.body.appendChild(modal);
    }
    
    // Abrir modal de configuração do relatório
    async abrirConfiguracaoRelatorio() {
        try {
            const response = await fetch('/api/configuracao-relatorio');
            if (response.ok) {
                const config = await response.json();
                document.getElementById('configTitulo').value = config?.titulo || '';
                document.getElementById('previewTitulo').textContent = config?.titulo || 'Título do Relatório';
                
                // Carregar logo
                const logoUrl = config?.logo || '/Logo-Hoss.jpg';
                document.getElementById('previewLogo').src = logoUrl;
                document.getElementById('previewLogoHeader').src = logoUrl;
                this.logoAtual = logoUrl;
            }
            
            document.getElementById('modalConfiguracao').style.display = 'flex';
            
            // Atualizar prévia enquanto digita
            document.getElementById('configTitulo').addEventListener('input', (e) => {
                document.getElementById('previewTitulo').textContent = e.target.value || 'Título do Relatório';
            });
            
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            this.showToast('Erro ao carregar configuração', 'error');
        }
    }
    
    // Preview do logo selecionado
    previewLogoConfig(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('previewLogo').src = e.target.result;
                document.getElementById('previewLogoHeader').src = e.target.result;
                this.logoBase64 = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }
    
    // Fechar modal de configuração
    fecharConfiguracao() {
        document.getElementById('modalConfiguracao').style.display = 'none';
        this.logoBase64 = null;
    }
    
    // Salvar configuração do relatório
    async salvarConfiguracao() {
        const titulo = document.getElementById('configTitulo').value.trim();
        const logo = this.logoBase64 || this.logoAtual || '/Logo-Hoss.jpg';
        
        try {
            const response = await fetch('/api/configuracao-relatorio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    titulo: titulo || 'Relatório de Cursos',
                    rodape: 'SSMA',
                    logo: logo
                })
            });
            
            if (response.ok) {
                this.showToast('Configuração salva com sucesso!', 'success');
                this.fecharConfiguracao();
            } else {
                this.showToast('Erro ao salvar configuração', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            this.showToast('Erro ao salvar configuração', 'error');
        }
    }
    
    showLoading() {
        const tbody = document.getElementById('tabelaBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="15" class="loading-cell">
                        <div class="loading-spinner">🔄</div>
                        <span>Carregando dados...</span>
                    </td>
                </tr>
            `;
        }
        
        // Loading para mobile
        let container = document.getElementById('mobileCardsContainer');
        if (container) {
            container.innerHTML = `
                <div class="mobile-loading">
                    <div class="mobile-loading-spinner">🔄</div>
                    <div class="mobile-loading-text">Carregando dados...</div>
                </div>
            `;
        }
    }

    async exportarFornecedores() {
        try {
            // Obter tipo de exportação selecionado
            const exportType = document.querySelector('input[name="export-type"]:checked')?.value || 'excel';
            
            // Obter dados dos fornecedores
            const response = await fetch('/api/fornecedores');
            if (!response.ok) {
                this.showToast('Erro ao carregar fornecedores', 'error');
                return;
            }
            
            const fornecedores = await response.json();
            
            if (fornecedores.length === 0) {
                this.showToast('Nenhum fornecedor para exportar', 'warning');
                return;
            }
            
            if (exportType === 'excel') {
                this.exportarParaExcel(fornecedores);
            } else if (exportType === 'pdf') {
                this.exportarParaPDF(fornecedores);
            }
            
            this.showToast(`Exportação para ${exportType.toUpperCase()} realizada com sucesso!`, 'success');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.showToast('Erro ao exportar: ' + error.message, 'error');
        }
    }

    exportarParaExcel(fornecedores) {
        // Criar CSV
        let csv = 'Empresa,CNPJ,Telefone,Celular,Contato,Observação,Data do Cadastro,Data da Inativação,Situação\n';
        
        fornecedores.forEach(f => {
            const empresa = this.escaparCSV(f.Empresa);
            const cnpj = this.escaparCSV(f.CNPJ);
            const telefone = this.escaparCSV(f.Telefone);
            const celular = this.escaparCSV(f.Celular);
            const contato = this.escaparCSV(f.Contato);
            const observacao = this.escaparCSV(f.Observacao);
            const dataCadastro = f.DataCadastro ? new Date(f.DataCadastro).toLocaleDateString('pt-BR') : '';
            const dataInativacao = f.DataInativacao ? new Date(f.DataInativacao).toLocaleDateString('pt-BR') : '';
            const situacao = f.Situacao === 'N' ? 'Ativo' : 'Inativo';
            
            csv += `${empresa},${cnpj},${telefone},${celular},${contato},${observacao},${dataCadastro},${dataInativacao},${situacao}\n`;
        });
        
        // Criar blob e download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `fornecedores_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportarParaPDF(fornecedores) {
        // Criar HTML para PDF
        let html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { text-align: center; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #4a90e2; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
                    td { padding: 8px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .ativo { color: green; font-weight: bold; }
                    .inativo { color: red; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Relatório de Fornecedores</h1>
                <p>Data de Geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>CNPJ</th>
                            <th>Telefone</th>
                            <th>Celular</th>
                            <th>Contato</th>
                            <th>Observação</th>
                            <th>Data do Cadastro</th>
                            <th>Situação</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        fornecedores.forEach(f => {
            const dataCadastro = f.DataCadastro ? new Date(f.DataCadastro).toLocaleDateString('pt-BR') : '';
            const situacao = f.Situacao === 'N' ? 'Ativo' : 'Inativo';
            const situacaoClass = f.Situacao === 'N' ? 'ativo' : 'inativo';
            
            html += `
                <tr>
                    <td>${f.Empresa}</td>
                    <td>${f.CNPJ}</td>
                    <td>${f.Telefone}</td>
                    <td>${f.Celular}</td>
                    <td>${f.Contato}</td>
                    <td>${f.Observacao}</td>
                    <td>${dataCadastro}</td>
                    <td class="${situacaoClass}">${situacao}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        // Abrir em nova aba para impressão
        const newWindow = window.open('', '', 'width=800,height=600');
        newWindow.document.write(html);
        newWindow.document.close();
        
        // Aguardar um pouco e depois imprimir
        setTimeout(() => {
            newWindow.print();
        }, 250);
    }

    escaparCSV(valor) {
        if (!valor) return '';
        valor = valor.toString();
        if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
            return `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
    }

    // Navegação do formulário com TAB - REGRA SUPREMA
    navegarFormulario(event, campoAtual, proximoCampo) {
        // Se não for TAB, não fazer nada
        if (event.key !== 'Tab') return;
        
        event.preventDefault();
        
        // Descobrir qual aba está ativa atualmente
        const abaAtiva = document.querySelector('.nr-tab.active');
        const abaAtualNr = abaAtiva ? abaAtiva.dataset.nr : 'aso';
        
        // REGRA PARA ABA ASO
        if (abaAtualNr === 'aso') {
            // Fluxo: Nome -> Empresa -> Função -> Data Emissão -> Imagem -> Anotações -> Próxima aba
            if (campoAtual === 'nome') {
                document.getElementById('empresa')?.focus();
                return;
            }
            if (campoAtual === 'empresa') {
                document.getElementById('funcao')?.focus();
                return;
            }
            if (campoAtual === 'funcao') {
                document.getElementById('dataEmissao')?.focus();
                return;
            }
            if (campoAtual === 'dataEmissao') {
                // Ir para botão de imagem e focar nele
                const btnImagem = document.getElementById('btnImagem');
                if (btnImagem) {
                    btnImagem.focus();
                }
                return;
            }
            if (campoAtual === 'btnImagem') {
                // Do botão Imagem, ir para Anotações
                const anotacoes = document.getElementById('anotacoes');
                if (anotacoes) {
                    anotacoes.focus();
                }
                return;
            }
            if (campoAtual === 'anotacoes') {
                // Ir para próxima aba habilitada
                this.irParaProximaAbaHabilitada();
                return;
            }
        }
        
        // REGRA PARA ABA NR-12 (tem campo Ferramenta)
        if (abaAtualNr === 'nr12') {
            if (campoAtual === 'nr12_dataEmissao') {
                // Ir para campo Ferramenta
                const campoFerramenta = document.getElementById('nr12_ferramenta') || document.getElementById('nr12_ferramentas');
                if (campoFerramenta) {
                    campoFerramenta.focus();
                    return;
                }
            }
            if (campoAtual === 'nr12_ferramenta' || campoAtual === 'nr12_ferramentas') {
                // Ir para próxima aba
                this.irParaProximaAbaHabilitada();
                return;
            }
        }
        
        // REGRA PARA ABA EPI (última aba - volta para ASO)
        if (abaAtualNr === 'epi') {
            // Após EPI, volta para ASO mas sem foco (usuário decide onde clicar)
            this.switchNRTab('aso');
            return;
        }
        
        // REGRA PADRÃO PARA OUTRAS ABAS (NR-06, NR-10, NR-11, NR-17, NR-18, NR-20, NR-33, NR-34, NR-35)
        // Após data de emissão, vai para próxima aba
        this.irParaProximaAbaHabilitada();
    }
    
    // Ir para próxima aba habilitada
    irParaProximaAbaHabilitada() {
        // Obter lista de abas habilitadas (visíveis)
        const abasHabilitadas = Array.from(document.querySelectorAll('.nr-tab'))
            .filter(tab => tab.style.display !== 'none')
            .map(tab => tab.dataset.nr);
        
        if (abasHabilitadas.length <= 1) return;
        
        // Descobrir qual aba está ativa
        const abaAtiva = document.querySelector('.nr-tab.active');
        const abaAtualNr = abaAtiva ? abaAtiva.dataset.nr : abasHabilitadas[0];
        
        // Encontrar índice da aba atual
        const indiceAtual = abasHabilitadas.indexOf(abaAtualNr);
        
        // Calcular próxima aba
        const proximoIndice = (indiceAtual + 1) % abasHabilitadas.length;
        const proximaAbaNr = abasHabilitadas[proximoIndice];
        
        // Mudar para a próxima aba
        this.switchNRTab(proximaAbaNr);
        
        // Focar no campo de data de emissão da próxima aba
        setTimeout(() => {
            const campoFoco = this.getCampoFocoPorAba(proximaAbaNr);
            if (campoFoco) {
                campoFoco.focus();
                campoFoco.select();
            }
        }, 100);
    }
    
    // Retorna o campo de foco principal de cada aba
    getCampoFocoPorAba(aba) {
        // REGRA: Em TODAS as abas NR e EPI, o foco vai DIRETO para Data Emissão
        // Os campos Nome, Empresa, Função são readonly e NÃO recebem foco
        const mapeamento = {
            'aso': 'nome', // ASO foca no Nome (primeiro campo editável)
            'nr06': 'nr06_dataEmissao',
            'nr10': 'nr10_dataEmissao',
            'nr11': 'nr11_dataEmissao',
            'nr12': 'nr12_dataEmissao',
            'nr17': 'nr17_dataEmissao',
            'nr18': 'nr18_dataEmissao',
            'nr20': 'nr20_dataEmissao',
            'nr33': 'nr33_dataEmissao',
            'nr34': 'nr34_dataEmissao',
            'nr35': 'nr35_dataEmissao',
            'epi': 'epi_dataEmissao'
        };
        
        const campoId = mapeamento[aba];
        return campoId ? document.getElementById(campoId) : null;
    }
    
    // Callback quando foto é selecionada - foca no campo anotações
    onFotoSelecionada() {
        setTimeout(() => {
            const anotacoes = document.getElementById('anotacoes');
            if (anotacoes) {
                anotacoes.focus();
            }
        }, 300);
    }

    calcularStatusCurso(dataVencimento, tipoCurso = 'ASO') {
        if (!dataVencimento) return 'NaoInformado';
        
        const hoje = new Date();
        const vencimento = new Date(dataVencimento);
        
        // Calcular diferença em dias
        const diffTime = vencimento - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Se venceu (passou da data)
        if (diffDays < 0) return 'Vencido';
        
        // Regra especial para EPI (5 dias em vez de 30)
        if (tipoCurso === 'EPI') {
            if (diffDays <= 5) return 'Renovar';
        } else {
            // Para todos os outros cursos (30 dias)
            if (diffDays <= 30) return 'Renovar';
        }
        
        // Se está dentro do vencimento (OK)
        return 'OK';
    }

    atualizarContadoresASO(dados) {
        if (this.modalHabilitarAberta) return;
        
        // Buscar contadores de TODOS os registros filtrados (não só da página atual)
        this.buscarContadoresGlobais();
    }
    
    // Buscar contadores de vencimentos de TODOS os registros (todas as páginas)
    async buscarContadoresGlobais() {
        try {
            // Pegar filtros atuais (incluindo datas)
            const filtroNome = document.getElementById('filtroNome')?.value || '';
            const filtroEmpresa = document.getElementById('filtroEmpresa')?.value || '';
            const filtroFuncao = document.getElementById('filtroFuncao')?.value || '';
            const chkAtivo = document.getElementById('chkAtivo');
            const situacao = chkAtivo?.checked ? 'N' : 'S';
            
            // Incluir filtros de data
            const dataInicio = document.getElementById('dataInicio')?.value || '';
            const dataFim = document.getElementById('dataFim')?.value || '';
            
            const params = new URLSearchParams();
            if (filtroNome) params.append('nome', filtroNome);
            if (filtroEmpresa) params.append('empresa', filtroEmpresa);
            if (filtroFuncao) params.append('funcao', filtroFuncao);
            params.append('situacao', situacao);
            
            // Converter datas para formato do banco
            const converterParaBanco = (dataStr) => {
                if (!dataStr || dataStr.length < 10) return null;
                const partes = dataStr.split('/');
                if (partes.length !== 3) return null;
                return `${partes[2]}-${partes[1]}-${partes[0]}`;
            };
            
            if (dataInicio && dataInicio.length === 10) {
                params.append('dataInicio', converterParaBanco(dataInicio));
            }
            if (dataFim && dataFim.length === 10) {
                params.append('dataFim', converterParaBanco(dataFim));
            }
            
            const response = await fetch(`/api/ssma/contadores?${params.toString()}`);
            if (!response.ok) return;
            
            const contadores = await response.json();
            
            // Atualizar os contadores no rodapé para todos os cursos
            const cursos = ['aso', 'nr06', 'nr10', 'nr11', 'nr12', 'nr17', 'nr18', 'nr20', 'nr33', 'nr34', 'nr35', 'epi'];
            cursos.forEach(curso => {
                const vencidoEl = document.getElementById(`${curso}-vencido`);
                const renovarEl = document.getElementById(`${curso}-renovar`);
                
                if (vencidoEl) vencidoEl.textContent = contadores[curso]?.vencidos || 0;
                if (renovarEl) renovarEl.textContent = contadores[curso]?.renovar || 0;
            });
            
        } catch (error) {
            console.error('Erro ao buscar contadores:', error);
        }
    }

    aplicarFiltrosCursos() {
        console.log('Aplicando filtros de cursos...');
        
        // Voltar para página 1 e recarregar dados do servidor com os filtros
        this.currentPage = 1;
        this.loadData();
    }
    
    // ===== FUNÇÕES DE FORNECEDOR =====
    
    // Carregar grid de fornecedores
    async carregarGridFornecedores() {
        try {
            const response = await fetch('/api/fornecedores');
            if (response.ok) {
                const fornecedores = await response.json();
                
                // Aplicar filtro de situação
                let fornecedoresFiltrados = fornecedores;
                
                // Se filtroMostrarApenasInativos está true, mostrar apenas inativos
                if (this.filtroMostrarApenasInativos === true) {
                    fornecedoresFiltrados = fornecedores.filter(f => f.Situacao === 'N');
                } else {
                    // Por padrão, mostrar apenas ativos
                    fornecedoresFiltrados = fornecedores.filter(f => f.Situacao === 'S');
                }
                
                this.renderGridFornecedores(fornecedoresFiltrados);
            } else {
                console.error('Erro ao carregar fornecedores');
                this.renderGridFornecedores([]);
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            this.renderGridFornecedores([]);
        }
    }
    
    formatarDataBreve(data) {
        if (!data) return '';
        // Se for string no formato YYYY-MM-DD HH:MM:SS ou ISO
        if (typeof data === 'string') {
            // Trata formato ISO (2025-12-12T18:19:27.814Z)
            if (data.includes('T')) {
                const partes = data.split('T')[0].split('-');
                if (partes.length === 3) {
                    const ano = partes[0].slice(-2);
                    const mes = partes[1];
                    const dia = partes[2];
                    return `${dia}/${mes}/${ano}`;
                }
            }
            // Trata formato YYYY-MM-DD HH:MM:SS
            const partes = data.split(' ')[0].split('-');
            if (partes.length === 3) {
                const ano = partes[0].slice(-2);
                const mes = partes[1];
                const dia = partes[2];
                return `${dia}/${mes}/${ano}`;
            }
        }
        return data;
    }

    renderGridFornecedores(fornecedores) {
        const gridBody = document.getElementById('fornecedorGridBody');
        if (!gridBody) return;
        
        if (!fornecedores || fornecedores.length === 0) {
            gridBody.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    Nenhum fornecedor encontrado
                </div>
            `;
            // Atualizar contadores mesmo com lista vazia
            this.atualizarContadoresFornecedor(fornecedores || []);
            return;
        }
        
        gridBody.innerHTML = fornecedores.map(fornecedor => {
            const isAtivo = fornecedor.Situacao === 'S';
            const dataCadastro = this.formatarDataBreve(fornecedor.DataCadastro);
            const dataInativacao = this.formatarDataBreve(fornecedor.DataInativacao);
            
            return `
            <div class="grid-row" data-id="${fornecedor.id}" onclick="syscontrole.selecionarFornecedor(${fornecedor.id})" ondblclick="syscontrole.editarFornecedor(${fornecedor.id})">
                <div class="grid-cell empresa">${fornecedor.Empresa || ''}</div>
                <div class="grid-cell cnpj">${fornecedor.CNPJ || ''}</div>
                <div class="grid-cell contato">${fornecedor.Contato || ''}</div>
                <div class="grid-cell data-cadastro">${dataCadastro}</div>
                <div class="grid-cell data-inativacao">${dataInativacao}</div>
                <div class="grid-cell situacao">
                    <div class="toggle-container-small">
                        <input type="checkbox" id="toggle-fornecedor-${fornecedor.id}" class="toggle-input-small" ${isAtivo ? 'checked' : ''} onchange="syscontrole.toggleFornecedorSituacao(${fornecedor.id}, this.checked)" onclick="event.stopPropagation()">
                        <label for="toggle-fornecedor-${fornecedor.id}" class="toggle-label-small">
                            <span class="toggle-slider-small"></span>
                            <span class="toggle-text-small">${isAtivo ? 'Ativo' : 'Inativo'}</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        }).join('');
        
        // Atualizar contadores (TOTAL GERAL + LOCALIZADOS)
        this.atualizarContadoresFornecedor();
        this.atualizarLocalizadosNoGrid();
    }
    
    // Atualizar apenas o contador de LOCALIZADOS baseado no grid visível
    atualizarLocalizadosNoGrid() {
        const rows = document.querySelectorAll('#fornecedorGridBody .grid-row[data-id]');
        let localizados = 0;
        
        rows.forEach(row => {
            if (row.style.display !== 'none') {
                localizados++;
            }
        });
        
        const localizadosEl = document.getElementById('fornecedor-localizados');
        if (localizadosEl) localizadosEl.textContent = localizados;
    }
    
    // Atualizar contadores do rodapé de fornecedores (TOTAL GERAL)
    async atualizarContadoresFornecedor() {
        const localizadosEl = document.getElementById('fornecedor-localizados');
        const ativosEl = document.getElementById('fornecedor-ativos');
        const canceladosEl = document.getElementById('fornecedor-cancelados');
        
        if (!localizadosEl || !ativosEl || !canceladosEl) return;
        
        try {
            // Buscar TODOS os fornecedores (sem filtro)
            const response = await fetch('/api/fornecedores');
            if (!response.ok) throw new Error('Erro ao carregar fornecedores');
            
            const todosFornecedores = await response.json();
            
            const total = todosFornecedores.length;
            const ativos = todosFornecedores.filter(f => f.Situacao === 'S').length;
            const cancelados = todosFornecedores.filter(f => f.Situacao === 'N').length;
            
            localizadosEl.textContent = total;
            ativosEl.textContent = ativos;
            canceladosEl.textContent = cancelados;
            
            // Atualizar cores
            const ativoItem = ativosEl.closest('.footer-stat-item');
            const canceladoItem = canceladosEl.closest('.footer-stat-item');
            
            if (ativoItem) {
                ativoItem.classList.remove('cancelado', 'ativo');
                ativoItem.classList.add('ativo');
            }
            
            if (canceladoItem) {
                canceladoItem.classList.remove('cancelado', 'ativo');
                canceladoItem.classList.add('cancelado');
            }
        } catch (error) {
            console.error('Erro ao atualizar contadores:', error);
        }
    }
    
    // Exportar para Excel
    exportarExcel(dados) {
        let csv = 'Empresa,CNPJ,Telefone,Celular,Contato,Data Cadastro,Data Inativação,Situação\n';
        
        dados.forEach(f => {
            csv += `"${f.Empresa}","${f.CNPJ}","${f.Telefone}","${f.Celular}","${f.Contato}","${f.DataCadastro}","${f.DataInativacao}","${f.Situacao === 'N' ? 'Ativo' : 'Inativo'}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fornecedores.csv';
        a.click();
    }
    
    // Colunas disponíveis para exportação - TODAS AS COLUNAS DO BANCO
    getColunasDisponiveis() {
        return [
            // Dados Básicos
            { id: 'Nome', label: 'Nome', checked: true, grupo: 'Dados Básicos' },
            { id: 'Empresa', label: 'Empresa', checked: true, grupo: 'Dados Básicos' },
            { id: 'Funcao', label: 'Função', checked: true, grupo: 'Dados Básicos' },
            { id: 'Situacao', label: 'Situação', checked: true, grupo: 'Dados Básicos' },
            { id: 'Cadastro', label: 'Data Cadastro', checked: false, grupo: 'Dados Básicos' },
            { id: 'DataInativacao', label: 'Data Inativação', checked: false, grupo: 'Dados Básicos' },
            { id: 'Ambientacao', label: 'Ambientação', checked: false, grupo: 'Dados Básicos' },
            { id: 'Anotacoes', label: 'Anotações', checked: false, grupo: 'Dados Básicos' },
            
            // ASO
            { id: 'Vencimento', label: 'ASO - Vencimento', checked: true, grupo: 'ASO' },
            { id: 'Status', label: 'ASO - Status', checked: false, grupo: 'ASO' },
            
            // NR-06
            { id: 'Nr06_DataEmissao', label: 'NR-06 - Data Emissão', checked: false, grupo: 'NR-06' },
            { id: 'Nr06_Vencimento', label: 'NR-06 - Vencimento', checked: false, grupo: 'NR-06' },
            { id: 'Nr06_Status', label: 'NR-06 - Status', checked: false, grupo: 'NR-06' },
            
            // NR-10
            { id: 'Nr10_DataEmissao', label: 'NR-10 - Data Emissão', checked: false, grupo: 'NR-10' },
            { id: 'Nr10_Vencimento', label: 'NR-10 - Vencimento', checked: false, grupo: 'NR-10' },
            { id: 'Nr10_Status', label: 'NR-10 - Status', checked: false, grupo: 'NR-10' },
            
            // NR-11
            { id: 'Nr11_DataEmissao', label: 'NR-11 - Data Emissão', checked: false, grupo: 'NR-11' },
            { id: 'Nr11_Vencimento', label: 'NR-11 - Vencimento', checked: false, grupo: 'NR-11' },
            { id: 'Nr11_Status', label: 'NR-11 - Status', checked: false, grupo: 'NR-11' },
            
            // NR-12
            { id: 'Nr12_DataEmissao', label: 'NR-12 - Data Emissão', checked: false, grupo: 'NR-12' },
            { id: 'NR12_Vencimento', label: 'NR-12 - Vencimento', checked: false, grupo: 'NR-12' },
            { id: 'Nr12_Status', label: 'NR-12 - Status', checked: false, grupo: 'NR-12' },
            { id: 'Nr12_Ferramenta', label: 'NR-12 - Ferramentas Autorizadas', checked: false, grupo: 'NR-12' },
            
            // NR-17
            { id: 'Nr17_DataEmissao', label: 'NR-17 - Data Emissão', checked: false, grupo: 'NR-17' },
            { id: 'Nr17_Vencimento', label: 'NR-17 - Vencimento', checked: false, grupo: 'NR-17' },
            { id: 'Nr17_Status', label: 'NR-17 - Status', checked: false, grupo: 'NR-17' },
            
            // NR-18
            { id: 'Nr18_DataEmissao', label: 'NR-18 - Data Emissão', checked: false, grupo: 'NR-18' },
            { id: 'NR18_Vencimento', label: 'NR-18 - Vencimento', checked: true, grupo: 'NR-18' },
            { id: 'Nr18_Status', label: 'NR-18 - Status', checked: false, grupo: 'NR-18' },
            
            // NR-20
            { id: 'Nr20_DataEmissao', label: 'NR-20 - Data Emissão', checked: false, grupo: 'NR-20' },
            { id: 'Nr20_Vencimento', label: 'NR-20 - Vencimento', checked: false, grupo: 'NR-20' },
            { id: 'Nr20_Status', label: 'NR-20 - Status', checked: false, grupo: 'NR-20' },
            
            // NR-33
            { id: 'Nr33_DataEmissao', label: 'NR-33 - Data Emissão', checked: false, grupo: 'NR-33' },
            { id: 'NR33_Vencimento', label: 'NR-33 - Vencimento', checked: false, grupo: 'NR-33' },
            { id: 'Nr33_Status', label: 'NR-33 - Status', checked: false, grupo: 'NR-33' },
            
            // NR-34
            { id: 'Nr34_DataEmissao', label: 'NR-34 - Data Emissão', checked: false, grupo: 'NR-34' },
            { id: 'Nr34_Vencimento', label: 'NR-34 - Vencimento', checked: false, grupo: 'NR-34' },
            { id: 'Nr34_Status', label: 'NR-34 - Status', checked: false, grupo: 'NR-34' },
            
            // NR-35
            { id: 'Nr35_DataEmissao', label: 'NR-35 - Data Emissão', checked: false, grupo: 'NR-35' },
            { id: 'NR35_Vencimento', label: 'NR-35 - Vencimento', checked: true, grupo: 'NR-35' },
            { id: 'Nr35_Status', label: 'NR-35 - Status', checked: false, grupo: 'NR-35' },
            
            // EPI
            { id: 'Epi_DataEmissao', label: 'EPI - Data Emissão', checked: false, grupo: 'EPI' },
            { id: 'epiVencimento', label: 'EPI - Vencimento', checked: false, grupo: 'EPI' },
            { id: 'EpiStatus', label: 'EPI - Status', checked: false, grupo: 'EPI' }
        ];
    }
    
    // Abrir modal de exportação com seleção de colunas
    exportarSSMA() {
        const modal = document.getElementById('modalExportar');
        const columnsList = document.getElementById('exportColumnsList');
        
        // Preencher lista de colunas organizadas por grupo
        const colunas = this.getColunasDisponiveis();
        
        // Agrupar colunas
        const grupos = {};
        colunas.forEach(col => {
            const grupo = col.grupo || 'Outros';
            if (!grupos[grupo]) grupos[grupo] = [];
            grupos[grupo].push(col);
        });
        
        // Gerar HTML com grupos
        let html = '';
        Object.keys(grupos).forEach(grupo => {
            html += `<div class="export-grupo">
                <div class="export-grupo-header" onclick="syscontrole.toggleGrupoExport('${grupo}')">
                    <span class="export-grupo-toggle">▼</span>
                    <strong>${grupo}</strong>
                    <label class="export-grupo-check" onclick="event.stopPropagation()">
                        <input type="checkbox" onchange="syscontrole.toggleGrupoCheckbox('${grupo}', this)">
                        <span>Todos</span>
                    </label>
                </div>
                <div class="export-grupo-items" id="grupo_${grupo.replace(/[^a-zA-Z0-9]/g, '_')}">`;
            
            grupos[grupo].forEach(col => {
                html += `
                    <label class="export-checkbox" data-grupo="${grupo}">
                        <input type="checkbox" id="export_${col.id}" value="${col.id}" ${col.checked ? 'checked' : ''}>
                        <span>${col.label.replace(grupo + ' - ', '')}</span>
                    </label>`;
            });
            
            html += '</div></div>';
        });
        
        columnsList.innerHTML = html;
        
        // Atualizar checkbox "Selecionar Todas"
        this.atualizarSelectAllExport();
        
        modal.style.display = 'flex';
    }
    
    // Toggle expandir/colapsar grupo
    toggleGrupoExport(grupo) {
        const grupoId = 'grupo_' + grupo.replace(/[^a-zA-Z0-9]/g, '_');
        const items = document.getElementById(grupoId);
        const header = items.previousElementSibling;
        const toggle = header.querySelector('.export-grupo-toggle');
        
        if (items.style.display === 'none') {
            items.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            items.style.display = 'none';
            toggle.textContent = '▶';
        }
    }
    
    // Toggle todos os checkboxes de um grupo
    toggleGrupoCheckbox(grupo, checkbox) {
        const items = document.querySelectorAll(`.export-checkbox[data-grupo="${grupo}"] input`);
        items.forEach(cb => cb.checked = checkbox.checked);
        this.atualizarSelectAllExport();
    }
    
    // Toggle selecionar todas as colunas
    toggleSelectAllExport(checkbox) {
        const checkboxes = document.querySelectorAll('#exportColumnsList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
    }
    
    // Atualizar estado do "Selecionar Todas"
    atualizarSelectAllExport() {
        const checkboxes = document.querySelectorAll('#exportColumnsList .export-checkbox input[type="checkbox"]');
        const selectAll = document.getElementById('exportSelectAll');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        if (selectAll) selectAll.checked = allChecked;
    }
    
    // Fechar modal de exportação
    fecharModalExportar() {
        document.getElementById('modalExportar').style.display = 'none';
    }
    
    // Confirmar e executar exportação
    async confirmarExportacao() {
        const checkboxes = document.querySelectorAll('#exportColumnsList input[type="checkbox"]:checked');
        const colunasSelecionadas = Array.from(checkboxes).map(cb => cb.value);
        
        if (colunasSelecionadas.length === 0) {
            this.showToast('Selecione pelo menos uma coluna', 'warning');
            return;
        }
        
        const formato = document.querySelector('input[name="exportFormat"]:checked')?.value || 'excel';
        
        this.fecharModalExportar();
        
        try {
            // Buscar configuração do relatório
            let titulo = 'Relatório de Cursos';
            try {
                const configResponse = await fetch('/api/configuracao-relatorio');
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    titulo = config?.titulo || 'Relatório de Cursos';
                    this.logoRelatorio = config?.logo || '/Logo-Hoss.jpg';
                }
            } catch (e) {
                this.logoRelatorio = '/Logo-Hoss.jpg';
            }
            
            // Buscar todos os dados
            const params = new URLSearchParams();
            const filtroNome = document.getElementById('filtroNome')?.value;
            const filtroEmpresa = document.getElementById('filtroEmpresa')?.value;
            const filtroFuncao = document.getElementById('filtroFuncao')?.value;
            const chkAtivo = document.getElementById('chkAtivo');
            
            if (filtroNome) params.append('nome', filtroNome);
            if (filtroEmpresa) params.append('empresa', filtroEmpresa);
            if (filtroFuncao) params.append('funcao', filtroFuncao);
            params.append('situacao', chkAtivo?.checked ? 'N' : 'S');
            params.append('limit', '10000');
            
            const response = await fetch(`/api/ssma?${params.toString()}`);
            if (!response.ok) throw new Error('Erro ao buscar dados');
            
            const result = await response.json();
            const dados = result.data || [];
            
            if (dados.length === 0) {
                this.showToast('Nenhum dado para exportar', 'warning');
                return;
            }
            
            if (formato === 'excel') {
                this.exportarSSMAExcelComColunas(dados, titulo, colunasSelecionadas);
            } else {
                this.exportarSSMAPDFComColunas(dados, titulo, this.logoRelatorio, colunasSelecionadas);
            }
            
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.showToast('Erro ao exportar dados', 'error');
        }
    }
    
    // Exportar para Excel com colunas selecionadas (usa servidor para gerar .xlsx formatado)
    async exportarSSMAExcelComColunas(dados, titulo, colunas) {
        try {
            this.showToast('Gerando Excel formatado...', 'info');
            
            // Pegar filtros atuais
            const filtroNome = document.getElementById('filtroNome')?.value || '';
            const filtroEmpresa = document.getElementById('filtroEmpresa')?.value || '';
            const filtroFuncao = document.getElementById('filtroFuncao')?.value || '';
            const chkAtivo = document.getElementById('chkAtivo');
            const situacao = chkAtivo?.checked ? 'N' : 'S';
            
            // Chamar API do servidor para gerar Excel formatado
            const response = await fetch('/api/exportar-excel-custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: filtroNome,
                    empresa: filtroEmpresa,
                    funcao: filtroFuncao,
                    situacao: situacao,
                    colunas: colunas
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao gerar Excel');
            }
            
            // Baixar o arquivo
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_ssma_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showToast('Excel exportado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            this.showToast('Erro ao exportar Excel', 'error');
        }
    }
    
    // Exportar para PDF com colunas selecionadas
    exportarSSMAPDFComColunas(dados, titulo, logo, colunas) {
        const colunasInfo = this.getColunasDisponiveis();
        const colunasMap = {};
        colunasInfo.forEach(c => colunasMap[c.id] = c.label);
        
        const headers = colunas.map(c => colunasMap[c] || c);
        
        let html = `
            <html>
            <head>
                <title>${titulo}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { text-align: center; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                    th { background: #4a90e2; color: white; padding: 8px; text-align: left; }
                    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .logo { text-align: center; margin-bottom: 20px; }
                    .logo img { max-height: 60px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="logo"><img src="${logo}" alt="Logo"></div>
                <h1>${titulo}</h1>
                <table>
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>
        `;
        
        dados.forEach(row => {
            html += '<tr>';
            colunas.forEach(col => {
                let valor = row[col] || '';
                
                if (col === 'Situacao') {
                    valor = valor === 'N' ? 'Ativo' : 'Inativo';
                }
                
                if (col.includes('Vencimento') || col === 'Cadastro') {
                    if (valor) {
                        try {
                            const date = new Date(valor);
                            valor = date.toLocaleDateString('pt-BR');
                        } catch (e) {}
                    }
                }
                
                html += `<td>${valor}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></body></html>';
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        
        this.showToast('PDF gerado!', 'success');
    }
    
    // Exportar SSMA para Excel (.xlsx real) - mantido para compatibilidade
    exportarSSMAExcel(dados, titulo) {
        // Usar a rota do servidor para gerar Excel real
        const params = new URLSearchParams();
        const nome = document.getElementById('searchNome')?.value;
        const empresa = document.getElementById('searchEmpresa')?.value;
        const funcao = document.getElementById('searchFuncao')?.value;
        const chkAtivo = document.getElementById('chkAtivo');
        
        if (nome) params.append('nome', nome);
        if (empresa) params.append('empresa', empresa);
        if (funcao) params.append('funcao', funcao);
        params.append('situacao', chkAtivo?.checked ? 'S' : 'N');
        
        // Fazer download direto
        window.location.href = `/api/exportar-excel?${params.toString()}`;
        this.showToast('Exportando Excel...', 'success');
    }
    
    // Exportar SSMA para PDF
    exportarSSMAPDF(dados, titulo, logo) {
        const logoUrl = logo || '/Logo-Hoss.jpg';
        const logoSrc = logoUrl.startsWith('data:') ? logoUrl : window.location.origin + logoUrl;
        
        let html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 10px; }
                    .header img { width: 80px; height: auto; }
                    .header h1 { margin: 0; color: #333; }
                    .data { text-align: center; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th { background-color: #4a90e2; color: white; padding: 6px; text-align: left; border: 1px solid #ddd; }
                    td { padding: 5px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    @media print { body { margin: 10px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${logoSrc}" alt="Logo" onerror="this.style.display='none'">
                    <h1>${titulo}</h1>
                </div>
                <p class="data">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Empresa</th>
                            <th>Função</th>
                            <th>Venc-ASO</th>
                            <th>Venc-NR10</th>
                            <th>Venc-NR12</th>
                            <th>Venc-NR18</th>
                            <th>Venc-NR35</th>
                            <th>Venc-EPI</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        dados.forEach(d => {
            html += `
                <tr>
                    <td>${d.Nome || ''}</td>
                    <td>${d.Empresa || ''}</td>
                    <td>${d.Funcao || ''}</td>
                    <td>${this.formatDateForDisplay(d.Vencimento)}</td>
                    <td>${this.formatDateForDisplay(d.Nr10_Vencimento)}</td>
                    <td>${this.formatDateForDisplay(d.NR12_Vencimento)}</td>
                    <td>${this.formatDateForDisplay(d.NR18_Vencimento)}</td>
                    <td>${this.formatDateForDisplay(d.NR35_Vencimento)}</td>
                    <td>${this.formatDateForDisplay(d.epiVencimento)}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <p class="footer">SSMA</p>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
    
    // Exportar para PDF
    exportarPDF(dados) {
        this.showToast('Exportação PDF em desenvolvimento', 'info');
    }
    
    // Abrir configurações (atalho para a barra de título)
    abrirConfiguracoes() {
        this.abrirConfiguracaoRelatorio();
    }
    
    // ===== CONTROLE DE PRESENÇA =====
    
    // Feriados nacionais brasileiros (formato: "MM-DD")
    getFeriadosBrasil(ano) {
        // Feriados fixos
        const feriadosFixos = [
            '01-01', // Ano Novo
            '04-21', // Tiradentes
            '05-01', // Dia do Trabalho
            '09-07', // Independência
            '10-12', // Nossa Senhora Aparecida
            '11-02', // Finados
            '11-15', // Proclamação da República
            '12-25', // Natal
            '12-26', // Ponto facultativo após Natal
            '12-29', // Recesso fim de ano
            '12-30', // Recesso fim de ano
            '12-31', // Véspera de Ano Novo
        ];
        
        // Calcular Páscoa (algoritmo de Meeus/Jones/Butcher)
        const a = ano % 19;
        const b = Math.floor(ano / 100);
        const c = ano % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
        const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
        
        const pascoa = new Date(ano, mesPascoa - 1, diaPascoa);
        
        // Feriados móveis baseados na Páscoa
        const carnaval = new Date(pascoa);
        carnaval.setDate(pascoa.getDate() - 47);
        
        const sextaSanta = new Date(pascoa);
        sextaSanta.setDate(pascoa.getDate() - 2);
        
        const corpusChristi = new Date(pascoa);
        corpusChristi.setDate(pascoa.getDate() + 60);
        
        const formatarData = (d) => {
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            return `${mes}-${dia}`;
        };
        
        return [
            ...feriadosFixos,
            formatarData(carnaval),
            formatarData(new Date(carnaval.getTime() + 86400000)), // Terça de carnaval
            formatarData(sextaSanta),
            formatarData(pascoa),
            formatarData(corpusChristi)
        ];
    }
    
    // Verificar se é fim de semana ou feriado
    isFimDeSemanaOuFeriado(ano, mes, dia) {
        // Criar data corretamente (mês é 0-indexed no JavaScript)
        const anoNum = parseInt(ano);
        const mesNum = parseInt(mes);
        const diaNum = parseInt(dia);
        
        const data = new Date(anoNum, mesNum - 1, diaNum);
        const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
        
        // Fim de semana (Sábado = 6, Domingo = 0)
        if (diaSemana === 0 || diaSemana === 6) return true;
        
        // Feriado
        const feriados = this.getFeriadosBrasil(anoNum);
        const dataStr = `${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
        return feriados.includes(dataStr);
    }
    
    // Abrir modal de controle de presença
    async abrirControlePresenca() {
        const modal = document.getElementById('modalControlePresenca');
        
        try {
            this.showToast('Carregando controle de presença...', 'info');
            
            // Buscar funcionários ativos
            const funcResponse = await fetch('/api/controle-presenca/funcionarios');
            const funcResult = await funcResponse.json();
            
            // Buscar dados de presença
            const dadosResponse = await fetch('/api/controle-presenca/dados');
            const dadosResult = await dadosResponse.json();
            
            const funcionarios = funcResult.data || [];
            const dadosPresenca = dadosResult.data || {};
            const comentarios = dadosResult.comentarios || {};
            const metadados = funcResult.metadados || {};
            const mesAno = funcResult.mesAno;
            
            // Guardar dados para cálculos
            this.presencaFuncionarios = funcionarios;
            this.presencaDados = dadosPresenca;
            this.presencaComentarios = comentarios;
            this.presencaMetadados = metadados;
            this.presencaMesAno = mesAno;
            
            // Atualizar título com mês/ano
            const [mes, ano] = mesAno.split('-');
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            document.getElementById('presencaMesAnoAtual').textContent = `${meses[parseInt(mes) - 1]} ${ano}`;
            
            // Contar ativos e inativados
            const ativos = funcionarios.filter(f => f.Situacao === 'N').length;
            const inativados = funcionarios.filter(f => f.Situacao === 'S').length;
            let textoQtd = `${ativos} funcionários ativos`;
            if (inativados > 0) textoQtd += ` + ${inativados} inativados no mês`;
            document.getElementById('presencaQtdFunc').textContent = textoQtd;
            
            // Calcular dias do mês
            const diasNoMes = new Date(parseInt(ano), parseInt(mes), 0).getDate();
            this.presencaDiasNoMes = diasNoMes;
            
            // Agrupar funções únicas
            const funcoesUnicas = [...new Set(funcionarios.map(f => f.Funcao).filter(f => f))].sort();
            
            // Montar cabeçalho
            let headerHtml = '<tr>';
            headerHtml += '<th class="col-empresa">Empresa</th>';
            headerHtml += '<th class="col-nome">Nome</th>';
            headerHtml += '<th class="col-funcao">Função</th>';
            
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const isFolga = this.isFimDeSemanaOuFeriado(ano, mes, dia);
                headerHtml += `<th class="col-dia ${isFolga ? 'dia-folga' : ''}">${dia}</th>`;
            }
            
            headerHtml += '<th class="col-total">P</th>';
            headerHtml += '<th class="col-total">F</th>';
            headerHtml += '</tr>';
            
            document.getElementById('presencaHeader').innerHTML = headerHtml;
            
            // Montar corpo da tabela
            let bodyHtml = '';
            
            for (const func of funcionarios) {
                const presencaFunc = dadosPresenca[func.id] || {};
                
                bodyHtml += `<tr data-funcao="${func.Funcao || ''}">`;
                bodyHtml += `<td class="col-empresa">${func.Empresa || ''}</td>`;
                bodyHtml += `<td class="col-nome">${func.Nome || ''}</td>`;
                bodyHtml += `<td class="col-funcao">${func.Funcao || ''}</td>`;
                
                for (let dia = 1; dia <= diasNoMes; dia++) {
                    const dadosDia = presencaFunc[dia];
                    const status = typeof dadosDia === 'object' ? (dadosDia.status || '') : (dadosDia || '');
                    const isFolgaSalva = typeof dadosDia === 'object' ? dadosDia.isFolga : false;
                    
                    // Só mostra azul se foi marcado manualmente como folga (ponto)
                    const statusClass = status ? `status-${status.toLowerCase()}` : (isFolgaSalva ? 'dia-folga-input' : '');
                    
                    // Verificar se tem comentário
                    const chaveComentario = `${func.id}_${dia}`;
                    const comentario = comentarios[chaveComentario];
                    const temComentario = comentario && comentario.texto;
                    const comentarioClass = temComentario ? 'tem-comentario' : '';
                    const comentarioData = temComentario ? `data-comentario="${comentario.texto.replace(/"/g, '&quot;')}"` : '';
                    const comentarioTitle = temComentario ? `title="💬 ${comentario.texto.replace(/"/g, '&quot;')}"` : '';
                    
                    // Verificar se usuário é comum (só visualização)
                    const isComum = this.currentUser && this.currentUser.tipo === 'comum';
                    const readonlyAttr = isComum ? 'readonly disabled' : '';
                    
                    bodyHtml += `<td class="col-dia">`;
                    bodyHtml += `<input type="text" class="presenca-input ${statusClass} ${comentarioClass}" `;
                    bodyHtml += `data-func="${func.id}" data-dia="${dia}" data-funcao="${func.Funcao || ''}" data-folga="${isFolgaSalva}" ${comentarioData} ${comentarioTitle} `;
                    bodyHtml += `value="${status}" maxlength="2" ${readonlyAttr} `;
                    if (!isComum) {
                        bodyHtml += `onchange="syscontrole.marcarPresenca(this)" `;
                        bodyHtml += `onkeyup="syscontrole.formatarPresenca(this)" `;
                        bodyHtml += `onkeydown="syscontrole.handlePresencaKeydown(event, this)" `;
                        bodyHtml += `onfocus="syscontrole.destacarLinhaPresenca(this)" `;
                        bodyHtml += `ondblclick="syscontrole.adicionarComentarioPresenca(this)" `;
                        bodyHtml += `onmousedown="syscontrole.handlePresencaClick(event, this)"`;
                    }
                    bodyHtml += `>`;
                    bodyHtml += '</td>';
                }
                
                // Totais por funcionário
                bodyHtml += `<td class="col-total" id="totalP_${func.id}">0</td>`;
                bodyHtml += `<td class="col-total col-total-f" id="totalF_${func.id}">0</td>`;
                bodyHtml += '</tr>';
            }
            
            // Linha de TOTAL DO DIA (presenças)
            bodyHtml += '<tr class="linha-total-dia">';
            bodyHtml += '<td colspan="3" class="total-dia-label"><strong>TOTAL DO DIA</strong></td>';
            for (let dia = 1; dia <= diasNoMes; dia++) {
                bodyHtml += `<td class="col-dia total-dia" id="totalDiaP_${dia}" data-dia="${dia}">0</td>`;
            }
            bodyHtml += '<td class="col-total total-geral" id="totalGeralP">0</td>';
            bodyHtml += '<td class="col-total"></td>';
            bodyHtml += '</tr>';
            
            // Linha de FALTAS DO DIA
            bodyHtml += '<tr class="linha-faltas-dia">';
            bodyHtml += '<td colspan="3" class="faltas-dia-label"><strong>FALTAS DO DIA</strong></td>';
            for (let dia = 1; dia <= diasNoMes; dia++) {
                bodyHtml += `<td class="col-dia faltas-dia" id="totalDiaF_${dia}" data-dia="${dia}">0</td>`;
            }
            bodyHtml += '<td class="col-total"></td>';
            bodyHtml += '<td class="col-total total-geral-f" id="totalGeralF">0</td>';
            bodyHtml += '</tr>';
            
            // Separador
            bodyHtml += '<tr class="separador-funcao"><td colspan="' + (diasNoMes + 5) + '"></td></tr>';
            
            // Cabeçalho da seção por função
            bodyHtml += '<tr class="header-funcao">';
            bodyHtml += '<td colspan="3" class="funcao-header"><strong>FUNÇÃO</strong></td>';
            for (let dia = 1; dia <= diasNoMes; dia++) {
                bodyHtml += `<td class="col-dia header-dia" data-dia="${dia}">${dia}</td>`;
            }
            bodyHtml += '<td class="col-total">P</td>';
            bodyHtml += '<td class="col-total">F</td>';
            bodyHtml += '</tr>';
            
            // Linhas por função
            for (const funcao of funcoesUnicas) {
                bodyHtml += `<tr class="linha-funcao" data-funcao-resumo="${funcao}">`;
                bodyHtml += `<td colspan="3" class="funcao-nome">${funcao}</td>`;
                for (let dia = 1; dia <= diasNoMes; dia++) {
                    bodyHtml += `<td class="col-dia funcao-dia" id="funcao_${funcao.replace(/\s/g, '_')}_dia_${dia}" data-dia="${dia}">0</td>`;
                }
                bodyHtml += `<td class="col-total funcao-total-p" id="funcao_${funcao.replace(/\s/g, '_')}_totalP">0</td>`;
                bodyHtml += `<td class="col-total funcao-total-f" id="funcao_${funcao.replace(/\s/g, '_')}_totalF">0</td>`;
                bodyHtml += '</tr>';
            }
            
            // Linha GERAL
            bodyHtml += '<tr class="linha-geral">';
            bodyHtml += '<td colspan="' + (diasNoMes + 3) + '" class="geral-label"><strong>GERAL</strong></td>';
            bodyHtml += '<td class="col-total geral-total" id="geralTotalP">0</td>';
            bodyHtml += '<td class="col-total geral-total-f" id="geralTotalF">0</td>';
            bodyHtml += '</tr>';
            
            document.getElementById('presencaBody').innerHTML = bodyHtml;
            
            // Calcular totais iniciais
            this.calcularTotaisPresenca();
            
            // Marcar colunas de folga nas linhas de totais/funções
            this.marcarColunasFollga();
            
            // Esconder botão de exportar para usuário comum
            if (this.currentUser && this.currentUser.tipo === 'comum') {
                const btnExportar = document.querySelector('[onclick*="exportarControlePresenca"]');
                if (btnExportar) btnExportar.style.display = 'none';
            }
            
            // Adicionar listener global para Alt+Shift+A
            this.presencaKeyListener = (e) => {
                if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'A') {
                    e.preventDefault();
                    // Pegar a célula focada ou a última selecionada
                    const celulaFocada = document.activeElement;
                    if (celulaFocada && celulaFocada.classList.contains('presenca-input')) {
                        this.abrirComentarioCelula(celulaFocada);
                    } else if (this.presencaUltimoSelecionado) {
                        this.abrirComentarioCelula(this.presencaUltimoSelecionado);
                    } else {
                        this.showToast('Selecione uma célula primeiro', 'info');
                    }
                }
            };
            document.addEventListener('keydown', this.presencaKeyListener);
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Erro ao carregar controle de presença:', error);
            this.showToast('Erro ao carregar controle de presença', 'error');
        }
    }
    
    // Formatar input de presença
    formatarPresenca(input) {
        let valor = input.value.toUpperCase();
        
        // Se digitou ponto ou hífen, marca como folga (azul claro vazio)
        if (valor === '.' || valor === '-') {
            // Aplicar folga na célula atual
            input.value = '';
            valor = '';
            input.dataset.folga = 'true';
            input.className = 'presenca-input dia-folga-input';
            this.salvarPresencaIndividual(input);
            
            // Se tem seleção múltipla, aplicar em todas as células selecionadas
            if (this.presencaSelecionados && this.presencaSelecionados.size > 0) {
                this.presencaSelecionados.forEach(inp => {
                    if (inp !== input) {
                        inp.value = '';
                        inp.dataset.folga = 'true';
                        inp.className = 'presenca-input dia-folga-input';
                        if (inp.dataset.comentario) {
                            inp.classList.add('tem-comentario');
                        }
                        this.salvarPresencaIndividual(inp);
                    }
                });
                this.limparSelecaoPresenca();
            }
            
            // Indicar se tem comentário
            if (input.dataset.comentario) {
                input.classList.add('tem-comentario');
            }
            
            this.calcularTotaisPresenca();
            return;
        }
        
        input.value = valor;
        
        // Se tem seleção múltipla e digitou um valor válido, aplicar em todas
        const valoresValidos = ['P', 'F', 'A', 'FE', 'FO', 'N'];
        if (this.presencaSelecionados && this.presencaSelecionados.size > 0 && valoresValidos.includes(valor)) {
            this.presencaSelecionados.forEach(inp => {
                if (inp !== input) {
                    inp.value = valor;
                    inp.dataset.folga = 'false';
                    inp.className = 'presenca-input';
                    inp.classList.add(`status-${valor.toLowerCase()}`);
                    if (inp.dataset.comentario) {
                        inp.classList.add('tem-comentario');
                    }
                    this.salvarPresencaIndividual(inp);
                }
            });
            this.limparSelecaoPresenca();
        }
        
        // Aplicar cor baseada no status
        input.className = 'presenca-input';
        input.dataset.folga = 'false';
        if (valor === 'P') input.classList.add('status-p');
        else if (valor === 'F') input.classList.add('status-f');
        else if (valor === 'A') input.classList.add('status-a');
        else if (valor === 'FE') input.classList.add('status-fe');
        else if (valor === 'FO') input.classList.add('status-fo');
        else if (valor === 'N') input.classList.add('status-n');
        else if (input.dataset.folga === 'true' && !valor) input.classList.add('dia-folga-input');
        
        // Indicar se tem comentário (borda laranja)
        if (input.dataset.comentario) {
            input.classList.add('tem-comentario');
        }
        
        // Manter seleção se estiver selecionado
        if (this.presencaSelecionados && this.presencaSelecionados.has(input)) {
            input.classList.add('presenca-selecionado');
        }
        
        this.calcularTotaisPresenca();
    }
    
    // Salvar presença individual (para uso com ponto)
    async salvarPresencaIndividual(input) {
        const funcId = input.dataset.func;
        const dia = input.dataset.dia;
        const valor = input.value;
        const isFolga = input.dataset.folga === 'true';
        
        try {
            await fetch('/api/controle-presenca/marcar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mesAno: this.presencaMesAno,
                    funcionarioId: funcId,
                    dia: dia,
                    status: valor,
                    isFolga: isFolga
                })
            });
        } catch (error) {
            console.error('Erro ao salvar presença:', error);
        }
    }
    
    // Inicializar seleção múltipla
    initPresencaSelecao() {
        if (!this.presencaSelecionados) {
            this.presencaSelecionados = new Set();
            this.presencaUltimoSelecionado = null;
        }
    }
    
    // Handler de clique para seleção
    handlePresencaClick(event, input) {
        this.initPresencaSelecao();
        
        // Ctrl+Shift ou Shift = seleção em range
        if (event.shiftKey && this.presencaUltimoSelecionado) {
            event.preventDefault();
            
            const diaInicio = parseInt(this.presencaUltimoSelecionado.dataset.dia);
            const diaFim = parseInt(input.dataset.dia);
            
            // Se é a mesma coluna (mesmo dia), selecionar verticalmente
            if (diaInicio === diaFim) {
                const dia = diaInicio;
                const celulasColuna = Array.from(document.querySelectorAll(`.presenca-input[data-dia="${dia}"]`));
                const startIdx = celulasColuna.indexOf(this.presencaUltimoSelecionado);
                const endIdx = celulasColuna.indexOf(input);
                
                const minIdx = Math.min(startIdx, endIdx);
                const maxIdx = Math.max(startIdx, endIdx);
                
                // Se não tem Ctrl, limpar seleção anterior
                if (!event.ctrlKey) {
                    this.limparSelecaoPresenca();
                }
                
                // Selecionar todas as células da coluna no range
                for (let i = minIdx; i <= maxIdx; i++) {
                    this.presencaSelecionados.add(celulasColuna[i]);
                    celulasColuna[i].classList.add('presenca-selecionado');
                }
            } else {
                // Seleção horizontal (diferentes dias)
                const allInputs = Array.from(document.querySelectorAll('.presenca-input'));
                const startIdx = allInputs.indexOf(this.presencaUltimoSelecionado);
                const endIdx = allInputs.indexOf(input);
                
                const minIdx = Math.min(startIdx, endIdx);
                const maxIdx = Math.max(startIdx, endIdx);
                
                if (!event.ctrlKey) {
                    this.limparSelecaoPresenca();
                }
                
                for (let i = minIdx; i <= maxIdx; i++) {
                    this.presencaSelecionados.add(allInputs[i]);
                    allInputs[i].classList.add('presenca-selecionado');
                }
            }
            
            return;
        }
        
        // Ctrl = toggle seleção individual
        if (event.ctrlKey) {
            if (this.presencaSelecionados.has(input)) {
                this.presencaSelecionados.delete(input);
                input.classList.remove('presenca-selecionado');
            } else {
                this.presencaSelecionados.add(input);
                input.classList.add('presenca-selecionado');
            }
            this.presencaUltimoSelecionado = input;
            return;
        }
        
        // Clique normal - limpar seleção e marcar como ponto de partida
        this.limparSelecaoPresenca();
        this.presencaUltimoSelecionado = input;
    }
    
    // Limpar seleção
    limparSelecaoPresenca() {
        if (this.presencaSelecionados) {
            this.presencaSelecionados.forEach(inp => {
                inp.classList.remove('presenca-selecionado');
            });
            this.presencaSelecionados.clear();
        }
    }
    
    // Navegação por setas na tabela de presença
    navegarPresenca(input, direcao) {
        const row = input.closest('tr');
        if (!row) return;
        
        const dia = parseInt(input.dataset.dia);
        const funcId = input.dataset.func;
        
        let targetInput = null;
        
        switch (direcao) {
            case 'ArrowRight':
                // Próximo dia na mesma linha
                const proximoDia = dia + 1;
                targetInput = row.querySelector(`.presenca-input[data-dia="${proximoDia}"]`);
                break;
                
            case 'ArrowLeft':
                // Dia anterior na mesma linha
                const diaAnterior = dia - 1;
                if (diaAnterior >= 1) {
                    targetInput = row.querySelector(`.presenca-input[data-dia="${diaAnterior}"]`);
                }
                break;
                
            case 'ArrowDown':
                // Mesmo dia na próxima linha (próximo funcionário)
                const proximaLinha = row.nextElementSibling;
                if (proximaLinha && !proximaLinha.classList.contains('linha-total-dia')) {
                    targetInput = proximaLinha.querySelector(`.presenca-input[data-dia="${dia}"]`);
                }
                break;
                
            case 'ArrowUp':
                // Mesmo dia na linha anterior (funcionário anterior)
                const linhaAnterior = row.previousElementSibling;
                if (linhaAnterior) {
                    targetInput = linhaAnterior.querySelector(`.presenca-input[data-dia="${dia}"]`);
                }
                break;
        }
        
        if (targetInput) {
            targetInput.focus();
            targetInput.select();
            this.destacarLinhaPresenca(targetInput);
        }
    }
    
    // Destacar linha da célula selecionada
    destacarLinhaPresenca(input) {
        // Remover destaque de todas as linhas
        document.querySelectorAll('.presenca-linha-ativa').forEach(row => {
            row.classList.remove('presenca-linha-ativa');
        });
        
        // Adicionar destaque na linha atual
        const row = input.closest('tr');
        if (row && !row.classList.contains('linha-total-dia') && !row.classList.contains('linha-faltas-dia')) {
            row.classList.add('presenca-linha-ativa');
        }
    }
    
    // Handler de teclas para navegação e aplicação em massa
    handlePresencaKeydown(event, input) {
        // Tecla C = Adicionar/Editar comentário na célula
        if (event.key.toUpperCase() === 'C' && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            this.abrirComentarioCelula(input);
            return;
        }
        
        // Navegação por setas
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            this.navegarPresenca(input, event.key);
            return;
        }
        
        if (event.key === 'Enter') {
            event.preventDefault();
            this.navegarPresenca(input, 'ArrowRight');
            return;
        }
        
        if (event.key === 'Escape') {
            this.limparSelecaoPresenca();
            return;
        }
        
        // Aplicar valor em todas as células selecionadas
        this.initPresencaSelecao();
        
        // Verificar se tem células selecionadas (mais de 1)
        if (this.presencaSelecionados && this.presencaSelecionados.size > 1) {
            const tecla = event.key.toUpperCase();
            
            // Ponto ou hífen = folga (azul claro)
            if (tecla === '.' || event.key === '.' || event.key === '-') {
                event.preventDefault();
                this.presencaSelecionados.forEach(inp => {
                    inp.value = '';
                    inp.dataset.folga = 'true';
                    inp.className = 'presenca-input dia-folga-input';
                    if (inp.dataset.comentario) {
                        inp.classList.add('tem-comentario');
                    }
                    this.salvarPresencaIndividual(inp);
                });
                this.limparSelecaoPresenca();
                this.calcularTotaisPresenca();
                this.showToast('Folga aplicada nas células selecionadas', 'success');
                return;
            }
            
            // Valores válidos: P, F, A, N
            if (['P', 'F', 'A', 'N'].includes(tecla)) {
                event.preventDefault();
                this.presencaSelecionados.forEach(inp => {
                    inp.value = tecla;
                    inp.dataset.folga = 'false';
                    inp.className = 'presenca-input';
                    inp.classList.add(`status-${tecla.toLowerCase()}`);
                    if (inp.dataset.comentario) {
                        inp.classList.add('tem-comentario');
                    }
                    this.salvarPresencaIndividual(inp);
                });
                this.limparSelecaoPresenca();
                this.calcularTotaisPresenca();
                this.showToast(`${tecla} aplicado nas células selecionadas`, 'success');
                return;
            }
        }
    }
    
    // Abrir caixa de comentário na célula (Alt+Shift+A)
    abrirComentarioCelula(input) {
        const funcId = input.dataset.func;
        const dia = input.dataset.dia;
        const comentarioAtual = input.dataset.comentario || '';
        
        // Criar modal de comentário
        const modalExistente = document.getElementById('modalComentarioCelula');
        if (modalExistente) modalExistente.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modalComentarioCelula';
        modal.className = 'modal-comentario-celula';
        modal.innerHTML = `
            <div class="modal-comentario-content">
                <div class="modal-comentario-header">
                    <h4>📝 Comentário - Dia ${dia}</h4>
                    <span class="modal-comentario-close" onclick="syscontrole.fecharComentarioCelula()">&times;</span>
                </div>
                <div class="modal-comentario-body">
                    <textarea id="comentarioCelulaTexto" placeholder="Digite o comentário..." autofocus>${comentarioAtual}</textarea>
                </div>
                <div class="modal-comentario-footer">
                    <button class="btn btn-danger btn-sm" onclick="syscontrole.removerComentarioCelula('${funcId}', '${dia}')">🗑️ Remover</button>
                    <button class="btn btn-primary btn-sm" onclick="syscontrole.salvarComentarioCelula('${funcId}', '${dia}')">💾 Salvar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focar no textarea
        setTimeout(() => {
            const textarea = document.getElementById('comentarioCelulaTexto');
            if (textarea) {
                textarea.focus();
                textarea.select();
            }
        }, 100);
        
        // Enter para salvar
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.salvarComentarioCelula(funcId, dia);
            }
            if (e.key === 'Escape') {
                this.fecharComentarioCelula();
            }
        });
    }
    
    // Salvar comentário da célula
    async salvarComentarioCelula(funcId, dia) {
        const textarea = document.getElementById('comentarioCelulaTexto');
        const texto = textarea ? textarea.value.trim() : '';
        
        try {
            const response = await fetch('/api/controle-presenca/comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funcionarioId: funcId, dia: dia, comentario: texto })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Atualizar célula
                const input = document.querySelector(`.presenca-input[data-func="${funcId}"][data-dia="${dia}"]`);
                if (input) {
                    if (texto) {
                        input.dataset.comentario = texto;
                        input.classList.add('tem-comentario');
                        input.title = texto;
                    } else {
                        delete input.dataset.comentario;
                        input.classList.remove('tem-comentario');
                        input.title = '';
                    }
                }
                
                this.fecharComentarioCelula();
                this.showToast('Comentário salvo!', 'success');
            } else {
                this.showToast('Erro ao salvar comentário', 'error');
            }
        } catch (err) {
            console.error('Erro ao salvar comentário:', err);
            this.showToast('Erro ao salvar comentário', 'error');
        }
    }
    
    // Remover comentário da célula
    async removerComentarioCelula(funcId, dia) {
        try {
            const response = await fetch('/api/controle-presenca/comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funcionarioId: funcId, dia: dia, comentario: '' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const input = document.querySelector(`.presenca-input[data-func="${funcId}"][data-dia="${dia}"]`);
                if (input) {
                    delete input.dataset.comentario;
                    input.classList.remove('tem-comentario');
                    input.title = '';
                }
                
                this.fecharComentarioCelula();
                this.showToast('Comentário removido!', 'success');
            }
        } catch (err) {
            console.error('Erro ao remover comentário:', err);
        }
    }
    
    // Fechar modal de comentário
    fecharComentarioCelula() {
        const modal = document.getElementById('modalComentarioCelula');
        if (modal) modal.remove();
    }
    
    // Duplo clique para adicionar comentário ou aplicar folga na coluna
    adicionarComentarioPresenca(input) {
        this.initPresencaSelecao();
        
        // Se a célula está marcada como folga (ponto) E não tem seleção múltipla, aplicar folga em toda a coluna
        if (input.dataset.folga === 'true' && input.value === '' && (!this.presencaSelecionados || this.presencaSelecionados.size <= 1)) {
            const dia = input.dataset.dia;
            const confirmar = confirm(`Aplicar folga (fim de semana/feriado) para TODOS os funcionários no dia ${dia}?`);
            
            if (confirmar) {
                // Pegar todas as células do mesmo dia
                const todasCelulas = document.querySelectorAll(`.presenca-input[data-dia="${dia}"]`);
                todasCelulas.forEach(inp => {
                    inp.value = '';
                    inp.dataset.folga = 'true';
                    inp.className = 'presenca-input dia-folga-input';
                    if (inp.dataset.comentario) {
                        inp.classList.add('tem-comentario');
                    }
                    this.salvarPresencaIndividual(inp);
                });
                this.showToast(`Folga aplicada para todos no dia ${dia}`, 'success');
                this.calcularTotaisPresenca();
            }
            return;
        }
        
        // Se tem células selecionadas, abrir modal para comentário em múltiplas células
        if (this.presencaSelecionados && this.presencaSelecionados.size > 1) {
            this.abrirComentarioMultiplasCelulas(Array.from(this.presencaSelecionados));
        } else {
            // Abrir modal de comentário para célula única
            this.abrirComentarioCelula(input);
        }
    }
    
    // Abrir modal para comentário em múltiplas células
    abrirComentarioMultiplasCelulas(celulas) {
        const qtd = celulas.length;
        
        // Criar modal de comentário
        const modalExistente = document.getElementById('modalComentarioCelula');
        if (modalExistente) modalExistente.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modalComentarioCelula';
        modal.className = 'modal-comentario-celula';
        modal.innerHTML = `
            <div class="modal-comentario-content">
                <div class="modal-comentario-header">
                    <h4>📝 Comentário para ${qtd} células selecionadas</h4>
                    <span class="modal-comentario-close" onclick="syscontrole.fecharComentarioCelula()">&times;</span>
                </div>
                <div class="modal-comentario-body">
                    <p style="font-size: 12px; color: #666; margin-bottom: 10px;">O comentário será aplicado em todas as ${qtd} células selecionadas.</p>
                    <textarea id="comentarioCelulaTexto" placeholder="Digite o comentário..." autofocus></textarea>
                </div>
                <div class="modal-comentario-footer">
                    <button class="btn btn-danger btn-sm" onclick="syscontrole.removerComentarioMultiplasCelulas()">🗑️ Remover de Todas</button>
                    <button class="btn btn-primary btn-sm" onclick="syscontrole.salvarComentarioMultiplasCelulas()">💾 Salvar em Todas</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Guardar referência das células selecionadas
        this.celulasParaComentario = celulas;
        
        // Focar no textarea
        setTimeout(() => {
            const textarea = document.getElementById('comentarioCelulaTexto');
            if (textarea) {
                textarea.focus();
            }
        }, 100);
        
        // Enter para salvar
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.salvarComentarioMultiplasCelulas();
            }
            if (e.key === 'Escape') {
                this.fecharComentarioCelula();
            }
        });
    }
    
    // Salvar comentário em múltiplas células
    async salvarComentarioMultiplasCelulas() {
        const textarea = document.getElementById('comentarioCelulaTexto');
        const texto = textarea ? textarea.value.trim() : '';
        
        if (!texto) {
            this.showToast('Digite um comentário', 'error');
            return;
        }
        
        if (!this.celulasParaComentario || this.celulasParaComentario.length === 0) {
            this.fecharComentarioCelula();
            return;
        }
        
        let salvos = 0;
        
        for (const input of this.celulasParaComentario) {
            const funcId = input.dataset.func;
            const dia = input.dataset.dia;
            
            try {
                const response = await fetch('/api/controle-presenca/comentario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ funcionarioId: funcId, dia: dia, comentario: texto })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    input.dataset.comentario = texto;
                    input.classList.add('tem-comentario');
                    input.title = texto;
                    salvos++;
                }
            } catch (err) {
                console.error('Erro ao salvar comentário:', err);
            }
        }
        
        this.fecharComentarioCelula();
        this.limparSelecaoPresenca();
        this.showToast(`Comentário salvo em ${salvos} células!`, 'success');
    }
    
    // Remover comentário de múltiplas células
    async removerComentarioMultiplasCelulas() {
        if (!this.celulasParaComentario || this.celulasParaComentario.length === 0) {
            this.fecharComentarioCelula();
            return;
        }
        
        let removidos = 0;
        
        for (const input of this.celulasParaComentario) {
            const funcId = input.dataset.func;
            const dia = input.dataset.dia;
            
            try {
                const response = await fetch('/api/controle-presenca/comentario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ funcionarioId: funcId, dia: dia, comentario: '' })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    delete input.dataset.comentario;
                    input.classList.remove('tem-comentario');
                    input.title = '';
                    removidos++;
                }
            } catch (err) {
                console.error('Erro ao remover comentário:', err);
            }
        }
        
        this.fecharComentarioCelula();
        this.limparSelecaoPresenca();
        this.showToast(`Comentário removido de ${removidos} células!`, 'success');
    }
    
    // Salvar comentário no servidor
    async salvarComentarioPresenca(funcId, dia, comentario) {
        try {
            await fetch('/api/controle-presenca/comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funcionarioId: funcId, dia: parseInt(dia), comentario })
            });
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
        }
    }
    
    // Marcar presença
    async marcarPresenca(input) {
        const funcionarioId = input.dataset.func;
        const dia = parseInt(input.dataset.dia);
        const status = input.value.toUpperCase().trim();
        const isFolga = input.dataset.folga === 'true';
        
        input.value = status;
        this.formatarPresenca(input);
        
        try {
            await fetch('/api/controle-presenca/marcar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funcionarioId, dia, status, isFolga })
            });
            
            // Recalcular totais
            this.calcularTotaisPresenca();
            
        } catch (error) {
            console.error('Erro ao marcar presença:', error);
        }
    }
    
    // Calcular totais de presença
    calcularTotaisPresenca() {
        const inputs = document.querySelectorAll('.presenca-input');
        const totaisPorFunc = {};
        const totaisPorDia = { p: {}, f: {} };
        const totaisPorFuncao = {};
        let totalGeralP = 0;
        let totalGeralF = 0;
        
        // Inicializar totais por dia
        for (let dia = 1; dia <= (this.presencaDiasNoMes || 31); dia++) {
            totaisPorDia.p[dia] = 0;
            totaisPorDia.f[dia] = 0;
        }
        
        inputs.forEach(input => {
            const funcId = input.dataset.func;
            const dia = parseInt(input.dataset.dia);
            const funcao = input.dataset.funcao || '';
            const status = input.value.toUpperCase();
            
            // Totais por funcionário
            if (!totaisPorFunc[funcId]) {
                totaisPorFunc[funcId] = { p: 0, f: 0 };
            }
            
            // Totais por função
            if (funcao && !totaisPorFuncao[funcao]) {
                totaisPorFuncao[funcao] = { dias: {}, totalP: 0, totalF: 0 };
                for (let d = 1; d <= (this.presencaDiasNoMes || 31); d++) {
                    totaisPorFuncao[funcao].dias[d] = 0;
                }
            }
            
            if (status === 'P') {
                totaisPorFunc[funcId].p++;
                totaisPorDia.p[dia]++;
                totalGeralP++;
                if (funcao) {
                    totaisPorFuncao[funcao].dias[dia]++;
                    totaisPorFuncao[funcao].totalP++;
                }
            } else if (status === 'F') {
                totaisPorFunc[funcId].f++;
                totaisPorDia.f[dia]++;
                totalGeralF++;
                if (funcao) {
                    totaisPorFuncao[funcao].totalF++;
                }
            }
        });
        
        // Atualizar totais por funcionário
        for (const funcId in totaisPorFunc) {
            const totalP = document.getElementById(`totalP_${funcId}`);
            const totalF = document.getElementById(`totalF_${funcId}`);
            if (totalP) totalP.textContent = totaisPorFunc[funcId].p;
            if (totalF) totalF.textContent = totaisPorFunc[funcId].f;
        }
        
        // Atualizar totais por dia
        for (let dia = 1; dia <= (this.presencaDiasNoMes || 31); dia++) {
            const totalDiaP = document.getElementById(`totalDiaP_${dia}`);
            const totalDiaF = document.getElementById(`totalDiaF_${dia}`);
            if (totalDiaP) totalDiaP.textContent = totaisPorDia.p[dia];
            if (totalDiaF) totalDiaF.textContent = totaisPorDia.f[dia];
        }
        
        // Atualizar totais gerais
        const totalGeralPEl = document.getElementById('totalGeralP');
        const totalGeralFEl = document.getElementById('totalGeralF');
        if (totalGeralPEl) totalGeralPEl.textContent = totalGeralP;
        if (totalGeralFEl) totalGeralFEl.textContent = totalGeralF;
        
        // Atualizar totais por função
        for (const funcao in totaisPorFuncao) {
            const funcaoKey = funcao.replace(/\s/g, '_');
            for (let dia = 1; dia <= (this.presencaDiasNoMes || 31); dia++) {
                const el = document.getElementById(`funcao_${funcaoKey}_dia_${dia}`);
                if (el) el.textContent = totaisPorFuncao[funcao].dias[dia];
            }
            const totalPEl = document.getElementById(`funcao_${funcaoKey}_totalP`);
            const totalFEl = document.getElementById(`funcao_${funcaoKey}_totalF`);
            if (totalPEl) totalPEl.textContent = totaisPorFuncao[funcao].totalP;
            if (totalFEl) totalFEl.textContent = totaisPorFuncao[funcao].totalF;
        }
        
        // Atualizar GERAL
        const geralTotalP = document.getElementById('geralTotalP');
        const geralTotalF = document.getElementById('geralTotalF');
        if (geralTotalP) geralTotalP.textContent = totalGeralP;
        if (geralTotalF) geralTotalF.textContent = totalGeralF;
        
        // Marcar colunas de folga
        this.marcarColunasFollga();
    }
    
    // Marcar colunas de folga nas linhas de totais e funções
    marcarColunasFollga() {
        const diasNoMes = this.presencaDiasNoMes || 31;
        
        // Para cada dia, verificar se a maioria dos funcionários tem folga
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const inputsDia = document.querySelectorAll(`.presenca-input[data-dia="${dia}"]`);
            let totalFolgas = 0;
            let total = 0;
            
            inputsDia.forEach(input => {
                total++;
                if (input.dataset.folga === 'true' && input.value === '') {
                    totalFolgas++;
                }
            });
            
            // Se mais de 50% dos funcionários tem folga nesse dia, marcar a coluna
            const isFolgaDia = total > 0 && (totalFolgas / total) > 0.5;
            
            // Marcar células de TOTAL DO DIA
            const totalDiaP = document.getElementById(`totalDiaP_${dia}`);
            const totalDiaF = document.getElementById(`totalDiaF_${dia}`);
            if (totalDiaP) {
                totalDiaP.classList.toggle('coluna-folga', isFolgaDia);
            }
            if (totalDiaF) {
                totalDiaF.classList.toggle('coluna-folga', isFolgaDia);
            }
            
            // Marcar cabeçalho da seção FUNÇÃO
            const headerDia = document.querySelector(`.header-funcao .header-dia[data-dia="${dia}"]`);
            if (headerDia) {
                headerDia.classList.toggle('coluna-folga', isFolgaDia);
            }
            
            // Marcar células das linhas por função
            const funcaoDias = document.querySelectorAll(`.funcao-dia[data-dia="${dia}"]`);
            funcaoDias.forEach(el => {
                el.classList.toggle('coluna-folga', isFolgaDia);
            });
        }
    }
    
    // Fechar modal de controle de presença
    fecharControlePresenca() {
        document.getElementById('modalControlePresenca').style.display = 'none';
        // Limpar filtros ao fechar
        this.limparFiltrosPresenca();
        // Remover listener de teclado
        if (this.presencaKeyListener) {
            document.removeEventListener('keydown', this.presencaKeyListener);
            this.presencaKeyListener = null;
        }
    }
    
    // Salvar ocorrência do dia
    async salvarOcorrencia() {
        const textarea = document.getElementById('ocorrenciasTexto');
        const texto = textarea.value.trim();
        
        if (!texto) {
            this.showToast('Digite uma ocorrência antes de salvar', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/ocorrencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Ocorrência salva com sucesso!', 'success');
                textarea.value = '';
                this.carregarOcorrencias();
            } else {
                this.showToast('Erro ao salvar: ' + result.error, 'error');
            }
        } catch (err) {
            console.error('Erro ao salvar ocorrência:', err);
            this.showToast('Erro ao salvar ocorrência', 'error');
        }
    }
    
    // Carregar histórico de ocorrências
    async carregarOcorrencias() {
        try {
            const response = await fetch('/api/ocorrencias');
            const result = await response.json();
            
            const lista = document.getElementById('ocorrenciasLista');
            if (!lista) return;
            
            if (!result.data || result.data.length === 0) {
                lista.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">Nenhuma ocorrência registrada</div>';
                return;
            }
            
            lista.innerHTML = result.data.map(oc => `
                <div class="ocorrencia-item">
                    <div class="ocorrencia-data">📅 ${this.formatarDataHora(oc.data)}</div>
                    <div class="ocorrencia-texto">${oc.texto}</div>
                    <div class="ocorrencia-acoes">
                        <button class="btn-excluir-ocorrencia" onclick="syscontrole.excluirOcorrencia('${oc.id}')">🗑️ Excluir</button>
                    </div>
                </div>
            `).join('');
            
        } catch (err) {
            console.error('Erro ao carregar ocorrências:', err);
        }
    }
    
    // Excluir ocorrência
    async excluirOcorrencia(id) {
        if (!confirm('Tem certeza que deseja excluir esta ocorrência?')) return;
        
        try {
            const response = await fetch(`/api/ocorrencias/${id}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Ocorrência excluída!', 'success');
                this.carregarOcorrencias();
            } else {
                this.showToast('Erro ao excluir', 'error');
            }
        } catch (err) {
            console.error('Erro ao excluir ocorrência:', err);
        }
    }
    
    // Formatar data e hora
    formatarDataHora(dataISO) {
        if (!dataISO) return '';
        const data = new Date(dataISO);
        return data.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Filtrar tabela de presença
    filtrarPresenca() {
        const filtroNome = (document.getElementById('presencaFiltroNome')?.value || '').toLowerCase().trim();
        const filtroEmpresa = (document.getElementById('presencaFiltroEmpresa')?.value || '').toLowerCase().trim();
        const filtroFuncao = (document.getElementById('presencaFiltroFuncao')?.value || '').toLowerCase().trim();
        
        const tbody = document.getElementById('presencaBody');
        if (!tbody) return;
        
        const linhas = tbody.querySelectorAll('tr');
        let visiveis = 0;
        
        linhas.forEach(linha => {
            // Ignorar linhas de totais, funções e separadores
            if (linha.classList.contains('linha-total-dia') || 
                linha.classList.contains('linha-faltas-dia') ||
                linha.classList.contains('separador-funcao') ||
                linha.classList.contains('header-funcao') ||
                linha.classList.contains('linha-funcao') ||
                linha.classList.contains('linha-geral')) {
                return;
            }
            
            const colunas = linha.querySelectorAll('td');
            if (colunas.length < 3) return;
            
            const empresa = (colunas[0]?.textContent || '').toLowerCase();
            const nome = (colunas[1]?.textContent || '').toLowerCase();
            const funcao = (colunas[2]?.textContent || '').toLowerCase();
            
            const matchNome = !filtroNome || nome.includes(filtroNome);
            const matchEmpresa = !filtroEmpresa || empresa.includes(filtroEmpresa);
            const matchFuncao = !filtroFuncao || funcao.includes(filtroFuncao);
            
            if (matchNome && matchEmpresa && matchFuncao) {
                linha.style.display = '';
                visiveis++;
            } else {
                linha.style.display = 'none';
            }
        });
        
        // Atualizar contador
        const qtdFunc = document.getElementById('presencaQtdFunc');
        if (qtdFunc) {
            qtdFunc.textContent = `${visiveis} funcionários encontrados`;
        }
    }
    
    // Limpar filtros de presença
    limparFiltrosPresenca() {
        const filtroNome = document.getElementById('presencaFiltroNome');
        const filtroEmpresa = document.getElementById('presencaFiltroEmpresa');
        const filtroFuncao = document.getElementById('presencaFiltroFuncao');
        
        if (filtroNome) filtroNome.value = '';
        if (filtroEmpresa) filtroEmpresa.value = '';
        if (filtroFuncao) filtroFuncao.value = '';
        
        // Mostrar todas as linhas
        const tbody = document.getElementById('presencaBody');
        if (tbody) {
            const linhas = tbody.querySelectorAll('tr');
            linhas.forEach(linha => {
                linha.style.display = '';
            });
        }
        
        // Restaurar contador original
        this.atualizarContadorPresenca();
    }
    
    // Atualizar contador de funcionários na presença
    atualizarContadorPresenca() {
        const tbody = document.getElementById('presencaBody');
        if (!tbody) return;
        
        let total = 0;
        const linhas = tbody.querySelectorAll('tr');
        linhas.forEach(linha => {
            if (!linha.classList.contains('linha-total-dia') && 
                !linha.classList.contains('linha-faltas-dia') &&
                !linha.classList.contains('separador-funcao') &&
                !linha.classList.contains('header-funcao') &&
                !linha.classList.contains('linha-funcao') &&
                !linha.classList.contains('linha-geral') &&
                linha.style.display !== 'none') {
                const colunas = linha.querySelectorAll('td');
                if (colunas.length >= 3) total++;
            }
        });
        
        const qtdFunc = document.getElementById('presencaQtdFunc');
        if (qtdFunc) {
            qtdFunc.textContent = `${total} funcionários ativos`;
        }
    }
    
    // Exportar controle de presença para Excel
    async exportarControlePresenca() {
        try {
            this.showToast('Exportando presença...', 'info');
            
            const response = await fetch('/api/controle-presenca/exportar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: 'CONTROLE DE PRESENÇA' })
            });
            
            if (!response.ok) throw new Error('Erro ao exportar');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'Presenca.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showToast('Presença exportada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.showToast('Erro ao exportar presença', 'error');
        }
    }
    
    // Abrir modal de habilitar cursos
    async abrirHabilitarCursos() {
        try {
            console.log('🔵 ABRINDO MODAL - Setando flag para TRUE');
            this.modalHabilitarAberta = true;
            document.body.classList.add('modal-open');
            
            // Cancelar todos os timers pendentes
            console.log('⏰ Cancelando', this.updateTimers.length, 'timers pendentes');
            this.updateTimers.forEach(timer => clearTimeout(timer));
            this.updateTimers = [];
            
            const response = await fetch('/api/habilitar-cursos');
            if (!response.ok) throw new Error('Erro ao carregar cursos');
            
            const cursos = await response.json();
            
            // Marcar checkboxes conforme banco de dados
            cursos.forEach(curso => {
                const cursoId = curso.curso.toLowerCase().replace(/-/g, '');
                const checkbox = document.getElementById(`chk_${cursoId}`);
                if (checkbox) {
                    checkbox.checked = curso.habilitado === 1;
                } else {
                    console.log(`Checkbox não encontrado: chk_${cursoId}`);
                }
            });
            
            document.getElementById('modalHabilitarCursos').style.display = 'flex';
            
            // Adicionar evento ESC para fechar
            this.escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.fecharHabilitarCursos();
                }
            };
            document.addEventListener('keydown', this.escHandler);
        } catch (error) {
            console.error('Erro ao abrir habilitar cursos:', error);
            this.showToast('Erro ao carregar configurações de cursos', 'error');
            this.modalHabilitarAberta = false;
            document.body.classList.remove('modal-open');
        }
    }
    
    // Fechar modal de habilitar cursos
    fecharHabilitarCursos() {
        this.modalHabilitarAberta = false;
        document.body.classList.remove('modal-open');
        document.getElementById('modalHabilitarCursos').style.display = 'none';
        
        // Remover evento ESC
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }
    
    // Salvar configurações de cursos habilitados
    async salvarHabilitarCursos() {
        const cursos = ['ASO', 'NR-06', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-18', 'NR-20', 'NR-33', 'NR-34', 'NR-35', 'EPI'];
        const cursosHabilitados = [];
        
        cursos.forEach(curso => {
            const cursoId = curso.toLowerCase().replace(/-/g, '');
            const checkbox = document.getElementById(`chk_${cursoId}`);
            if (checkbox) {
                cursosHabilitados.push({
                    curso: curso,
                    habilitado: checkbox.checked ? 1 : 0
                });
            }
        });
        
        try {
            const response = await fetch('/api/habilitar-cursos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cursos: cursosHabilitados })
            });
            
            if (response.ok) {
                // Invalidar cache para forçar recarregar
                this.cursosHabilitadosCache = null;
                
                this.showToast('Configurações salvas com sucesso!', 'success');
                this.fecharHabilitarCursos();
                
                // Atualizar visibilidade dos cursos no rodapé e tabela
                await this.atualizarVisibilidadeCursosRodape();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta do servidor:', errorData);
            }
        } catch (error) {
            console.error('Erro ao salvar cursos:', error);
        }
    }
    
    // Atualizar visibilidade dos cursos no rodapé baseado na configuração

    // Aplicar visibilidade das colunas usando cache (síncrono, sem tremor)

    // Carregar cache de cursos habilitados (chamado na inicialização)
    async carregarCacheCursos() {
        try {
            const response = await fetch('/api/habilitar-cursos');
            if (response.ok) {
                this.cursosHabilitadosCache = await response.json();
                console.log(' Cache de cursos carregado:', this.cursosHabilitadosCache.length, 'cursos');
            }
        } catch (error) {
            console.error('Erro ao carregar cache de cursos:', error);
        }
    }
    aplicarVisibilidadeColunasCache() {
        if (!this.cursosHabilitadosCache) return;
        
        const mapeamentoCursos = {
            'ASO': { id: 'aso', colIndex: 6 },
            'NR-06': { id: 'nr06', colIndex: 7 },
            'NR-10': { id: 'nr10', colIndex: 8 },
            'NR-11': { id: 'nr11', colIndex: 9 },
            'NR-12': { id: 'nr12', colIndex: 10 },
            'NR-17': { id: 'nr17', colIndex: 11 },
            'NR-18': { id: 'nr18', colIndex: 12 },
            'NR-20': { id: 'nr20', colIndex: 13 },
            'NR-33': { id: 'nr33', colIndex: 14 },
            'NR-34': { id: 'nr34', colIndex: 15 },
            'NR-35': { id: 'nr35', colIndex: 16 },
            'EPI': { id: 'epi', colIndex: 17 }
        };

        const tabela = document.getElementById('tabelaSSMA');
        const thead = tabela?.querySelector('thead tr');
        const tbody = tabela?.querySelector('tbody');

        this.cursosHabilitadosCache.forEach(curso => {
            const mapeamento = mapeamentoCursos[curso.curso];
            if (mapeamento) {
                const mostrar = curso.habilitado === 1;
                const displayValue = mostrar ? '' : 'none';

                // Ocultar/mostrar coluna na tabela (cabeçalho)
                if (thead) {
                    const thElement = thead.children[mapeamento.colIndex];
                    if (thElement) thElement.style.display = displayValue;
                }

                // Ocultar/mostrar coluna na tabela (dados)
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const tdElement = row.children[mapeamento.colIndex];
                        if (tdElement) tdElement.style.display = displayValue;
                    });
                }

                // Ocultar/mostrar no RODAPÉ
                const filterElement = document.getElementById(`filter-${mapeamento.id}`);
                if (filterElement) {
                    const parentGroup = filterElement.closest('.course-filter-group');
                    if (parentGroup) {
                        parentGroup.style.display = mostrar ? 'flex' : 'none';
                    }
                }
            }
        });
    }
    async atualizarVisibilidadeCursosRodape() {
        // Não atualizar se a modal estiver aberta
        if (this.modalHabilitarAberta) {
            console.log('🚫 Bloqueado: Modal aberta (verificação 1)');
            return;
        }
        
        try {
            const response = await fetch('/api/habilitar-cursos');
            if (!response.ok) throw new Error('Erro ao carregar cursos');
            
            // Verificar novamente após o fetch
            if (this.modalHabilitarAberta) {
                console.log('🚫 Bloqueado: Modal aberta (verificação 2 - após fetch)');
                return;
            }
            
            const cursos = await response.json();
            
            // Mapear cursos para seus IDs no rodapé e índices das colunas na tabela
            const mapeamentoCursos = {
                'ASO': { id: 'aso', colIndex: 6 },
                'NR-06': { id: 'nr06', colIndex: 7 },
                'NR-10': { id: 'nr10', colIndex: 8 },
                'NR-11': { id: 'nr11', colIndex: 9 },
                'NR-12': { id: 'nr12', colIndex: 10 },
                'NR-17': { id: 'nr17', colIndex: 11 },
                'NR-18': { id: 'nr18', colIndex: 12 },
                'NR-20': { id: 'nr20', colIndex: 13 },
                'NR-33': { id: 'nr33', colIndex: 14 },
                'NR-34': { id: 'nr34', colIndex: 15 },
                'NR-35': { id: 'nr35', colIndex: 16 },
                'EPI': { id: 'epi', colIndex: 17 }
            };
            
            // Usar requestAnimationFrame para atualização suave e sem tremor
            requestAnimationFrame(() => {
                // Verificar novamente se a modal não foi aberta durante o fetch
                if (this.modalHabilitarAberta) {
                    console.log('🚫 Bloqueado: Modal aberta (verificação 3 - requestAnimationFrame)');
                    return;
                }
                
                console.log('✅ Atualizando visibilidade das colunas');
                const tabela = document.getElementById('tabelaSSMA');
                const thead = tabela?.querySelector('thead tr');
                const tbody = tabela?.querySelector('tbody');
                
                // Ocultar/mostrar cada curso no rodapé, na tabela e nas abas do formulário
                cursos.forEach(curso => {
                    const mapeamento = mapeamentoCursos[curso.curso];
                    if (mapeamento) {
                        const mostrar = curso.habilitado === 1;
                        const displayValue = mostrar ? '' : 'none';
                        
                        // Ocultar/mostrar no rodapé
                        const filterElement = document.getElementById(`filter-${mapeamento.id}`);
                        if (filterElement) {
                            const parentGroup = filterElement.closest('.course-filter-group');
                            if (parentGroup) {
                                parentGroup.style.display = mostrar ? 'flex' : 'none';
                            }
                        }
                        
                        // Ocultar/mostrar coluna na tabela (cabeçalho)
                        if (thead && !this.modalHabilitarAberta) {
                            const thElement = thead.children[mapeamento.colIndex];
                            if (thElement) {
                                thElement.style.display = displayValue;
                            }
                        }
                        
                        // Ocultar/mostrar coluna na tabela (dados)
                        if (tbody && !this.modalHabilitarAberta) {
                            const rows = tbody.querySelectorAll('tr');
                            rows.forEach(row => {
                                const tdElement = row.children[mapeamento.colIndex];
                                if (tdElement) {
                                    tdElement.style.display = displayValue;
                                }
                            });
                        }
                        
                        // Ocultar/mostrar aba no formulário de cadastro
                        const nrTab = document.querySelector(`.nr-tab[data-nr="${mapeamento.id}"]`);
                        if (nrTab) {
                            nrTab.style.display = displayValue;
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao atualizar visibilidade dos cursos:', error);
        }
    }
}

// Inicializar o sistema quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando SysControle...');
    window.syscontrole = new SysControleWeb();
});
