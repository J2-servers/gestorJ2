# Melhorias Visuais 200 Itens - Gestor J2

Data: 2026-06-21
Escopo: frontend Vue, experiencia desktop/mobile, componentes, layout, contraste, responsividade, estados visuais, motion, formularios, tabelas, modais, chat, dashboard e paginas operacionais.

## Como Usar

- `V-*` identifica melhoria visual rastreavel.
- Prioridades: `P0` critico visual/acessibilidade, `P1` alto impacto, `P2` medio impacto, `P3` refinamento.
- Cada item deve manter o sistema funcional e respeitar o fluxo real do Gestor J2.

## 200 Melhorias Visuais

1. `V-001` P0 Design system: definir token `--gj2-text` para eliminar variavel sem valor em paginas compartilhadas.
2. `V-002` P1 Design system: consolidar tokens de superficie, borda, foco, sombra e acento.
3. `V-003` P1 Design system: padronizar elevacao de cards entre dashboard, servidores, pedidos e configuracoes.
4. `V-004` P1 Design system: criar sombra hover unica para cards clicaveis.
5. `V-005` P1 Design system: criar foco acessivel global para teclado.
6. `V-006` P2 Design system: ajustar cor de selecao de texto para combinar com acento do sistema.
7. `V-007` P2 Design system: padronizar placeholders de inputs com contraste correto.
8. `V-008` P2 Design system: padronizar raio de formularios e botoes.
9. `V-009` P2 Design system: criar token de painel elevado para overlays e modais.
10. `V-010` P2 Design system: reduzir variacoes soltas de cinza nas paginas.
11. `V-011` P1 Layout: manter tela cheia real no desktop sem barras horizontais.
12. `V-012` P1 Layout: manter altura `100dvh` consistente em mobile.
13. `V-013` P1 Layout: ocultar scrollbars sem perder rolagem.
14. `V-014` P1 Layout: melhorar separacao visual entre sidebar e area de conteudo.
15. `V-015` P2 Layout: padronizar gutters internos por breakpoint.
16. `V-016` P2 Layout: compactar espacamentos excessivos em telas operacionais.
17. `V-017` P2 Layout: criar largura maxima para conteudo muito aberto.
18. `V-018` P2 Layout: garantir que headers nao ocupem espaco inutil.
19. `V-019` P2 Layout: ajustar grid de paginas para evitar buracos visuais.
20. `V-020` P2 Layout: criar transicoes suaves entre estados de pagina.
21. `V-021` P1 Sidebar: reforcar estado ativo com contraste e profundidade.
22. `V-022` P1 Sidebar: melhorar hover de itens sem criar ruido.
23. `V-023` P2 Sidebar: alinhar icones com texto em todos os itens.
24. `V-024` P2 Sidebar: padronizar avatar/logo com corte seguro.
25. `V-025` P2 Sidebar: evitar que nomes longos quebrem layout.
26. `V-026` P2 Sidebar: melhorar divisao entre perfil, navegacao e acoes.
27. `V-027` P2 Sidebar: refinar contraste de texto secundario.
28. `V-028` P3 Sidebar: reduzir repeticao de sombras internas.
29. `V-029` P3 Sidebar: criar microinteracao no item ativo.
30. `V-030` P3 Sidebar: melhorar legibilidade em monitores de baixo contraste.
31. `V-031` P1 Topbar: melhorar busca global com estado de foco visivel.
32. `V-032` P1 Topbar: alinhar botoes de notificacao e logout.
33. `V-033` P2 Topbar: reduzir peso visual de botoes secundarios.
34. `V-034` P2 Topbar: padronizar altura dos controles.
35. `V-035` P2 Topbar: evitar quebra estranha em telas medias.
36. `V-036` P2 Topbar: mostrar titulo com peso correto por pagina.
37. `V-037` P3 Topbar: criar transicao suave ao abrir busca.
38. `V-038` P3 Topbar: melhorar contraste de icones.
39. `V-039` P3 Topbar: simplificar labels redundantes.
40. `V-040` P3 Topbar: padronizar espacamento entre grupos.
41. `V-041` P1 Mobile: navbar inferior com alvos de toque confortaveis.
42. `V-042` P1 Mobile: area clicavel minima de 44px em botoes.
43. `V-043` P1 Mobile: prevenir overflow horizontal em cards largos.
44. `V-044` P1 Mobile: melhorar altura util da tela em navegadores com barra dinamica.
45. `V-045` P1 Mobile: garantir rolagem vertical em todas as paginas longas.
46. `V-046` P2 Mobile: compactar cards de metricas.
47. `V-047` P2 Mobile: melhorar hierarquia de titulos.
48. `V-048` P2 Mobile: criar agrupamento visual para acoes primarias.
49. `V-049` P2 Mobile: evitar botoes lado a lado apertados.
50. `V-050` P2 Mobile: melhorar modais como bottom sheets.
51. `V-051` P1 Cards: padronizar canto decorativo de cards operacionais.
52. `V-052` P1 Cards: criar borda sutil sem parecer tema antigo.
53. `V-053` P1 Cards: dar profundidade consistente em estatisticas.
54. `V-054` P2 Cards: ajustar padding interno por densidade.
55. `V-055` P2 Cards: melhorar titulo, valor e legenda.
56. `V-056` P2 Cards: evitar numeros descentralizados.
57. `V-057` P2 Cards: criar estado hover apenas em cards interativos.
58. `V-058` P2 Cards: padronizar chips dentro de cards.
59. `V-059` P3 Cards: reduzir sombras muito pesadas.
60. `V-060` P3 Cards: alinhar icones em card headers.
61. `V-061` P1 Formularios: melhorar contraste de labels.
62. `V-062` P1 Formularios: padronizar foco de input/select/textarea.
63. `V-063` P1 Formularios: mostrar erro com cor e leitura melhores.
64. `V-064` P1 Formularios: melhorar campos desabilitados.
65. `V-065` P2 Formularios: adicionar hover sutil em campos.
66. `V-066` P2 Formularios: alinhar hints e mensagens.
67. `V-067` P2 Formularios: padronizar textarea com resize vertical seguro.
68. `V-068` P2 Formularios: evitar placeholders como labels.
69. `V-069` P2 Formularios: melhorar aparencia de selects nativos.
70. `V-070` P3 Formularios: suavizar transicoes de borda.
71. `V-071` P1 Botoes: padronizar gradiente de acao primaria.
72. `V-072` P1 Botoes: adicionar foco visivel em todos os botoes.
73. `V-073` P1 Botoes: melhorar estado disabled.
74. `V-074` P2 Botoes: criar hover lift discreto.
75. `V-075` P2 Botoes: ajustar altura para mobile.
76. `V-076` P2 Botoes: equilibrar padding lateral.
77. `V-077` P2 Botoes: padronizar botoes perigo.
78. `V-078` P2 Botoes: melhorar botoes ghost/secondary.
79. `V-079` P3 Botoes: evitar sombras coloridas exageradas.
80. `V-080` P3 Botoes: melhorar legibilidade de texto em botoes longos.
81. `V-081` P1 Tabelas: criar header sticky visualmente leve.
82. `V-082` P1 Tabelas: adicionar hover de linha.
83. `V-083` P1 Tabelas: melhorar estado vazio.
84. `V-084` P2 Tabelas: reduzir altura de linhas em desktop.
85. `V-085` P2 Tabelas: melhorar scroll horizontal oculto.
86. `V-086` P2 Tabelas: alinhar colunas numericas.
87. `V-087` P2 Tabelas: fortalecer labels de colunas.
88. `V-088` P3 Tabelas: zebra striping muito sutil.
89. `V-089` P3 Tabelas: melhorar bordas inferiores.
90. `V-090` P3 Tabelas: criar sombra interna de overflow.
91. `V-091` P1 Modais: aumentar contraste de painel e header.
92. `V-092` P1 Modais: refinar backdrop com blur e cor controlada.
93. `V-093` P1 Modais: garantir leitura em mobile.
94. `V-094` P2 Modais: melhorar botao fechar.
95. `V-095` P2 Modais: separar footer com sombra/borda leve.
96. `V-096` P2 Modais: criar animacao de entrada mais natural.
97. `V-097` P2 Modais: evitar painel muito largo sem necessidade.
98. `V-098` P3 Modais: padronizar textos de descricao.
99. `V-099` P3 Modais: melhorar scroll interno.
100. `V-100` P3 Modais: reduzir clipping de conteudo.
101. `V-101` P1 Toasts: melhorar contraste de mensagens.
102. `V-102` P1 Toasts: posicionar melhor no mobile.
103. `V-103` P2 Toasts: criar barra lateral sem bug de grid.
104. `V-104` P2 Toasts: padronizar cores por variante.
105. `V-105` P2 Toasts: melhorar botao de fechar.
106. `V-106` P3 Toasts: animacao de saida mais suave.
107. `V-107` P3 Toasts: reduzir sombra excessiva.
108. `V-108` P3 Toasts: truncar textos longos com quebra correta.
109. `V-109` P3 Toasts: melhorar acessibilidade de aria-live.
110. `V-110` P3 Toasts: melhorar densidade em desktop.
111. `V-111` P1 Dashboard: aumentar densidade informativa sem poluir.
112. `V-112` P1 Dashboard: padronizar cards de ranking.
113. `V-113` P1 Dashboard: melhorar graficos com legenda clara.
114. `V-114` P2 Dashboard: destacar alertas operacionais.
115. `V-115` P2 Dashboard: alinhar valores monetarios.
116. `V-116` P2 Dashboard: criar separadores de secao discretos.
117. `V-117` P2 Dashboard: melhorar estado sem dados.
118. `V-118` P3 Dashboard: suavizar cor de graficos.
119. `V-119` P3 Dashboard: melhorar tags de periodo.
120. `V-120` P3 Dashboard: reduzir textos redundantes.
121. `V-121` P1 Pedidos: compactar cards mobile.
122. `V-122` P1 Pedidos: destacar status sem ocupar muito espaco.
123. `V-123` P1 Pedidos: melhorar botoes de aprovacao/rejeicao.
124. `V-124` P1 Pedidos: melhorar area PIX para reseller.
125. `V-125` P2 Pedidos: criar hierarquia login/servidor/valor.
126. `V-126` P2 Pedidos: melhorar cards expandidos.
127. `V-127` P2 Pedidos: refinar comprovantes.
128. `V-128` P2 Pedidos: melhorar modais de auditoria.
129. `V-129` P3 Pedidos: alinhar chips de status.
130. `V-130` P3 Pedidos: reduzir areas vazias.
131. `V-131` P1 Chat: manter lista e conversa com scroll independente.
132. `V-132` P1 Chat: melhorar contraste de bolhas.
133. `V-133` P1 Chat: refinar barra de envio.
134. `V-134` P1 Chat: melhorar avatars reais.
135. `V-135` P2 Chat: criar frases prontas mais elegantes.
136. `V-136` P2 Chat: melhorar estado sem conversa.
137. `V-137` P2 Chat: diferenciar mensagens minhas e recebidas.
138. `V-138` P2 Chat: melhorar timestamps.
139. `V-139` P3 Chat: animar digitacao com suavidade.
140. `V-140` P3 Chat: reduzir ruido visual dos icones.
141. `V-141` P1 Servidores: padronizar abas fornecedores/servidores.
142. `V-142` P1 Servidores: melhorar cards de fornecedor.
143. `V-143` P1 Servidores: melhorar lista de servidores.
144. `V-144` P1 Servidores: destacar vinculos internos sem expor ao reseller.
145. `V-145` P2 Servidores: melhorar formulario de vinculo.
146. `V-146` P2 Servidores: refinar empty states.
147. `V-147` P2 Servidores: melhorar botoes de excluir/desativar.
148. `V-148` P2 Servidores: compactar estatisticas.
149. `V-149` P3 Servidores: melhorar busca.
150. `V-150` P3 Servidores: alinhar custos e precos.
151. `V-151` P1 Revendedores: lista com selecao em lote mais clara.
152. `V-152` P1 Revendedores: melhorar editor de permissoes.
153. `V-153` P1 Revendedores: destacar status ativo/bloqueado.
154. `V-154` P2 Revendedores: melhorar avatar e identificacao.
155. `V-155` P2 Revendedores: compactar dados de contato.
156. `V-156` P2 Revendedores: melhorar acoes secundarias.
157. `V-157` P3 Revendedores: padronizar badges.
158. `V-158` P3 Revendedores: reduzir repeticao de texto.
159. `V-159` P3 Revendedores: melhorar confirmacoes.
160. `V-160` P3 Revendedores: refinar estados sem resultado.
161. `V-161` P1 Configuracoes: organizar abas por prioridade operacional.
162. `V-162` P1 Configuracoes: melhorar preview de logos.
163. `V-163` P1 Configuracoes: deixar PIX visualmente copiavel.
164. `V-164` P2 Configuracoes: compactar formularios longos.
165. `V-165` P2 Configuracoes: melhorar mensagens de salvamento.
166. `V-166` P2 Configuracoes: separar campos sensiveis.
167. `V-167` P3 Configuracoes: reduzir botoes redundantes.
168. `V-168` P3 Configuracoes: refinar upload de imagens.
169. `V-169` P3 Configuracoes: padronizar preview mobile.
170. `V-170` P3 Configuracoes: melhorar listas internas.
171. `V-171` P1 Login: manter versoes desktop/mobile coerentes.
172. `V-172` P1 Login: melhorar contraste dos inputs.
173. `V-173` P1 Login: destacar marca sem poluir.
174. `V-174` P2 Login: reduzir excesso de decoracao.
175. `V-175` P2 Login: melhorar card de acesso seguro.
176. `V-176` P2 Login: criar estado de erro mais elegante.
177. `V-177` P3 Login: alinhar metricas decorativas.
178. `V-178` P3 Login: melhorar background responsivo.
179. `V-179` P3 Login: reduzir sombras conflitantes.
180. `V-180` P3 Login: evitar texto quebrado em mobile.
181. `V-181` P1 Acessibilidade: foco visivel em todo elemento interativo.
182. `V-182` P1 Acessibilidade: contraste minimo para textos secundarios.
183. `V-183` P1 Acessibilidade: botoes com area minima de toque.
184. `V-184` P1 Acessibilidade: estados de erro com cor e texto.
185. `V-185` P2 Acessibilidade: respeitar `prefers-reduced-motion`.
186. `V-186` P2 Acessibilidade: evitar texto muito pequeno em mobile.
187. `V-187` P2 Acessibilidade: melhorar semantica de estados vazios.
188. `V-188` P2 Acessibilidade: melhorar labels de formularios.
189. `V-189` P3 Acessibilidade: padronizar aria-labels de icones.
190. `V-190` P3 Acessibilidade: melhorar leitura de tabelas por teclado.
191. `V-191` P1 Motion: criar transicoes de hover consistentes.
192. `V-192` P1 Motion: evitar animacoes que atrapalham mobile.
193. `V-193` P2 Motion: usar easing unico do sistema.
194. `V-194` P2 Motion: animar modais e toasts com suavidade.
195. `V-195` P2 Motion: criar feedback visual em acoes salvas.
196. `V-196` P3 Motion: reduzir movimento em dados densos.
197. `V-197` P3 Motion: criar microinteracao em filtros ativos.
198. `V-198` P3 Motion: melhorar entrada de cards carregados.
199. `V-199` P3 Motion: padronizar duracoes.
200. `V-200` P3 Motion: remover animacoes visuais sem funcao.

