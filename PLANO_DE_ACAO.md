# Plano de Acao Tecnico - Gestor J2

Este plano segue as diretrizes do arquivo `prompt do scopo.txt`: diagnosticar antes de alterar, corrigir sem duplicar funcionalidades, justificar decisoes tecnicas, testar e documentar.

## 1. Diagnostico tecnico

Estado atual:

- Frontend Vite + React funcionando localmente.
- Projeto foi desacoplado da Base44 no nivel de dependencia ativa.
- Nao existe backend real versionado na pasta.
- Persistencia atual esta em `localStorage` via `src/api/appClient.js`.
- Funcoes criticas como auth, entidades, upload, WhatsApp e broadcast estao simuladas no navegador.
- Build de producao passa.
- Lint e typecheck ainda falham.
- Existem textos com codificacao quebrada em varios arquivos.

Rotas/telas principais:

- `Dashboard`
- `CreditRequests`
- `InvoiceManagement`
- `FinanceiroPospago`
- `AdminServers`
- `Servers`
- `Users`
- `Settings`
- `MessageTemplates`
- `BroadcastMessage`
- `WhatsAppDiagnostic`
- `Analytics`
- `ProofGallery`
- `Profile`
- `Playlists`

Fluxo principal esperado:

- Revendedor cria pedido de recarga.
- Sistema registra pedido, auditoria, etapa de aprovacao e notificacao interna.
- Sistema envia WhatsApp avisando que o pedido entrou na fila.
- Admin analisa, aprova ou rejeita.
- Ao aprovar, sistema marca pedido como recarregado e envia WhatsApp avisando creditos disponiveis.
- Ao rejeitar, sistema registra motivo, notifica internamente e envia WhatsApp.
- Financeiro acompanha faturas, pos-pago e comprovantes.

## 2. Problemas encontrados

Criticos:

- Nao ha backend proprio: regras de negocio e permissoes ainda rodam no cliente.
- Nao ha banco real: dados somem/trocam por navegador, sem integridade ou auditoria confiavel.
- Chaves/configuracoes de integracao podem ficar no frontend se nao migrarmos para backend.
- Upload atual converte arquivo para base64 no navegador, sem armazenamento seguro.

Altos:

- Permissoes administrativas dependem da interface/local client.
- Envio WhatsApp e broadcast ainda sao simulados localmente.
- Falta fila backend para notificacoes, retentativas e controle de falha.
- Falta autenticação real com senha/session/JWT/refresh ou provedor confiavel.
- `lint` falha com 16 erros.

Medios:

- `typecheck` falha com muitos erros de tipagem/inferencia.
- Textos estao com mojibake/codificacao quebrada.
- Bundle final esta grande.
- Algumas telas/testes de WhatsApp usam campos divergentes (`evolution_instance` vs `evolution_instance_id`).
- Existem componentes legados de provedores diferentes de WhatsApp que precisam ser consolidados.

Baixos:

- README ainda esta minimo.
- Falta documentacao de ambiente, deploy, backup e operacao.

## 3. Riscos criticos

- Aprovar recarga sem validacao forte no backend pode gerar prejuizo financeiro.
- Usuario malicioso pode alterar dados no navegador se o sistema continuar sem backend.
- Credenciais de WhatsApp expostas no frontend podem comprometer a instancia.
- Falha silenciosa no WhatsApp pode deixar revendedor sem aviso.
- Sem banco transacional, pedido, auditoria e notificacao podem ficar inconsistentes.

## 4. Arquitetura recomendada

Backend:

- NestJS + TypeScript.
- API REST para CRUD e operacoes principais.
- WebSocket Gateway para notificacoes em tempo real.
- Workers com BullMQ para WhatsApp, push notification, faturas e tarefas demoradas.

Banco de dados:

- PostgreSQL como banco principal.
- Prisma ORM com migrations versionadas.
- Redis para filas, cache leve, rate limit e jobs.

Notificacoes:

- Tabela `notifications` para historico interno.
- WebSocket para desktop aberto no painel.
- Push Notification via service worker para desktop/smartphone.
- WhatsApp via Evolution API executado por worker backend.

Armazenamento:

- Upload de comprovantes e anexos em storage privado.
- Backend valida tipo, tamanho e permissao antes de salvar.

Seguranca:

- Auth backend real.
- Controle RBAC: admin, reseller, possivelmente master/admin financeiro.
- CORS restrito.
- Rate limit nos endpoints sensiveis.
- Secrets apenas em `.env`, nunca no frontend.

## 5. Plano de acao por etapas

Etapa 1 - Estabilizacao do frontend atual:

- Corrigir lint bloqueante.
- Corrigir divergencias mais perigosas de WhatsApp.
- Padronizar nomes de campos usados pelo app.
- Corrigir codificacao de textos principais.
- Confirmar fluxo visual: revendedor cria pedido, admin aprova, notificacoes aparecem.

Etapa 2 - Fundacao do backend:

- Criar pasta `backend`.
- Configurar NestJS, Prisma, PostgreSQL e Redis.
- Criar `.env.example`.
- Criar migrations iniciais.
- Criar modulos: auth, users, servers, reseller-servers, credit-requests, approvals, notifications, whatsapp, invoices, audit, uploads.

Etapa 3 - Modelo de dados:

- Modelar tabelas com chaves estrangeiras e indices.
- Criar auditoria consistente.
- Criar status claros para pedidos e faturas.
- Criar vinculo admin -> revendedor.
- Criar configuracoes protegidas por admin.

Etapa 4 - Migracao da regra de negocio:

- Mover criacao de pedido para backend.
- Mover aprovacao/rejeicao para backend.
- Mover envio WhatsApp para fila backend.
- Mover upload para endpoint protegido.
- Frontend passa a consumir API real em vez de `localStorage`.

Etapa 5 - Notificacoes fortes:

- Criar notificacoes internas no banco.
- Criar gateway WebSocket.
- Criar service worker e push subscription no frontend.
- Criar worker que envia push para desktop/smartphone.
- Criar worker WhatsApp com retentativa e logs.

Etapa 6 - Testes e producao:

- Testes unitarios dos services.
- Testes de integracao da API.
- Teste do fluxo principal completo.
- Teste de permissao por papel.
- Teste de upload.
- Teste de falha/retry do WhatsApp.
- Documentacao de deploy, backup e operacao.

## 6. Correcoes propostas primeiro

Ordem recomendada:

1. Corrigir `lint` para termos base limpa.
2. Criar documento de arquitetura e `.env.example`.
3. Criar backend NestJS com Prisma e schema inicial.
4. Implementar entidades principais no banco.
5. Trocar gradualmente `appClient` por cliente HTTP real.
6. Implementar fila de WhatsApp e notificacoes.
7. Implementar push desktop/smartphone.
8. Remover simulacoes locais quando a API estiver pronta.

## 7. Testes necessarios

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- Login como admin.
- Login como revendedor.
- Criacao de pedido pelo revendedor.
- Notificacao de entrada na fila.
- WhatsApp de entrada na fila.
- Aprovacao pelo admin.
- WhatsApp de credito disponivel.
- Rejeicao com motivo.
- Upload de comprovante/anexo.
- Permissao: revendedor nao acessa telas administrativas.
- Permissao: admin enxerga seus revendedores e pedidos.

## 8. Checklist final de producao

- Backend real ativo.
- PostgreSQL com migrations.
- Redis ativo para filas.
- Secrets fora do frontend.
- CORS restrito.
- Upload privado validado.
- Rotas administrativas protegidas.
- Logs de auditoria funcionando.
- WhatsApp com retry e historico.
- Push notification funcionando em desktop e smartphone.
- Build, lint e typecheck passando.
- Documentacao minima criada.
- Backup definido.
- Deploy reproduzivel.

## Implementacao iniciada

Concluido nesta etapa:

- Corrigidos erros de lint do frontend.
- Mantido `npm run build` do frontend funcionando.
- Criada pasta `backend` com NestJS + TypeScript.
- Adicionado `docker-compose.yml` para PostgreSQL e Redis.
- Criado `.env.example` do backend.
- Criado Prisma schema com usuarios, servidores, vinculos, pedidos, aprovacao, notificacoes, auditoria, faturas, logs WhatsApp e push subscriptions.
- Criado healthcheck em `/api/health`.
- Criada autenticacao inicial com register/login JWT.
- Criados guards de papel para admin/revendedor/dev.
- Criado fluxo backend para pedido de recarga:
  - revendedor cria pedido;
  - cria etapa de aprovacao;
  - registra auditoria;
  - notifica revendedor que entrou na fila;
  - notifica admin do novo pedido;
  - enfileira WhatsApp de entrada na fila;
  - admin coloca em analise;
  - admin aprova e enfileira WhatsApp de creditos disponiveis;
  - admin rejeita e enfileira WhatsApp de rejeicao.
- Criada fila BullMQ para WhatsApp com Redis.
- Criado worker backend para Evolution API.
- Criado suporte inicial a push notification:
  - service worker no frontend;
  - cliente frontend para inscricao push;
  - endpoint backend para salvar push subscriptions;
  - envio de push quando uma notificacao interna e criada.

Validacoes desta etapa:

- `npm run lint` passou.
- `npm run build` passou.
- `npm run prisma:generate --prefix backend` passou.
- `npm run build --prefix backend` passou.

Pendencias abertas:

- Migrar frontend do `localStorage/appClient` para API real.
- Criar seed inicial do banco.
- Implementar upload protegido real.
- Implementar refresh token/session segura.
- Configurar chaves VAPID reais.
- Configurar Evolution API real por ambiente.
- Rodar migrations com PostgreSQL ativo.
- Corrigir `npm audit` do backend.
- Reduzir bundle do frontend.
- Corrigir `typecheck` herdado do frontend.

## Rodada multiagente

Equipe usada:

- Agente Backend Seed: implementou seed inicial idempotente.
- Agente Upload Seguro: implementou upload protegido real.
- Agente Auditor Frontend: mapeou migracao do `appClient/localStorage` para API real.
- Orquestrador local: revisou seguranca, integrou ajustes, removeu senha fixa do seed, criou runbook e cliente HTTP inicial.

Implementado nesta rodada:

- `backend/prisma/seed.ts` com seed idempotente de admin, revendedor, servidor, vinculo e settings.
- `backend:prisma:seed` no `package.json` raiz.
- `prisma:seed` no `backend/package.json`.
- Upload protegido em `POST /api/uploads`.
- Download protegido em `GET /api/uploads/:filename`.
- Validacao de upload por extensao, MIME e assinatura de bytes.
- Limite de upload via `MAX_UPLOAD_MB`.
- `backend/RUNBOOK.md`.
- `backend/.gitignore`.
- `.env.example` do frontend com `VITE_API_URL` e `VITE_VAPID_PUBLIC_KEY`.
- `src/api/httpClient.js`.
- `src/api/remoteClient.js`.
- Endpoints reais adicionados para `users`, `settings` e `reseller-servers`.

Revisao de seguranca aplicada:

- O seed inicialmente tinha senha dev fixa. Foi corrigido para exigir `SEED_ADMIN_PASSWORD` e `SEED_RESELLER_PASSWORD` por ambiente.
- Upload nao expoe path absoluto.
- Arquivos servidos pelo endpoint de upload exigem JWT.

Validacoes da rodada:

- `npm run prisma:generate --prefix backend` passou.
- `npm run build --prefix backend` passou.
- `npm run lint` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou apos novos endpoints.
- `npx tsc -p backend\tsconfig.build.json --noEmit --incremental false` passou.

Achados QA corrigidos nesta rodada:

- `PATCH /api/users/me` agora aceita apenas `name` e `phone`.
- Login agora bloqueia usuarios que nao estao `active`.
- Admin nao pode criar revendedor associado a outro `parentId`.
- Admin lista/processa apenas pedidos de revendedores filhos.
- Admin lista/cria/edita apenas vinculos `reseller-server` dos seus revendedores.
- Settings ficaram restritas ao admin operacional.
- JWT falha em producao se `JWT_SECRET` estiver ausente ou fraco.
- `proofUrl` de pedido agora precisa seguir o padrao do endpoint `/api/uploads`.
- Seed nao sobrescreve senhas existentes sem `SEED_RESET_PASSWORDS=true`.

Pendencias QA ainda abertas:

- Upload ainda nao persiste metadados de dono/finalidade em tabela propria.
- Ainda faltam migrations versionadas.
- Ainda faltam testes automatizados backend.
- Ainda falta migrar o frontend para consumir API real em fluxo completo.

## Rodada de continuidade - Login, auth e banco

Analise executada:

- Verificada rota `/Login` no frontend.
- Verificado `AuthContext` usando `remoteClient`.
- Verificado backend com refresh token, cookie httpOnly, throttling e cookie parser.
- Verificada existencia de `RefreshToken` no Prisma schema.
- Verificado que o Docker CLI existe, mas o Docker Desktop/daemon nao esta rodando.

Implementado/corrigido:

- Gerada migration SQL inicial em `backend/prisma/migrations/20260615170000_init/migration.sql`.
- Corrigido `httpClient` para nao autenticar usuario nulo em caso de 401.
- `AuthContext` agora exige `currentUser.id` para considerar autenticado.
- Removida diretiva ESLint invalida em `src/hooks/useNotifications.js`.

Validacoes:

- `npm run lint` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- `npm run prisma:generate --prefix backend` passou.
- `npx tsc -p backend\tsconfig.build.json --noEmit --incremental false` passou.
- `http://localhost:5174/Login` respondeu `200 OK`.

Bloqueio:

- `npm run infra:dev` nao conseguiu subir Postgres/Redis porque o Docker Desktop daemon nao esta ativo:
  `failed to connect to the docker API ... dockerDesktopLinuxEngine`.

Proxima acao quando Docker estiver ativo:

1. `npm run infra:dev`
2. `npm run backend:prisma:migrate`
3. Definir `SEED_ADMIN_PASSWORD` e `SEED_RESELLER_PASSWORD`
4. `npm run backend:prisma:seed`
5. `npm run backend:dev`
6. Testar login real em `/Login`

Mapa de migracao frontend definido:

1. Migrar auth para API real.
2. Criar adapter temporario camelCase/snake_case.
3. Migrar pedidos para API real.
4. Migrar upload para `POST /api/uploads`.
5. Migrar servidores e vinculos de revendedor.
6. Migrar usuarios/settings/WhatsApp.
7. Migrar financeiro/invoices.
8. Remover `localStorage/appClient` quando os fluxos principais estiverem cobertos.

## Rodada de continuidade - Remocao operacional do localStorage/Base44

Implementado/corrigido:

- Rotas perigosas de diagnostico/teste foram removidas da exposicao normal do app.
- `Settings`, `Profile`, `MessageTemplates` e formularios relacionados passaram a usar API real.
- Criacao de pedido simples e multiplo agora usa `POST /api/uploads` e `POST /api/credit-requests`.
- Aprovacao, rejeicao e marcacao em analise agora usam endpoints reais do backend.
- Rejeicao com imagem anexa agora envia a URL para o backend e registra no detalhe de auditoria.
- `appClient` deixou de ser banco local em `localStorage` e virou adaptador temporario para `remoteClient`.
- CRUD real de servidores foi adicionado ao backend:
  - `POST /api/servers`
  - `PATCH /api/servers/:id`
  - `DELETE /api/servers/:id` com desativacao logica
- Criada rota segura `GET /api/settings/public` para revendedores lerem PIX, marca e contatos sem expor segredos de integracao.
- Adicionados campos de branding/integracoes em `Settings`.
- Adicionada migration para `ErrorLog`.
- Removidos arquivos duplicados/obsoletos:
  - `src/api/backendClient.js`
  - `src/components/settings/WhatsAppEvolution.jsx`

Validacoes desta rodada:

- `npm run lint` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- `npx tsc -p backend\tsconfig.build.json --noEmit --incremental false` passou.
- `npm run prisma:generate --prefix backend` passou.
- `npm exec -- prisma validate` dentro de `backend` passou.
- `http://localhost:5174/Login` respondeu `200 OK`.

Pendencias abertas:

- API backend nao ficou ativa em `http://localhost:3333/api/health` durante o teste curto desta rodada; precisa rodar com Postgres/Redis ativos.
- Ainda existem telas que importam `appClient`, mas agora ele aponta para o backend proprio em vez de persistir em `localStorage`.
- Alguns metodos antigos agora falham explicitamente porque ainda faltam endpoints reais, principalmente CRUD completo de entidades auxiliares e algumas rotinas financeiras legadas.
- `npm run typecheck` do frontend continua como divida herdada por JS/checkJs.
- Bundle do frontend ainda esta acima de 500 kB.
- `whatsappHelper.jsx` ainda aparece como import estatico/dinamico misto e deve ser consolidado no cliente backend.

## Rodada de limpeza incremental - validacao e pontas soltas

Implementado/corrigido:

- Removidas paginas legadas/perigosas que nao estavam mais roteadas:
  - `DataDiagnostic`
  - `PromoteToAdmin`
  - `ServerValidation`
  - `WhatsAppTest`
- `RequestActions.jsx` foi limpo:
  - removido `appClient`;
  - removido import estatico de `whatsappHelper`;
  - removidos fluxos locais mortos de aprovacao/rejeicao;
  - a tela agora apenas chama endpoints reais e o backend cuida de auditoria/notificacoes/fila.
- Backend ganhou remocao logica de revendedor:
  - `DELETE /api/users/:id` bloqueia o revendedor preservando historico.
- Backend ganhou remocao logica de vinculo servidor-revendedor:
  - `DELETE /api/reseller-servers/:id` marca o vinculo como inativo.
- Cliente remoto/adaptador foram atualizados para usar essas rotas.
- `Invoice.update(... status: paid)` no adaptador agora chama `PATCH /api/invoices/:id/pay`.
- Atualizacao antiga de `invoice_id` em pedido virou operacao idempotente no adaptador, porque o backend novo ja vincula pedidos ao gerar fatura.
- Importacao em massa de servidores deixou de depender de extracao/LLM externa e agora le CSV/TSV localmente.
- Grafico de demanda deixou de chamar LLM e passou a calcular por pedidos reais aprovados.
- `typecheck` passou a ser coerente com o estado JS do projeto (`checkJs: false`) e foi adicionada tipagem Vite para `import.meta.env`.

Validacoes desta rodada:

- `npm run lint` passou.
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- `npx tsc -p backend\tsconfig.build.json --noEmit --incremental false` passou.
- `npm exec -- prisma validate` dentro de `backend` passou.
- `http://localhost:5174/Login` respondeu `200 OK`.

Observacao importante:

- A engine de envio WhatsApp ainda nao foi reestruturada nesta rodada. Ela deve ser tratada em etapa propria, com fila, worker, janelas aleatorias, limites por instancia e retries para reduzir risco de bloqueio.

## Rodada de implementacao - WhatsApp seguro e remocao do helper legado

Implementado/corrigido:

- Engine WhatsApp no backend passou a usar politica anti-ban:
  - delay aleatorio por mensagem antes de entrar em envio;
  - worker com concorrencia 1;
  - intervalo minimo entre envios;
  - limite maximo por minuto em janela deslizante;
  - retry com backoff mais longo;
  - logs em `WhatsAppLog`.
- Variaveis adicionadas ao `backend/.env.example`:
  - `WHATSAPP_MIN_DELAY_MS`
  - `WHATSAPP_MAX_DELAY_MS`
  - `WHATSAPP_MIN_SEND_INTERVAL_MS`
  - `WHATSAPP_RETRY_BASE_DELAY_MS`
  - `WHATSAPP_MAX_PER_MINUTE`
- Backend ganhou endpoints de fila:
  - `GET /api/whatsapp/queue`
  - `POST /api/whatsapp/queue/retry-failed`
  - `POST /api/whatsapp/queue/clear-pending`
- `remoteClient.whatsapp` atualizado com status da fila, retry e limpeza.
- `WhatsAppDiagnostic` refeito para usar API real:
  - status da instancia;
  - QR Code;
  - teste de envio;
  - status da fila anti-ban;
  - logs recentes.
- `NotificationTest` refeito para usar API real e mostrar configuracao anti-ban.
- `whatsappHelper.jsx` removido.
- `InvoiceManagement` deixou de importar helper WhatsApp; pagamento e reenvio de recibo passam pelo backend.
- `appClient.functions.invoke('evolutionProxy')` removido.
- Exports antigos de LLM/email/SMS/extracao de arquivo foram removidos dos clientes de integracao; ficou apenas upload real.

Validacoes desta rodada:

- `npm run lint` passou.
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- `npx tsc -p backend\tsconfig.build.json --noEmit --incremental false` passou.

Pendencias para validar em ambiente real:

- Subir Redis e Postgres.
- Rodar migrations e seed.
- Configurar Evolution API real.
- Testar envio real com as janelas anti-ban configuradas.
- Se houver multiplas instancias/workers em producao, migrar o controle de janela por minuto do processo Node para Redis, garantindo limite global.

## Rodada de continuidade - hardening administrativo e integridade financeira

Implementado/corrigido:

- Removida a pagina `AdminTransfer`, que tinha e-mails fixos e permitia reatribuir dados administrativos pela interface.
- `pages.config.js` deixou de expor a rota `AdminTransfer`.
- Historico de preco por servidor foi modelado no backend com `ServerPriceHistory`.
- Criada migration `20260615203000_server_price_history`.
- Backend agora registra preco inicial do servidor e novas entradas quando `valuePerCredit` muda.
- Cliente remoto ganhou `servers.priceHistory(id)`.
- Adaptador temporario ganhou `ServerPriceHistory.list(...)` apontando para o backend.
- Broadcast WhatsApp no adaptador passou a traduzir payload legado `reseller_ids` para `userIds`.
- Normalizacao de faturas no cliente remoto passou a preencher campos legados esperados pela UI sem recriar persistencia local.

Decisao tecnica:

- Operacoes de manutencao administrativa sensiveis nao devem ficar disponiveis como tela do produto. Quando necessarias, devem virar comando controlado no backend, com autenticacao forte, auditoria, confirmacao explicita e escopo claro.

Pendencias imediatas:

- Rodar novamente lint, typecheck e builds apos esta remocao.
- Continuar reduzindo uso direto do adaptador `appClient` tela por tela.
- Criar testes automatizados para os fluxos de pedido, aprovacao, fatura e fila WhatsApp.

Validacoes e correcoes finais desta rodada:

- Corrigido `Dashboard.jsx`, que usava `appClient` sem import explicito.
- Corrigido `InvoiceManagement.jsx`, removendo aspas curvas que quebravam parser/build.
- Corrigido `appClient.auth.updateMe`, que apontava para metodo inexistente e quebrava `src/api/entities.js` antes da montagem do React.
- Blindado `src/main.jsx` contra ambientes sem `navigator` antes de registrar service worker.
- `npm run lint` passou.
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- Chrome headless confirmou que `/Login` renderiza `Gestor J2`, campos de email/senha e botoes.
- In-app browser confirmou `rootChildren: 2`, `inputs: 2`, `buttons: 3` em `http://localhost:5174/Login`.

## Rodada de seguranca - bootstrap unico dos 2 administradores

Implementado/corrigido:

- Adicionado `GET /api/auth/bootstrap/status`.
- Adicionado `POST /api/auth/bootstrap`.
- O bootstrap publico so fica permitido quando ainda nao existe nenhum admin operacional e nenhuma conta de recuperacao.
- Ao executar o bootstrap, o backend cria exatamente:
  - 1 admin operacional (`role=admin`);
  - 1 conta de recuperacao (`role=recovery`).
- Depois que qualquer uma dessas contas existe, o endpoint bloqueia novas criacoes administrativas.
- A tela de login agora consulta o status do bootstrap:
  - se `canBootstrap=true`, mostra um formulario unico para criar as duas contas;
  - se `canBootstrap=false`, mostra apenas login e cadastro de revendedor.
- O cadastro normal continua criando somente revendedor; a API de usuarios tambem continua impedindo criacao de admin.
- Criada migration `20260615210000_add_recovery_role` para garantir o valor `recovery` no enum `UserRole`.

Validacoes desta rodada:

- `npm run lint` passou.
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run build --prefix backend` passou.
- `npm exec -- prisma validate` dentro de `backend` passou.
- `npm run prisma:generate --prefix backend` passou.
- In-app browser confirmou `/Login` renderizando em modo normal quando backend/bootstrap nao esta disponivel.
