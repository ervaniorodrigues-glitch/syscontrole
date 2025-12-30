# 🌐 SysControle Web - Sistema de Controle de Cursos de Segurança

## 🎯 **SISTEMA IDÊNTICO AO DESKTOP, MAS NA WEB!**

Este é o **SysControle Web** - uma versão **100% funcional** e **idêntica** ao sistema desktop SysControle, mas rodando na internet com todas as vantagens de uma aplicação web moderna.

---

## 🚀 **INÍCIO RÁPIDO**

### 1. **Instalar Dependências**
```bash
npm install
```

### 2. **Iniciar o Sistema**
```bash
npm start
```

### 3. **Acessar o Sistema**
Abra seu navegador em: **http://localhost:3000**

---

## ✨ **FUNCIONALIDADES PRINCIPAIS**

### 📊 **Gestão Completa de Registros**
- ✅ **Adicionar** novos funcionários e cursos
- ✅ **Editar** informações existentes
- ✅ **Excluir** registros (individual ou múltiplo)
- ✅ **Filtrar** por nome, empresa, função, situação
- ✅ **Paginação** inteligente
- ✅ **Seleção múltipla** para operações em lote

### 🎓 **Controle de Cursos NR**
- ✅ **NR10** - Segurança em Instalações Elétricas
- ✅ **NR11** - Transporte e Movimentação
- ✅ **NR12** - Segurança no Trabalho em Máquinas
- ✅ **NR17** - Ergonomia
- ✅ **NR18** - Condições de Segurança na Construção
- ✅ **NR33** - Segurança em Espaços Confinados
- ✅ **NR35** - Trabalho em Altura
- ✅ **EPI** - Equipamento de Proteção Individual

### 🚨 **Sistema de Status Inteligente**
- 🟢 **OK**: Mais de 30 dias para vencer
- 🟡 **Renovar**: Entre 1-30 dias para vencer
- 🔴 **Vencido**: Data já passou
- ⚪ **Não Informado**: Sem data cadastrada

### 📈 **Estatísticas em Tempo Real**
- 📊 Total de registros
- 🟢 Quantidade com status OK
- 🟡 Quantidade para renovar
- 🔴 Quantidade vencidos

---

## 🎨 **INTERFACE VISUAL**

### **Design Moderno e Profissional**
- 🎨 Interface **idêntica** ao sistema desktop
- 📱 **Responsiva** - funciona em desktop, tablet e celular
- 🌈 **Cores intuitivas** para status
- ⚡ **Animações suaves** e feedback visual
- 🖱️ **Interações intuitivas**

### **Componentes Principais**
- 📋 **Tabela de dados** com ordenação e filtros
- 🔧 **Barra de ferramentas** com todas as ações
- 📝 **Formulários completos** para cadastro/edição
- 🔍 **Sistema de filtros** avançado
- 📄 **Paginação** com controles completos

---

## ⚡ **ATALHOS DO TECLADO**

- **Ctrl + N**: Novo registro
- **Ctrl + E**: Editar registro selecionado
- **Ctrl + Delete**: Excluir registros selecionados
- **F5**: Atualizar lista
- **Escape**: Fechar modais
- **Enter**: Aplicar filtros (nos campos de filtro)

---

## 🔧 **TECNOLOGIAS UTILIZADAS**

### **Backend**
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **SQLite**: Banco de dados
- **Multer**: Upload de arquivos
- **CORS**: Cross-Origin Resource Sharing

### **Frontend**
- **HTML5**: Estrutura semântica
- **CSS3**: Estilização moderna com gradientes e animações
- **JavaScript ES6+**: Funcionalidades interativas
- **Fetch API**: Comunicação assíncrona

### **Banco de Dados**
- **SQLite**: Banco leve e eficiente
- **Estrutura idêntica** ao sistema desktop
- **Migrations automáticas**
- **Dados de exemplo** para testes

---

## 📁 **ESTRUTURA DO PROJETO**

```
SysControle/
├── 📄 server.js              # Servidor principal
├── 📄 package.json           # Dependências e scripts
├── 📄 README.md              # Este arquivo
├── 📄 GUIA_TESTE_WEB.md      # Guia completo de testes
├── 🗃️ syscontrole.db         # Banco de dados SQLite
└── 📁 public/                # Arquivos estáticos
    ├── 📄 index.html         # Interface principal
    ├── 📄 styles.css         # Estilos CSS
    └── 📄 script.js          # JavaScript frontend
```

---

## 🧪 **COMO TESTAR**

### **Teste Básico**
1. Acesse **http://localhost:3000**
2. Clique em **"➕ Novo"**
3. Preencha os dados obrigatórios
4. Salve e veja o registro na tabela

### **Teste Completo**
Consulte o arquivo **`GUIA_TESTE_WEB.md`** para um roteiro completo de testes com todos os cenários.

---

## 🌟 **VANTAGENS DA VERSÃO WEB**

### ✅ **Acessibilidade**
- 🌍 Acesso de **qualquer lugar** com internet
- 💻 **Não precisa instalar** nada
- 🖥️ Funciona em **qualquer sistema operacional**

### ✅ **Colaboração**
- 👥 **Múltiplos usuários** simultâneos
- 🔄 Dados **centralizados**
- ⚡ Atualizações em **tempo real**

### ✅ **Manutenção**
- 🔄 **Atualizações automáticas**
- 💾 **Backup centralizado**
- 🔧 Sem problemas de **compatibilidade**

### ✅ **Mobilidade**
- 📱 Funciona em **tablets e celulares**
- 📐 Interface **responsiva**
- 🔄 Dados sempre **sincronizados**

---

## 🚨 **SOLUÇÃO DE PROBLEMAS**

### **Porta 3000 já em uso**
```bash
# Matar processo na porta 3000
npx kill-port 3000

# Ou usar outra porta
PORT=3001 npm start
```

### **Erro de permissão no banco**
```bash
# Dar permissão ao arquivo do banco
chmod 666 syscontrole.db
```

### **Problemas de cache**
- Pressione **Ctrl + F5** para recarregar sem cache
- Ou abra o DevTools (F12) e clique com botão direito no refresh

---

## 📊 **COMPARAÇÃO: DESKTOP vs WEB**

| Funcionalidade | Desktop | Web | Status |
|---|---|---|---|
| Interface Visual | ✅ | ✅ | **Idêntica** |
| Todas as Funcionalidades | ✅ | ✅ | **100% Compatível** |
| Banco de Dados | ✅ | ✅ | **Mesma Estrutura** |
| Cálculo de Status | ✅ | ✅ | **Mesma Lógica** |
| Filtros e Pesquisa | ✅ | ✅ | **Idênticos** |
| Upload de Fotos | ✅ | ✅ | **Funcional** |
| Atalhos de Teclado | ✅ | ✅ | **Mesmos Atalhos** |
| Acesso Remoto | ❌ | ✅ | **Vantagem Web** |
| Múltiplos Usuários | ❌ | ✅ | **Vantagem Web** |
| Instalação | Necessária | ❌ | **Vantagem Web** |
| Offline | ✅ | ❌ | **Vantagem Desktop** |

---

## 🎯 **CASOS DE USO**

### **Para Empresas Pequenas**
- 🏢 **Acesso local**: Use a versão desktop
- 🌐 **Acesso remoto**: Use a versão web

### **Para Empresas Médias/Grandes**
- 👥 **Múltiplos usuários**: Versão web é ideal
- 🔄 **Colaboração**: Dados centralizados
- 📊 **Relatórios**: Acesso de qualquer lugar

### **Para Consultores**
- 💼 **Mobilidade**: Acesso de qualquer cliente
- 📱 **Dispositivos**: Tablet/celular para campo
- ☁️ **Backup**: Dados seguros na nuvem

---

## 🔮 **PRÓXIMAS FUNCIONALIDADES**

### **Em Desenvolvimento**
- 📊 **Relatórios PDF** exportáveis
- 📧 **Notificações por email** de vencimentos
- 👥 **Sistema de usuários** e permissões
- 📈 **Dashboard** com gráficos
- 🔄 **Sincronização** com sistema desktop

### **Planejado**
- 📱 **App mobile** nativo
- 🌐 **API REST** completa
- 🔐 **Autenticação** avançada
- 📋 **Auditoria** de alterações
- 🎨 **Temas** personalizáveis

---

## 📞 **SUPORTE E CONTATO**

### **Documentação**
- 📖 **README.md**: Este arquivo
- 🧪 **GUIA_TESTE_WEB.md**: Guia completo de testes
- 💡 **Comentários no código**: Documentação inline

### **Problemas?**
1. 🔍 Verifique o **console do navegador** (F12)
2. 📋 Verifique os **logs do servidor** no terminal
3. 🔄 **Reinicie o servidor** se necessário
4. 🧹 **Limpe o cache** do navegador

---

## 🏆 **CONCLUSÃO**

O **SysControle Web** representa a evolução natural do sistema desktop, mantendo **100% da funcionalidade** original enquanto adiciona todas as vantagens de uma aplicação web moderna.

### **Principais Conquistas:**
- ✅ **Interface idêntica** ao sistema desktop
- ✅ **Funcionalidades completas** sem perda
- ✅ **Performance otimizada** para web
- ✅ **Código limpo** e bem documentado
- ✅ **Fácil manutenção** e expansão

### **Resultado Final:**
🎉 **Um sistema profissional, completo e pronto para produção!**

---

**🚀 SISTEMA PRONTO PARA USO! 🚀**

*Desenvolvido com ❤️ para facilitar o controle de cursos de segurança do trabalho*