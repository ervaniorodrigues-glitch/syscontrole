# 🚀 Guia Completo - Deploy SysControle no Render.com

## PARTE 1: Criar conta no GitHub (se não tiver)

1. Acesse: https://github.com
2. Clique em **"Sign up"**
3. Preencha email, senha e username
4. Confirme o email

---

## PARTE 2: Criar repositório no GitHub

1. Logado no GitHub, clique no **"+"** no canto superior direito
2. Clique em **"New repository"**
3. Configure:
   - Repository name: `syscontrole`
   - Description: `Sistema de Controle de Cursos de Segurança`
   - Marque: **Public** (gratuito)
   - **NÃO** marque "Add a README file"
4. Clique em **"Create repository"**
5. **COPIE** a URL que aparece (algo como: `https://github.com/SEU_USUARIO/syscontrole.git`)

---

## PARTE 3: Subir código para o GitHub

Abra o **Prompt de Comando** ou **PowerShell** na pasta do projeto e execute:

```bash
# 1. Adicionar arquivos
git add .

# 2. Criar o commit
git commit -m "SysControle - Deploy inicial"

# 3. Conectar ao GitHub (TROQUE pela sua URL!)
git remote add origin https://github.com/SEU_USUARIO/syscontrole.git

# 4. Subir o código
git branch -M main
git push -u origin main
```

**Se pedir login:** Use seu usuário e senha do GitHub (ou token)

---

## PARTE 4: Criar conta no Render.com

1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. Clique em **"GitHub"** para fazer login com sua conta GitHub
4. Autorize o Render a acessar seus repositórios

---

## PARTE 5: Criar o Banco de Dados PostgreSQL

1. No Dashboard do Render, clique em **"New +"**
2. Selecione **"PostgreSQL"**
3. Configure:
   - **Name:** `syscontrole-db`
   - **Database:** `syscontrole`
   - **User:** `syscontrole`
   - **Region:** `Oregon (US West)`
   - **PostgreSQL Version:** `16`
   - **Plan:** `Free`
4. Clique em **"Create Database"**
5. Aguarde criar (1-2 minutos)
6. Na página do banco, role até **"Connections"**
7. **COPIE** a **"External Database URL"** (começa com `postgres://...`)

---

## PARTE 6: Criar o Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Clique em **"Build and deploy from a Git repository"** → **"Next"**
3. Encontre o repositório `syscontrole` e clique **"Connect"**
4. Configure:
   - **Name:** `syscontrole`
   - **Region:** `Oregon (US West)` (mesmo do banco)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

5. Role até **"Environment Variables"** e clique **"Add Environment Variable"**:
   
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (cole a URL do banco que copiou) |
   | `NODE_ENV` | `production` |

6. Clique em **"Create Web Service"**

---

## PARTE 7: Aguardar Deploy

1. O Render vai:
   - Clonar seu repositório
   - Instalar dependências (`npm install`)
   - Iniciar o servidor (`npm start`)

2. Acompanhe os logs na tela

3. Quando aparecer **"Your service is live"**, está pronto!

4. Clique na URL no topo (algo como `https://syscontrole.onrender.com`)

---

## ✅ PRONTO!

Seu SysControle está online em:
**https://syscontrole.onrender.com**

### Login padrão:
- **Usuário:** master
- **Senha:** @Senha01

---

## ⚠️ Observações Importantes

### Plano Gratuito
- O serviço "adormece" após 15 minutos sem acesso
- Demora ~30 segundos para "acordar" no primeiro acesso
- Isso é normal e não perde dados

### Banco PostgreSQL Gratuito
- 256 MB de armazenamento
- Expira após 90 dias (pode recriar gratuitamente)
- Seus dados ficam salvos na nuvem

### Atualizações
Sempre que fizer alterações no código:
```bash
git add .
git commit -m "Descrição da alteração"
git push
```
O Render detecta automaticamente e faz novo deploy!

---

## 🆘 Problemas Comuns

### "Build failed"
- Verifique os logs no Render
- Certifique-se que `package.json` está correto

### "Application error"
- Verifique se `DATABASE_URL` está configurada
- Veja os logs em "Logs" no Dashboard

### Banco não conecta
- Confirme que copiou a URL **External** (não Internal)
- A URL deve começar com `postgres://`
