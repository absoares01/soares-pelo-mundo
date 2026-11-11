# TripFlow ✈️

Sistema de gestão para **consultores de viagem, concierges e pequenas agências**. Troca planilhas, WhatsApp solto e propostas manuais por um só lugar: clientes, orçamentos, roteiros e propostas profissionais.

Tudo em português do Brasil. Funciona no computador, no tablet e no celular.

## O que já faz (v1)

| Módulo | O que você consegue |
|---|---|
| **Painel** | Clientes, orçamentos ativos, viagens confirmadas, propostas pendentes, receita, lucro estimado, próximas partidas e funil de clientes. Todos os cartões são clicáveis. |
| **Clientes (CRM)** | Cadastro com contato, preferências, estilo de viagem, histórico, origem do contato, situação no funil, valor da oportunidade e próximo contato. Busca e filtros. |
| **Orçamentos** | Voos, hospedagem, transporte, passeios, seguro e outros. Cálculo automático de custo, markup, taxa de assessoria, desconto, preço final, **lucro e margem**. Marque "confirmado" quando fechar. |
| **Roteiros** | Dia a dia com atividades, restaurantes, transportes, hospedagem, voos e dicas. Gera os dias pelas datas, reordena, ordena por horário. **PDF** com capa elegante. |
| **Propostas** | Documento com a sua marca (nome, cor, logo, contatos): dados do cliente, viagem, valores, incluído / não incluído, pagamento, roteiro e termos. Você escolhe como mostrar os valores (detalhado, por categoria ou só o total). **Link para o cliente** com botões de aceitar ou recusar, e PDF. |
| **Configurações** | Sua marca, markup padrão, moeda e termos padrão. Botão para carregar ou remover **dados de exemplo**. |

Segurança: cada usuário só enxerga os próprios dados (Row Level Security no banco). **Custos, lucro e observações internas nunca aparecem** na proposta, no PDF nem no link do cliente.

## Como colocar no ar

### 1. Banco de dados (Supabase)

1. Entre no seu projeto em [supabase.com](https://supabase.com) → **SQL Editor** → *New query*.
2. Cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. É seguro rodar mais de uma vez.
   - As tabelas do TripFlow começam com `tf_`, então podem conviver com tabelas de outros apps no mesmo projeto.
3. (Recomendado para testar) **Authentication → Providers → Email → desligue "Confirm email"**, para o cadastro entrar direto. Depois de lançar, volte a ligar.
4. **Authentication → URL Configuration**: em *Site URL* coloque o endereço do seu site (ex.: `https://tripflow.vercel.app`) e, em *Redirect URLs*, `https://SEU-SITE/auth/callback`.

### 2. Variáveis de ambiente (Vercel)

Em **Project → Settings → Environment Variables** (marque Production **e Preview**):

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → *anon public* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → *service_role* (secreta!) |
| `ALLOWED_EMAILS` *(opcional)* | E-mails autorizados, separados por vírgula |

Depois faça um **Redeploy**.

### 3. Primeiro acesso

Abra o site → **Criar conta** → entre → no Painel clique em **Carregar dados de exemplo** para explorar. Vá em **Configurações** e preencha a sua marca.

## PDFs

Os PDFs usam a impressão do navegador, sem biblioteca extra: clique em **Baixar PDF** e, na janela que abrir, escolha **Salvar como PDF** (no iPad/iPhone: *Compartilhar → Imprimir → pinça na pré-visualização → Salvar em Arquivos*). A página já está formatada em A4 com quebras de página e sem os botões.

## Compartilhar proposta

No editor da proposta, **Publicar e copiar link** muda o status para *Enviada* e copia o link `/p/...`. O cliente abre sem login, vê a proposta e pode aceitar ou recusar (uma vez). Quando ele aceitar, o botão **Confirmar viagem no orçamento** contabiliza a venda no Painel. Propostas em *Rascunho* ou excluídas não abrem pelo link, e propostas vencidas não podem mais ser aceitas.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev                  # http://localhost:3000
npm run typecheck
npm run test:logic           # cálculos, dados de exemplo e indicadores do painel
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Auth + Postgres + RLS).

### Estrutura

```
app/(auth)        login, cadastro, recuperação de senha
app/(app)         painel, clientes, orçamentos, roteiros, propostas, configurações
app/(print)       telas de PDF (sem menu)
app/p/[token]     proposta pública do cliente
app/api/p/...     aceitar / recusar proposta
lib/calc.ts       cálculos de orçamento (centavos)
lib/sample.ts     dados de exemplo
supabase/schema.sql
```

## Próximas versões (a arquitetura já comporta)

Gestão de pagamentos, cadastro de fornecedores, controle de comissões, follow-ups automáticos (e-mail/WhatsApp) e análises do negócio. Cada área entra como uma nova tabela `tf_*` e uma nova pasta em `app/(app)`, sem mexer no que já existe.

> O código do antigo buscador de voos continua guardado na branch `buscador-v1`.
