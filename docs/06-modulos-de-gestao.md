# RU-FOOD — Módulos do painel de gestão

> Versão 3 · 08/10/2026. Cada módulo indica as cláusulas do Termo de Referência 47/2023 (TR) e os itens do IMR que atende.

## 1. Painel (primeira tela)

**Proteínas do dia, ao vivo**: a primeira dobra mostra o dia de serviço (hoje ou o próximo) com as três opções de prato principal.

| Informação | Origem |
|---|---|
| Escolhas recebidas e proporção prevista | App do aluno + totem |
| Previsto (porções e kg) | Previsão de consumo |
| Produzido (kg e porções equivalentes) | Cubas lançadas pela cozinha: **+5 kg**, **+10 kg** ou outro valor |
| Estimativa no buffet e alerta **Repor agora** | Produzido − (servidos × proporção × porção) |
| **Acabou** (com horário) | Botão na opção; risco de IMR 50 e TR 5.13 |
| Servidos até agora | Número da catraca (COIN), atualizado pela equipe |
| Fechamento: sobras e resto-ingesta | IMR 26 e 27 |

Tudo se atualiza sozinho para quem estiver com o painel aberto (Supabase Realtime).

**Trilha de acompanhamento**: logo abaixo das proteínas, a trilha **Planejamento → Compras → Estoque → Consumo → Sobras** cruza os dados de cada etapa e mostra o estado de cada uma (ok, atenção ou crítico):

| Etapa | O que cruza |
|---|---|
| Planejamento | Semanas aprovadas nas próximas 3 e proteínas com ficha técnica |
| Compras | Necessidade das fichas × estoque × ordens abertas (faltas, entregas atrasadas) |
| Estoque | Cobertura de 14 dias (TR 5.17), valor em estoque e lotes vencendo |
| Consumo | Público previsto × servido na última semana e opções que acabaram |
| Sobras | Sobra limpa e resto-ingesta por comensal |

A mesma trilha aparece, compacta, no topo de Compras e Estoque. Ao rolar o painel: indicadores, porções dos próximos dias, pendências, estoque × necessidade e preferências.

**Atalhos**:
- **Ilha de serviço** no topo: mostra quanto falta para o próximo serviço e, durante o serviço, os servidos ao vivo.
- **Criar**: atalho para nova ordem de compra, recebimento, insumo, fornecedor, temperatura, semana de cardápio e recado.
- **Busca** (⌘K ou /): encontra telas e também registros, como insumos, fornecedores, ordens e lotes.

## 2. Gestão de alimentos

| Módulo | O que faz | TR / IMR |
|---|---|---|
| Previsão de consumo | Porções e kg por proteína, dia e serviço | — |
| Cardápios | Semanas futuras com verificador de regras | TR 5.9, Quadros 02–04 · IMR 1, 62 |
| Fichas técnicas | Per capita, fator de correção, alergênicos | IMR 36 |
| **Estoque e lotes** | Itens, lotes, movimentações (kardex), inventário e rastreabilidade (abaixo) | TR 5.17, 5.59 · IMR 2, 3 |
| **Compras** | Organizada pelo TR, com ordens de compra (abaixo) | TR 4.1.3, 4.1.6, 4.1.7, 5.17, 5.24–5.28, 6.14.3 · IMR 21, 24, 41, 42 |
| **Fornecedores** | Cadastro completo, documentos, ordens e nota de desempenho | TR 5.25, 5.26 |
| **Relatórios** | 13 relatórios com período, gráfico ajustável e exportação | — |

### Compras conforme o TR

1. **Planejamento (TR 5.17)**: o que vai faltar e até quando pedir, mantendo estoque para 14 dias de refeições. Selecione vários insumos e gere uma **ordem de compra** já preenchida: fornecedor mais comum, quantidades sugeridas, último preço pago e entrega um dia antes da primeira falta.
2. **Ordens de compra**: cada ordem (OC-000001…) reúne os itens de um fornecedor, com preço, frete, condição de pagamento, horário de entrega e marcações do TR. O detalhe mostra o **rastreamento**: criada → enviada → entrega prevista → recebida (parcial ou total) → nota fiscal. Cada item é recebido separadamente (com a conferência do TR 5.24). Também é possível exportar a ordem em PDF para mandar ao fornecedor e anexar NF, boleto ou orçamento. A situação da ordem muda sozinha conforme os itens chegam.
3. **Cronograma de entregas (TR 6.14.3)**: entregas por dia e horário; aviso quando a entrega tem menos de 3 dias de antecedência; exportação dos próximos 14 dias para a fiscalização.
4. **Recebimento (TR 5.24 e 5.25)**: conferência de quantidade, origem e registro (SIF/MAPA/ANVISA), embalagem, características, **temperatura** (resfriados e congelados) e **validade**.
   - Conforme: entra no estoque como **lote** (com validade), atualiza o custo médio e registra a entrada no kardex.
   - Não conforme: **devolvido** ao fornecedor, com reposição agendada.
   - Com 2 ou mais devoluções do mesmo fornecedor em 90 dias, o sistema exige outro fornecedor.
5. **Agricultura familiar (TR 5.26 a 5.28)**: percentual do valor de gêneros comprados da agricultura familiar no mês (meta de 30%), evolução de 6 meses (sem oscilar), notas fiscais do mês e prazo de envio até o dia 10.
A ordem registra também embalagem grande (TR 4.1.6) e caixa retornável para hortifrúti (TR 4.1.7).

### Estoque e lotes

| Aba | O que faz |
|---|---|
| Itens | Ficha completa do insumo: código, EAN, marca, NCM, unidade de compra e fator de conversão, mínimo e máximo, local, conservação, exigências de recebimento, foto e ficha técnica anexadas. Filtros por situação, categoria, conservação e fornecedor |
| Lotes | Saldo por lote com validade e faixas de vencimento; a saída segue o **primeiro a vencer, primeiro a sair** (FEFO) |
| Movimentações | Kardex com entradas, saídas para produção, perdas, ajustes e estornos, com gráfico de entradas × saídas |
| Inventário | Contagem em massa; o sistema ajusta só as divergências e registra quem contou |
| Rastreabilidade | Do lote até a origem: recebimento (temperatura, validade, responsável), ordem de compra, nota fiscal e fornecedor; e para onde foi (produções que usaram o lote) |

**Baixa da produção**: na Produção diária, depois de emitir a ordem de produção, o botão **Dar baixa no estoque** tira os insumos das fichas técnicas, lote a lote (FEFO). **Estornar baixa** devolve tudo aos mesmos lotes.

### Fornecedores

Cadastro de pessoa jurídica ou física/produtor com CNPJ, CPF ou CAF, inscrição estadual, contato, telefone, e-mail, endereço (preenchido pelo CEP), prazo de entrega, pedido mínimo, condição de pagamento, dias de entrega, categorias, agricultura familiar e grupos prioritários. O botão **Consultar** preenche os dados públicos a partir do CNPJ.

Ao abrir um fornecedor, aparecem:
- **Resumo**: total comprado, entregas no prazo, devoluções em 90 dias e uma nota de 1 a 5 (50% pontualidade e 50% recebimentos aprovados).
- **Ordens**: as ordens de compra do fornecedor.
- **Documentos**: contrato social, alvará, DAP/CAF, certidões e laudos.

### Relatórios

Cada relatório tem filtro de período (7, 30 ou 90 dias, mês, ano ou intervalo livre), indicadores, gráfico com troca de tipo (colunas, empilhado, linhas, área, pizza), tabela ordenável e exportação em **PDF, Excel, CSV** ou **compartilhar**.

| Área | Relatórios |
|---|---|
| Consumo e previsão | Consumo das proteínas · Precisão da previsão · Sobras e resto-ingesta |
| Compras | Por fornecedor · Por categoria · Agricultura familiar · Desempenho de fornecedores |
| Estoque | Estoque valorizado · Movimentações · Validade dos lotes |
| Qualidade | Satisfação · IMR por competência · Temperaturas |

As telas que antes exportavam só CSV (previsão, consumo, IMR, cronograma, recebimentos, notas) agora usam a mesma barra de exportação.

## 3. Operação

| Módulo | O que faz | TR / IMR |
|---|---|---|
| Produção diária | Ordem de produção por serviço: porções, peso pronto, insumos e separação no estoque; emissão registrada e impressão | IMR 29 |
| Consumo e sobras | Previsto × servido × produzido × sobra; vezes que acabou; resto-ingesta por pessoa; calibração da proporção histórica | IMR 26, 27, 50 |
| Segurança alimentar | Temperaturas de cocção, distribuição, resfriamento, descongelamento e equipamentos, com limites da RDC 216; não conformidades com ação corretiva; amostras de 72 h | TR 5.64 · IMR 9, 10, 20–25 |
| Rotinas e checklists | Tarefas com periodicidade (diária a semestral), vencimento e comprovante | IMR 4–8, 11, 12, 17, 28, 30–35, 37, 39, 66 |

## 4. Qualidade

| Módulo | O que faz |
|---|---|
| **Autoavaliação IMR** | Os 70 itens do instrumento. O sistema **sugere** o resultado do mês a partir dos registros (amostras, temperaturas, fechamentos, ordens de produção, fichas, agricultura familiar, escala, rotinas, satisfação, frequências do cardápio, documentos) e mostra a evidência. A equipe confirma. Calcula o desconto (% por item não realizado, por vez) e simula em reais. Exporta CSV. |
| Satisfação | Avaliações anônimas do app (IMR 51–60) |
| Agricultura familiar | Atalho para a aba em Compras |

## 5. Pessoas

| Módulo | O que faz | TR / IMR |
|---|---|---|
| Equipe e escala | Cadastro mínimo (nome, função, CRN), escala semanal por turno, alerta de turno sem nutricionista ou com equipe abaixo do mínimo, cópia da semana anterior | IMR 45, 46, 47 |
| Documentos | Obrigações com prazo (NFs até o dia 10, certidões, trabalhista mensal e anual, MBP/POP, alvará, planilhas) e registro de cada envio com link | TR 5.27, 5.62–5.64, 6.14.2, 6.14.8 · IMR 67–70 |
| Perfis de acesso | Gestor, Nutricionista, Compras e **Fiscal (somente leitura, bloqueado no banco)** | — |

## 6. Canais

| Módulo | O que faz | TR / IMR |
|---|---|---|
| Totem | QR Code + voto por toque | — |
| **Modo TV** (`/tv`) | Cardápio do dia com ingredientes em ordem decrescente, alergênicos e **gramatura mínima** dos pratos principais; semana; QR Code; recados | TR 5.20, 5.6.2, 5.21 · IMR 64, 65 |
| Recados aos alunos | Avisos com período, exibidos no app (sino e destaque), no totem e na TV | — |

## 7. Segurança dos dados novos

- Todas as tabelas novas têm RLS: leitura para membros da equipe; gravação só para quem não é fiscal. A equipe de acesso só é alterada pelo gestor.
- Funções de gestão só podem ser chamadas por usuários autenticados e conferem o perfil por dentro.
- Dados de funcionários: apenas nome, função, CRN e admissão (necessários à escala e à fiscalização).
- Anexos ficam num bucket privado do Supabase Storage (até 10 MB; imagens, PDF, Office e CSV). Os arquivos só abrem por link assinado temporário, e só a equipe com permissão de gravação pode enviar ou remover.
- Estoque, lotes e kardex só mudam por funções do banco (entrada, saída FEFO, ajuste, baixa e estorno). Isso mantém saldo, custo médio e histórico sempre coerentes.
