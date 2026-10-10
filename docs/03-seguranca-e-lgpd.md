# Prev Cardápio — Segurança da informação e LGPD

> Documento de referência sobre quais dados o sistema trata, para quê, onde ficam, quem acessa, por quanto tempo e o que é ou não permitido.
> Versão 3 · 08/10/2026 (módulos de gestão, perfis de acesso, fornecedores e equipe) · Revisar sempre que o sistema ou o contrato mudar.
> **Não substitui parecer jurídico.** Os pontos marcados com ⚠️ dependem de decisão da empresa ou da UFGD.

---

## 1. Resumo em uma página

| Pergunta | Resposta |
|---|---|
| O app do aluno coleta dados pessoais? | **Não de forma direta.** Não há cadastro, login, nome, matrícula, CPF, e-mail, telefone, foto ou localização. |
| O que é guardado sobre o aluno? | Um **código aleatório do aparelho** (UUID), as **escolhas de prato** por refeição, a **preferência padrão** e as **notas de satisfação** (😞 😐 😋 + marcadores fixos). Votos no **totem** não têm nenhum identificador de pessoa. |
| Dá para saber quem é o aluno? | Não pelo sistema: o código não tem vínculo com identidade. A cozinha vê apenas **totais agregados**. |
| Restrições alimentares (alergias) | **Não são coletadas.** Os alergênicos são cadastrados pela nutricionista nas fichas técnicas e exibidos como selos nos pratos. |
| Dados pessoais que o sistema trata | Apenas os **e-mails dos administradores** (funcionários da empresa) para login no painel. |
| Onde ficam os dados | Banco Supabase em **São Paulo (sa-east-1)**; aplicação na Vercel com funções em **São Paulo (gru1)**. |
| Por quanto tempo | Códigos de aparelho sem uso por **180 dias** são apagados automaticamente, com tudo o que está ligado a eles. |
| O aluno pode apagar? | Sim: **Ajustes → Apagar meus dados deste celular** remove o código, as escolhas e as avaliações na hora. |

---

## 2. Inventário de dados

### 2.1 App do aluno (anônimo)

| Dado | Exemplo | Onde fica | Finalidade | Quem vê |
|---|---|---|---|---|
| Código do aparelho | `3f2a…-…` (aleatório) | Celular (localStorage) e tabela `dispositivos` | Evitar resposta duplicada; lembrar as escolhas | Ninguém individualmente (acesso só por função do banco) |
| Preferência padrão | "vegana" | `dispositivos.preferencia` | Preencher dias sem escolha | Só totais no painel |
| Escolha de prato | 13/10, almoço, "frango" | `respostas` | **Previsão de consumo de proteínas** | Só totais no painel |
| Avaliação | nota 3 + "sabor" | `avaliacoes` | Qualidade (IMR 51–60) | Só totais no painel (administradores) |
| Datas de uso | criado/visto em | `dispositivos` | Retenção e contagem de aparelhos ativos | Só totais |
| Voto no totem | 13/10, almoço, "vegana" | `votos_totem` (só o totem, a data e a escolha) | Previsão de consumo | Só totais no painel |

**Não existe texto livre** em nenhum formulário do aluno, para que ninguém digite dado pessoal por engano.

### 2.2 Painel de gestão

| Dado | Onde fica | Finalidade | Base legal (LGPD art. 7º) |
|---|---|---|---|
| E-mail e senha dos administradores | Supabase Auth (senha com hash, nunca em texto) | Login no painel | Execução de contrato / legítimo interesse (V, IX) |
| E-mail do autor de pedidos de alteração | `alteracoes.autor_email` | Rastreabilidade perante a fiscalização | Cumprimento de obrigação contratual (V) |
| Cardápios, fichas técnicas, regras, estoque, compras | Banco | Operação do contrato | Não são dados pessoais |
| Funcionários: nome, função, CRN, data de admissão; escala por turno | `funcionarios`, `escala` | Escala e comprovação de nutricionista em todo o horário (IMR 45–47) | Execução de contrato e obrigação legal (V, II) |
| Fornecedores: nome, CNPJ ou CAF, contato comercial, grupo prioritário (TR 5.26) | `fornecedores` | Compras e comprovação dos 30% da agricultura familiar | Execução de contrato (V). Para agricultor pessoa física, preferir o número do CAF ao CPF ⚠️ |
| Responsável por registros (e-mail do administrador) | Recebimentos, temperaturas, rotinas, envios, movimentações de estoque e ordens de compra | Rastreabilidade para a fiscalização | Obrigação contratual (V) |
| Fornecedores (cadastro completo): razão social, CNPJ/CPF/CAF, inscrição estadual, contato, e-mail, telefone e endereço comercial | `fornecedores` | Ordens de compra, entregas e desempenho | Execução de contrato (V). Para produtor pessoa física, guardar só o necessário e preferir o CAF ⚠️ |
| Anexos (fotos de insumos, fichas técnicas, documentos de fornecedores, notas fiscais) | Supabase Storage, bucket **privado** `anexos` (até 10 MB por arquivo), acessado só por link assinado temporário | Comprovação e consulta pela equipe | Execução de contrato (V). Não anexar documentos pessoais de funcionários ou alunos ⚠️ |

### 2.3 Registros técnicos dos provedores

Vercel e Supabase mantêm, por segurança e diagnóstico, **logs técnicos de acesso** que incluem endereço IP e horário. Esses registros ficam com os provedores pelo prazo do plano contratado (em geral, de 1 a 7 dias nos planos atuais). O sistema não grava IP nas tabelas e não cruza IP com escolhas. ⚠️ Confirmar os prazos nos contratos dos provedores.

---

## 3. Para onde os dados vão (fluxos)

```
Celular do aluno
  ├─ localStorage: código do aparelho
  └─ HTTPS ──► Vercel (São Paulo)
                 ├─ /api/dispositivo: checagem de robô (BotID) + chave do servidor ──► Supabase
                 └─ Página do app ──► Supabase (São Paulo), sempre por funções do banco:
                         criar_dispositivo · sincronizar_dispositivo · registrar_resposta
                         definir_preferencia · avaliar_refeicao · apagar_dispositivo

Totem (tablet) ──HTTPS──► Supabase: totem_info · votar_totem (código do totem guardado só como hash;
                            mínimo de 2 s entre toques e no máximo 40 por minuto)

Painel (administradores) ──HTTPS──► Vercel (São Paulo) ──► Supabase (São Paulo)
                                     login por e-mail e senha; permissões checadas no banco (RLS)

Supabase ──► somente totais agregados (previsao, resumo_comensais, resumo_satisfacao) ──► Painel
```

**Consultas públicas no cadastro de fornecedores:** ao clicar em **Consultar** (CNPJ) ou ao digitar o CEP, o navegador do administrador consulta a BrasilAPI e o ViaCEP, serviços públicos de dados cadastrais. Vai apenas o número do CNPJ ou do CEP; nenhum dado de aluno ou de funcionário.

**Não há** envio de dados para Google Analytics, Meta, anunciantes, planilhas externas ou outros terceiros.
A exportação do painel (PDF, Excel, CSV ou compartilhar) é gerada **no próprio navegador**, com os dados que a pessoa já está vendo. Nada passa por servidor de terceiros, e não há dado de aluno: só totais, registros de operação e cadastros de fornecedores.

---

## 4. Controles de segurança implementados

| Camada | Controle |
|---|---|
| Transporte | HTTPS obrigatório (HSTS de 2 anos), cabeçalhos `nosniff`, `Referrer-Policy` e `Permissions-Policy` (câmera, microfone e localização bloqueados) |
| Banco | **RLS ativado em todas as tabelas.** Tabelas de alunos (`dispositivos`, `respostas`, `avaliacoes`) não têm nenhuma política: só são acessíveis pelas funções do banco |
| Funções do banco | `SECURITY DEFINER` com `search_path` fixo; validam o prazo de escolha, o dia de serviço e a janela de avaliação; funções de gestão conferem `is_admin()` por dentro |
| Anti-duplicidade | Chave primária (aparelho, data, refeição): **uma resposta por aparelho por refeição**. Repetir só troca a escolha |
| Anti-robô | Criação de aparelho só pela rota do servidor, com **Vercel BotID** + **chave secreta** (só o hash fica no banco) + limite global de 300 aparelhos novos por minuto |
| Segredos | A chave do servidor fica só em variável de ambiente (Vercel e `.env.local`, fora do Git). Nenhuma chave de serviço (service role) é usada no navegador |
| Administração | Login do Supabase Auth com **perfis**: Gestor, Nutricionista, Compras e Fiscal (somente leitura). Gravações sem permissão são recusadas pelo banco, mesmo que alguém chame a API direto. Só o Gestor altera a equipe |
| Previsão | Funções públicas devolvem **somente totais**, nunca linhas individuais |
| Retenção | Tarefa diária (`pg_cron`, 06:15 UTC) apaga aparelhos sem uso há 180 dias |
| Localização | Banco em São Paulo e funções da aplicação em São Paulo, **sem transferência internacional** na operação normal |

---

## 5. O que pode e o que não pode

### Pode
- Usar os **totais** de escolhas e avaliações para planejar compras, produção e qualidade.
- Compartilhar com a fiscalização da UFGD relatórios **agregados** (previsão, satisfação, conformidade).
- Exportar listas de produção e compras (sem dados de alunos).

### Não pode
- **Pedir ou registrar** nome, matrícula, CPF, e-mail ou telefone de alunos no sistema, inclusive em campos de observação.
- Tentar **reidentificar** aparelhos (cruzar códigos com câmeras, catraca, horários ou logs).
- Usar os dados para **marketing**, venda, publicidade ou qualquer finalidade fora da gestão do restaurante.
- **Compartilhar contas** de administrador ou usar senhas fracas.
- Colocar chaves e senhas em planilhas, e-mail ou mensagens.
- Liberar o modo de visualização local (`ADMIN_PREVIEW`) fora do ambiente de desenvolvimento. O código já bloqueia isso em produção.

---

## 6. Direitos dos titulares

| Direito (LGPD art. 18) | Como é atendido |
|---|---|
| Acesso e confirmação | O aluno vê as próprias escolhas e preferências no app |
| Eliminação | **Ajustes → Apagar meus dados deste celular** (imediato, inclui escolhas e avaliações) |
| Informação | Aviso de privacidade na tela de boas-vindas e em Ajustes |
| Administradores | Pedidos de acesso ou exclusão de conta pelo encarregado da empresa ⚠️ |

---

## 7. Alergênicos: responsabilidade e cuidados

- A primeira classificação foi **sugerida automaticamente** pelos nomes e ingredientes das planilhas e aparece ao aluno como **"em validação"**.
- A nutricionista responsável deve revisar cada preparação no painel (**Fichas técnicas → Revisado pela nutricionista**). Só então o aviso "em validação" sai.
- O app exibe sempre o aviso de **possível contato cruzado** e orienta quem tem alergia grave a confirmar no balcão.
- A informação de alergênicos **não substitui** o display obrigatório de ingredientes no balcão (TR 5.6.2).

---

## 8. Riscos residuais conhecidos

| Risco | Situação | Mitigação |
|---|---|---|
| Uma pessoa responder de vários celulares ou limpar os dados do navegador | Possível: sem identificar a pessoa, não há trava absoluta | Impacto pequeno, porque as respostas são **amostra** para a proporção; BotID e limite de taxa impedem automação em massa |
| Código do aparelho vazado (alguém com acesso ao celular) | Permite ver e mudar as escolhas daquele aparelho | Não expõe identidade; o aluno pode apagar os dados |
| Senha fraca de administrador | ⚠️ A conta de teste usa senha simples | Trocar antes de liberar o painel; ativar MFA no Supabase Auth |
| Classificação de alergênicos incorreta | Sugestão automática pode errar | Revisão da nutricionista + aviso "em validação" + aviso de contato cruzado |
| Logs dos provedores com IP | Registros técnicos temporários | Prazo curto; sem cruzamento com escolhas |

---

## 9. Pendências de conformidade ⚠️

1. **Nomear o encarregado (DPO)** da empresa e publicar o contato no app.
2. **Aviso de privacidade formal**: validar com o jurídico o texto da tela de boas-vindas e de Ajustes.
3. **Contratos com operadores** (Vercel e Supabase): guardar os termos de processamento de dados (DPA) aceitos.
4. **Alinhar com a UFGD** o uso do app pelos alunos e a divulgação (QR Codes, redes).
5. **MFA** para administradores e troca da senha de teste. Ativar também a proteção contra senhas vazadas (Supabase → Authentication → Password security).
6. **Plano de resposta a incidentes**: quem avisar e em quanto tempo (ANPD e titulares, quando aplicável).
7. Configurar no Supabase (Authentication → URL Configuration) o domínio de produção.
