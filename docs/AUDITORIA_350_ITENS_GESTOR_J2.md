# Auditoria 350 Itens - Gestor J2

Data: 2026-06-21
Status: backlog tecnico e produto para evolucao continua
Escopo: frontend Vue, backend NestJS, banco Prisma/Postgres, deploy EasyPanel, PWA, notificacoes, WhatsApp, pedidos, servidores, revendedores e operacao.

## Como Usar

- `M-*` sao melhorias de produto, UX, operacao, seguranca ou arquitetura.
- `C-*` sao correcoes de bugs, falhas, riscos tecnicos ou inconsistencias.
- Prioridades: `P0` bloqueante/critico, `P1` alto impacto, `P2` medio impacto, `P3` polimento.
- Cada item deve virar tarefa antes de ser implementado, com criterio de aceite, evidencia e responsavel.

## Melhorias 200

1. `M-001` P1 Dashboard: criar filtro global por periodo; impacto: metricas ficam comparaveis e acionaveis.
2. `M-002` P1 Dashboard: adicionar ranking de revendedores por receita; impacto: admin identifica melhores clientes.
3. `M-003` P1 Dashboard: adicionar ranking de servidores por volume; impacto: admin sabe onde focar estoque/fornecedor.
4. `M-004` P2 Dashboard: incluir comparativo com periodo anterior; impacto: melhora leitura de crescimento.
5. `M-005` P2 Dashboard: cards com drill-down para listas filtradas; impacto: numero vira acao.
6. `M-006` P2 Dashboard: separar indicadores admin e reseller; impacto: reduz ruido por perfil.
7. `M-007` P2 Dashboard: mostrar fila por tempo parado; impacto: ajuda priorizar pedidos antigos.
8. `M-008` P1 Dashboard: alerta de pedidos sem comprovante; impacto: evita analise perdida.
9. `M-009` P1 Dashboard: alerta de pedidos aguardando WhatsApp; impacto: melhora comunicacao.
10. `M-010` P2 Dashboard: grafico de receita por servidor; impacto: identifica rentabilidade.
11. `M-011` P2 Dashboard: grafico de creditos por status; impacto: facilita operacao.
12. `M-012` P2 Dashboard: metas mensais configuraveis; impacto: admin acompanha objetivo.
13. `M-013` P3 Dashboard: modo compacto para desktop; impacto: usa melhor telas grandes.
14. `M-014` P3 Dashboard: skeleton loading por card; impacto: experiencia mais fluida.
15. `M-015` P2 Dashboard: resumo de PIX copiado/pago; impacto: identifica gargalo de pagamento.
16. `M-016` P1 Pedidos: criar busca por ID curto, login, servidor e reseller; impacto: atendimento mais rapido.
17. `M-017` P1 Pedidos: filtros salvos por status; impacto: admin volta direto para fila de trabalho.
18. `M-018` P1 Pedidos: acao em lote para aprovar pedidos selecionados; impacto: reduz repeticao.
19. `M-019` P1 Pedidos: acao em lote para marcar em analise; impacto: organiza fila.
20. `M-020` P1 Pedidos: acao em lote para rejeitar com motivo padrao; impacto: padroniza comunicacao.
21. `M-021` P1 Pedidos: historico visual de etapas no card; impacto: rastreabilidade imediata.
22. `M-022` P2 Pedidos: indicador de SLA por pedido; impacto: evita atraso.
23. `M-023` P2 Pedidos: destaque para pedidos urgentes; impacto: priorizacao clara.
24. `M-024` P2 Pedidos: separacao "meus pedidos" e "todos" para admin; impacto: melhora foco.
25. `M-025` P2 Pedidos: timeline de mensagens e auditoria no mesmo painel; impacto: reduz cliques.
26. `M-026` P1 Pedidos: copiar dados do painel fornecedor em um clique; impacto: acelera recarga.
27. `M-027` P1 Pedidos: mostrar fornecedor interno apenas para admin; impacto: operacao segura.
28. `M-028` P1 Pedidos: botao de WhatsApp direto no card; impacto: contato rapido.
29. `M-029` P2 Pedidos: anexos multiplos por pedido; impacto: comprovantes e evidencias melhores.
30. `M-030` P2 Pedidos: preview de comprovante no card expandido; impacto: menos modais.
31. `M-031` P2 Pedidos: pagamento PIX com botao copiar mais visivel; impacto: reduz erro do reseller.
32. `M-032` P2 Pedidos: estado vazio com CTA para cadastrar servidor; impacto: onboarding melhor.
33. `M-033` P2 Pedidos: separar pedidos pre-pago e pos-pago; impacto: financeiro mais claro.
34. `M-034` P2 Pedidos: exportacao CSV por filtro; impacto: auditoria externa.
35. `M-035` P2 Pedidos: salvar observacao interna por pedido; impacto: contexto operacional.
36. `M-036` P2 Pedidos: comentarios visiveis por perfil; impacto: comunicacao controlada.
37. `M-037` P3 Pedidos: atalhos de teclado para admin; impacto: produtividade em desktop.
38. `M-038` P3 Pedidos: chips de status com contadores; impacto: leitura rapida.
39. `M-039` P2 Pedidos: indicador de lucro estimado por pedido; impacto: decisao financeira.
40. `M-040` P1 Pedidos: bloqueio de pedido se reseller sem servidor ativo; impacto: evita erro operacional.
41. `M-041` P1 Chat: notificacao em tempo real por conversa; impacto: respostas mais rapidas.
42. `M-042` P1 Chat: separacao lista/conversa com scroll independente; impacto: usabilidade em conversas longas.
43. `M-043` P1 Chat: templates rapidos ao lado do input; impacto: padroniza atendimento.
44. `M-044` P2 Chat: marcar conversa como resolvida; impacto: organiza suporte.
45. `M-045` P2 Chat: filtro por nao lidas; impacto: reduz perda de mensagens.
46. `M-046` P2 Chat: indicador "digitando" local/futuro WebSocket; impacto: sensacao de tempo real.
47. `M-047` P2 Chat: anexos no chat; impacto: suporte com evidencias.
48. `M-048` P2 Chat: busca dentro da conversa; impacto: encontra historico.
49. `M-049` P2 Chat: etiquetas por assunto; impacto: triagem.
50. `M-050` P2 Chat: notas internas invisiveis ao reseller; impacto: contexto do suporte.
51. `M-051` P3 Chat: reacoes rapidas operacionais; impacto: feedback rapido.
52. `M-052` P2 Chat: arquivamento com motivo; impacto: governanca.
53. `M-053` P2 Chat: fila de atendimento por admin; impacto: escala.
54. `M-054` P1 Chat: push para mensagens novas; impacto: reduz espera.
55. `M-055` P2 Chat: resumo automatico da conversa; impacto: troca de turno.
56. `M-056` P1 Revendedores: selecao multipla e exclusao em lote; impacto: gestao de volume.
57. `M-057` P1 Revendedores: edicao de senha pelo admin; impacto: suporte rapido.
58. `M-058` P1 Revendedores: edicao de permissoes por admin; impacto: controle de acesso.
59. `M-059` P1 Revendedores: painel de servidores vinculados no perfil; impacto: visao completa.
60. `M-060` P1 Revendedores: definir preco por servidor no cadastro; impacto: evita retrabalho.
61. `M-061` P2 Revendedores: status comercial ativo/inativo/bloqueado; impacto: controle financeiro.
62. `M-062` P2 Revendedores: limite de credito por reseller; impacto: risco menor.
63. `M-063` P2 Revendedores: historico financeiro individual; impacto: cobranca clara.
64. `M-064` P2 Revendedores: busca por telefone/WhatsApp; impacto: suporte rapido.
65. `M-065` P2 Revendedores: tags de segmentacao; impacto: campanhas melhores.
66. `M-066` P2 Revendedores: importacao com preview antes do commit; impacto: evita dados ruins.
67. `M-067` P2 Revendedores: merge de duplicados; impacto: base limpa.
68. `M-068` P2 Revendedores: auditoria de alteracao de preco; impacto: transparencia.
69. `M-069` P2 Revendedores: painel de pedidos recentes no perfil; impacto: atendimento rapido.
70. `M-070` P2 Revendedores: indicador de inadimplencia; impacto: controle pos-pago.
71. `M-071` P3 Revendedores: avatar/identidade por reseller; impacto: leitura visual.
72. `M-072` P3 Revendedores: exportacao XLS/CSV; impacto: backup operacional.
73. `M-073` P1 Servidores: excluir servidor com confirmacao detalhada; impacto: gestao completa.
74. `M-074` P1 Servidores: restaurar servidor excluido quando possivel; impacto: recuperacao de erro humano.
75. `M-075` P1 Servidores: fornecedor principal sugerido; impacto: recarga mais rapida.
76. `M-076` P1 Servidores: ranking de custo por fornecedor; impacto: margem maior.
77. `M-077` P1 Servidores: alerta de fornecedor sem custo; impacto: evita lucro errado.
78. `M-078` P1 Servidores: alerta de reseller sem preco definido; impacto: evita pedido invalido.
79. `M-079` P2 Servidores: lista compacta mobile; impacto: menos scroll.
80. `M-080` P2 Servidores: duplicar servidor como rascunho; impacto: cadastro mais rapido.
81. `M-081` P2 Servidores: historico de alteracoes por servidor; impacto: auditoria.
82. `M-082` P2 Servidores: importacao de fornecedores; impacto: onboarding.
83. `M-083` P2 Servidores: agrupamento por categoria; impacto: organizacao.
84. `M-084` P2 Servidores: status operacional online/instavel/offline; impacto: evita pedidos em servidor ruim.
85. `M-085` P2 Servidores: campo de painel interno criptografado; impacto: seguranca.
86. `M-086` P2 Servidores: mascara para custo e preco BRL; impacto: menos erro.
87. `M-087` P2 Servidores: validacao de duplicidade por nome normalizado; impacto: base limpa.
88. `M-088` P2 Servidores: dashboard de margem por servidor; impacto: gestao financeira.
89. `M-089` P2 Servidores: vinculo fornecedor-servidor em lote; impacto: produtividade.
90. `M-090` P3 Servidores: badges visuais de inativo/ativo; impacto: leitura rapida.
91. `M-091` P1 Financeiro: contas a receber por reseller; impacto: cobranca.
92. `M-092` P1 Financeiro: vencimentos e lembretes pos-pago; impacto: reducao de inadimplencia.
93. `M-093` P1 Financeiro: conciliacao manual de PIX; impacto: controle de pagamento.
94. `M-094` P2 Financeiro: relatorio de margem por periodo; impacto: lucro visivel.
95. `M-095` P2 Financeiro: exportar extrato por reseller; impacto: transparencia.
96. `M-096` P2 Financeiro: filtro por forma de pagamento; impacto: analise melhor.
97. `M-097` P2 Financeiro: despesas por fornecedor; impacto: lucro real.
98. `M-098` P2 Financeiro: alerta de pedido aprovado sem pagamento confirmado; impacto: risco menor.
99. `M-099` P2 Financeiro: fechamento mensal; impacto: processo recorrente.
100. `M-100` P2 Financeiro: resumo de comissoes/descontos; impacto: flexibilidade comercial.
101. `M-101` P1 Templates: biblioteca inicial por status do pedido; impacto: WhatsApp mais rapido.
102. `M-102` P1 Templates: preview com variaveis reais; impacto: evita mensagem errada.
103. `M-103` P1 Templates: validação de placeholders aceitos; impacto: reduz falha de envio.
104. `M-104` P2 Templates: historico de versoes; impacto: auditoria de comunicacao.
105. `M-105` P2 Templates: duplicar template; impacto: produtividade.
106. `M-106` P2 Templates: categorizar por fila/aprovacao/rejeicao/cobranca; impacto: organizacao.
107. `M-107` P2 Templates: teste de envio para numero admin; impacto: QA operacional.
108. `M-108` P2 Templates: indicador de template padrao ativo; impacto: previsibilidade.
109. `M-109` P2 Templates: variaveis por tipo de evento; impacto: menos erro.
110. `M-110` P3 Templates: contador de caracteres; impacto: controle de mensagem.
111. `M-111` P1 WhatsApp: painel da fila com tentativa e proximo envio; impacto: debug real.
112. `M-112` P1 WhatsApp: reprocessar falhas selecionadas; impacto: recuperacao.
113. `M-113` P1 WhatsApp: pausa manual da fila; impacto: controle contra ban.
114. `M-114` P1 WhatsApp: janela de envio configuravel; impacto: envio mais seguro.
115. `M-115` P2 WhatsApp: healthcheck da Evolution API; impacto: deteccao precoce.
116. `M-116` P2 WhatsApp: alerta quando instancia desconecta; impacto: evita silencio.
117. `M-117` P2 WhatsApp: log por pedido; impacto: rastreabilidade.
118. `M-118` P2 WhatsApp: estatistica de sucesso/falha; impacto: operacao.
119. `M-119` P2 WhatsApp: variacao de texto por template; impacto: menor risco de bloqueio.
120. `M-120` P2 WhatsApp: backoff visual por erro; impacto: previsibilidade.
121. `M-121` P1 Notificacoes: WebSocket/SSE para eventos criticos; impacto: tempo real.
122. `M-122` P1 Notificacoes: configurar sons por evento; impacto: atencao operacional.
123. `M-123` P1 Notificacoes: teste push por usuario; impacto: suporte.
124. `M-124` P2 Notificacoes: central com filtros lida/nao lida; impacto: organizacao.
125. `M-125` P2 Notificacoes: marcar todas como lidas; impacto: limpeza.
126. `M-126` P2 Notificacoes: notificacao para pedido parado; impacto: SLA.
127. `M-127` P2 Notificacoes: notificacao para novo chat; impacto: atendimento.
128. `M-128` P2 Notificacoes: notificacao para falha WhatsApp; impacto: operacao.
129. `M-129` P2 Notificacoes: preferencia por perfil; impacto: menos ruido.
130. `M-130` P3 Notificacoes: icones por tipo; impacto: leitura.
131. `M-131` P1 Configuracoes: editor visual completo de login; impacto: personalizacao real.
132. `M-132` P1 Configuracoes: preview mobile/desktop do branding; impacto: evita tema quebrado.
133. `M-133` P1 Configuracoes: gestao de chaves PIX com status; impacto: pagamento correto.
134. `M-134` P2 Configuracoes: logs de alteracoes sensiveis; impacto: auditoria.
135. `M-135` P2 Configuracoes: abas por dominio operacional; impacto: menos confusao.
136. `M-136` P2 Configuracoes: validacao de URLs e emails; impacto: dados limpos.
137. `M-137` P2 Configuracoes: backup/export das configuracoes; impacto: recuperacao.
138. `M-138` P2 Configuracoes: restaurar configuracao anterior; impacto: seguranca.
139. `M-139` P2 Configuracoes: modo manutencao; impacto: deploy controlado.
140. `M-140` P3 Configuracoes: assistente de setup inicial; impacto: onboarding.
141. `M-141` P1 Importacao: aceitar multiplos layouts de CSV; impacto: migracao facil.
142. `M-142` P1 Importacao: mapeamento de colunas salvo; impacto: produtividade.
143. `M-143` P1 Importacao: validacao de duplicidade antes de importar; impacto: base limpa.
144. `M-144` P1 Importacao: simulador de impacto; impacto: previsibilidade.
145. `M-145` P2 Importacao: relatorio de linhas rejeitadas; impacto: correcao facil.
146. `M-146` P2 Importacao: rollback da importacao; impacto: seguranca.
147. `M-147` P2 Importacao: logs por arquivo; impacto: auditoria.
148. `M-148` P2 Importacao: importacao de servidores/fornecedores; impacto: escala.
149. `M-149` P2 Importacao: senha padrao configuravel por lote; impacto: flexibilidade.
150. `M-150` P2 Importacao: normalizacao de nomes de servidores; impacto: evita duplicidade.
151. `M-151` P1 Auth: 2FA opcional para admin; impacto: seguranca.
152. `M-152` P1 Auth: politicas de senha forte por perfil; impacto: seguranca.
153. `M-153` P1 Auth: revogar todas as sessoes do usuario; impacto: resposta a incidente.
154. `M-154` P2 Auth: log de login e IP; impacto: auditoria.
155. `M-155` P2 Auth: bloqueio temporario por tentativas; impacto: protecao.
156. `M-156` P2 Auth: recuperacao de senha por fluxo seguro; impacto: suporte.
157. `M-157` P2 Auth: sessao persistente configuravel; impacto: UX.
158. `M-158` P2 Auth: dispositivo confiavel; impacto: seguranca/UX.
159. `M-159` P2 Auth: aviso de novo login; impacto: seguranca.
160. `M-160` P3 Auth: tela de logout confirmada em mobile; impacto: clareza.
161. `M-161` P1 API: padrao de resposta de erro unificado; impacto: frontend previsivel.
162. `M-162` P1 API: paginacao nos endpoints grandes; impacto: performance.
163. `M-163` P1 API: rate limit por rota sensivel; impacto: seguranca.
164. `M-164` P1 API: DTOs com transform numerico consistente; impacto: menos 400 inesperado.
165. `M-165` P2 API: documentacao OpenAPI; impacto: integracao.
166. `M-166` P2 API: filtros padronizados por query; impacto: escalabilidade.
167. `M-167` P2 API: versionamento `/api/v1`; impacto: evolucao segura.
168. `M-168` P2 API: correlation-id por request; impacto: debug.
169. `M-169` P2 API: auditoria automatica de mutacoes; impacto: compliance.
170. `M-170` P3 API: mensagens de erro humanizadas; impacto: UX.
171. `M-171` P1 Banco: indices para consultas de fila; impacto: performance.
172. `M-172` P1 Banco: constraints de unicidade normalizada; impacto: dados limpos.
173. `M-173` P1 Banco: soft delete para entidades comerciais; impacto: historico.
174. `M-174` P2 Banco: views/materialized summaries para dashboard; impacto: escala.
175. `M-175` P2 Banco: politica de backup testada; impacto: recuperacao.
176. `M-176` P2 Banco: migration checklist; impacto: deploy seguro.
177. `M-177` P2 Banco: seed idempotente por ambiente; impacto: previsibilidade.
178. `M-178` P2 Banco: campos `createdBy/updatedBy`; impacto: auditoria.
179. `M-179` P2 Banco: limpeza programada de logs antigos; impacto: storage.
180. `M-180` P3 Banco: nomes de constraints padronizados; impacto: manutencao.
181. `M-181` P1 Deploy: checklist pre-deploy automatizado; impacto: menos quebra.
182. `M-182` P1 Deploy: healthcheck profundo com Postgres/Redis/Evolution; impacto: confiabilidade.
183. `M-183` P1 Deploy: rollback documentado no EasyPanel; impacto: recuperacao rapida.
184. `M-184` P2 Deploy: logs estruturados JSON; impacto: observabilidade.
185. `M-185` P2 Deploy: separacao env por frontend/backend; impacto: clareza.
186. `M-186` P2 Deploy: compressao gzip/brotli no nginx; impacto: performance.
187. `M-187` P2 Deploy: cache headers para assets versionados; impacto: velocidade.
188. `M-188` P2 Deploy: volume de uploads verificado; impacto: persistencia.
189. `M-189` P2 Deploy: alerta de migracao falha; impacto: resposta rapida.
190. `M-190` P3 Deploy: comando de smoke test pos-deploy; impacto: rotina.
191. `M-191` P1 QA: suite e2e dos fluxos principais; impacto: regressao menor.
192. `M-192` P1 QA: testes unitarios para servicos de pedido; impacto: confianca.
193. `M-193` P1 QA: testes de permissao por perfil; impacto: seguranca.
194. `M-194` P2 QA: visual regression das telas principais; impacto: tema consistente.
195. `M-195` P2 QA: teste mobile 375px automatizado; impacto: responsividade.
196. `M-196` P2 QA: contract tests API/frontend; impacto: menos quebra.
197. `M-197` P2 QA: fixtures realistas de revendedores/servidores; impacto: teste util.
198. `M-198` P2 QA: checklist de acessibilidade; impacto: inclusao.
199. `M-199` P2 QA: monitoramento de erro frontend; impacto: debug.
200. `M-200` P3 QA: changelog automatico por release; impacto: governanca.

## Correcoes 150

1. `C-001` P1 Git: ignorar artefatos `.qa` e relatorios temporarios; impacto: repositorio limpo.
2. `C-002` P1 Servidores: evitar `DELETE` acidental sem confirmacao rica; impacto: previne perda operacional.
3. `C-003` P1 Servidores: diferenciar claramente desativar e excluir; impacto: reduz erro humano.
4. `C-004` P1 Servidores: validar custo/preco com virgula e ponto; impacto: evita valor zero indevido.
5. `C-005` P1 Servidores: impedir duplicidade por nome com espacos/case; impacto: base limpa.
6. `C-006` P1 Servidores: bloquear vinculo reseller sem login; impacto: pedido correto.
7. `C-007` P1 Servidores: bloquear mudanca de preco pelo reseller apos cadastro; impacto: regra de negocio.
8. `C-008` P2 Servidores: tratar lista vazia de fornecedores no formulario; impacto: menos confusao.
9. `C-009` P2 Servidores: corrigir textos com mojibake; impacto: profissionalismo.
10. `C-010` P2 Servidores: garantir botao excluir visivel apenas para admin/dev; impacto: seguranca.
11. `C-011` P1 Pedidos: nao pedir login se ja existe vinculo reseller-servidor; impacto: fluxo correto.
12. `C-012` P1 Pedidos: bloquear pedido quando servidor vinculado esta inativo; impacto: evita falha de recarga.
13. `C-013` P1 Pedidos: bloquear aprovacao dupla concorrente; impacto: evita credito duplicado.
14. `C-014` P1 Pedidos: rejeicao deve exigir motivo quando visivel ao reseller; impacto: comunicacao.
15. `C-015` P1 Pedidos: pedido aprovado deve criar auditoria sempre; impacto: rastreabilidade.
16. `C-016` P1 Pedidos: upload de comprovante deve validar tipo real; impacto: seguranca.
17. `C-017` P2 Pedidos: corrigir modais com contraste baixo; impacto: acessibilidade.
18. `C-018` P2 Pedidos: remover overlays brancos fora do tema; impacto: consistencia.
19. `C-019` P2 Pedidos: evitar card ocupando espaco excessivo no mobile; impacto: usabilidade.
20. `C-020` P2 Pedidos: corrigir botoes desalinhados em cards compactos; impacto: polimento.
21. `C-021` P1 Chat: impedir auto-scroll quando usuario esta lendo historico; impacto: leitura possivel.
22. `C-022` P1 Chat: separar scroll da lista e da conversa; impacto: UX.
23. `C-023` P1 Chat: notificar novas mensagens mesmo fora da tela; impacto: atendimento.
24. `C-024` P2 Chat: corrigir area de input sobreposta no mobile; impacto: envio confiavel.
25. `C-025` P2 Chat: truncar frases prontas sem cortar acao; impacto: layout limpo.
26. `C-026` P2 Chat: tratar conversa sem reseller selecionado; impacto: estado vazio correto.
27. `C-027` P2 Chat: marcar leitura apenas na conversa ativa; impacto: contador confiavel.
28. `C-028` P2 Chat: tratar falha ao enviar mensagem; impacto: recuperacao.
29. `C-029` P2 Chat: evitar duplicacao visual apos envio otimista; impacto: clareza.
30. `C-030` P3 Chat: ajustar horario em timezone local; impacto: leitura correta.
31. `C-031` P1 Revendedores: exclusao em lote deve confirmar impacto; impacto: seguranca.
32. `C-032` P1 Revendedores: edicao de senha deve invalidar sessoes antigas; impacto: seguranca.
33. `C-033` P1 Revendedores: permissao admin/dev nao deve ser editavel por reseller; impacto: seguranca.
34. `C-034` P1 Revendedores: telefone/WhatsApp deve normalizar DDI; impacto: envio.
35. `C-035` P2 Revendedores: evitar email duplicado em importacao; impacto: dados limpos.
36. `C-036` P2 Revendedores: corrigir estados ativos/inativos inconsistentes; impacto: lista confiavel.
37. `C-037` P2 Revendedores: salvar preco por servidor sem sobrescrever outro login; impacto: regra correta.
38. `C-038` P2 Revendedores: tratar reseller sem servidores no dashboard; impacto: UX.
39. `C-039` P2 Revendedores: corrigir ordenacao por nome acentuado; impacto: busca.
40. `C-040` P3 Revendedores: evitar avatars quebrados; impacto: visual.
41. `C-041` P1 Templates: corrigir erro "dados invalidos" ao criar template; impacto: funcionalidade.
42. `C-042` P1 Templates: validar tipo antes de enviar ao backend; impacto: menos 400.
43. `C-043` P1 Templates: garantir conteudo nao vazio apos trim; impacto: dados limpos.
44. `C-044` P2 Templates: corrigir placeholder desconhecido com aviso; impacto: previsibilidade.
45. `C-045` P2 Templates: impedir exclusao de template padrao sem substituto; impacto: envio.
46. `C-046` P2 Templates: corrigir preview com variaveis nulas; impacto: QA.
47. `C-047` P2 Templates: tratar falha de salvar com mensagem do backend; impacto: suporte.
48. `C-048` P3 Templates: ajustar contador de caracteres; impacto: polimento.
49. `C-049` P1 WhatsApp: fila deve respeitar delays min/max; impacto: evita ban.
50. `C-050` P1 WhatsApp: falha da Evolution nao pode derrubar worker; impacto: resiliencia.
51. `C-051` P1 WhatsApp: retry deve registrar tentativa; impacto: debug.
52. `C-052` P1 WhatsApp: template sem numero deve cair em log claro; impacto: suporte.
53. `C-053` P2 WhatsApp: status desconectado deve aparecer no painel; impacto: operacao.
54. `C-054` P2 WhatsApp: QR expirado deve permitir renovar; impacto: conexao.
55. `C-055` P2 WhatsApp: remover secrets de logs; impacto: seguranca.
56. `C-056` P2 WhatsApp: normalizar telefone antes de enviar; impacto: entrega.
57. `C-057` P2 WhatsApp: limitar broadcast por lote; impacto: estabilidade.
58. `C-058` P3 WhatsApp: corrigir label "WA Diagnostic" para portugues; impacto: consistencia.
59. `C-059` P1 Notificacoes: push subscription duplicada deve ser deduplicada; impacto: menos spam.
60. `C-060` P1 Notificacoes: remover subscriptions 404/410; impacto: fila limpa.
61. `C-061` P1 Notificacoes: notificar admin em novo pedido; impacto: operacao.
62. `C-062` P1 Notificacoes: notificar reseller em mudanca de status; impacto: comunicacao.
63. `C-063` P2 Notificacoes: tratar permissao negada sem loop; impacto: UX.
64. `C-064` P2 Notificacoes: esconder alerta persistente apos acao; impacto: menos ruido.
65. `C-065` P2 Notificacoes: contador deve zerar ao marcar lida; impacto: confianca.
66. `C-066` P2 Notificacoes: service worker deve atualizar sem cache velho; impacto: PWA.
67. `C-067` P3 Notificacoes: texto de permissao mobile mais curto; impacto: UX.
68. `C-068` P1 Auth: JWT_SECRET nao pode ser URL; impacto: seguranca.
69. `C-069` P1 Auth: cookies devem usar secure em producao; impacto: seguranca.
70. `C-070` P1 Auth: refresh token deve rotacionar; impacto: seguranca.
71. `C-071` P1 Auth: logout deve revogar refresh token; impacto: seguranca.
72. `C-072` P1 Auth: bootstrap admin deve fechar apos limite; impacto: regra do sistema.
73. `C-073` P2 Auth: mensagem de login falho nao deve revelar usuario; impacto: seguranca.
74. `C-074` P2 Auth: cadastro reseller deve validar WhatsApp; impacto: fluxo.
75. `C-075` P2 Auth: login mobile deve evitar zoom em input; impacto: UX.
76. `C-076` P3 Auth: botao sair deve existir em todos os perfis; impacto: navegacao.
77. `C-077` P1 Configuracoes: logo salva deve refletir no sidebar; impacto: branding.
78. `C-078` P1 Configuracoes: login deve usar textos/background configurados; impacto: personalizacao.
79. `C-079` P1 Configuracoes: chaves PIX ativas devem aparecer para reseller; impacto: pagamento.
80. `C-080` P2 Configuracoes: validar URL de logo antes de salvar; impacto: visual.
81. `C-081` P2 Configuracoes: impedir apagar ultima chave PIX ativa sem aviso; impacto: operacao.
82. `C-082` P2 Configuracoes: salvar fit/posicao de imagem corretamente; impacto: visual.
83. `C-083` P2 Configuracoes: corrigir abas com botoes inutilizados; impacto: clareza.
84. `C-084` P3 Configuracoes: estado de upload deve mostrar progresso; impacto: UX.
85. `C-085` P1 Importacao: CSV com separador `;` e `,` deve ser detectado; impacto: compatibilidade.
86. `C-086` P1 Importacao: valores BRL devem aceitar virgula; impacto: dados corretos.
87. `C-087` P1 Importacao: servidores iguais devem ser agrupados; impacto: evita duplicidade.
88. `C-088` P1 Importacao: senha padrao deve ser aplicada apenas a novos resellers; impacto: seguranca.
89. `C-089` P2 Importacao: logar linhas puladas; impacto: auditoria.
90. `C-090` P2 Importacao: validar colunas obrigatorias antes do commit; impacto: previsibilidade.
91. `C-091` P2 Importacao: evitar historico duplicado em reimportacao; impacto: dados limpos.
92. `C-092` P2 Importacao: fornecedores faltantes devem virar pendencia; impacto: cadastro posterior.
93. `C-093` P2 Importacao: tratar encoding Windows-1252; impacto: CSV brasileiro.
94. `C-094` P3 Importacao: preview deve limitar linhas; impacto: performance.
95. `C-095` P1 API: endpoints de admin devem usar roles guard sempre; impacto: seguranca.
96. `C-096` P1 API: validar DTOs com transform para numeros; impacto: menos erro.
97. `C-097` P1 API: respostas 500 devem virar erro amigavel; impacto: suporte.
98. `C-098` P1 API: upload deve limitar tamanho por env; impacto: estabilidade.
99. `C-099` P2 API: padronizar snake/camel no client; impacto: manutencao.
100. `C-100` P2 API: tratar 401 removendo token local; impacto: UX.
101. `C-101` P2 API: retry apenas para GET idempotente; impacto: seguranca.
102. `C-102` P2 API: timeout em chamadas externas; impacto: resiliencia.
103. `C-103` P2 API: nao expor dados de fornecedor para reseller; impacto: confidencialidade.
104. `C-104` P3 API: mensagens sem acento quebrado; impacto: polimento.
105. `C-105` P1 Banco: migrations novas devem ser idempotentes quando possivel; impacto: deploy.
106. `C-106` P1 Banco: cascades precisam ser documentados; impacto: evita perda.
107. `C-107` P1 Banco: serverId opcional em pedidos deve ter snapshot confiavel; impacto: historico.
108. `C-108` P1 Banco: valores monetarios devem ser Decimal; impacto: precisao.
109. `C-109` P2 Banco: indices em status/data dos pedidos; impacto: performance.
110. `C-110` P2 Banco: limpar relacionamentos legados Supplier; impacto: modelo claro.
111. `C-111` P2 Banco: constraints para fornecedor-servidor unico; impacto: dados limpos.
112. `C-112` P2 Banco: seed nao deve sobrescrever senha sem flag; impacto: seguranca.
113. `C-113` P3 Banco: nomes de campos em ingles/portugues misturados; impacto: manutencao.
114. `C-114` P1 Deploy: EasyPanel 502 por `BACKEND_UPSTREAM` errado; impacto: indisponibilidade.
115. `C-115` P1 Deploy: FRONTEND_ORIGIN errado quebra CORS; impacto: login.
116. `C-116` P1 Deploy: VAPID vazio quebra push; impacto: notificacao.
117. `C-117` P1 Deploy: volume de uploads ausente perde comprovantes; impacto: dados.
118. `C-118` P1 Deploy: migrations travadas devem ter runbook; impacto: deploy.
119. `C-119` P2 Deploy: nginx deve servir SPA fallback; impacto: rotas diretas.
120. `C-120` P2 Deploy: healthcheck deve falhar se DB desconectado; impacto: confiabilidade.
121. `C-121` P2 Deploy: env example deve nao conter senha real; impacto: seguranca.
122. `C-122` P2 Deploy: logs devem indicar porta e upstream; impacto: debug.
123. `C-123` P3 Deploy: remover configuracoes React antigas; impacto: limpeza.
124. `C-124` P1 Frontend: impedir scroll horizontal global; impacto: mobile.
125. `C-125` P1 Frontend: sidebar nao deve rolar junto do conteudo desktop; impacto: navegacao.
126. `C-126` P1 Frontend: mobile deve ter scroll vertical ocultando barra; impacto: usabilidade.
127. `C-127` P1 Frontend: navbar mobile nao deve aparecer no desktop; impacto: layout.
128. `C-128` P2 Frontend: botoes sem funcao devem ser removidos; impacto: confianca.
129. `C-129` P2 Frontend: inputs devem ter labels acessiveis; impacto: acessibilidade.
130. `C-130` P2 Frontend: modais devem prender foco; impacto: teclado.
131. `C-131` P2 Frontend: contraste minimo em botoes de perigo; impacto: acessibilidade.
132. `C-132` P2 Frontend: estados vazios devem ter acao; impacto: UX.
133. `C-133` P2 Frontend: tabelas devem virar cards no mobile; impacto: responsividade.
134. `C-134` P2 Frontend: loading nao deve apagar contexto; impacto: UX.
135. `C-135` P2 Frontend: erros de API devem aparecer perto da acao; impacto: recuperacao.
136. `C-136` P3 Frontend: padronizar capitalizacao de menus; impacto: polimento.
137. `C-137` P1 Acessibilidade: foco visivel em todos os controles; impacto: uso por teclado.
138. `C-138` P1 Acessibilidade: modais com role/dialog e aria; impacto: leitores.
139. `C-139` P2 Acessibilidade: textos pequenos devem respeitar 14px minimo em mobile; impacto: leitura.
140. `C-140` P2 Acessibilidade: icones sem texto precisam de aria-label; impacto: inclusao.
141. `C-141` P2 Performance: listas grandes precisam de paginacao; impacto: memoria.
142. `C-142` P2 Performance: charts devem carregar sob demanda; impacto: velocidade.
143. `C-143` P2 Performance: imagens de branding devem ser otimizadas; impacto: rede.
144. `C-144` P2 Performance: evitar `findMany` sem limite em telas grandes; impacto: DB.
145. `C-145` P2 Performance: debounce em buscas; impacto: API.
146. `C-146` P3 Performance: lazy load de paginas raras; impacto: bundle.
147. `C-147` P1 QA: build frontend e backend obrigatorios antes de deploy; impacto: regressao.
148. `C-148` P1 QA: smoke test login/pedido/aprovacao; impacto: confianca.
149. `C-149` P2 QA: screenshots mobile/desktop por release; impacto: visual.
150. `C-150` P2 QA: checklist manual de EasyPanel apos push; impacto: producao.

## Correcoes Aplicadas Neste Commit

- A primeira correcao da lista foi aplicada: `.gitignore` agora ignora `.qa/`, `frontend-vue/.qa/`, `playwright-report/` e `test-results/`.
- A exclusao de servidor foi endurecida: o endpoint agora usa `deletedAt` e remove o servidor da operacao sem apagar historico/vinculos por cascade.

## Proxima Execucao Recomendada

1. Transformar itens `P0/P1` em tarefas pequenas.
2. Rodar um ciclo por modulo: Auth, Pedidos, Chat, Servidores, Configuracoes, WhatsApp, Deploy.
3. Exigir evidencia por tarefa: build, teste, screenshot ou smoke test.
