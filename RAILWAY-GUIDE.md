# GUIA COMPLETO: Hospedar CobraFacil no Railway

## O que voce vai conseguir
- App online 24/7, acessivel de qualquer lugar do mundo
- Sincronizacao automatica entre PC, celular e tablet
- Banco de dados SQLite no servidor (dados persistidos)
- Mesma conta funciona em todos os dispositivos
- Backup via exportacao JSON/Excel

---

## PASSO 1: Criar conta no Railway (Gratuito)

1. Acesse: **https://railway.app**
2. Clique em **"Start for Free"**
3. Escolha login com **GitHub** (mais facil)
4. Pronto! Sua conta esta criada

---

## PASSO 2: Criar repositorio no GitHub

1. Acesse: **https://github.com/new**
2. Repository name: `cobrafacil`
3. Escolha **Public** (ou Private se preferir)
4. **NAO** marque "Add a README"
5. Clique em **"Create repository"**

Copie o URL do repositorio (vai ser algo como `https://github.com/SEU-USUARIO/cobrafacil.git`)

---

## PASSO 3: Enviar o codigo para o GitHub

No seu PC, abra o terminal e execute:

```bash
# Navegue ate a pasta do projeto
cd caminho/para/o/projeto-cobrafacil

# Inicializar git
git init

# Adicionar todos os arquivos
git add .

# Criar o primeiro commit
git commit -m "CobraFacil v1.0 - Sistema de gestao de emprestimos"

# Conectar ao GitHub (substitua SEU-USUARIO pelo seu usuario)
git remote add origin https://github.com/SEU-USUARIO/cobrafacil.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

---

## PASSO 4: Deploy no Railway

1. Volte para **https://railway.app**
2. Clique em **"New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Clique em **"Configure GitHub App"** e autorize o Railway
5. Selecione o repositorio **"cobrafacil"**
6. Clique em **"Deploy"**

O Railway vai automaticamente:
- Instalar dependencias (`npm install`)
- Buildar o frontend (`npm run build`)
- Iniciar o servidor (`npm start`)
- Gerar uma URL publica

---

## PASSO 5: Acessar seu app

1. Aguarde 2-3 minutos (o deploy inicial pode demorar)
2. No dashboard do Railway, clique no seu projeto
3. Va em **"Settings" > "Public Networking"**
4. Clique **"Generate Domain"**
5. Sua URL sera algo como: `https://cobrafacil-production.up.railway.app`

Pronto! Seu app esta online e funciona em qualquer dispositivo!

---

## PASSO 6: Migrar seus dados (se ja tiver cadastrado no navegador)

Se voce ja usou o app no navegador e tem dados salvos:

### No app atual (navegador):
1. Acesse o app
2. Va em **Configuracoes > Dados**
3. Clique **"Exportar Dados"**
4. Salve o arquivo `.json`

### No novo app (Railway):
1. Acesse a URL do Railway
2. Crie uma nova conta
3. Va em **Configuracoes > Dados**
4. Clique **"Importar Dados"**
5. Selecione o arquivo `.json`
6. Pronto! Todos seus dados foram migrados!

---

## PASSO 7: Backup automatico (IMPORTANTE)

Mesmo no Railway, faca backup **semanal**:

1. Va em **Configuracoes > Dados**
2. Clique **"Exportar Dados"** (JSON completo)
3. OU clique **"Exportar Excel"** (planilha .xlsx)
4. Salve no Google Drive, Dropbox ou PC

Isso garante que mesmo se algo acontecer com o Railway, voce tem seus dados.

---

## CUSTOS

O Railway tem plano **gratuito**:
- 500 horas/mes (suficiente para 1 app rodando 24/7)
- Se o app dormir por inatividade, basta acessar que ele acorda

Se quiser 24/7 garantido sem dormir:
- Plano pago: a partir de **$5/mes** (cerca de R$ 25)

---

## PROBLEMAS COMUNS

### "Deployment failed"
- Verifique os logs no Railway (aba "Deploy")
- Certifique-se que o `nixpacks.toml` esta no repositorio
- Verifique se `package.json` tem os scripts `build` e `start`

### "Cannot find module"
- O `better-sqlite3` precisa ser compilado. O Railway geralmente ja tem as ferramentas.
- Se der erro, adicione um arquivo `railway.toml`:

```toml
[build]
builder = "nixpacks"
```

### App abre mas API nao funciona
- Verifique se a variavel `PORT` esta definida no Railway
- Va em "Variables" no dashboard e adicione `PORT = 3001`

---

## SUPORTE

Se precisar de ajuda:
1. Verifique os logs no Railway dashboard
2. Acesse a comunidade: https://railway.app/community
3. Ou entre em contato comigo
