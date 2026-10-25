# ✈️ Soares pelo Mundo — Buscador de passagens para assessoria de viagens

Painel para pesquisar e comparar passagens aéreas e montar propostas para clientes.
Dados de voos via **SerpApi (Google Flights)**; login e banco de dados via **Supabase**; hospedagem sugerida: **Vercel**.

## O que já funciona (MVP)

| Módulo | Status |
| --- | --- |
| 1. Dias mais baratos para voar (3 melhores combinações + calendário de preços) | ✅ |
| 2. Voos que quase ninguém vê (aeroportos alternativos, baixo custo, custo final) | ✅ |
| 3. Rota mais barata com escalas (1 ou 2 escalas, 5 melhores, economia × tempo) | ✅ |
| Clientes, histórico de buscas, comparador (até 4 opções) | ✅ |
| Proposta: link compartilhável, PDF (imprimir), texto de WhatsApp, margem de serviço | ✅ |
| Login por e-mail e senha (equipe) | ✅ |
| 4. Descontos reais · 5. Taxas · 6. Risco da tarifa · 7. Hidden-city | ⏳ próxima etapa |
| Alerta de preço por e-mail | ⏳ próxima etapa |

**Regra de ouro:** todos os números (preços, taxas, tempos, economia) vêm da SerpApi ou de cálculos no código.
A IA (opcional) só escreve um resumo em texto a partir desses números.
Quando a fonte não informa algo (ex.: regra de bagagem), o app diz “não informado pela fonte — confirmar com a companhia”.

## Modo exemplo

Sem `SERPAPI_KEY`, o app roda com **voos fictícios**, sempre marcados em vermelho como “DADOS DE EXEMPLO”. Serve para testar telas e fluxo.
O app recusa criar propostas com dados de exemplo, a menos que você confirme que é um teste.

## Passo a passo para colocar no ar

### 1. SerpApi (preços reais)
1. Crie conta em <https://serpapi.com> e copie sua chave em *Manage API Key*.
2. Cada busca de datas/aeroportos consome **créditos**. O módulo 1 usa 1 crédito por combinação de datas (você define o máximo no formulário). Confira o plano gratuito e os limites no site da SerpApi.

### 2. Supabase (login, clientes, histórico, propostas)
1. Crie um projeto em <https://supabase.com>.
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Providers → Email**, **desligue** “Allow new users to sign up” (só a sua equipe deve entrar).
4. Em **Authentication → Users → Add user**, crie o seu usuário (e-mail e senha) e os da equipe.
5. Em **Project Settings → API**, copie: *Project URL*, *anon public key* e *service_role key*.

### 3. Vercel (publicar o site)
1. Em <https://vercel.com>, entre com o GitHub e clique em **Add New → Project**; escolha este repositório.
2. Em **Environment Variables**, cadastre:

| Variável | Valor |
| --- | --- |
| `SERPAPI_KEY` | chave da SerpApi |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**segredo**, nunca compartilhe) |
| `ALLOWED_EMAILS` | (opcional) e-mails autorizados, separados por vírgula |
| `ANTHROPIC_API_KEY` | (opcional) habilita o botão “Resumo por IA” |

3. Clique em **Deploy**. Pronto: o endereço aparece na Vercel.

> Segurança: o app **bloqueia buscas** se a `SERPAPI_KEY` estiver configurada sem o login do Supabase em produção, para ninguém de fora gastar seus créditos.
> Chaves ficam só nas variáveis da Vercel — nunca no código do GitHub.

### Rodando no seu computador (opcional)
```bash
npm install
cp .env.example .env.local   # preencha as chaves (pode deixar vazio para o modo exemplo)
npm run dev                  # abre em http://localhost:3000
npm run test:logic           # teste da lógica dos módulos 1 a 3 (modo exemplo, sem internet)
```

## Limitações conhecidas (leia antes de usar com clientes)

- **Ida e volta:** a SerpApi devolve o **preço total de ida e volta**, mas os horários e escalas exibidos são os do **trecho de ida**. Os detalhes do voo de volta ainda não são consultados — confira no Google Flights (há um link em cada resultado) antes de enviar ao cliente.
- **Bagagem:** só é marcada como “incluída” quando a fonte diz isso explicitamente. Caso contrário aparece “confirmar com a companhia”.
- **Taxas:** o app não inventa valores. Para somar bagagem/assento ao custo final, informe o valor estimado no formulário.
- **Conexões e vistos:** o aviso de visto/trânsito é uma lista de atenção por aeroporto, não uma consulta oficial. Confirme as exigências conforme a nacionalidade.
- **Preços mudam rápido:** toda tela mostra data e hora da consulta.
- **Créditos:** buscas repetidas idênticas em até 20 minutos usam cache (não gastam crédito), mas o cache vive na memória do servidor e pode ser reiniciado.

## Estrutura

```
app/                páginas e rotas de API (Next.js)
components/         interface (cartão de voo, formulários, proposta)
lib/serpapi.ts      ÚNICO ponto de contato com a SerpApi (troque aqui para mudar de provedor)
lib/mock.ts         voos fictícios do modo exemplo
lib/analysis/       cálculos dos módulos 1, 2 e 3
supabase/schema.sql tabelas e regras de segurança
```
