# RU-FOOD

Previsão de consumo do Restaurante Universitário da UFGD: os alunos escolhem o prato (app anônimo ou totem) e a cozinha produz e compra na medida certa.

- **App do aluno, totem e TV**: https://rufood.vercel.app (totem em `/totem`, TV em `/tv`)
- **Painel de gestão**: https://rufood.vercel.app/admin
- O endereço antigo (prev-cardapio.vercel.app) redireciona para o novo.

## Pastas

| Pasta | O que tem |
|---|---|
| `RU-FOOD Instaladores/` | Versão desktop pronta: `Windows/RU-FOOD-Instalador.exe` e `Mac/RU-FOOD-Mac.dmg` (com o `RU-FOOD.app`) |
| `Design/` | Arquivos-fonte da identidade: `Marca`, `Mascote RUzinho`, `Stickers`, `Ilustrações` |
| `docs/` | Documentação do projeto (lista abaixo) |
| `landing/` | Landing comercial (site estático separado do app, com links de acesso por perfil) |
| `web/` | Código: site, painel, PWA, agente local, instaladores e banco (Next.js 16, Supabase, Vercel) |

## Documentação
1. [Estrutura do MVP](docs/01-estrutura-mvp.md)
2. [Regras do contrato (TR 47/2023)](docs/02-regras-contrato.md)
3. [Segurança da informação e LGPD](docs/03-seguranca-e-lgpd.md)
4. [Créditos e licenças](docs/04-creditos-e-licencas.md)
5. [Guia de apresentação e testes](docs/05-guia-apresentacao-e-testes.md)
6. [Módulos do painel de gestão](docs/06-modulos-de-gestao.md)
7. [Auditoria e plano do RU-FOOD Intelligence](docs/07-auditoria-e-plano-intelligence.md)
8. [Revisão final do MVP](docs/08-auditoria-mvp.md)

## Desenvolvimento

```bash
npm --prefix web install
npm --prefix web run dev
```

Gerar de novo os instaladores (Windows e Mac) e atualizar `RU-FOOD Instaladores/`:

```bash
web/instalador/construir-tudo.sh
```
