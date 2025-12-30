# Deploy do SysControle no Render.com

## Passo a Passo

### 1. Criar conta no Render
- Acesse: https://render.com
- Clique em "Get Started for Free"
- Faça login com sua conta GitHub

### 2. Subir código para o GitHub
Se ainda não tem o projeto no GitHub:
```bash
git init
git add .
git commit -m "Preparando para deploy"
git remote add origin https://github.com/SEU_USUARIO/syscontrole.git
git push -u origin main
```

### 3. Criar o banco PostgreSQL
1. No Dashboard do Render, clique em **"New +"** → **"PostgreSQL"**
2. Configure:
   - Name: `syscontrole-db`
   - Database: `syscontrole`
   - User: `syscontrole`
   - Region: `Oregon (US West)` (mais próximo)
   - Plan: **Free**
3. Clique em **"Create Database"**
4. Aguarde criar e copie a **"External Database URL"**

### 4. Criar o Web Service
1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Configure:
   - Name: `syscontrole`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
4. Em **"Environment Variables"**, adicione:
   - `DATABASE_URL` = (cole a URL do banco que copiou)
   - `NODE_ENV` = `production`
5. Clique em **"Create Web Service"**

### 5. Aguardar Deploy
- O Render vai instalar dependências e iniciar o servidor
- Após alguns minutos, seu app estará disponível em:
  `https://syscontrole.onrender.com`

## Observações

### Plano Gratuito
- 750 horas/mês (suficiente para rodar 24/7)
- Após 15 min sem acesso, o serviço "adormece"
- Demora ~30 segundos para "acordar" no primeiro acesso

### Banco PostgreSQL Gratuito
- 256 MB de armazenamento
- Expira após 90 dias (pode recriar)
- Suficiente para milhares de registros

### Fotos
- As fotos são salvas no banco como BYTEA (binário)
- Funciona perfeitamente no PostgreSQL

## Migrar dados existentes

Se quiser migrar os dados do SQLite local para o PostgreSQL:

1. Exporte os dados localmente (o sistema já tem backup JSON)
2. Após o deploy, importe via interface web

## Suporte

Em caso de problemas:
- Verifique os logs no Dashboard do Render
- Certifique-se que DATABASE_URL está configurada corretamente
