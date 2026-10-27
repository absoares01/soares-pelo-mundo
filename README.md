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
| 4. Descontos reais antes de comprar (IA com busca na web, só com fonte verificável) | ✅ |
| 5. Onde a companhia cobra taxa (custo total real) | ✅ |
| 6. Risco real da tarifa barata (cancelar, mudar, bagagem depois) | ✅ |
| 7. Hidden-city (só comparação de preços + riscos, com aviso) | ✅ |
| Alerta de preço por e-mail (verificação diária) | ✅ |

**Regra de ouro:** todos os números (preços, taxas, tempos, economia) vêm da SerpApi ou de cálculos no código.
A IA (opcional) escreve resumos e, nos módulos 4 a 6, **pesquisa na web** — mas só vale o que tiver link de uma página que a pesquisa de fato consultou; o que não tiver fonte é descartado, e dado ausente aparece como “não informado”, nunca como zero.
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
npm run test:logic           # teste da lógica dos módulos 1 a 7 e alertas (modo exemplo, sem internet)
```

## Módulos 4 a 7 e alertas — o que configurar

Rode o SQL novo: no Supabase > SQL Editor, cole o `supabase/schema.sql` inteiro e clique em Run (é seguro repetir; cria a tabela `price_alerts`).

Variáveis novas na Vercel (Settings > Environment Variables; chaves como **Secret**), depois faça **Redeploy**:

| Variável | Para quê |
| --- | --- |
| `ANTHROPIC_API_KEY` | Módulo 4 e busca automática dos módulos 5 e 6. Precisa de conta paga na Anthropic com **busca na web** habilitada no console. Cada pesquisa custa centavos. |
| `RESEND_API_KEY` | Envio dos e-mails de alerta (resend.com, plano grátis: 100/dia). |
| `ALERT_FROM_EMAIL` | Remetente. Sem ela usa `onboarding@resend.dev`, que **só entrega ao e-mail da própria conta Resend**. Para avisar outras pessoas, verifique um domínio seu no Resend. |
| `CRON_SECRET` | Texto longo e aleatório. Liga a verificação diária automática dos alertas. |
| `ALERTS_MAX_PER_RUN` | (opcional) máximo de alertas por execução, padrão 30. |
| `NEXT_PUBLIC_APP_URL` | (opcional, tipo Config) endereço do site, usado no link do e-mail. |

- **Alertas:** o `vercel.json` agenda uma verificação por dia. No plano **Hobby** a Vercel só permite 1 execução diária (horário aproximado); no Pro dá para aumentar. Cada alerta verificado gasta **1 crédito da SerpApi**. O botão “Verificar agora” confere na hora. O app não avisa duas vezes pelo mesmo preço.
- **Módulo 5:** soma só valores com origem (SerpApi, fonte com link ou digitados por você). Você pode digitar/corrigir qualquer valor; o digitado vale mais.
- **Módulo 6:** os prejuízos são calculados em código. A chance de precisar mudar/cancelar é uma estimativa sua.
- **Módulo 7:** só passagens de ida; é apenas comparação de preços, sem recomendação, e sempre exibe o aviso de que a prática pode violar as condições da companhia. Esses resultados não podem ser adicionados à proposta.

### Pontos ainda não testados com chave real
- As **opções de reserva** da SerpApi (bagagem por vendedor) foram escritas pela documentação pública e ainda não foram testadas com uma chave real; se algo vier vazio, use a pesquisa por IA ou digite os valores.
- Em passagens com mais de um adulto, confirme se o preço da SerpApi é por pessoa ou total antes de enviar ao cliente.
- A pesquisa por IA depende de a Anthropic ter a busca na web habilitada na sua organização.

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
lib/analysis/       cálculos dos módulos 1 a 7
lib/research.ts     pesquisas por IA com filtro de fonte (módulos 4 a 6)
lib/alerts.ts       regra e envio dos alertas de preço
supabase/schema.sql tabelas e regras de segurança
```
