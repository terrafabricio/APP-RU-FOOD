# Prev Cardápio — Estrutura do MVP

> Documento de definição. Nada foi construído ainda.
> **Revisão 3 (07/10/2026):** incorpora as respostas do cliente e as regras do Termo de Referência da UFGD (detalhadas em [02-regras-contrato.md](02-regras-contrato.md)). As regras contratuais são **editáveis e versionadas** no sistema (6.8).

---

## 1. O problema em uma frase

No RU da UFGD (Dourados/MS), precisamos saber, **antes de comprar e antes de produzir**, quantas porções de cada uma das três opções de prato principal serão consumidas em cada refeição. O contrato exige que **todos os itens fiquem disponíveis do início ao fim do serviço** (TR 5.13): faltar gera desconto na nota. Sobrar gera desperdício e custo.

## 2. Contexto confirmado

| Tema | O que sabemos | Fonte |
|---|---|---|
| Serviços | Almoço seg–sáb (10h30–14h) · Jantar seg–sex (17h30–21h) | TR Quadro 01 |
| Público médio | Almoço ≈ 1.300 · Jantar ≈ 500 | Cliente |
| Cardápio | Igual no almoço e no jantar | Cliente |
| Prato principal | O comensal escolhe **uma** de três: **Bovina** · **Suína/Frango/Peixe/Ovo** · **Vegana** | Cliente + TR Quadro 02 |
| Quem come | Estudantes, servidores, terceirizados, estagiários, visitantes | TR 5.4 |
| Identificação | Cartão lido na catraca, em sistema da UFGD (COIN). A contratada opera o sistema e emite relatórios diários e mensais | TR 5.117–5.126 |
| Trocas de cardápio | Pedido formal, justificado, **≥ 72 h antes, sujeito a aprovação** da fiscalização | Cliente + TR 5.19 |
| Calendário do cardápio | Enviado ≥ 3 semanas antes; aprovado ≥ 2 semanas antes | TR 5.9 |
| Fichas técnicas | Existem | Cliente |
| Planilha atual | Grade seg–sáb com slots fixos, dias temáticos, feriados, alérgenos, ingredientes; aba oculta de quantidades para 1.000/200 pessoas | Cardápio Outubro.xlsx |

## 3. Princípio central: a escolha é uma *amostra*, não um pedido

Nem todo mundo vai responder (e visitantes quase nunca respondem). Se produzirmos só para quem escolheu, **vai faltar**. As escolhas servem para estimar a **proporção** entre as três opções. Essa proporção é aplicada ao **público esperado**.

```
Público esperado (ex.: almoço de terça)     1.300   ← histórico da catraca
Proporção pelas escolhas                    420 responderam → Bovina 45% | Frango 40% | Vegana 15%
Porções previstas                           585 | 520 | 195
+ Margem de segurança (por categoria)       +10% → 644 | 572 | 215
× Ficha técnica                             frango 140 g/porção → 80 kg prontos → insumo cru pelo fator de cocção
```

- **Público esperado:** vem do **relatório da catraca**, que já existe. Com o histórico de alguns meses, o sistema prevê o público por dia da semana e serviço desde o primeiro dia. Se não houver histórico, usa o padrão de 1.300 / 500.
- **Poucas respostas:** com amostra pequena, a proporção das respostas é misturada com a proporção histórica daquela categoria.
- **Viés:** quem é vegano tende a responder mais. O registro do **consumo real** (seção 6.6) mede o erro e ajusta a margem automaticamente com o tempo.

## 4. Interfaces

Um único sistema web com quatro "portas":

| Interface | Quem usa | Onde | Faz o quê |
|---|---|---|---|
| **App do comensal** (PWA) | Estudantes e servidores | Celular (site ou "instalar na tela inicial") | Vê o cardápio, escolhe o prato principal de cada refeição, é avisado de trocas |
| **Totem** | Quem não tem celular ou está na fila | Tablet no RU em modo quiosque | Mesmo fluxo, em menos de 20 s, com saída automática |
| **Modo TV** | Todos | TV no RU | Cardápio do dia e da semana. Atende a divulgação exigida (TR 5.20, IMR 64) |
| **Painel admin** | Nutricionista, gestor, compras | Computador | Cardápio, trocas, previsão, compras, produção, consumo real |

**Totem e fila:** o canal principal é o celular, divulgado por **QR Code** nas mesas, bandejas, fila, TV e redes do RU. O que reduz atrito:

1. **Preferência padrão:** "normalmente eu como: carne / frango-suíno-peixe / vegano / decido na hora". Preenche as semanas automaticamente e o comensal só ajusta o que quiser.
2. **"Repetir semana passada"** e escolha da semana inteira numa única tela.
3. **Totem:** número do cartão/matrícula → semana → toques → confirmar.

**Por que não "só local":** celulares, totem, TV e painel precisam conversar em tempo real, então o sistema fica **na nuvem**. Totem e TV são apenas navegadores apontando para o site.

## 5. Fluxos

### 5.1 Ciclo de um cardápio semanal

```
S-3  [Admin] Monta o cardápio (ou importa a planilha) → verificador de regras → envia à fiscalização
S-2  [Fiscal] Aprova → [Admin] marca "aprovado" → PUBLICADO para os comensais (escolhas abertas)
     [Comensais] Escolhem (preferência padrão já preenche)
D-?  PRAZO DE COMPRA → previsão congelada para compras → LISTA DE COMPRAS            (prazo a definir, pendência 2)
D-1  PRAZO DE PRODUÇÃO (ex.: 14h) → ORDEM DE PRODUÇÃO por serviço
D    Serviço → importa relatório da catraca → registra sobras e se/quando algo acabou
```

Como o cardápio é aprovado duas semanas antes, os comensais têm cerca de **duas semanas para escolher**, o que é ótimo para a taxa de resposta.

### 5.2 Troca de item depois de aprovado

O sistema segue as duas vias do contrato:

| Via | Quando | Fluxo no sistema |
|---|---|---|
| **Alteração planejada** (TR 5.19) | Faltam **≥ 72 h** para o serviço | Admin cria o **pedido de alteração** (antes → depois, justificativa) → sistema gera o ofício/e-mail para a fiscalização → status *aguardando aprovação* → *aprovada* ou *negada*. Só depois de aprovada a troca aparece para os comensais |
| **Substituição por força maior** (TR 5.18) | Faltam **< 72 h** (ex.: fornecedor não entregou) | Sistema bloqueia o pedido comum e abre o fluxo de **emergência**: exige item de igual valor nutritivo e justificativa, gera a comunicação imediata e registra a autorização do fiscal |

Todo pedido fica no **histórico** com data, horas de antecedência, responsável e status. É a prova de conformidade para o IMR 61 (servir conforme o cardápio autorizado, 0,40%).

**Efeito nos comensais**, quando a troca é aprovada:

- **Mesma categoria** (frango → outro frango): a escolha é mantida e o comensal recebe um aviso.
- **Categoria diferente** (peixe → suíno, dentro da opção 2): a escolha fica *"precisa reconfirmar"* e entra na previsão como incerta.
- **Avisos:** banner ao abrir o app ou totem ("1 item da sua semana mudou"), selo **"Alterado"** no dia (antes → depois) e push para quem instalou o app (fase 1.5).

## 6. Módulos do MVP

### 6.1 Catálogo de preparações e fichas técnicas
- Nome, slot (salada, prato principal, vegano, guarnição, base, sobremesa), **opção contratual** (bovina / suína-frango-peixe-ovo / vegana), **tipo no contrato** (ex.: "Isca chinesa" → "Bife, isca ou cubo grelhado") e alérgenos (pimenta, glúten, lactose, vegano).
- **Ficha técnica:** insumos com per capita e fator de correção/cocção; porção servida (validada contra a porção mínima do contrato).
- Importação em lote das fichas no formato atual (ver pendência 4).

### 6.2 Montagem do cardápio + verificador de regras
- Grade semanal igual à planilha (seg–sáb × slots), com **importação da planilha .xlsx** atual.
- Dias temáticos, feriados, sem jantar aos sábados.
- Estados: rascunho → enviado à fiscalização → aprovado/publicado → encerrado.
- **Verificador de regras (básico):** lê as regras cadastradas no módulo 6.8 (nada fica fixo no código). Ao montar, alerta sobre:
  - frequência máxima mensal por tipo de preparação (Quadros 03 e 04);
  - mesma forma de preparo repetida na semana;
  - peixe ao menos 1x por semana e ovo no máximo 1x por mês;
  - mesma folha ou legume mais de 2x por semana;
  - porção da ficha técnica abaixo da mínima.

  Isso evita o desconto do IMR 62 (0,40% por ocorrência) ainda na montagem. Os exemplos que a nutricionista comentou na planilha ("acelga 3x na semana", "já tem carne moída na quinta") seriam pegos automaticamente.
- Controle dos prazos de envio (3 semanas) e aprovação (2 semanas): IMR 1.

### 6.3 App do comensal, totem e modo TV
- Identificação pelo cartão/matrícula da UFGD (pendência 1).
- Semanas aprovadas. Para cada dia e serviço: **Bovina · Suína/Frango/Peixe/Ovo · Vegana · Não vou comer**.
- Preferência padrão e "repetir semana passada".
- Cardápio completo (saladas, guarnições, sobremesas, alérgenos, ingredientes).
- Avisos de alteração.
- Modo TV: cardápio do dia e da semana em tela cheia.

### 6.4 Previsão (painel admin)
- Por dia e serviço: respostas, % de adesão, proporção por opção, porções previstas com margem, **kg por insumo**.
- Atualização ao vivo.
- Alerta de baixa adesão ("só 6% responderam para o jantar de sexta").

### 6.5 Saídas operacionais
- **Lista de compras** do período (fichas técnicas explodidas por insumo) → CSV/PDF.
- **Ordem de produção** do dia por serviço → PDF (IMR 29).

### 6.6 Consumo real (fecha o ciclo)
- **Importar o relatório diário da catraca** (refeições servidas por serviço).
- Por opção de prato principal: produzido (kg), **sobra limpa** (kg), **acabou? a que horas?**, **resto-ingesta** (IMR 26 e 27).
- Indicadores: erro da previsão, desperdício por opção, ocorrências de falta.

### 6.7 Configurações
Prazos internos (compra, produção) · margem por opção · público padrão · usuários admin e papéis · contatos da fiscalização.

### 6.8 Regras do contrato (editáveis e versionadas)
O contrato pode mudar (aditivo, novo edital, renegociação). Por isso **nenhuma regra contratual fica fixa no código**. Tudo é cadastro que o admin edita:

| Tipo de regra | Exemplos (valores iniciais do TR) |
|---|---|
| **Prazos** | Envio do cardápio ≥ 3 semanas · aprovação ≥ 2 semanas · alteração ≥ 72 h |
| **Estrutura do dia** | 3 opções de prato principal e suas categorias · nº de saladas, guarnições e sobremesas · itens obrigatórios sem origem animal |
| **Porção mínima e frequência** | Tabela por tipo de preparação: porção mínima (g), máximo por mês, máximo por semana (Quadros 03 e 04) |
| **Regras de repetição e presença** | "mesma forma de preparo no máx. 1x/semana" · "peixe ≥ 1x/semana" · "ovo ≤ 1x/mês" · "mesma folha ≤ 2x/semana" |
| **Funcionamento** | Serviços, dias e horários (ex.: sem jantar aos sábados) |
| **IMR** | Itens e % de desconto, para estimar o impacto financeiro de cada alerta |

- **Versões com vigência:** cada conjunto de regras tem data de início (e de fim). Quando o contrato muda, cria-se uma nova versão a partir da anterior e só o que mudou é editado. Cardápios antigos continuam sendo avaliados pelas regras **da época**, o que é importante para contestar um desconto.
- **Regras parametrizadas, não programadas:** o verificador conhece alguns *tipos* de regra (frequência máxima num período, frequência mínima num período, porção mínima, prazo mínimo). O admin cria e ajusta as regras escolhendo o tipo e preenchendo os valores. Um tipo de regra totalmente novo é a única coisa que exige desenvolvimento.
- **Severidade configurável:** cada regra pode *bloquear* (não deixa enviar à fiscalização) ou só *alertar*.
- **Carga inicial:** o sistema já vem com as regras do TR da UFGD preenchidas ([02-regras-contrato.md](02-regras-contrato.md)), para revisão.

## 7. Fora do MVP

| Fase | Item |
|---|---|
| 1.5 | Push no app · e-mail de alterações aos comensais |
| 2 | **Integração com o sistema da COIN/UFGD**: login/validação pelo cartão e importação automática da catraca |
| 2 | Controle de estoque com cobertura mínima de **14 dias** (TR 5.17), descontando o estoque da lista de compras |
| 2 | Avaliação rápida da refeição no app (alimenta IMR 51–60 e a pesquisa de satisfação) |
| 2 | Display diário de ingredientes em ordem decrescente, gerado das fichas (TR 5.6.2) |
| 3 | Cardápio quantitativo nutricional completo (VET, macronutrientes, sódio, Quadro 05), atendendo à exigência de software de gerenciamento (TR 5.10) |
| 3 | App nas lojas · múltiplas unidades/RUs |

## 8. Modelo de dados (rascunho)

```
Unidade            id, nome
Servico            id, nome (almoço, jantar), dias_semana, horário
VersaoContrato     id, nome (ex.: "TR 2025"), vigente_de, vigente_ate, prazos {envio_semanas, aprovacao_semanas, alteracao_horas}, estrutura_dia (JSON)
TipoPreparacao     id, versao_id, nome (ex.: "Bife, isca ou cubo grelhado"), opcao (bovina|animal_outra|vegana), porcao_min_g
RegraContrato      id, versao_id, tipo (freq_max|freq_min|porcao_min|prazo_min), alvo (tipo_preparacao|categoria|insumo), periodo (semana|mês), limite, severidade (bloqueia|alerta), clausula, imr_item?
ItemIMR            id, versao_id, numero, descricao, percentual
Preparacao         id, nome, slot, opcao, tipo_preparacao_id, alergenos[], porcao_g, ativo
Insumo             id, nome, unidade (kg, L, un), categoria
FichaTecnica       id, preparacao_id, insumo_id, per_capita, fator_correcao
SemanaCardapio     id, inicio, status (rascunho|enviado|aprovado|encerrado), enviado_em, aprovado_em
DiaCardapio        id, semana_id, data, tema, feriado
ItemCardapio       id, dia_id, slot, preparacao_id
Comensal           id, identificador (cartão/matrícula), nome, preferencia_padrao, criado_em
Escolha            id, comensal_id, dia_id, servico_id, opcao | nao_vou, origem (app|totem|padrão), status (válida|reconfirmar), atualizado_em
PedidoAlteracao    id, item_id, antes, depois, justificativa, via (planejada|força_maior), horas_antecedencia, status, enviado_em, decidido_em, autor
PrevisaoCongelada  id, dia_id, servico_id, tipo (compra|produção), publico, proporcoes, porcoes, gerada_em
ConsumoReal        id, dia_id, servico_id, servidos (catraca), origem (import|manual)
ConsumoOpcao       id, consumo_id, opcao, kg_produzido, kg_sobra_limpa, kg_resto, acabou_em?
Configuracao       prazos, margens, públicos padrão
UsuarioAdmin       id, nome, email, papel (nutricionista|gestor|compras)
```

## 9. Arquitetura técnica recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Front + backend | **Next.js** (rotas `/`, `/totem`, `/tv`, `/admin`) | Uma base de código para tudo; vira PWA instalável |
| Banco, login admin, tempo real | **Supabase** (Postgres) | Modelo bem relacional, autenticação pronta, atualização ao vivo; plano gratuito cobre o MVP |
| Hospedagem | **Vercel** | Deploy simples, HTTPS, domínio próprio |
| Totem e TV | Tablet e TV/Chromecast com o site em modo quiosque | Sem app especial; atualiza sozinho |
| Lojas (futuro) | Empacotar a PWA (Capacitor) | Reaproveita o código |

## 10. LGPD e cuidados

- Coletar o mínimo: identificador do cartão/matrícula e nome.
- Aviso de privacidade no primeiro acesso (finalidade: planejamento da produção).
- Totem: nunca mostrar dados de terceiros; saída automática após 30 s sem uso.
- O identificador é dado da UFGD: alinhar o uso com a gestão do contrato.

## 11. Pendências

1. **Identificação:** o que o comensal usa na catraca (número do cartão, RGA/matrícula, CPF)? Vocês conseguem **exportar a lista de usuários** do sistema que operam? A COIN aceitaria uma integração no futuro?
2. **Prazo de compras:** em que dia da semana as compras são fechadas e com quanta antecedência do consumo?
3. **Histórico da catraca:** dá para exportar os relatórios diários dos últimos meses (refeições por dia e serviço)? Isso calibra o público desde o primeiro dia.
4. **Fichas técnicas:** em que formato estão (planilha, sistema, PDF)? Enviar uma de exemplo.
5. **Contrato vigente:** as regras em [02-regras-contrato.md](02-regras-contrato.md) vêm do TR do edital de 2024 (o link dos anexos do edital de 2025 está fora do ar). Se tiver o TR/contrato de 2025, enviar para conferirmos.
6. **Canal com a fiscalização:** os pedidos de alteração são enviados por e-mail, SEI ou outro meio? Define o formato do documento que o sistema gera.
7. **Sábado:** qual o público médio do almoço?
