# Sistema Multi-Usuário - Manage Tasks

## Configuração Implementada

### Usuários Configurados

1. **Iago**
   - Login: `iago`
   - Senha: `Asfas852@`
   - Tabelas: `json_data`, `quick_notes`, `transactions`
   - Acesso completo: todas as funcionalidades incluindo Rotina do Dia

2. **Leticia**
   - Login: `leticia`
   - Senha: `123`
   - Tabelas: `leticia_json_data`, `leticia_quick_notes`, `leticia_transactions`
   - Acesso: todas as funcionalidades EXCETO Rotina do Dia (oculta)

## Funcionalidades

### Autenticação
- Sistema de login com cookies HttpOnly
- Sessão válida por 30 dias
- Logout disponível (botão no canto superior direito mostrando o usuário)

### Separação de Dados
- Cada usuário tem suas próprias tabelas no banco de dados
- Os dados são completamente isolados entre usuários
- APIs automaticamente detectam o usuário logado via cookie

### Diferenças por Usuário
- **Iago**: Vê todas as seções incluindo "Rotina do Dia"
- **Leticia**: Não vê a seção "Rotina do Dia"

## Setup do Banco de Dados

### 1. Para Iago (já existe)
As tabelas `json_data`, `quick_notes` e `transactions` já devem estar criadas.

### 2. Para Leticia (NOVO)
Execute o script `database_leticia_setup.sql` no Supabase SQL Editor para criar:
- `leticia_json_data`
- `leticia_quick_notes`
- `leticia_transactions`

## Como Usar

1. Acesse a aplicação
2. Faça login com um dos usuários
3. Os dados carregados serão específicos do usuário logado
4. Para trocar de usuário, clique em "Sair" no canto superior direito

## Estrutura de Cookies

- `app_session`: Token de sessão (HttpOnly, seguro)
- `app_user`: Nome do usuário logado (HttpOnly, usado pelas APIs)

## APIs Atualizadas

Todas as APIs agora detectam automaticamente o usuário pelo cookie:

- `/api/auth` - Login, logout e verificação de sessão
- `/api/tasks` - Tarefas (usa `json_data` ou `leticia_json_data`)
- `/api/quick-notes` - Notas rápidas (usa `quick_notes` ou `leticia_quick_notes`)
- `/api/transactions` - Transações (usa `transactions` ou `leticia_transactions`)
- `/api/transactions/autocomplete` - Autocomplete (busca na tabela do usuário)

## Próximos Passos

1. Execute `database_leticia_setup.sql` no Supabase
2. Teste o login com ambos os usuários
3. Verifique que os dados são isolados e específicos de cada usuário
