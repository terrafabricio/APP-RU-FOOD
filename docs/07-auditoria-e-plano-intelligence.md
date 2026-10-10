# RU-FOOD Intelligence — Auditoria (Fase 0) e plano de implementação

> 08/10/2026 · Resposta ao item 68 da especificação V2. **Nenhum código foi alterado nesta fase.**
> Ordem pedida: entender tudo → banco e backend → wireframes, usabilidade e fluxos → visual e animação ligados ao banco.

---

## Sumário executivo

1. O RU-FOOD já tem **a maior parte do núcleo determinístico** que a especificação pede: previsão, verificador do TR, estoque por lote (FEFO), compras com ordens, produção com baixa, consumo, sobras, IMR, relatórios e auditoria parcial. Ou seja, a IA entra como **camada**, sem reescrever nada.
2. Faltam no núcleo:
   - calendário operacional;
   - barramento de eventos;
   - projeção diária de estoque (físico, reservado, comprometido, em trânsito e projetado);
   - log de decisões;
   - versionamento genérico;
   - classificação de dados;
   - simulação (what-if);
   - otimizador (OR-Tools).
3. **A máquina real difere da especificação**. Isso muda o roteamento de modelos:

   | Item | Especificação | O que existe de fato |
   |---|---|---|
   | Modelos | gemma4:26b, glm-5.3:cloud, deepseek-v4.1-flash:cloud, gemma4:31b-cloud | `qwen3:8b`, `qwen3.5` e `qwen3-vl:4b-instruct` (Ollama 0.35.0) |
   | Máquina | — | Mac M4 com **16 GB de RAM** e 53 GB livres em disco |

   Um modelo de 26B não cabe com folga em 16 GB.
4. **O EmbeddingGemma 2 existe e já está no Ollama.** A variante `embeddinggemma-2:270m` é só texto, tem 378 MB, 768 dimensões e cortes em 512, 256 e 128. Com isso dá para fazer os embeddings **sem instalar PyTorch**, o que simplifica muito o instalador.
5. **O banco ainda não tem histórico operacional**: zero registros de consumo, lotes, fichas e fornecedores. Previsão, otimizador e IA vão começar com **confiança BAIXA**, e o sistema precisa dizer isso com clareza.
6. **O ponto técnico mais arriscado** é o navegador (site em HTTPS na Vercel) conversar com o agente local (localhost). Os navegadores tratam isso de formas diferentes. A Fase 11 começa com um teste prático por navegador antes de construir em cima.
7. **O Ruzinho funciona em dois níveis**:
   - **Sem IA:** responde com dados e regras, com ações rápidas e perguntas prontas.
   - **Com IA local:** responde em linguagem natural, sempre citando as fontes.

   No celular do aluno ele é **sempre determinístico**, porque o agente local fica no computador do restaurante, não no celular de ninguém.

---

## 1. ARCHITECTURE AUDIT

### Stack atual

| Camada | Tecnologia | Observação |
|---|---|---|
| Front-end + servidor | **Next.js 16.4** (App Router, `cacheComponents`, `partialPrefetching`), **React 19.3**, TypeScript 5 | Server Components + Server Actions; `proxy.ts` (antigo middleware) protege `/admin` |
| Estilo | **Tailwind v4** (tokens próprios: cream, ink, ketchup, mustard, leaf…), GSAP 3.15 | Design system próprio, já documentado no código |
| Banco / Auth / Storage | **Supabase** (Postgres 17.11, região São Paulo), `@supabase/ssr` | RLS em todas as tabelas; funções `SECURITY DEFINER` |
| Hospedagem | **Vercel**, região `gru1`, projeto `prev-cardapio` | Deploy pela CLI (sem Git) |
| Anti-robô | **BotID** (Vercel) no `/api/dispositivo` | |
| Exportação | jsPDF, jspdf-autotable, write-excel-file | Gerados no navegador |

### Módulos existentes (31 telas + 4 rotas de API)

| Área | Telas | Lógica |
|---|---|---|
| **App do aluno** (anônimo) | `/hoje`, `/semana`, `/dia/[data]`, `/avaliar`, `/perfil`, `/bem-vindo`, `/entrar` | `store.tsx` (código do aparelho no localStorage) + RPCs anônimas |
| **Totem e TV** | `/totem`, `/tv` | Voto por toque (token com hash) e painel ao vivo |
| **Planejamento** | previsão, cardápios (+ editor da semana), fichas técnicas, regras do contrato, alterações (72 h) | `previsao.ts` (votos + histórico com suavização), `verificador.ts` (**motor de regras do TR já existente**, função pura) |
| **Suprimentos** | compras (plano TR 5.17, ordens, cronograma, recebimento, agricultura familiar), estoque e lotes, fornecedores | `suprimentos.ts` (necessidade = cardápio × previsão × ficha), `erp-dados.ts`, funções FEFO no banco |
| **Produção** | produção diária (ordem + baixa/estorno), consumo e sobras, segurança alimentar | Realtime em `consumo_opcao`, `consumo_real`, `lotes_producao` |
| **Qualidade, contrato e pessoas** | IMR, rotinas, satisfação, documentos, equipe e escala, acessos | `imr.ts`, `rotinas.ts`, `obrigacoes.ts` |
| **Gestão** | painel com proteínas ao vivo + trilha, relatórios (13), busca (⌘K), ilha de serviço, menu Criar | `relatorios-dados.ts`, `/admin/api/busca`, `/admin/api/ilha` |

### Pontos de integração para a camada de inteligência

| Onde | Para quê |
|---|---|
| `src/lib/*.ts` (funções puras) | **Viram as "tools" do copiloto** sem reescrita. Exemplos: `calcularSuprimentos` → `get_purchase_plan`; `verificarSemana` → `validate_contract_compliance`; `calcularPrevisao` → `get_forecast` |
| `/admin/api/busca` | Base da busca tradicional (fallback da busca semântica) |
| Trilha (`getTrilha`) e `getPendencias` | Base do painel de riscos e dos alertas proativos do Ruzinho |
| `anexos` + bucket privado | Ganha classificação; documentos CONFIDENTIAL passam a poder ficar **só no agente local** |
| Server Actions (`acoes*.ts`) | Pontos onde nascem os eventos (`PURCHASE_CREATED`, `STOCK_UPDATED`…) |

### O que **não** existe hoje

- Rotinas agendadas de negócio: só existe um job de limpeza de aparelhos no `pg_cron`.
- Fila de eventos.
- Calendário operacional: a tabela `dias` tem `feriado` como texto, só para outubro de 2026.
- Testes automatizados.
- Repositório Git (a pasta `web` não está versionada).
- Separação entre ambientes de teste e produção no banco.

---

## 2. DATABASE AUDIT

**Banco**: Supabase Postgres 17.11. Há 38 tabelas em `public`, todas com RLS; 43 funções em `public`/`privado`; 1 bucket privado (`anexos`, 10 MB).

| Grupo | Tabelas | Dados hoje |
|---|---|---|
| Aluno (anônimo) | `dispositivos`, `respostas`, `avaliacoes`, `votos_totem`, `totens` | 1 aparelho; 0 respostas |
| Cardápio e contrato | `semanas_cardapio`, `dias` (27, out/2026), `itens` (288), `alteracoes`, `regras_contrato` (37), `versoes_contrato`, `configuracao` | Cardápio de demonstração |
| Fichas | `preparacoes` (152), `fichas_tecnicas` (**0**) | **Sem fichas → sem necessidade de insumos** |
| Suprimentos | `insumos` (16), `fornecedores` (0), `ordens_compra` (0), `pedidos_compra`, `recebimentos`, `lotes` (0), `movimentos_estoque` | Vazio |
| Produção e consumo | `ordens_producao`, `lotes_producao`, `consumo_opcao`, `consumo_real` (**0**) | **Sem histórico** |
| Qualidade e pessoas | `registros_temperatura`, `amostras`, `tarefas_rotina` (18), `execucoes_rotina`, `imr_itens` (70), `imr_avaliacoes`, `funcionarios`, `escala`, `obrigacoes`, `envios_documentos`, `recados` | Catálogos semeados |
| Acesso | `admins` (1, papel **gestor**), papéis: gestor, nutricionista, compras, fiscal | Login funcionando |
| Arquivos | `anexos` | — |

**Extensões disponíveis e não instaladas**: `vector` 0.8.2 (pgvector), `pgmq` 1.5.1 (fila), `pg_net`, `pg_trgm`, `unaccent`. `pg_cron` já está ativo.

**Lacunas de modelagem frente à especificação:**

| Pedido na especificação | Situação | Proposta |
|---|---|---|
| Regras estruturadas (operador, valor, unidade, período, vigência, fonte, página, versão, prioridade) | Parcial: `regras_contrato` tem porção mínima, máximo por mês, cláusula e severidade | Estender com `operador`, `valor`, `unidade`, `periodo`, `fonte_documento`, `pagina`, `prioridade`, `vigente_de/ate`, sem quebrar `verificador.ts` |
| Estoque físico, reservado, disponível, comprometido, em trânsito, projetado, mínimo e segurança | Físico (lotes) e mínimo existem; trânsito é calculado em `suprimentos.ts` | Função `projecao_estoque(horizonte)` com saldo diário por insumo; reservado = ordens de produção emitidas e não baixadas |
| Calendário operacional | Não existe | Tabelas `calendario_eventos` (fonte, origem, confiança, status, impacto) e `calendario_fontes` |
| Eventos (21 tipos) | Não existe | Tabela `eventos` (append-only), gatilhos nas tabelas-chave e `pgmq` para a fila de replanejamento |
| DecisionLog | Parcial: `autor_email` espalhado | Tabela `decisoes` (entradas, regras e versões, previsão, solver, IA, modelo, provedor, usuário) |
| Versionamento | Só contrato e status da semana | Tabela `versoes` genérica (entidade, id, revisão, instantâneo jsonb, autor, motivo) |
| Classificação PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED | Não existe | Enum `classificacao_dado` em `anexos` e na nova tabela `documentos` |
| Documentos (dono, versão, vigência, origem, hash, status) | `anexos` não tem hash nem versão | Tabela `documentos` + `documento_versoes`; conteúdo CONFIDENTIAL **não sobe para a nuvem**, só o registro (id, hash, classificação, estado) |
| Cenários (what-if) | Não existe | Tabelas `cenarios` + `cenario_resultados` que **nunca** tocam as tabelas reais |
| Agente local e pareamento | Não existe | Tabelas `agentes_locais` (identidade, chave pública, último sinal, revogado) e `pareamentos` (código temporário com hash e expiração) |
| Configuração de IA | Não existe | Tabela `config_ia`: `ai_disabled`, `allow_external_ai=false`, `telemetry_enabled=false`, política por classificação |

---

## 3. SECURITY AUDIT

**O que está bom**
- RLS em 100% das tabelas, com papéis checados no banco (`is_membro`, `is_admin`, `is_gestor`).
- Funções com `search_path` fixo.
- Aluno 100% anônimo: o app guarda só um código de aparelho e não tem campo de texto livre.
- Storage privado com links assinados.
- Cabeçalhos HSTS, nosniff e Permissions-Policy na Vercel.
- BotID no app do aluno.

**Avisos do linter do Supabase (todos conhecidos)**

| Aviso | Avaliação |
|---|---|
| 15 funções `SECURITY DEFINER` executáveis por `anon` | **Intencional**: é o app anônimo do aluno. Revisar a cada nova função |
| 31 funções executáveis por `authenticated` | Intencional: conferem o papel por dentro |
| 4 tabelas com RLS e sem política | Intencional: acesso só por funções |
| Proteção contra senhas vazadas desligada | **Ação sua**: ligar no painel do Supabase → Auth |

**Riscos que a camada de IA cria (e como serão tratados)**

| Risco | Tratamento |
|---|---|
| Copiloto ler dados que o usuário não pode ver | Toda tool roda **com a sessão do usuário** (RLS do Supabase). O agente local nunca usa a chave `service_role` |
| Prompt injection vindo do TR ou de anexos | Documento é dado: vai em bloco marcado como não confiável. Tools de escrita só **simulam**, e a gravação exige um clique humano na interface, nunca do modelo |
| Vazamento de documento CONFIDENTIAL | Política por classificação aplicada no **agente** e no **servidor**. Provedor externo bloqueado por padrão. Teste automático de "nenhuma chamada externa" |
| Agente local exposto na rede | Escuta só em `127.0.0.1`, exige token de sessão, CORS restrito à origem do RU-FOOD, pareamento revogável |
| Segredos no front-end | Proibido. A chave do agente fica no chaveiro do sistema (macOS Keychain / Windows Credential Manager) |

---

## 4. AI READINESS AUDIT

### Máquina de desenvolvimento (detectada, não assumida)

| Item | Valor |
|---|---|
| CPU/GPU | Apple M4, 10 núcleos (GPU integrada, Metal) |
| RAM | **16 GB** |
| Disco livre | 53 GB |
| Ollama | 0.35.0, ativo em `127.0.0.1:11434` |
| Modelos locais | `qwen3:8b` (5,2 GB), `qwen3.5:latest` (6,6 GB), `qwen3-vl:4b-instruct` (3,3 GB) |
| Modelos `:cloud` | **Nenhum instalado** (e, como manda a especificação, não contariam como locais) |
| Python | 3.14.7 (Homebrew), **sem** torch, sentence-transformers e OR-Tools |

### Roteamento proposto (ModelRouter, com detecção automática)

| Rota | Nesta máquina | Por quê |
|---|---|---|
| `LOCAL_GENERAL` | `qwen3.5` | O `gemma4:26b` precisa de cerca de 17 GB ou mais e não roda bem com 16 GB. O roteador lê a RAM e escolhe o maior modelo que cabe com folga |
| `LOCAL_FAST` | `qwen3:8b` | Classificação, extração e respostas curtas |
| `LOCAL_VISION` | `qwen3-vl:4b-instruct` | Leitura de notas fiscais e fotos (fase futura) |
| `LOCAL_EMBED` | `embeddinggemma-2:270m` (a instalar, 378 MB) | Só texto, como pede a especificação |
| `CLOUD_FALLBACK` | **desligado** | Só com `allow_external_ai=true`, e nunca para CONFIDENTIAL ou RESTRICTED |

O roteador também pergunta ao Ollama se o modelo **suporta ferramentas** (`/api/show` → `capabilities`) antes de usá-lo como copiloto. Cada resposta registra o modelo e o provedor que a executaram.

### EmbeddingGemma 2 (verificado no cartão oficial)

| Item | Valor |
|---|---|
| Configuração só texto | 270M parâmetros |
| Dimensões | 768 nativas, com corte Matryoshka para 512, 256 e 128 (re-normalizar depois do corte) |
| Contexto | 8.192 tokens |
| Prefixos | Busca: `task: search result \| query: …`. Documento: `title: … \| text: …` (`title: none` sem título) |
| Precisão | bfloat16 ou float32; **nunca float16** (gera NaN ou degrada em silêncio) |
| Licença | Apache 2.0 |

**Decisão proposta**:
- **Caminho principal:** usar o Ollama, que já está instalado, e não exige Python nem PyTorch.
- **Caminho alternativo:** `sentence-transformers`, só se o Ollama não suportar a variante. Verificar no teste de instalação se a precisão do pacote do Ollama segue a regra de não usar float16.
- **Índice:** começar em 768 dimensões, uma dimensão por índice e sem misturar.

### Prontidão por componente

| Componente | Prontidão | Comentário |
|---|---|---|
| Regras (motor determinístico) | 🟢 Alta | `verificador.ts` já é puro e testável. Falta estruturar operador, valor e vigência |
| Previsão | 🟡 Média | O algoritmo existe (votos + histórico). Faltam média móvel, dia da semana, feriados, eventos e **histórico real** |
| Estoque e compras | 🟡 Média | Falta a projeção diária e a separação reservado/comprometido |
| Otimização (OR-Tools) | 🔴 Baixa | Não existe. Também exige Python |
| RAG | 🔴 Baixa | Não existe. Não há documentos indexados |
| Copiloto | 🔴 Baixa | Não existe. As tools virão das funções de `lib/` |
| Dados para treinar ou validar | 🔴 Baixa | Banco vazio: precisa de 4 a 8 semanas de operação real para a confiança subir |

---

## 5. DEPLOYMENT AUDIT

| Item | Situação | Recomendação |
|---|---|---|
| Vercel | Produção em `prev-cardapio.vercel.app`, região `gru1`, Node (Fluid Compute) | Manter. **Não** hospedar Ollama |
| Python na Vercel | Suportado (3.12+) | Rodar o OR-Tools como função Python **na nuvem**, porque otimizar não é IA e precisa funcionar sem o agente. O mesmo código vai no agente para uso offline |
| Banco | Um único projeto Supabase (produção = testes) | Criar um *branch* de desenvolvimento antes das migrações grandes |
| Versionamento | **Sem Git** | Iniciar o repositório antes da Fase 1. É o que torna tudo "reversível", como pede a especificação |
| Tarefas longas | Não há worker | Reindexação e OCR rodam **no agente local**; replanejamento na nuvem via `pg_cron` + `pgmq` + rota de API |
| Agente local | Não existe | Serviço Python (FastAPI) com `uv` e Python próprio isolado (não depende do 3.14 do sistema); depois empacotado como `.dmg` e `.exe` |

---

## 6. MIGRATION PLAN (banco, aditivo e reversível)

Todas as migrações **só adicionam**: nenhuma coluna é removida e nenhum dado é reescrito. Cada uma terá um par de "desfazer".

| # | Migração | Conteúdo |
|---|---|---|
| M1 | `classificacao_e_config_ia` | Enum `classificacao_dado`; tabela `config_ia` (`ai_disabled`, `allow_external_ai=false`, `telemetry_enabled=false`); coluna `classificacao` em `anexos` (padrão INTERNAL) |
| M2 | `calendario_operacional` | `calendario_eventos` (tipo: feriado, universidade, cidade, restaurante, fornecedor, manutenção, entrega, produção; `fecha_restaurante`, `fator_demanda`, fonte, origem, confiança, status); feriados nacionais e de MS calculados (inclusive os móveis, pela Páscoa); Dourados cadastrado manualmente; migração de `dias.feriado` |
| M3 | `eventos_e_fila` | `eventos` (tipo, entidade, payload, autor, criado_em; somente inserção), gatilhos nas tabelas-chave, `pgmq` com a fila `replanejar` |
| M4 | `projecao_estoque` | Função `projecao_estoque(p_horizonte)` → saldo diário por insumo com físico, reservado, comprometido, em trânsito, projetado, mínimo e segurança |
| M5 | `regras_estruturadas` | Novas colunas em `regras_contrato` (operador, valor, unidade, período, fonte, página, prioridade, vigência) com valores derivados dos atuais |
| M6 | `decisoes_e_versoes` | Tabelas `decisoes` (DecisionLog) e `versoes` (instantâneos) |
| M7 | `cenarios` | Tabelas `cenarios` e `cenario_resultados` (what-if isolado) |
| M8 | `documentos` | `documentos`, `documento_versoes` (hash SHA-256, vigência, origem, armazenamento `nuvem` ou `local`, status) |
| M9 | `agentes_locais` | Tabelas `agentes_locais` e `pareamentos`; funções `gerar_codigo_pareamento`, `confirmar_pareamento`, `revogar_agente`, `sinal_agente` (heartbeat) |
| M10 | `vector` (opcional) | `pgvector` **apenas** para documentos PUBLIC/INTERNAL que o cliente aceitar indexar na nuvem. Documentos confidenciais ficam no índice local do agente (LanceDB ou sqlite-vec) |

---

## 7. RISK REGISTER

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | O navegador bloquear o acesso do site (HTTPS) ao agente (localhost): permissão de rede local do Chrome, regras de conteúdo misto do Safari | Alta | Alto | Teste prático por navegador na Fase 11. Alternativas: agente com janela própria; ou mensagens via Supabase **só para dados não confidenciais** |
| R2 | Sem histórico, previsão e otimizador entregam pouco valor no começo | Certa | Médio | Confiança calculada (BAIXA) bem visível; previsão cai para regras simples; tela para importar histórico de planilha |
| R3 | 16 GB de RAM limitam o modelo geral; respostas lentas | Média | Médio | Roteador por hardware, respostas curtas, tools fazem as contas (o modelo só redige) |
| R4 | O modelo inventar números | Média | Alto | Toda cifra vem de tool; a interface mostra a fonte de cada número; sem evidência, a resposta é "Não foi encontrada evidência suficiente" |
| R5 | Escopo enorme sem Git | Alta | Alto | Iniciar Git e um branch do banco antes da Fase 1 |
| R6 | Extensão de regras quebrar o editor de cardápio | Baixa | Alto | Colunas novas são opcionais; `verificador.ts` com testes antes da mudança |
| R7 | O Ruzinho animado pesar no celular (laço de animação contínuo) | Média | Médio | Pausar quando a aba ou o elemento estiver fora de vista; respeitar "reduzir movimento"; no toque, olhar para o último toque |
| R8 | Ruzinho e IA com "cara de IA" genérica | Média | Médio | Sem brilhos ✨, gradiente roxo nem arco-íris; cartões factuais com fonte; cores da marca; varredura do glimm (se usada) nas cores ketchup → mostarda → folha |
| R9 | Instalador mexer no sistema do cliente sem clareza | Baixa | Alto | Cada passo pede confirmação; relatório final; idempotente (reparar, atualizar, desinstalar) |
| R10 | Dados de aluno chegarem à IA | Baixa | Alto | Não há dado pessoal de aluno; as tools só leem agregados |

---

## 8. Análise das referências (o que cada uma traz)

| Referência | O que aproveitar no RU-FOOD |
|---|---|
| **Grocery app (tazabazar)** | Lista de favoritos para recompra → **listas recorrentes de compra** (kits de insumos por semana-tipo); chips de categoria com contagem; seletor de quantidade +/−; telas anotadas |
| **Online school** | Comparação lado a lado com a **opção recomendada invertida em fundo escuro** → comparação de **cenários what-if** e alternativas de cardápio; pílulas pequenas de metadados; títulos editoriais curtos |
| **Eventure** | Listagem com **filtros na coluna lateral** (data, categoria) e seções por categoria com "ver todos" → **calendário operacional** em lista e agenda |
| **AI Plant Health** | O padrão do **assistente com mascote**: estado vazio com saudação + **ações rápidas** (grade 2×2) + **perguntas populares**, depois conversa com sugestões. **Lembretes** com faixa horizontal de datas e checklist; cartão de item com problema em fundo tingido |
| **Fiton** | **Plano por dia** com foto de destaque, linha de números (kcal, proteína, carboidrato) e lista de refeições → dia do aluno e ficha técnica com valores nutricionais; detalhe com lista de ingredientes |
| **AI Customer Support (human-in-the-loop)** | O mais importante para a IA: **cartão de decisão** (valor em destaque, motivo, evidência, *Aprovar / Editar / Recusar*); recusa e edição em gaveta com **chips de motivo**; **linha do tempo de atividade com % de confiança**; "regras que mantêm você no controle" |
| **Food delivery (Foodio)** | Fluxos de usuário com losangos de decisão (modelo para os fluxos deste documento); vermelho na marca e verde nas ações (bate com o nosso); resumo fixo no rodapé; abas por categoria com grade de 2 colunas |
| **bencho · Command bar** | Botão que **se funde** num campo "Pergunte…" com ícone de voz → abertura do Ruzinho |
| **bencho · Checklist** | Caixa se preenche, o tique se desenha e o texto é riscado → rotinas, conferência de recebimento e pendências do assistente |
| **bencho · Slide to confirm / Inline confirm** (vistos no catálogo) | Confirmação humana de **ações críticas** sugeridas pela IA, como aplicar um plano de compras |
| **Prompt bar (código colado)** | `@` para escolher a fonte (Estoque, Compras, Cardápio, TR, Calendário, Documentos); `/` para comandos (`/comprar`, `/simular-atraso`, `/regra`, `/amanha`, `/resumo`); seletor de **modelo** → seletor de **modo** (Somente dados · IA local); anexar → só documentos locais |

---

## 9. Ruzinho (o assistente)

**Origem**: `ruzinho_eye_tracker.tsx`. É um personagem SVG (quadrado arredondado vermelho com uma mordida), com olhos que seguem o cursor por uma física de mola e piscam. Tem trava para os olhos não invadirem a mordida.

**Adaptação técnica**
- Converter para TypeScript e remover o painel de demonstração, o anel de proximidade e os emojis.
- Usar as cores dos tokens (`--ketchup`).
- Pausar a animação com a aba oculta, fora de vista ou com "reduzir movimento" ligado.
- No toque, sem cursor, olhar para o último toque; no restante do tempo, fazer a varredura calma.

**Estados**

| Estado | Visual |
|---|---|
| Observando | Varredura lenta |
| Desperto | Segue o cursor |
| Pensando | Olhos fazem uma varredura rápida |
| Alerta | Um ponto mostarda indica pendência crítica |
| IA local indisponível | Olhos semicerrados e o rótulo "Somente dados" |

**Posição**

| Onde | Posição |
|---|---|
| Computador | Canto inferior direito, 56 px |
| Celular | 48 px, acima da barra de abas, sem cobrir o botão "Criar" |

**Abertura**: o Ruzinho se funde na barra de comando, e a barra se expande para o painel.

| Onde | Painel |
|---|---|
| Computador | Painel lateral de 420 px |
| Celular | Gaveta de baixo para cima em tela cheia |

**Dois níveis**

| Nível | O que faz |
|---|---|
| Somente dados (sempre) | Ações rápidas e perguntas prontas respondidas pelas funções do sistema: "O que comprar esta semana?", "O que vence em 7 dias?", "O cardápio de amanhã cumpre o TR?", "Quais entregas estão atrasadas?" Também abre telas, preenche formulários e simula, sempre com confirmação |
| IA local (quando pareada) | Texto livre, `@` e `/`, RAG nos documentos locais, explicações com fontes (dados, regras, premissas, cálculos) e confiança calculada pelo sistema, nunca pelo modelo |

**No app do aluno** (decisão a confirmar): uma versão menor do Ruzinho, só determinística. Responde ao cardápio do dia, à legenda de alergênicos, a horários e ao prazo de escolha. Não guarda nada e mantém o aluno anônimo.

---

## 10. Fluxos de usuário principais (base dos wireframes)

```
F1 · Pergunta ao Ruzinho (gestão)
Toca no Ruzinho → barra de comando → escolhe ação rápida OU digita
  ├─ IA local pareada? ── não → resposta determinística (cartões com fonte)
  └─ sim → a IA chama tools com a sessão do usuário → resposta com fontes + confiança
        └─ sugere ação? → cartão de decisão → [Simular] → [Aplicar] (deslizar para confirmar) → DecisionLog

F2 · Atraso de fornecedor (replanejamento)
Recebimento marca "atrasou" OU gestor registra → evento DELIVERY_DELAYED
  → recalcula projeção → identifica dias e cardápios afetados → verifica TR
  → gera alternativas (troca de proteína, compra emergencial, outro fornecedor)
  → alerta na ilha + Ruzinho com ponto mostarda → gestor compara cenários → aprova → registro

F3 · Feriado no calendário
Calendário → novo evento "restaurante fechado" → prévia do impacto (demanda 0, produção 0, compras −X kg)
  → confirmar → evento CALENDAR_EVENT_CREATED → previsão e compras recalculadas → trilha atualizada

F4 · What-if
Simulações → escolher modelo (atraso N dias · demanda +X% · trocar proteína · fechar restaurante)
  → parâmetros → resultado lado a lado (atual × cenário, recomendado em fundo escuro) → salvar cenário (nunca altera dados reais)

F5 · Parear IA local
Configurações → IA local → "Gerar código" (6 dígitos, 10 min) → no agente: inserir código
  → servidor confirma → status "IA LOCAL ● Conectada · Processamento confidencial ● Local" → revogar a qualquer momento

F6 · Documento confidencial (TR)
Documentos → importar → classificar (CONFIDENTIAL) → enviado só ao agente local → hash → já existe? pula : versão nova
  → extração → trechos → embeddings locais → pronto para RAG; na nuvem fica só id, hash, classificação e estado
```

---

## 11. Wireframes de baixa fidelidade (telas novas)

```
Painel do Ruzinho (computador, lateral 420 px)
┌──────────────────────────────────────┐
│ ◉ Ruzinho      IA LOCAL ● Conectada ✕│
│ Processamento confidencial ● Local    │
├──────────────────────────────────────┤
│ Boa tarde! Posso ajudar com:          │
│ ┌────────────┐ ┌────────────┐         │
│ │ O que      │ │ Riscos da  │  ações  │
│ │ comprar    │ │ semana     │  rápidas│
│ ├────────────┤ ├────────────┤         │
│ │ Cardápio   │ │ Simular    │         │
│ │ de amanhã  │ │ atraso     │         │
│ └────────────┘ └────────────┘         │
│ Perguntas frequentes                  │
│  › Por que preciso comprar arroz?     │
│  › Qual regra do TR se aplica a…      │
│ ─ conversa ─                          │
│ ┌ Cartão de decisão ────────────────┐ │
│ │ Comprar 180 kg de frango até 14/10│ │
│ │ Motivo · Fontes (3) · Confiança MÉDIA│
│ │ [Ver cálculo] [Simular] [Aplicar →]│ │
│ └───────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ＋  Pergunte ou use @ e /    Modo ▾ ⬆ │
└──────────────────────────────────────┘

Calendário operacional
┌ Filtros ─────────┐┌ Outubro 2026          [Mês|Semana|Lista] ┐
│ Tipo             ││ Seg Ter Qua Qui Sex Sáb                   │
│ ☑ Feriados       ││  ·   ·  ▣feriado  ·  ▲entrega  ·          │
│ ☑ Universidade   ││ … cada dia mostra: público previsto,      │
│ ☑ Fornecedores   ││   eventos e impacto (−100% / +15%)        │
│ ☐ Manutenção     │└───────────────────────────────────────────┘
│ Fonte · Confiança│ Próximos com impacto → ver todos
└──────────────────┘

Riscos e replanejamento (painel)
┌ Ruptura ┐┌ Excesso ┐┌ Atrasos ┐┌ Aderência TR ┐   ← indicadores
Lista: [frango · falta 12/10 · causa: entrega atrasada] → abrir alternativas
Alternativas (lado a lado): Atual | Trocar p/ suíno | Compra emergencial ▓recomendada▓

Simulações (what-if)
[Atraso] [Demanda] [Troca de proteína] [Fechamento]  → parâmetros → Atual × Cenário
"Simulação: nada foi alterado."  [Salvar cenário] [Descartar]

IA local (configurações)
Status: Ollama ✓ · LLM ✓ · Embedding ✓ · Índice ✓ · RAG ✓ · Web ✓ · Banco ✓ · Sync ✓
Modelos detectados: qwen3.5 (geral) · qwen3:8b (rápido) · qwen3-vl:4b (visão) · embeddinggemma-2:270m
[Gerar código de pareamento]   Agentes pareados: MacBook RU · último sinal 2 min · [Revogar]
Política: Provedor externo ○ Desligado (padrão) · Telemetria ○ Desligada
```

---

## 12. IMPLEMENTATION PLAN (fases, com entregáveis verificáveis)

> Uma regra vale para todas as fases: **o sistema sem IA continua 100% funcional**. Cada fase termina com tsc, lint, build, revisão visual em 375/768/1280/1440 e deploy.

| Fase | Entrega | Visível ao usuário |
|---|---|---|
| **0 · Preparação** | Git; branch do banco; testes unitários das funções puras (`verificador`, `previsao`, `suprimentos`) | — |
| **1 · Modelo de dados** | Migrações M1, M5, M6 e M8 | Classificação nos anexos |
| **2 · Estoque projetado** | M4 + aba "Projeção" no estoque (gráfico diário por insumo: físico, reservado, em trânsito, projetado, mínimo) | Sim |
| **3 · Compras inteligentes** | Plano considera atrasos, lote mínimo, embalagem e calendário; urgência e risco; **listas recorrentes** | Sim |
| **4 · Calendário** | M2 + tela de calendário (mês, semana, lista) + impacto na previsão | Sim |
| **5 · Eventos** | M3 + linha do tempo de eventos + alertas na ilha | Sim |
| **6 · Motor de regras** | Regras estruturadas + verificador estendido + tela de regras com fonte e página | Sim |
| **7 · Previsão** | Média móvel, ponderada, dia da semana, feriados e eventos; confiança calculada | Sim |
| **8 · OR-Tools** | Função Python na Vercel: compras mínimas e cardápio alternativo que cumpre o TR | Sim |
| **9 · Ruzinho (somente dados)** | Componente, barra de comando, painel, ações rápidas, cartões de decisão, deslizar para confirmar. **Funciona sem IA** | Sim |
| **10 · Agente local (base)** | Serviço Python com `/health`, `/status`, `/models` e `/embed`; ModelRouter; teste de comunicação navegador ↔ localhost (R1) | Status da IA |
| **11 · Pareamento** | M9 + fluxo F5 + heartbeat + revogação | Sim |
| **12 · RAG local** | Documentos (F6), índice local, `/search` e `/rag` com citação de documento, versão, página e trecho | Sim |
| **13 · Copiloto** | `/chat` com tool calling (12 tools); a IA herda o RBAC; tools de escrita só simulam | Sim |
| **14 · What-if** | M7 + tela de simulações (F4) | Sim |
| **15 · Painel inteligente** | Riscos, rupturas, excesso, atrasos, aderência ao TR, custo, desperdício | Sim |
| **16 · Instalador** | Script idempotente (detectar → instalar → testar → relatório; reparar, atualizar, desinstalar, reindexar, diagnosticar) | Sim |
| **17 · Sincronização e hardening** | Fila offline do agente, resolução de conflitos, testes de privacidade, sem internet, sem IA e segurança (itens 59–66) | — |
| **18 · Deploy** | Produção + documentação + LGPD atualizada | — |

**Ordem visual dentro de cada fase** (como você pediu): banco e backend → fluxo e wireframe → interface com animação → ligação ao banco → verificação.

---

## Fontes externas verificadas

- [google/embeddinggemma-2 — Hugging Face](https://huggingface.co/google/embeddinggemma-2)
- [embeddinggemma-2:270m — Ollama](https://ollama.com/library/embeddinggemma-2:270m)
- [glimm 0.3.1 — npm](https://www.npmjs.com/package/glimm) (MIT)
- Referências de design: os 7 projetos do Behance e os blocos Command bar e Checklist do bencho.dev indicados por você.

---

## Situação da implementação (08/10/2026)

Tudo gratuito: nenhum serviço pago, branch ou API paga. Migrações aditivas, cada uma com o SQL de desfazer em `web/supabase/desfazer/`. Código versionado em Git local (tag `base-antes-intelligence`).

| Fase | Situação | O que entrou |
|---|---|---|
| 0 · Preparação | ✅ | Git; 70 testes automáticos (vitest) das funções puras |
| 1 · Modelo de dados | ✅ | Classificação PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED com política configurável (`config_ia`); anexos classificados; registro de documentos com hash e versão; regras estruturadas (69 restrições); DecisionLog (`decisoes`) e versionamento automático (`versoes`) |
| 2 · Estoque projetado | ✅ | Projeção diária: físico, reservado, comprometido, em trânsito, disponível, projetado, segurança de 14 dias, lotes FEFO e perda por validade. Aba "Projeção" com explicação do cálculo |
| 3 · Compras inteligentes | ✅ | Sugestões com quantidade (embalagem e pedido mínimo), data ideal pelo prazo e pelos dias de entrega do fornecedor, urgência, risco e confiança calculada. A ordem criada a partir da sugestão vai para o DecisionLog; dispensar exige motivo. *Listas recorrentes de compra ficaram para uma próxima rodada.* |
| 4 · Calendário | ✅ | Feriados 2026–2027 (nacionais, MS e Dourados, com os móveis pela Páscoa). Eventos com fonte, confiança e status; regra conservadora (reduzir ou fechar só se confirmado). Previsão, compras e projeção recalculadas |
| 5 · Eventos | ✅ | 21 tipos de evento gerados por gatilho no banco; atrasos detectados pelo `pg_cron` diário; tela "Atividade" ao vivo, com insumos em risco |
| 6 · Motor de regras | ✅ | O verificador lê as restrições do banco (frequência, folhosos, legumes, feijão diário) e a vigência; cada achado aponta a regra de origem. Tela de regras com fonte, página, prioridade e vigência |
| 7 · Previsão | ✅ | Média ponderada por dia da semana e serviço; proporção das opções pelo consumo real; confiança calculada; método mostrado na tela |
| 8 · OR-Tools | ✅ | Função Python na Vercel (`/api/otimizar_cardapio`, CP-SAT 9.15, cerca de 100 ms) com plano de reserva heurístico usando as mesmas regras. Alternativas de cardápio no editor da semana, aplicadas só com confirmação e registradas no DecisionLog |
| 9 · Ruzinho (somente dados) | ✅ | Painel com Ctrl+J, `/comandos` e `@insumos`, respostas com fonte e confiança, sem IA. No app do aluno: só perguntas prontas, sem texto livre |
| 10–13 · IA local | ⏳ próxima etapa | Agente Python + Ollama, pareamento, RAG local com EmbeddingGemma 2 e copiloto com ferramentas |
| 14–18 | ⏳ | What-if, painel inteligente, instalador, sincronização, hardening |

**Decisões tomadas durante a implementação**
- A projeção de estoque ficou em TypeScript puro (testável e reaproveitada pelas telas e pelo Ruzinho), não numa função SQL.
- O otimizador resolve **cardápios alternativos**. Comprar com um único fornecedor por insumo não precisa de solver; a regra de compra já é exata.
- O Ruzinho do aluno fica na barra inferior do celular, para não cobrir as escolhas dos cartões.
- O glimm (varredura em arco-íris) não foi usado: daria "cara de IA" e repetiria o problema de WebGL que já levou a deixar as animações estáticas.
- O ditado por voz não foi incluído: no Chrome, o reconhecimento de fala envia o áudio para servidores externos.

## Distribuição: web, PWA e desktop (8/10/2026)

| Versão | Como acessa | IA | Dados |
|---|---|---|---|
| Web | https://rufood.vercel.app | Não. A Estagiária usa só dados e respostas prontas | Supabase (nuvem), sincronizado em tempo real |
| PWA | "Instalar app" no navegador: `/manifest.webmanifest` (aluno) e `/gestao.webmanifest` (painel) | Não | Igual à web; `public/sw.js` guarda só arquivos estáticos e a página `/offline` |
| Desktop (Windows) | `public/download/RU-FOOD-Instalador.exe` → atalho "RU-FOOD Gestão" (Edge em modo app, perfil próprio) | Sim, local (Ollama) | O mesmo Supabase; ficam só no PC o índice de documentos, o token e o registro da IA |

- **Agente local** (`agente-local/agente.py`): só a stdlib, com pypdf via PEP 723. Escuta em 127.0.0.1:8787, usa token Bearer e CORS restrito ao site, e responde Private Network Access.
  - Rotas: `/health`, `/status`, `/models`, `/diagnostico`, `/embed`, `/documentos`, `/search`, `/rag` e `/chat` (classificar ou explicar).
  - ModelRouter por memória e capacidades, ignorando apelidos internos `llamacpp:<hash>` do Ollama 0.40 ou mais novo.
  - Embedding: **EmbeddingGemma 2** (`embeddinggemma-2:270m`, 768 dimensões; exige Ollama ≥ 0.40). Limiar de evidência de 0,65, calibrado: perguntas relevantes ≥ 0,69 e sem relação ≤ 0,60.
  - Reindexação automática quando o modelo de embedding muda.
- **Pareamento:** o atalho abre `/admin?desktop=1#pareamento=<token>`. O painel guarda o token no `localStorage` daquele perfil e limpa a URL (`src/lib/agente-local.ts`).
- **Estagiária desktop:**
  - A resposta determinística vem sempre primeiro, e a IA só explica embaixo, rotulada "gerado no seu computador · modelo".
  - Pedidos que o roteador não entende são classificados pela IA local e voltam ao cálculo determinístico. Se forem sobre documentos, vão para o RAG ("Não foi encontrada evidência suficiente." quando não houver trecho).
- **Instalador** (`instalador/`), NSIS por usuário, sem pedir administrador:
  - Licença = Termos (`scripts/gerar-termos.ts`).
  - `instalar.ps1` verifica o Ollama e o instala sem perguntar se faltar; se for antigo demais para o EmbeddingGemma 2, atualiza sem perguntar.
  - Também baixa o uv e o Python 3.12, os modelos e o token, cria a inicialização automática e gera `diagnostico.txt`.
  - O desinstalador mantém o Ollama e os modelos.
  - **Compilado no Mac com makensis, sem teste em Windows.**
- **Termos** (`src/lib/termos.ts` → `/termos` e `instalador/TERMOS.txt`): os dados compartilhados vão para o Supabase e a Vercel e não ficam locais. A seção 7 descreve a instalação automática.
- **Login do painel:** abas "Entrar" e "Primeiro acesso" (código de 6 dígitos + criação de senha). O código só é enviado a e-mails liberados (`email_autorizado`).
- **E-mails do Supabase:**
  - `src/lib/emails.ts` → `supabase/templates/*.html`, com prévias em `supabase/templates/previa/`.
  - Colar em Authentication → Emails → Templates.
