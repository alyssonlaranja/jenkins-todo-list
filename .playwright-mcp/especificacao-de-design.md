# Especificação de Design – Site Web para Venda de Automóveis de Luxo

Abaixo está a proposta de UX/UI baseada no briefing e no PRD já definidos. O foco é criar uma experiência premium, simples e orientada à conversão (leads).

---

## 1. Princípios de UX e Diretrizes de Interface

### 1.1 Princípios de UX

1. **Luxo e simplicidade**
   - Visual minimalista, poucos elementos na tela, muito espaço em branco.
   - Cada página com foco claro em 1–2 ações principais (ex.: ver detalhes, solicitar proposta).

2. **Confiança e transparência**
   - Informações de veículo claras e completas.
   - Destaque para procedência, laudos, histórico e diferenciais da loja.

3. **Velocidade na decisão**
   - Filtros eficientes, busca visível.
   - Acesso rápido ao WhatsApp/contato em toda navegação.

4. **Mobile-first**
   - Público usa muito smartphone; o design começa pelo mobile e se expande para desktop.

---

### 1.2 Diretrizes de UI (Look & Feel)

**Paleta de cores (sugestão)**

- Primária:
  - Preto profundo (#0B0B0D) – fundos escuros, header.
- Secundária:
  - Dourado metálico suave (#C6A15B) – destaques, CTA em fundos escuros.
- Neutros:
  - Branco puro (#FFFFFF) – fundos claros.
  - Cinza claro (#F3F3F5) – cards, áreas secundárias.
  - Cinza médio (#8C8C94) – textos secundários.

**Tipografia (sugestão)**

- Títulos: Serif elegante (ex.: Playfair Display / Cormorant Garamond).
- Texto: Sans serif moderna (ex.: Lato / Inter / SF Pro).

**Estilo geral**

- Fundo predominantemente escuro nas áreas hero e de destaque (sensação de exclusividade).
- Fotos grandes dos carros, sem poluição visual.
- Microinterações suaves (hover em botões, destaque em cards, transições discretas).

---

## 2. Arquitetura de Informação (Sitemap)

1. **Home**
2. **Estoque**
   - Listagem de veículos
   - Página de detalhe do veículo
3. **Serviços**
   - Compra de veículos
   - Consignação
   - Serviços financeiros (financiamento, seguros, blindagem)
4. **Sobre**
5. **Blog** (se estiver no MVP)
6. **Contato**
7. **Páginas Legais**
   - Política de Privacidade
   - Termos de Uso
   - Avisos Legais

Elementos globais:

- Header fixo com logo, menu e CTA.
- Footer com contatos, links rápidos e redes sociais.
- Botão flutuante de WhatsApp (todas as páginas).

---

## 3. Fluxos de Usuário Principais

### 3.1 Fluxo – Encontrar e solicitar proposta de um veículo

1. Usuário acessa **Home**.
2. Clica em “Ver estoque” ou usa campo de busca/filtro direto na home.
3. Acessa **Lista de veículos** (Estoque) com filtros aplicáveis.
4. Aplica filtros por marca/modelo/preço.
5. Clica em um card → **Página de Detalhe do Veículo**.
6. Analisa fotos, ficha técnica.
7. Clica em **“Solicitar Proposta”**.
8. Preenche formulário e envia (feedback de sucesso).

Pontos de atenção:

- Filtro sempre visível (mobile: gaveta lateral).
- Voltar à lista mantendo filtros aplicados.
- CTA “Fale via WhatsApp” presente o tempo todo na página do veículo.

---

### 3.2 Fluxo – Agendar test drive

1. Usuário entra em **Página do Veículo**.
2. Clica em **“Agendar Test Drive”** (botão próximo às principais infos).
3. Modal ou página com formulário leve.
4. Envia formulário → mensagem de confirmação + opção de continuar navegando.

---

### 3.3 Fluxo – Contato geral (dúvidas, compra e venda)

1. Usuário acessa **Contato** pelo menu ou CTA no footer.
2. Vê formulário de contato + dados da loja + mapa.
3. Escolhe entre:
   - Enviar formulário.
   - Clicar em WhatsApp.
   - Ligar (click-to-call em mobile).

---

## 4. Especificação de Telas (Layout Conceitual)

### 4.1 Home (Página Inicial)

**Objetivo:** introduzir a marca, destacar veículos e direcionar para estoque/contato.

**Estrutura (desktop)**

1. **Header (fixo)**
   - Logo (lado esquerdo).
   - Menu: Home | Estoque | Serviços | Sobre | Blog | Contato.
   - CTA à direita: botão “Fale com um consultor” (abre WhatsApp ou modal de contato).
   - Fundo semi-transparente sobre o hero (quando rolar, vira sólido).

2. **Hero Section**
   - Fundo: foto de carro de luxo em ambiente elegante (escuro, showroom ou urbana noturna).
   - Texto:
     - Título: “Automóveis de Luxo com Curadoria Exclusiva”
     - Subtítulo: “Seleção premium, histórico transparente e atendimento consultivo.”
   - CTA principal: “Ver estoque” (botão sólido, cor secundária – dourado).
   - CTA secundário: “Agendar visita ao showroom”.
   - Possibilidade de mini-filtro rápido abaixo: “Marca / Modelo / Preço máx.” + botão “Buscar”.

3. **Destaques de Veículos**
   - Carrossel horizontal com 4–6 veículos em destaque.
   - Card do veículo:
     - Foto grande.
     - Marca + modelo + ano.
     - Faixa de preço.
     - Tag (Novo, Blindado, Recém-chegado).
     - Ao hover: overlay suave com “Ver detalhes”.

4. **Seção “Quem Somos / Diferenciais”**
   - Layout em duas colunas:
     - Texto sobre a empresa e posicionamento de luxo.
     - Lista de diferenciais com ícones (ex.: Curadoria, Procedência, Laudos, Atendimento VIP).
   - Link “Conheça nossa história”.

5. **Seção “Como Funciona” (opcional)**
   - 3–4 passos simplificados:
     1. Escolha o veículo.
     2. Fale com um consultor.
     3. Test drive exclusivo.
     4. Entrega personalizada.
   - Ícones lineares sofisticados.

6. **Seção Blog (se houver)**
   - 3 cards de artigos recentes: imagem, título, resumo, botão “Ler mais”.

7. **Seção “Agende sua visita”**
   - Bloco com fundo em cor secundária suave.
   - Texto curto + CTA “Agendar visita” → leva à página de contato ou formulário.

8. **Footer**
   - Coluna 1: logo + breve texto da marca.
   - Coluna 2: navegação (links principais).
   - Coluna 3: dados de contato (telefone, WhatsApp, e-mail).
   - Coluna 4: endereço + mapa miniatura ou link.
   - Linha final: links de Política de Privacidade e Termos.

**Mobile**

- Menu em ícone de “hambúrguer”.
- Hero com título, subtítulo e botões empilhados.
- Carrossel de veículos deslizando por swipe.
- WhatsApp flutuante fixo no canto inferior direito.

---

### 4.2 Estoque – Listagem de Veículos

**Objetivo:** permitir ao usuário filtrar e encontrar um veículo ideal rapidamente.

**Layout (desktop)**

1. **Header da página**
   - Título: “Estoque de Veículos de Luxo”.
   - Subtítulo: “Use os filtros para encontrar o veículo que combina com você.”

2. **Área de filtros (lado esquerdo em desktop / gaveta em mobile)**
   - Campo de busca: “Buscar por modelo, marca…”.
   - Filtros em acordeão:
     - Marca (checkbox ou seleção múltipla).
     - Modelo (dependente da marca, se possível).
     - Faixa de preço (slider ou campos de min/máx).
     - Ano (slider ou multiselect).
     - Tipo de veículo (SUV, sedã, esportivo, conversível).
     - Câmbio (automático, manual).
     - Combustível.
     - Blindado (switch Sim/Não).
   - Botões:
     - “Aplicar filtros”.
     - “Limpar filtros”.

3. **Área de resultados (lado direito)**
   - Barra superior:
     - Contador: “X veículos encontrados”.
     - Ordenação: dropdown (Mais recentes, Menor preço, Maior preço, Menor km).
   - Cards de veículo (grid 2–3 colunas):
     - Foto em destaque (proporção 4:3).
     - Marca + modelo + versão.
     - Ano / Quilometragem / Câmbio.
     - Preço.
     - Tag (Blindado, Novo, etc.).
     - CTA: “Ver detalhes”.
   - Paginação simples no rodapé (1,2,3…).

**Mobile**

- Filtro acessível por botão “Filtrar” fixo no topo da listagem → abre modal/gaveta.
- Cards em coluna única, com foco na foto e nas informações principais.

---

### 4.3 Página de Detalhe do Veículo

**Objetivo:** convencer o usuário e facilitar contato/proposta rapidamente.

**Layout (desktop)**

1. **Header do veículo**
   - Breadcrumb: Home > Estoque > [Marca] [Modelo] [Ano].
   - Título principal: Marca + Modelo + Versão + Ano.
   - Subtítulo: “Blindado / km / câmbio / combustível” (pontos chave).

2. **Colunas principais**
   - **Coluna esquerda (imagens)**
     - Galeria principal:
       - Grande foto em destaque.
       - Miniaturas abaixo em carrossel.
       - Zoom ao clicar.
   - **Coluna direita (informações e CTAs)**
     - Preço em destaque (tipografia forte).
     - Status: Disponível / Reservado / Vendido (visual claro).
     - Botões:
       - Principal: “Solicitar proposta” (preenchimento modal ou âncora para formulário na mesma página).
       - Secundário: “Agendar test drive”.
       - Terciário: “Falar via WhatsApp”.
     - Pequenas informações:
       - Código do veículo.
       - Tempo estimado de resposta.

3. **Ficha técnica (aba ou seção abaixo)**
   - Disposição em tabela ou grid:
     - Marca, Modelo, Versão.
     - Ano fab/ano mod.
     - Quilometragem.
     - Câmbio.
     - Combustível.
     - Cor.
     - Blindagem (sim/não, nível).
     - Número de portas, potência, etc. (se fornecido).
   - Seção “Destaques”:
     - Lista de itens importantes (teto solar, som premium, pacote esportivo, etc.).

4. **Descrição detalhada**
   - Texto com narrativa clara:
     - Estado do veículo.
     - Histórico de revisões.
     - Garantias.
     - Diferenciais de procedência.

5. **Formulário de Proposta / Test Drive**
   - Pode ser:
     - Modal ao clicar no CTA, ou
     - Seção fixa na parte inferior da página.
   - Campos:
     - Nome.
     - E-mail.
     - Telefone (WhatsApp).
     - Preferência de contato.
     - Mensagem.
   - Botão: “Enviar proposta”.
   - Mensagem de confirmação (inline) após envio.

6. **Veículos relacionados**
   - Título: “Você também pode se interessar por”.
   - 3–4 cards de veículos similares.

**Mobile**

- Galeria em carrossel full-width no topo.
- Botões principais logo abaixo da foto (ocupando toda a largura).
- Ficha técnica em blocos colapsáveis (acordeão).

---

### 4.4 Página Sobre a Empresa

**Objetivo:** reforçar confiança e posicionamento premium.

- Hero com foto do showroom ou da equipe.
- Bloco de texto: história, missão, visão, valores.
- Highlights em cards:
  - “Anos de mercado”.
  - “Número de veículos vendidos”.
  - “Parcerias com bancos e seguradoras”.
- Seção “Nossa Estrutura”: fotos do espaço, eventualmente vídeo institucional.
- Depoimentos (se houver) em carrossel de clientes.

---

### 4.5 Página de Serviços

**Objetivo:** explicar claramente o que a loja oferece além da venda.

- Seção com cards de serviços:
  - “Compra do seu veículo”.
  - “Consignação de veículos de luxo”.
  - “Financiamento e seguros”.
- Cada card leva a uma sub-seção com:
  - Explicação do processo em passos.
  - Benefícios.
  - CTA: “Falar com consultor” / “Envie seus dados”.

---

### 4.6 Página de Contato

**Layout**

- Bloco à esquerda:
  - Título: “Fale com nossa equipe”.
  - Formulário:
    - Nome.
    - E-mail.
    - Telefone.
    - Assunto (dropdown: Compra, Venda, Dúvidas, Outros).
    - Mensagem.
    - Checkbox LGPD: “Concordo com o uso dos meus dados para contato”.
- Bloco à direita:
  - Telefone (click-to-call em mobile).
  - WhatsApp (botão com número).
  - E-mail (link mailto).
  - Endereço + mapa (Google Maps embed).
  - Horário de atendimento.

---

### 4.7 Blog (se aplicado)

- Listagem:
  - Cards com imagem, título, resumo, data.
- Página de post:
  - Título, data, categoria.
  - Conteúdo.
  - Bloco “Artigos relacionados”.

---

## 5. Componentes Reutilizáveis

1. **Botão Primário**
   - Usado para CTAs principais (Ver estoque, Solicitar proposta, Fale via WhatsApp).
   - Estilo: retângulo com cantos levemente arredondados, cor secundária (dourado) em fundo escuro / cor primária em fundo claro.

2. **Botão Secundário**
   - Borda dourada, fundo transparente, texto branco/escuro conforme fundo.

3. **Card de Veículo**
   - Campos padronizados.
   - Tag no canto superior esquerdo para destaque (ex.: “Blindado”).
   - Ícones pequenos para câmbio, combustível, km (visual sintético).

4. **Seção de Título de Página**
   - Padrão de hero: título + breve descrição + breadcrumb opcional.

5. **Campos de Formulário**
   - Input com borda sutil, estados de foco nítidos.
   - Mensagens de erro claras e discretas.

6. **Modal/Overlay**
   - Fundo escurecido com card centralizado para formulários (proposta/test drive).

7. **Banner de cookies**
   - Barra discreta no rodapé com botão “Aceitar” e link para política.

---

## 6. Estados e Microinterações

- **Hover em cards**: leve aumento de sombra, imagem um pouco mais clara, botão “Ver detalhes” aparece.
- **Feedback de formulários**:
  - Sucesso: mensagem em verde discreto “Recebemos seus dados, entraremos em contato”.
  - Erro: avisos próximos aos campos obrigatórios.
- **Scroll do header**:
  - No topo: transparente sobre hero.
  - Ao rolar: fundo sólido preto com leve sombra.

---

## 7. Acessibilidade Básica

- Contraste mínimo respeitando boas práticas (WCAG AA onde possível).
- Links e botões com área clicável confortável (touch).
- Labels visíveis em todos os campos de formulário.
- Texto alternativo (alt) para imagens principais dos veículos.

---

## 8. Prioridades para o MVP (Design)

1. Home (hero, destaques, diferenciais, CTA).
2. Estoque (listagem + filtros).
3. Página de Detalhe do Veículo (galeria, ficha, CTAs, formulário).
4. Contato (formulário + dados).
5. Componentes globais: header, footer, botão WhatsApp, formulários.

---

Se você quiser, posso detalhar o próximo nível com:

- Wireframes descritos tela a tela (ex.: “wireframe de baixa fidelidade” com mais precisão), ou
- Um guia de estilo mais completo (Design System inicial: spacing, grid, tokens de cor, estados de botão, etc.).Segue a especificação de design do projeto (UX/UI) já estruturada acima, cobrindo:

- Princípios de UX e diretrizes visuais (cores, tipografia, estilo premium)
- Sitemap e arquitetura de informação
- Fluxos principais (encontrar veículo, solicitar proposta, agendar test drive, contato)
- Layout conceitual das principais telas:
  - Home
  - Estoque (listagem)
  - Detalhe do veículo
  - Sobre
  - Serviços
  - Contato
  - Blog (opcional)
- Componentes reutilizáveis (cards, botões, formulários, modais)
- Microinterações e acessibilidade básica
- Prioridades de design para o MVP

Se você me disser qual ferramenta pretende usar (Figma, Adobe XD, etc.), posso transformar essa especificação em um guia mais “pronto para prototipar”, com grids, espaçamentos, tamanhos de fontes e tokens de cor padronizados.
