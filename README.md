# Agendamentos de serviços MG Elétrica

Aplicação web para consultar serviços e disponibilidade, solicitar agendamentos e gerenciar reservas de uma empresa de serviços elétricos e fotovotáicos. O projeto é dividido em um frontend React/Vite, uma API Node.js/Express e um banco MongoDB. O servidor também usa Socket.IO para notificar mudanças de disponibilidade em tempo real.

## Requisitos

- Node.js e npm instalados (use uma versão compatível com Vite 8).
- MongoDB local ou uma instância MongoDB acessível, como MongoDB Atlas.
- Git, para clonar o repositório.

## Estrutura

```text
client/   Aplicação React e Vite
server/   API Express, Socket.IO e acesso ao MongoDB
```

O frontend e o backend são instalados e executados separadamente. Não há um `package.json` na raiz.

## Configuração

### 1. Clone o projeto

```bash
git clone https://github.com/Math77077/agendamentos-mg-eletrica/
cd agendamentos-mg-eletrica
```


### 2. Configure o servidor

Crie o arquivo `server/.env` a partir do exemplo:

```bash
cp server/.env.example server/.env
```

No PowerShell, use:

```powershell
Copy-Item server\.env.example server\.env
```

Edite `server/.env` e configure os valores:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/solarev_db
JWT_SECRET=troque-por-um-segredo-longo-e-aleatorio
BUSINESS_TIME_ZONE=America/Manaus
```

- `PORT`: porta da API. Mantenha `5000` para corresponder ao endereço configurado no frontend.
- `MONGO_URI`: endereço de conexão do MongoDB. Para Atlas, use a string de conexão fornecida pelo serviço.
- `JWT_SECRET`: substitua o valor de exemplo por um segredo forte e privado. Nunca publique esse valor.
- `BUSINESS_TIME_ZONE`: fuso horário usado pelas regras de disponibilidade do negócio.

O `.env` não deve ser enviado ao GitHub. O arquivo `server/.env.example` contém apenas valores de exemplo.

### 3. Instale as dependências

Em um terminal:

```bash
cd server
npm ci
```

Em outro terminal, na raiz do repositório:

```bash
cd client
npm ci
```

## Executar localmente

Certifique-se de que o MongoDB está acessível pela URI configurada em `server/.env`.

### Inicie a API

No diretório `server`:

```bash
npm run dev
```

A API ficará disponível em `http://localhost:5000`. Para verificar se está ativa, acesse `http://localhost:5000/api/health`; a resposta deve indicar que o servidor está funcionando.

### (Opcional) Cadastre os serviços iniciais

Em um terminal no diretório `server`, execute:

```bash
npm run seed:services
```

O comando cria os serviços iniciais no MongoDB sem duplicar serviços com os mesmos títulos.

### Inicie o frontend

Em outro terminal, no diretório `client`:

```bash
npm run dev
```

Abra no navegador o endereço informado pelo Vite, normalmente `http://localhost:5173`.

## Contas e acesso administrativo

Use a página de cadastro para criar uma conta de usuário e depois entre pela página de login. O cadastro público cria contas com perfil de usuário; não cria administradores. Para acessar o painel em `/admin`, é necessário que um administrador seja provisionado por um processo confiável no backend. O repositório não fornece credenciais administrativas padrão; não use nem publique credenciais fixas.

## Comandos úteis

Execute os comandos abaixo no diretório indicado:

| Diretório | Comando | Descrição |
| --- | --- | --- |
| `server` | `npm run dev` | Inicia a API com reinício automático durante o desenvolvimento |
| `server` | `npm start` | Inicia a API |
| `server` | `npm test` | Executa os testes do backend |
| `server` | `npm run seed:services` | Insere os serviços iniciais no MongoDB |
| `client` | `npm run dev` | Inicia o servidor de desenvolvimento do frontend |
| `client` | `npm run build` | Gera a versão de produção em `client/dist` |
| `client` | `npm run preview` | Pré-visualiza a versão de produção |
| `client` | `npm run lint` | Executa o ESLint |

## Funcionalidades principais

- Consulta de serviços e disponibilidade para agendamento.
- Cadastro e autenticação de usuários.
- Visualização dos agendamentos do usuário.
- Painel administrativo para gerenciar serviços e agendamentos.
- Atualizações de disponibilidade via Socket.IO.

## Tecnologias

- **Frontend:** React, React Router, Vite e Axios.
- **Backend:** Node.js, Express, Mongoose, JWT e Socket.IO.
- **Banco de dados:** MongoDB.

## Observações

- O frontend aponta para `http://localhost:5000/api`; se alterar a porta da API, atualize também a configuração em `client/src/services/api.js`.
- Mantenha segredos, strings privadas do MongoDB e arquivos `.env` fora do controle de versão.
