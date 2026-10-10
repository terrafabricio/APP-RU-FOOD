# RU-FOOD — Revisão final do MVP (09/10/2026)

Legenda das evidências: **COMPROVADO** (teste executado) · **CÓDIGO** (identificado no código) · **NÃO TESTADO** (com motivo) · **SEM FONTE**.

> Observação de método: o roteiro de auditoria recebido pedia "só auditar, sem corrigir". O pedido direto do usuário foi
> "faça uma revisão final em tudo e publique o MVP"; por isso os problemas graves encontrados foram **corrigidos e publicados**,
> e estão registrados abaixo com o que foi feito.

## 1. Diagnóstico técnico

| Item | Situação |
|---|---|
| Stack | Next.js 16.4 (App Router, cacheComponents), React 19, TypeScript, Tailwind v4; Supabase (Postgres + RLS + Auth + Realtime); Vercel; função Python (OR-Tools) |
| Banco | 40+ tabelas; regras de acesso por perfil (RLS) e funções `SECURITY DEFINER` com `search_path` vazio |
| Testes | 79 testes unitários (vitest) **COMPROVADO**; teste de ponta a ponta no banco `supabase/testes/ponta_a_ponta.sql` **COMPROVADO** |
| Build | `next build` sem erros, 54 páginas **COMPROVADO** |
| Deploy | Produção em https://rufood.vercel.app (09/10/2026) **COMPROVADO** |

## 2. Achados e o que foi feito

| ID | Gravidade | Achado | Situação |
|---|---|---|---|
| B-01 | **P0** | Baixa de produção e perdas quebravam: `privado.saida_fefo` tinha variável `saldo` com o mesmo nome da coluna `lotes.saldo` ("column reference is ambiguous"). Nenhuma saída de estoque funcionava. | **Corrigido** (migração `20261009_corrige_saida_fefo`). Teste: 45 kg baixados consumiram primeiro o lote que vence antes (LP 10→0, LG 300→265) **COMPROVADO** |
| B-02 | **P1** | Fiscal da UFGD não aprovava nada; a própria empresa aprovava cardápio e alterações (conflito de interesse). | **Corrigido**: fluxo nutricionista → gestor → fiscal, com motivo obrigatório na devolução **COMPROVADO** (testes 1c–2i, 3a–3d) |
| B-03 | **P1** | Nutricionista e Compras tinham os mesmos poderes; qualquer membro publicava o cardápio. | **Corrigido** no banco (RLS + funções) **COMPROVADO** (1a, 1h, 2f, 4a, 5a, 6b, 7a, F1) |
| B-04 | **P1** | Ordens de compra sem alçada de aprovação. | **Corrigido**: acima do limite (padrão R$ 5.000, só o gestor altera) aguardam o gestor; não se recebe mercadoria de ordem não aprovada **COMPROVADO** (4c–4g) |
| B-05 | **P1** | Ficha técnica rasa (só alergênicos, porção e insumos), dentro de janela; "Nova ficha" sem campos. | **Corrigido**: página completa `/admin/fichas/[id]` com rendimento, per capita líquido/bruto, FC, fator de cocção, modo de preparo, temperatura de cocção (RDC 216), validade, alergênicos (RDC 26), nutrição, custo e **versões** **COMPROVADO** (F2–F4) |
| B-06 | **P1** | "Planejar semana" abria janela quebrada e sem campos suficientes. | **Corrigido**: botão removido; semanas futuras abrem com sugestão do sistema (tom claro), alterações em preto, "Enviar para aprovação" **COMPROVADO** (C1 + navegador) |
| B-07 | P2 | Cardápio não indicava almoço/jantar. | **Corrigido**: cada dia mostra "Almoço 10h30–14h" e "Jantar 17h30–21h" (sábado sem jantar). Regra do projeto: mesmo cardápio nos dois serviços (docs/01) **CÓDIGO** |
| B-08 | P2 | Funções de gestão executáveis sem login (recusavam por dentro). | **Corrigido**: acesso anônimo revogado **COMPROVADO** (`has_function_privilege`) |
| B-09 | P2 | Mensagens de permissão genéricas. | **Corrigido**: o banco explica o motivo ("Só Compras ou o gestor emitem ordens de compra.") **CÓDIGO** |

## 3. Pendências abertas (não resolvidas nesta rodada)

| ID | Gravidade | Pendência | Por quê / próximo passo |
|---|---|---|---|
| P-01 | **P1 (dados)** | Produção tem **152 preparações sem ficha oficial, 16 insumos, 0 fornecedores, 0 lotes**. | Sem fichas e insumos cadastrados, compras e estoque não têm o que calcular. É cadastro operacional (nutricionista e Compras), não código. A tela inicial mostra a pendência. |
| P-02 | ~~P2~~ | ~~Itens do cardápio ligados à ficha só pelo nome.~~ | **Corrigido (09/10):** `itens.preparacao_id` + gatilhos; renomear a preparação atualiza só cardápios futuros. Teste de integração prova o vínculo por ID **COMPROVADO** |
| P-03 | P2 | Modelos de e-mail em português ainda não aplicados no Supabase. | Colar manualmente (`supabase/templates/LEIA-ME.txt`). |
| P-04 | P2 | Proteção contra senhas vazadas desligada no Supabase Auth. | Configuração do painel do Supabase (verificar se o plano permite). |
| P-05 | P3 | ~~Produção não registra a versão da ficha usada.~~ Rendimento real ainda não é registrado. | **Versão corrigida (09/10):** `ordens_producao.fichas` guarda preparação, versão e se era oficial **COMPROVADO** (11/11 pratos). Rendimento real: pendente. |

## 4. Rastreabilidade (estado comprovado)

- **Para a frente** (lote → uso): recebimento cria lote com validade; a baixa de produção grava movimento com `lote_id`, quantidade, saldo após, data, serviço e referência `producao:data:serviço` **COMPROVADO**.
- **Para trás** (produção → fornecedor): movimento → lote → recebimento → pedido → ordem de compra → fornecedor existem como chaves **CÓDIGO**; a versão da ficha usada não é registrada (P-05).
- **Histórico**: ficha técnica, regras, configuração, semanas e calendário guardam versão anterior (`public.versoes`) **COMPROVADO** para ficha (F4).

## 5. Perfis e permissões (matriz aplicada no banco)

| Ação | Gestor | Nutricionista | Compras | Fiscal UFGD |
|---|---|---|---|---|
| Montar e enviar cardápio, fichas, regras, produção | ✔ | ✔ | — | — |
| 1ª aprovação (semana, alteração, compra acima do limite) | ✔ | — | — | — |
| Aprovação final do cardápio e das alterações | — | — | — | ✔ |
| Fornecedores, ordens, recebimento, estoque | ✔ | — | ✔ | — |
| IMR | ✔ | — | — | ✔ |
| Perfis de acesso e limite de compras | ✔ | — | — | — |
| Ler tudo | ✔ | ✔ | ✔ | ✔ |

## 6. O que NÃO foi testado (e por quê)

- **Telas logadas em produção, por perfil**: não tenho senhas e não crio contas com senha; as regras foram provadas **no banco**, simulando cada perfil (o mesmo caminho que as telas usam). As telas foram verificadas no ambiente local em modo prévia (gestor, só leitura).
- **Instalador .exe no Windows**: sem Windows disponível.
- **Instalação do PWA em aparelho real e uso offline**: verificados manifesto, service worker e página offline por HTTP; não testado em aparelho.
- **Conformidade completa com o TR**: o PDF do TR não está no repositório; a verificação usa as regras extraídas em `docs/02-regras-contrato.md` (**SEM FONTE** primária).

## 7. Decisão

**MVP publicado, APTO PARA USO ASSISTIDO.** A lógica crítica (permissões, aprovações, compras, recebimento, estoque FEFO, produção, ficha técnica) foi provada em teste de ponta a ponta. Para operar de verdade, falta **cadastrar os dados** (P-01) e aplicar os e-mails (P-03).

## 8. Rodada de 09/10/2026 — massa de teste e validação com dados

**Massa de teste aplicada em produção** (`web/supabase/semente/`), removível com `select privado.remover_dados_teste();`.
Ensaio completo (semente → remoção) numa transação desfeita: banco voltou **idêntico** (hash por tabela) **COMPROVADO**.

| ID | Gravidade | Achado com os dados | Situação |
|---|---|---|---|
| B-10 | P2 | Ordem cuja entrega foi **devolvida** (leite a 11 °C) aparecia como "Recebida". | **Corrigido:** novo status `devolvida` ("aguarda reposição"); devolução parcial = `parcial` **COMPROVADO** |
| D-01 | P3 (dados) | Preparações duplicadas que diferem só em acento/maiúscula ("Feijao carioca" × "Feijão carioca", "Estrogonofe" × "Estronofe"). | Pendente: unificar no cadastro (nutricionista). O vínculo por ID evita erro de cálculo. |

**Validações com a massa de teste (COMPROVADO):**
- Necessidade de compra do app = cálculo independente em SQL, insumo por insumo (dia 13/10, 22 insumos), inclusive com nomes de preparação alterados (vínculo por ID).
- Saldo de cada insumo = soma dos movimentos = soma dos lotes (0 divergências, antes e depois da baixa de produção).
- Recebimento recusado não gera lote nem estoque; ordem não aprovada não pode ser recebida.
- Fluxos completos sobre os dados: semana enviada → gestor → fiscal → publicada; alteração aprovada nas 2 etapas; compra acima do limite aprovada e recebida (+400 kg); baixa de 11 pratos (46 saídas FEFO, nenhum saldo negativo).
- Rastreabilidade de um lote: lote → recebimento → pedido → ordem → fornecedor.

## 9. Notificações push (09/10/2026)

Web Push com chaves VAPID (gratuito, sem serviço pago). Migração `20261009_notificacoes_push` (desfazer em `supabase/desfazer/`).

| Quem | Recebe |
|---|---|
| Gestor | cardápio enviado, troca de prato pedida, compra acima do limite, temperatura fora do padrão |
| Fiscal UFGD | cardápio e trocas aprovados pelo gestor (aprovação final) |
| Nutricionista | cardápio devolvido/publicado, troca aprovada/recusada, temperatura fora, lotes vencendo, prazo de envio do cardápio |
| Compras | compra aprovada/recusada, entrega devolvida, entregas atrasadas, lotes vencendo, estoque abaixo do mínimo (07h) |
| Alunos | cardápio publicado, troca de prato nos próximos 7 dias, recados, lembrete de domingo 18h para quem não escolheu |

- Gatilhos no banco → fila `notificacoes` → pg_net chama `/api/push/enviar` → envio → confirmação; pg_cron reenvia a cada 10 min.
- A fila só é lida com `PUSH_SEGREDO` (o banco guarda só o hash). Lote reservado de forma atômica (sem envio duplicado).
- **COMPROVADO:** gatilhos (temperatura e publicação do cardápio geram 4 avisos certos, em transação desfeita); segredo errado recusado;
  em produção, o banco chamou a rota (200), a rota enviou ao serviço do Google, a inscrição inválida foi removida sozinha.
- **NÃO TESTADO:** chegada em aparelho real (o navegador de teste bloqueia permissão de notificação).
