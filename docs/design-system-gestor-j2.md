# Design System Gestor J2

## Direcao Visual Aprovada

O Gestor J2 usa uma interface dark premium inspirada em dashboards financeiros: preto fosco, superficies esculpidas no proprio fundo, acentos laranja/vermelho apenas em dados, icones e acoes ativas.

## Regras Obrigatorias

- Nao usar bordas visiveis em cards, paineis ou linhas.
- Nao usar glow laranja ao redor de containers.
- Nao usar sombras coloridas em cards.
- Cards devem parecer 2mm acima do fundo, como baixo relevo/neumorphism escuro.
- Laranja/vermelho deve aparecer somente em acentos funcionais: graficos, icones ativos, botoes primarios, valores de destaque e barras de progresso.
- Fundo e superficies devem ser preto, quase preto ou grafite frio.
- Mobile deve ser desenhado como tela propria, nao apenas desktop encolhido.

## Tokens Principais

- Fundo: `#030404`, `#080909`, `#010202`
- Superficie: `rgba(6, 7, 7, .96)`
- Superficie secundaria: `rgba(9, 10, 10, .96)`
- Texto: `#fff8f2`
- Texto secundario: `#a3a09b`
- Texto apagado: `#67615c`
- Acento: `#ff4b12`
- Acento profundo: `#8f1608`

## Elevacao

Use `--j2-neu` para cards e paineis:

```css
box-shadow:
  8px 10px 22px rgba(0, 0, 0, .44),
  -4px -4px 12px rgba(255, 255, 255, .016),
  inset 1px 1px 0 rgba(255, 255, 255, .014);
```

Use `--j2-sunken` para inputs, filtros e campos:

```css
box-shadow:
  inset 3px 3px 8px rgba(0, 0, 0, .34),
  inset -2px -2px 6px rgba(255, 255, 255, .016);
```

## Classes Do Projeto

O arquivo `src/styles/gestor-j2-design-system.css` define:

- `.j2-page`
- `.j2-shell`
- `.j2-panel`
- `.j2-card`
- `.j2-sunken`
- `.j2-input`
- `.j2-select`
- `.j2-textarea`
- `.j2-button`
- `.j2-button-primary`
- `.j2-icon-button`
- `.j2-chip`
- `.j2-list-row`
- `.j2-scroll-x`

## Como Aplicar Em Uma Pagina

1. Envolver a pagina em `.j2-page`.
2. Usar `.j2-shell` quando a tela precisar de uma area principal full-screen.
3. Substituir cards com bordas por `.j2-card` ou `.j2-panel`.
4. Trocar inputs inline por `.j2-input`, selects por `.j2-select`, textarea por `.j2-textarea`.
5. Trocar botoes por `.j2-button` ou `.j2-button j2-button-primary`.
6. Remover `border`, `boxShadow` colorido e fundos roxos/azuis antigos.
7. Manter dados reais e hierarquia funcional da pagina.

## Checklist De Aceite

- A pagina nao tem cards com bordas visiveis.
- A pagina nao tem glow laranja em volta de containers.
- O laranja aparece somente em informacao, icone ou acao.
- O layout mobile nao estoura largura.
- Textos cabem em botoes/cards.
- Fluxos originais continuam funcionando.
