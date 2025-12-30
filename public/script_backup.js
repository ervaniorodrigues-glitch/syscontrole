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
        
        this.init();
    }
    
    init() {
        console.log('Inicializando SysControle Web...');
        this.bindEvents();
        
        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(() => {
            this.loadData();
        }, 100);
        
        // Carregar dados a cada 30 segundos (igual ao sistema desktop)
        setInterval(() => {
            this.loadData(false); // false = não mostrar loading
        }, 30000);
    }
    
    bindEvents() {
        // Botões da toolbar (igual ao sistema desktop)
        document.getElementById('btnBuscar').addEventListener('click', () => this.aplicarFiltros());
        document.getElementById('btnAdd').addEventListener('click', () => this.novoRegistro());
        document.getElementById('btnLimpar').addEventListener('click', () => this.limparTudo());
        document.getElementById('btnAtualizar').addEventListener('click', () => this.loadData());
        
        // Toggle Ativo/Inativo
        document.getElementById('chkAtivo').addEventListener('change', (e) => this.toggleAtivoInativo(e));
        
        // Controle das abas NR
        document.querySelectorAll('.nr-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const nrType = e.target.dataset.nr;
                this.switchNRTab(nrType);
            });
        });
        
        // Configurar eventos específicos das NRs
        this.setupNR10Events();
        this.setupNR11Events();
        this.setupNR12Events();
        this.setupNR17Events();
        this.setupNR18Events();
        this.setupNR33Events();
        this.setupNR35Events();
        this.setupEPIEvents();
        this.setupAllNREvents();
        
        // Preview da foto
        document.getElementById('foto').addEventListener('change', (e) => {
            this.previewFoto(e.target.files[0]);
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
        }
        
        // Cálculo automático de dias
        const vencimento = document.getElementById('vencimento');
        if (vencimento) {
            vencimento.addEventListener('change', () => this.calcularDiasEStatus());
            vencimento.addEventListener('input', () => this.calcularDiasEStatus());
        }
        
        // Botão Ativo/Inativo não precisa de event listener aqui pois usa onclick
        
        // Enter nos campos de filtro
        ['filtroNome', 'filtroEmpresa', 'filtroFuncao'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.aplicarFiltros();
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
            btnNovo.addEventListener('click', () => this.novoRegistro());
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
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.novoRegistro();
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
        try {
            if (showLoading) {
                this.showLoading();
            }
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.getFiltros()
            });
            
            console.log('Carregando dados da API...');
            const response = await fetch(`/api/ssma?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos:', data);
            
            if (data && data.data) {
                this.currentData = data.data;
                this.totalPages = data.totalPages || 1;
                this.renderTable(data.data);
                this.updatePagination(data);
                this.updateStats(data.data);
                this.updateToolbarState();
            } else {
                console.log('Nenhum dado encontrado');
                this.renderTable([]);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showToast('Erro de conexão com o servidor: ' + error.message, 'error');
            // Mostrar tabela vazia em caso de erro
            this.renderTable([]);
        }
    }
    
    // Renderizar tabela (igual ao sistema desktop)
    renderTable(data) {
        console.log('Renderizando tabela com', data.length, 'registros');
        const tbody = document.getElementById('tabelaBody');
        
        if (!tbody) {
            console.error('Elemento tabelaBody não encontrado!');
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('Nenhum dado para exibir');
            tbody.innerHTML = `
                <tr>
                    <td colspan="15" class="loading-cell">
                        <div style="text-align: center; padding: 40px;">
                            <span style="font-size: 48px;">📋</span>
                            <p style="margin: 10px 0; font-size: 16px; color: #6c757d;">Nenhum registro encontrado</p>
                            <button class="btn btn-primary" onclick="syscontrole.novoRegistro()">
                                <span class="btn-icon">➕</span>
                                <span class="btn-text">Adicionar Primeiro Registro</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log('Dados a serem renderizados:', data);
        
        tbody.innerHTML = data.map(item => `
            <tr data-id="${item.id}" onclick="syscontrole.selectRow(${item.id}, event)" ${this.selectedRows.has(item.id) ? 'class="selected"' : ''}>
                <td class="col-expand">▼</td>
                <td class="col-nome">
                    <div class="nome-principal">${item.Nome || ''}</div>
                    <div class="cadastro-data">Cadastro: ${this.formatDateForDisplay(item.Cadastro) || '09/12/2025'}</div>
                    <div class="situacao-linha">
                        <span class="situacao-label">Situação:</span>
                        <div class="toggle-mini-container">
                            <input type="checkbox" id="toggle-${item.id}" ${item.Situacao === 'S' ? 'checked' : ''} class="toggle-mini-input" onchange="syscontrole.toggleSituacaoLinha(${item.id}, this)">
                            <label for="toggle-${item.id}" class="toggle-mini-label">
                                <span class="toggle-mini-slider"></span>
                            </label>
                        </div>
                        <span class="situacao-text">${item.Situacao === 'S' ? 'Ativo' : 'Inativo'}</span>
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
                <td class="col-venc">${this.formatDateForDisplay(item.Nr10_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.Nr11_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.NR12_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.Nr17_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.NR18_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.NR33_Vencimento)}</td>
                <td class="col-venc">${this.formatDateForDisplay(item.NR35_Vencimento)}</td>
                <td class="col-venc">
                    <div class="venc-epi">${this.formatDateForDisplay(item.epiVencimento)}</div>
                    <div class="venc-epi-label">Venc-EPI</div>
                </td>
                <td class="col-foto">${this.renderFoto(item.fotoUrl, item.id)}</td>
            </tr>
        `).join('');
        
        console.log('Tabela renderizada com sucesso');
    }
    
    // Renderizar foto
    renderFoto(fotoUrl, id) {
        if (fotoUrl && fotoUrl !== 'null' && fotoUrl !== '') {
            return `<img src="${fotoUrl}" class="foto-thumbnail" alt="Foto" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="foto-placeholder" style="display:none;">👤</div>`;
        }
        
        return `<div class="foto-placeholder">👤</div>`;
    }
    
    // Formatar data para exibição
    formatDateForDisplay(dateString) {
        if (!dateString || dateString === 'null') return '';
        
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            // Verificar se está vencido (vermelho) ou próximo do vencimento (laranja)
            const today = new Date();
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
        } catch (error) {
            return '';
        }
    }
    
    // Renderizar badge de situação
    renderSituacaoBadge(situacao) {
        if (situacao === 'S') {
            return '<span class="situacao-ativo">Ativo</span>';
        } else {
            return '<span class="situacao-inativo">Inativo</span>';
        }
    }
    
    // Atualizar estatísticas (igual ao sistema desktop)
    updateStats(data) {
        // Contar registros por status
        let totalOK = 0, totalRenovar = 0, totalVencido = 0;
        
        data.forEach(item => {
            // Verificar todas as datas de vencimento
            const dates = [
                item.Vencimento, item.Nr10_Vencimento, item.Nr11_Vencimento,
                item.NR12_Vencimento, item.Nr17_Vencimento, item.NR18_Vencimento,
                item.NR33_Vencimento, item.NR35_Vencimento, item.epiVencimento
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
        
        // Atualizar contadores no rodapé
        const recordCount = document.querySelector('.record-count');
        const activeCount = document.querySelector('.active-count');
        const canceledCount = document.querySelector('.canceled-count');
        
        if (recordCount) recordCount.textContent = `📊 ${data.length} Localizados`;
        if (activeCount) activeCount.textContent = `${data.filter(item => item.Situacao === 'S').length} Ativo`;
        if (canceledCount) canceledCount.textContent = `${data.filter(item => item.Situacao === 'N').length} Cancelado`;
        
        // Atualizar barra de progresso do toggle
        this.updateProgressBar(data);
    }
    
    // Atualizar paginação (igual ao sistema desktop)
    updatePagination(data) {
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Pág ${data.page}/${data.totalPages}`;
        }
        
        // Atualizar botões
        document.getElementById('btnFirst').disabled = data.page <= 1;
        document.getElementById('btnPrev').disabled = data.page <= 1;
        document.getElementById('btnNext').disabled = data.page >= data.totalPages;
        document.getElementById('btnLast').disabled = data.page >= data.totalPages;
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
        
        const btnEditar = document.getElementById('btnEditar');
        if (btnEditar) btnEditar.disabled = !singleSelection;
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
        
        // Filtro de situação baseado no toggle
        const chkAtivo = document.getElementById('chkAtivo');
        if (chkAtivo) {
            filtros.situacao = chkAtivo.checked ? 'S' : 'N';
        }
        
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
                    situacao: isAtivo ? 'S' : 'N',
                    dataInativacao: isAtivo ? null : new Date().toISOString()
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast(`Funcionário ${action}do com sucesso!`, 'success');
                
                const chkAtivo = document.getElementById('chkAtivo');
                const toggleText = document.querySelector('.toggle-text');
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                
                // Se mudou o status e não está na visualização correta, remover e voltar para área inicial
                if ((!isAtivo && chkAtivo && chkAtivo.checked) || (isAtivo && chkAtivo && !chkAtivo.checked)) {
                    // Remover linha da tabela imediatamente
                    const row = toggleElement.closest('tr');
                    if (row) {
                        row.style.transition = 'opacity 0.3s ease';
                        row.style.opacity = '0';
                        setTimeout(() => {
                            row.remove();
                        }, 300);
                    }
                    
                    // Se ativou um funcionário (estava vendo inativos), voltar para área inicial (ativos)
                    if (isAtivo && chkAtivo && !chkAtivo.checked) {
                        setTimeout(() => {
                            // Resetar toggle para Ativo
                            chkAtivo.checked = true;
                            if (toggleText) toggleText.textContent = 'Ativo';
                            if (progressFill) progressFill.classList.remove('inactive');
                            if (progressText) progressText.classList.remove('inactive');
                            
                            // Limpar seleções
                            this.selectedRows.clear();
                            
                            // Recarregar dados mostrando ativos
                            this.loadData();
                        }, 500);
                    } else {
                        // Apenas atualizar dados na mesma visualização
                        setTimeout(() => {
                            this.loadData();
                        }, 500);
                    }
                } else {
                    // Atualizar estatísticas e barra de progresso
                    setTimeout(() => {
                        this.updateProgressBar(this.currentData);
                    }, 500);
                }
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
    async updateProgressBar(currentData) {
        try {
            // Buscar total de registros (sem filtro de situação)
            const response = await fetch('/api/ssma?page=1&limit=1000');
            const allData = await response.json();
            
            if (allData && allData.data) {
                const totalRegistros = allData.data.length;
                const totalAtivos = allData.data.filter(item => item.Situacao === 'S').length;
                const totalInativos = allData.data.filter(item => item.Situacao === 'N').length;
                
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
        } catch (error) {
            console.error('Erro ao atualizar barra de progresso:', error);
        }
    }
    
    // Paginação
    irParaPagina(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadData();
        }
    }
    
    // CRUD Operations (igual ao sistema desktop)
    novoRegistro() {
        console.log('=== FUNÇÃO NOVO REGISTRO CHAMADA ===');
        this.editingId = null;
        this.currentEditingData = null; // Limpar dados de edição
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Novo Registro';
        
        // Limpar formulário principal
        const formSSMA = document.getElementById('formSSMA');
        if (formSSMA) formSSMA.reset();
        
        const registroId = document.getElementById('registroId');
        if (registroId) registroId.value = '';
        
        // Limpar TODOS os campos de TODAS as abas
        this.limparTodosOsCampos();
        
        // Voltar para a aba ASO
        this.switchNRTab('aso');
        
        // Configurar botão para novo cadastro (muda de "Alterar" para "Cadastrar")
        this.configurarBotaoSalvar(false);
        
        this.showModal('modalForm');
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
        
        // Campos das NRs (10, 11, 12, 17, 18, 33, 35)
        const nrs = ['nr10', 'nr11', 'nr12', 'nr17', 'nr18', 'nr33', 'nr35'];
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
        if (fotoPreview) {
            fotoPreview.src = '';
            fotoPreview.style.display = 'none';
            console.log('Preview da foto escondido');
        }
        
        const fotoPlaceholder = document.getElementById('fotoPlaceholder');
        if (fotoPlaceholder) {
            fotoPlaceholder.style.display = 'flex';
            console.log('Placeholder da foto mostrado');
        }
        
        // Também limpar o placeholder grande se existir
        const fotoPlaceholderLarge = document.querySelector('.foto-placeholder-large');
        if (fotoPlaceholderLarge) {
            fotoPlaceholderLarge.style.display = 'flex';
            console.log('Placeholder grande da foto mostrado');
        }
        
        console.log('Todos os campos foram limpos para novo registro');
    }
    
    // Função para trocar entre as abas das NRs
    switchNRTab(nrType) {
        // Remover classe active de todas as abas
        document.querySelectorAll('.nr-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Ocultar todo o conteúdo das abas
        document.querySelectorAll('.nr-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Ativar a aba clicada
        const activeTab = document.querySelector(`[data-nr="${nrType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Mostrar o conteúdo da aba ativa
        const activeContent = document.getElementById(`content-${nrType}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        console.log(`Aba ${nrType.toUpperCase()} ativada`);
    }
    
    // Configurar botão Salvar conforme o contexto
    configurarBotaoSalvar(isEdit) {
        const btnSalvar = document.getElementById('btnSalvar');
        if (btnSalvar) {
            if (isEdit) {
                // Modo edição - botão laranja "Alterar"
                btnSalvar.className = 'btn-form btn-alterar';
                btnSalvar.textContent = 'Alterar';
            } else {
                // Modo novo - botão verde "Cadastrar"
                btnSalvar.className = 'btn-form btn-cadastrar';
                btnSalvar.textContent = 'Cadastrar';
            }
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
            const response = await fetch(`/api/ssma/${id}`);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos para edição:', data);
            
            this.editingId = id;
            this.currentEditingData = data; // Armazenar dados para uso nas abas
            
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) modalTitle.textContent = 'Editar Registro';
            
            // Configurar botão para edição
            this.configurarBotaoSalvar(true);
            
            // Abrir modal primeiro
            this.showModal('modalForm');
            
            // Aguardar um pouco para o modal estar totalmente carregado
            setTimeout(() => {
                this.preencherFormulario(data);
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
            this.preencherCampo('nr10_nome', data.Nome);
            this.preencherCampo('nr10_empresa', data.Empresa);
            this.preencherCampo('nr10_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-10 se existirem
            if (data.Nr10_DataEmissao) {
                this.preencherCampo('nr10_dataEmissao', data.Nr10_DataEmissao);
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
                this.preencherCampo('nr11_dataEmissao', data.Nr11_DataEmissao);
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
                this.preencherCampo('nr12_dataEmissao', data.Nr12_DataEmissao);
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
                this.preencherCampo('nr17_dataEmissao', data.Nr17_DataEmissao);
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
                this.preencherCampo('nr18_dataEmissao', data.Nr18_DataEmissao);
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
            
            this.preencherCampo('nr33_nome', data.Nome);
            this.preencherCampo('nr33_empresa', data.Empresa);
            this.preencherCampo('nr33_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-33 se existirem
            if (data.Nr33_DataEmissao) {
                this.preencherCampo('nr33_dataEmissao', data.Nr33_DataEmissao);
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
            
            this.preencherCampo('nr35_nome', data.Nome);
            this.preencherCampo('nr35_empresa', data.Empresa);
            this.preencherCampo('nr35_funcao', data.Funcao);
            
            // Preencher dados específicos da NR-35 se existirem
            if (data.Nr35_DataEmissao) {
                this.preencherCampo('nr35_dataEmissao', data.Nr35_DataEmissao);
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
                this.preencherCampo('epi_dataEmissao', data.Epi_DataEmissao);
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
            
            // MANTER anotações existentes - NÃO LIMPAR
            const anotacoes = document.getElementById('anotacoes');
            if (anotacoes) {
                const anotacoesExistentes = anotacoes.value;
                const novasAnotacoes = data.Anotacoes || anotacoesExistentes || 'teste';
                anotacoes.value = novasAnotacoes;
                this.preencherCampo('hiddenAnotacoes', novasAnotacoes);
                console.log('Anotações mantidas:', novasAnotacoes);
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
            if (isSelect) {
                campo.innerHTML = `<option value="${valor}" selected>${valor}</option>`;
            } else {
                campo.value = valor;
            }
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
            if (situacao === 'S') {
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
                fotoPreview.style.display = 'none';
                fotoPlaceholder.style.display = 'flex';
                console.log('Nenhuma foto encontrada para ID:', data.id);
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
        
        try {
            // Coletar dados manualmente para evitar [object Object]
            const formData = new FormData();
            
            // Campos principais - pegar o texto selecionado, não o valor
            const nomeSelect = document.getElementById('nome');
            const empresaSelect = document.getElementById('empresa');
            const funcaoSelect = document.getElementById('funcao');
            
            const nomeValue = nomeSelect.options[nomeSelect.selectedIndex]?.text || '';
            const empresaValue = empresaSelect.options[empresaSelect.selectedIndex]?.text || '';
            const funcaoValue = funcaoSelect.options[funcaoSelect.selectedIndex]?.text || '';
            
            formData.append('nome', nomeValue);
            formData.append('empresa', empresaValue);
            formData.append('funcao', funcaoValue);
            
            // Outros campos
            formData.append('vencimento', document.getElementById('vencimento')?.value || '');
            formData.append('anotacoes', document.getElementById('anotacoes')?.value || '');
            formData.append('status', document.getElementById('status')?.value || '');
            formData.append('genero', document.getElementById('genero')?.value || '');
            formData.append('situacao', this.editingId ? (document.querySelector('.btn-status.ativo') ? 'S' : 'N') : 'S');
            
            // Ambientação
            const ambientacao = document.querySelector('input[name="ambientacao"]:checked')?.value || 'N';
            formData.append('ambientacao', ambientacao);
            
            // Campos NR-10
            formData.append('nr10_dataEmissao', document.getElementById('nr10_dataEmissao')?.value || '');
            formData.append('nr10_vencimento', document.getElementById('nr10_vencimento')?.value || '');
            formData.append('nr10_status', document.getElementById('nr10_status')?.value || '');
            
            // Campos NR-11
            formData.append('nr11_dataEmissao', document.getElementById('nr11_dataEmissao')?.value || '');
            formData.append('nr11_vencimento', document.getElementById('nr11_vencimento')?.value || '');
            formData.append('nr11_status', document.getElementById('nr11_status')?.value || '');
            
            // Campos NR-12
            formData.append('nr12_dataEmissao', document.getElementById('nr12_dataEmissao')?.value || '');
            formData.append('nr12_vencimento', document.getElementById('nr12_vencimento')?.value || '');
            formData.append('nr12_status', document.getElementById('nr12_status')?.value || '');
            formData.append('nr12_ferramenta', document.getElementById('nr12_ferramenta')?.value || '');
            
            // Campos NR-17
            formData.append('nr17_dataEmissao', document.getElementById('nr17_dataEmissao')?.value || '');
            formData.append('nr17_vencimento', document.getElementById('nr17_vencimento')?.value || '');
            formData.append('nr17_status', document.getElementById('nr17_status')?.value || '');
            
            // Campos NR-18
            formData.append('nr18_dataEmissao', document.getElementById('nr18_dataEmissao')?.value || '');
            formData.append('nr18_vencimento', document.getElementById('nr18_vencimento')?.value || '');
            formData.append('nr18_status', document.getElementById('nr18_status')?.value || '');
            
            // Campos NR-33
            formData.append('nr33_dataEmissao', document.getElementById('nr33_dataEmissao')?.value || '');
            formData.append('nr33_vencimento', document.getElementById('nr33_vencimento')?.value || '');
            formData.append('nr33_status', document.getElementById('nr33_status')?.value || '');
            
            // Campos NR-35
            formData.append('nr35_dataEmissao', document.getElementById('nr35_dataEmissao')?.value || '');
            formData.append('nr35_vencimento', document.getElementById('nr35_vencimento')?.value || '');
            formData.append('nr35_status', document.getElementById('nr35_status')?.value || '');
            
            // Campos EPI
            formData.append('epi_dataEmissao', document.getElementById('epi_dataEmissao')?.value || '');
            formData.append('epi_vencimento', document.getElementById('epi_vencimento')?.value || '');
            formData.append('epi_status', document.getElementById('epi_status')?.value || '');
            
            // Foto se existir
            const fotoInput = document.getElementById('foto');
            if (fotoInput?.files[0]) {
                formData.append('foto', fotoInput.files[0]);
            }
            
            const isEdit = this.editingId !== null;
            
            // Debug: mostrar dados que estão sendo enviados
            console.log('=== SALVANDO REGISTRO ===');
            console.log('Modo:', isEdit ? 'EDIÇÃO' : 'NOVO');
            console.log('ID:', this.editingId);
            
            // Mostrar todos os dados do formulário
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            
            const url = isEdit ? `/api/ssma/${this.editingId}` : '/api/ssma';
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log('URL:', url);
            console.log('Method:', method);
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            const data = await response.json();
            console.log('Resposta do servidor:', data);
            
            if (response.ok) {
                this.showToast(data.message || 'Registro salvo com sucesso!', 'success');
                
                // Fechar modal e voltar para tela principal
                this.fecharModals();
                
                // Recarregar dados imediatamente para refletir as alterações
                console.log('Recarregando dados da tabela...');
                await this.loadData();
                this.clearSelection();
                
                console.log('Dados atualizados na tabela após salvar');
            } else {
                console.error('Erro do servidor:', data);
                this.showToast(data.error || 'Erro ao salvar registro', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar registro:', error);
            this.showToast('Erro de conexão com o servidor', 'error');
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
        // Remover classe active de todas as abas
        document.querySelectorAll('.nr-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Ocultar todos os conteúdos
        document.querySelectorAll('.nr-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Ativar aba selecionada
        document.querySelector(`[data-nr="${nrType}"]`).classList.add('active');
        document.getElementById(`content-${nrType}`).classList.add('active');
        
        // Controlar visibilidade dos botões da foto
        const photoButtons = document.querySelector('.photo-buttons');
        if (photoButtons) {
            if (nrType === 'nr10' || nrType === 'nr11' || nrType === 'nr12' || nrType === 'nr17' || nrType === 'nr18' || nrType === 'nr33' || nrType === 'nr35') {
                // Nas NRs, ocultar botões (só visualização)
                photoButtons.style.display = 'none';
            } else {
                // Nas outras abas, mostrar botões
                photoButtons.style.display = 'flex';
            }
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr11DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR11();
                    // Atualizar tela principal
                    this.loadData();
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr12DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR12();
                    // Atualizar tela principal
                    this.loadData();
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr17DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR17();
                    // Atualizar tela principal
                    this.loadData();
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr18DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR18();
                    // Atualizar tela principal
                    this.loadData();
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr33DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR33();
                    // Atualizar tela principal
                    this.loadData();
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
                        // Atualizar tela principal instantaneamente
                        this.loadData();
                    }, 100);
                }
            });
            
            // Calcular também quando sair do campo
            nr35DataEmissao.addEventListener('blur', (e) => {
                setTimeout(() => {
                    this.calcularNR35();
                    // Atualizar tela principal
                    this.loadData();
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr10DataEmissao = document.getElementById('nr10_dataEmissao');
            if (nr10DataEmissao) {
                nr10DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr11DataEmissao = document.getElementById('nr11_dataEmissao');
            if (nr11DataEmissao) {
                nr11DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr12DataEmissao = document.getElementById('nr12_dataEmissao');
            if (nr12DataEmissao) {
                nr12DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr17DataEmissao = document.getElementById('nr17_dataEmissao');
            if (nr17DataEmissao) {
                nr17DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr18DataEmissao = document.getElementById('nr18_dataEmissao');
            if (nr18DataEmissao) {
                nr18DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr33DataEmissao = document.getElementById('nr33_dataEmissao');
            if (nr33DataEmissao) {
                nr33DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const nr35DataEmissao = document.getElementById('nr35_dataEmissao');
            if (nr35DataEmissao) {
                nr35DataEmissao.focus();
            }
        }, 100);
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
        
        // Dar foco no campo Data Emissão
        setTimeout(() => {
            const epiDataEmissao = document.getElementById('epi_dataEmissao');
            if (epiDataEmissao) {
                epiDataEmissao.focus();
            }
        }, 100);
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
        let vencimentoValue = vencimento.value;
        
        if (!emissaoValue) {
            return;
        }
        
        // Se não tem vencimento, calcular (2 anos após emissão)
        if (!vencimentoValue && emissaoValue.length === 10) {
            try {
                const [dia, mes, ano] = emissaoValue.split('/');
                const dataEmissaoDate = new Date(ano, mes - 1, dia);
                const vencimentoDate = new Date(dataEmissaoDate);
                vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 2);
                vencimento.value = vencimentoDate.toISOString().split('T')[0];
                vencimentoValue = vencimento.value;
            } catch (error) {
                console.error('Erro ao calcular vencimento NR-10:', error);
                return;
            }
        }
        
        if (!vencimentoValue) {
            return;
        }
        
        try {
            // Converter datas
            const [dia, mes, ano] = emissaoValue.split('/');
            const dataEmissaoDate = new Date(ano, mes - 1, dia);
            const vencimentoDate = new Date(vencimentoValue);
            
            if (isNaN(dataEmissaoDate.getTime()) || isNaN(vencimentoDate.getTime())) {
                return;
            }
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
    
    // Completar ano atual para NR-33 quando pressionar Tab
    completarAnoAtualNR33(event) {
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
        } catch (error) {
            console.error('Erro no cálculo NR-35:', error);
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
            status.className = 'status-select status-' + novoStatus.toLowerCase();
            
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
        
        preview.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'flex';
        fileInput.value = '';
    }
    
    // Formatar data de emissão automaticamente (dd/mm/aaaa)
    formatarDataEmissao(event) {
        let value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        
        // Limitar a 8 dígitos (ddmmaaaa)
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
        statusSelect.className = 'status-select status-' + novoStatus.toLowerCase();
        
        console.log('Status atualizado automaticamente:', novoStatus, 'Dias a vencer:', diasVencer);
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

    // UI Helpers
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Resetar para aba ASO quando abrir o modal
            if (modalId === 'modalForm') {
                this.switchNRTab('aso');
                
                // Se não está editando, configurar como novo cadastro
                if (!this.editingId) {
                    this.configurarBotaoSalvar(false);
                }
            }
        }
    }
    
    fecharModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
        
        // Resetar para mostrar apenas ativos ao sair do modal
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
        
        // Limpar seleção e resetar estado de edição
        this.selectedRows.clear();
        this.editingId = null;
        this.currentEditingData = null;
        
        // Atualizar dados para mostrar apenas ativos
        setTimeout(() => {
            this.loadData();
        }, 100);
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'flex';
            
            // Auto hide após 5 segundos
            setTimeout(() => {
                this.hideToast();
            }, 5000);
        }
    }
    
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'none';
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
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando SysControle...');
    window.syscontrole = new SysControleWeb();
});

// Fallback caso o DOMContentLoaded já tenha disparado
if (document.readyState === 'loading') {
    console.log('Aguardando DOM...');
} else {
    console.log('DOM já carregado, inicializando SysControle...');
    window.syscontrole = new SysControleWeb();
}

// Expor funções globais para uso nos event handlers inline
window.syscontrole = null; 
   // Função para fechar modais
    fecharModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Resetar para aba ASO quando fechar
        this.switchNRTab('aso');
        
        console.log('Modais fechados');
    }
    
    // Função para mostrar modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            console.log('Modal aberto:', modalId);
        }
    }
    
    // Função para mostrar toast
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'block';
            
            // Auto-hide após 3 segundos
            setTimeout(() => {
                this.hideToast();
            }, 3000);
        }
    }
    
    // Função para esconder toast
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'none';
        }
    }
    
    // Função para mostrar loading
    showLoading() {
        console.log('Carregando...');
    }
}
// In
icializar o sistema quando a página carregar
let syscontrole;
document.addEventListener('DOMContentLoaded', () => {
    syscontrole = new SysControleWeb();
});