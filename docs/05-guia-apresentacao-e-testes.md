# Prev Cardápio — Guia de apresentação e testes (versão 1)

> Primeira versão para apresentação de validação e testes com usuários. 07/10/2026.

## 1. Links e acessos

| O quê | Endereço | Acesso |
|---|---|---|
| App do aluno (celular ou computador) | https://rufood.vercel.app | Sem login: toque em **Começar** |
| Painel de gestão | https://rufood.vercel.app/admin | E-mail de administrador (ver 1.1) |
| Totem (tablet na fila) | https://rufood.vercel.app/totem | Link de ativação gerado no painel (ver 1.2) |

### 1.1 Primeiro acesso ao painel
O e-mail **asymmetrika.2026@gmail.com** já está na lista de administradores. Antes do primeiro login, no Supabase (projeto `RU-FOOD`):

1. **Authentication → URL Configuration**: em *Site URL* coloque `https://rufood.vercel.app` e em *Redirect URLs* adicione `https://rufood.vercel.app/**`.
2. Escolha uma forma de entrar:
   - **Link por e-mail** (não precisa de senha): em /admin/entrar, aba *Link por e-mail*, digite o e-mail e abra o link recebido.
   - **Senha**: em *Authentication → Users → Add user*, crie o usuário com esse e-mail, uma senha forte e *Auto Confirm User* marcado.
3. Para novos administradores, inclua o e-mail na tabela `admins`.

### 1.2 Ativar um totem
Painel → **Canais → Totem → Novo totem** → copie o link de ativação e abra-o no tablet. O código fica salvo no aparelho e sai da barra de endereço. Para a demonstração já existe o **"Totem de teste · Entrada"** (link entregue em separado; desative-o depois da apresentação).

## 2. Roteiro de demonstração (10 minutos)

1. **Problema** (1 min): faltar prato gera multa (IMR); sobrar é desperdício. A cozinha precisa saber *quantas porções de cada proteína* preparar.
2. **Aluno** (3 min), no celular:
   - Boas-vindas → **Começar** (sem cadastro).
   - **Semana**: toque em *Almoço* de um dia aberto → escolha o prato. Veja os selos de alergênicos e a **Legenda**.
   - **Ajustes**: preferência padrão (a semana se preenche sozinha) e privacidade.
   - **Avaliar**: nota em um toque (abre 30 min após o início da refeição).
3. **Totem** (2 min), no tablet: QR Code para o app **ou** voto por toque. Tela verde de confirmação; volta sozinho ao início.
4. **Gestão** (4 min), no computador:
   - **Painel**: refeições previstas, pendências, estoque × necessidade.
   - **Previsão de consumo**: porções e kg por proteína, com as escolhas (app + totem) ajustando a proporção histórica.
   - **Cardápios**: editor com o verificador de regras do contrato (frequência mensal, peixe semanal, ovo mensal, folhosos).
   - **Fichas técnicas**: alergênicos marcados pela nutricionista viram selos para os alunos.
   - **Estoque e Compras**: se a quantidade vai dar e se o pedido chega a tempo (cobertura mínima de 14 dias, TR 5.17).

## 3. Roteiro de testes

Marque ✅ ou ❌ e anote o aparelho e o navegador.

| # | Teste | Resultado esperado |
|---|---|---|
| A1 | Abrir o app pela primeira vez e tocar em Começar | Vai para a semana em até 3 s, sem pedir dados |
| A2 | Escolher o almoço de um dia aberto | Aviso verde de confirmação; o card mostra o prato |
| A3 | Tocar de novo no mesmo prato | A escolha é desfeita |
| A4 | Abrir um dia com prazo encerrado | Dia compacto com cadeado; não permite mudar |
| A5 | Tocar em "O que significam os selos?" | Legenda abre com todos os símbolos |
| A6 | Definir preferência "Vegana" em Ajustes | Dias sem escolha aparecem com a opção vegana |
| A7 | Avaliar uma refeição | Agradecimento; a mesma refeição não pede nova avaliação |
| A8 | Ajustes → Apagar dados deste celular | Volta às boas-vindas; escolhas somem |
| A9 | Instalar na tela inicial (Android: botão; iPhone: Compartilhar → Tela de Início) | Abre como app |
| T1 | Abrir o link de ativação no tablet | Totem carrega com o nome do aparelho |
| T2 | Ler o QR Code com um celular | Abre as boas-vindas do app |
| T3 | Tocar em uma opção | Tela "Anotado!" por cerca de 2,5 s e volta |
| T4 | Tocar duas vezes muito rápido | Segundo toque pede para aguardar |
| T5 | Deixar o totem parado por 1 minuto | Volta ao primeiro dia disponível |
| G1 | Entrar no painel | Painel com indicadores |
| G2 | Previsão de consumo da próxima semana | Tabela por dia e proteína; exportar CSV |
| G3 | Editar uma semana em rascunho | Verificador aponta regras do contrato |
| G4 | Marcar alergênico em uma ficha | Selo aparece no app para essa preparação |
| G5 | Registrar estoque e um pedido com entrega | Plano de compras recalcula "chega a tempo" |
| G6 | Canais → Totem → Novo totem | Link de ativação aparece uma única vez |
| G7 | Painel: lançar +5 kg numa opção, marcar "Acabou" e fechar o serviço | Números atualizam na hora em outro computador aberto no painel |
| G8 | Compras → Cronograma: receber uma entrega com temperatura acima do limite | Devolução registrada e reposição sugerida |
| G9 | Compras → Agricultura familiar: completar a nota de uma compra | Percentual do mês recalculado |
| G10 | Segurança alimentar: registrar cocção de 65 °C | Marcada fora do limite; pede ação corretiva |
| G11 | Rotinas: marcar "Feito" numa rotina atrasada | Passa para "Em dia" |
| G12 | IMR: "Aplicar sugestões pendentes" | Itens preenchidos com a evidência; desconto calculado |
| G13 | Equipe: escalar nutricionistas no almoço de hoje | Turno fica verde |
| G14 | Perfis de acesso: liberar um e-mail como Fiscal e entrar com ele | Vê tudo, não consegue salvar nada |
| G15 | Recados: publicar um alerta | Aparece no app (sino e destaque), no totem e em /tv |
| G16 | Abrir /tv em tela cheia | Cardápio do dia com gramatura mínima e semana |
| D1 | Repetir A1–A5 em celular pequeno (320 px), tablet e computador | Nada cortado, nenhuma rolagem lateral |

## 4. O que esta versão faz e o que ainda não faz

**Faz**: escolha anônima por refeição com trava por aparelho; totem com QR e voto por toque; previsão por proteína; editor de cardápio com verificador do TR; fichas técnicas e alergênicos; estoque e compras cruzados com a previsão; alterações com prazo de 72 h; regras do contrato editáveis e versionadas; satisfação anônima.

**Também faz (versão 2)**: painel ao vivo das proteínas, compras organizadas pelo TR, produção diária, consumo e sobras, segurança alimentar, rotinas, autoavaliação IMR, equipe e escala, documentos, perfis de acesso, modo TV e recados. Detalhes em `06-modulos-de-gestao.md`.

**Também faz (versão 3)**: trilha Planejamento → Compras → Estoque → Consumo → Sobras; ordens de compra com rastreamento; lotes com validade (FEFO), kardex, inventário e rastreabilidade; baixa da produção no estoque; cadastro completo de fornecedores com nota de desempenho; anexos (fotos, fichas, documentos e notas); 13 relatórios com exportação em PDF, Excel e CSV; busca de registros, menu "Criar" e ilha de serviço.

**Roteiro rápido da versão 3**
1. Painel → role até a **trilha** e toque em cada etapa.
2. **Fornecedores → Novo fornecedor**: digite um CNPJ e toque em **Consultar**. Salve, abra o fornecedor e anexe um PDF em **Documentos**.
3. **Estoque → Novo insumo** com saldo de abertura e validade. Abra o insumo e veja lotes e kardex.
4. **Compras → Planejamento**: marque 2 insumos e toque em **Criar ordem**. Abra a ordem, **Marcar como enviada**, receba um item, lance a NF e baixe o PDF.
5. **Estoque → Rastreabilidade**: escolha o lote recebido e veja a ordem e a NF de origem.
6. **Produção diária**: emita a ordem e toque em **Dar baixa no estoque**. Confira a saída no kardex e depois teste **Estornar baixa**.
7. **Relatórios**: abra "Compras por fornecedor", troque o gráfico para pizza e exporte em Excel.

**Ainda não faz**: integração automática com a catraca (COIN), em que o número de servidos ainda é digitado; notificações push; emissão de NF-e (o sistema só registra a NF do fornecedor).

**Limitações conhecidas**
- Sem identificar a pessoa, alguém pode responder de dois celulares. O impacto é pequeno porque as respostas são uma **amostra** para a proporção, e há anti-robô e limites de taxa.
- Os alergênicos foram pré-classificados automaticamente e aparecem como **"em validação"** até a revisão da nutricionista no painel.
- O estoque começa zerado: cadastre as quantidades reais (saldo de abertura ou inventário) antes de avaliar o plano de compras.
- A baixa da produção usa as fichas técnicas: pratos sem ficha não tiram nada do estoque.
- Cardápio de demonstração: outubro/2026.

## 5. Depois dos testes
- Desativar o totem de teste (Canais → Totem).
- Trocar para senha forte e ativar MFA para administradores.
- Revisar os pendentes de LGPD em `03-seguranca-e-lgpd.md` (seção 9).
