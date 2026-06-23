# Importação de dados — PURION OS

## Influencers (creators) — pendente

O arquivo **`influencers.xlsx`** ainda não foi colocado nesta pasta.

Para concluir a importação dos creators que faltam (104 dos 205 — os primeiros
101 já estão no banco, ver `sql/import_creators.sql`), coloque o arquivo em:

```
imports/influencers.xlsx
```

Aba esperada: **"Influencers - Perfume Luxo"**, dados a partir da linha 4.

Colunas esperadas:
| Coluna | Conteúdo |
|---|---|
| B | Nome |
| C | Instagram |
| D | TikTok |
| E | Nicho |
| F, G | Seguidores (IG / TikTok — usa o maior, convertendo K/M) |
| H | Tier |
| I | Aderência (estrelas) |
| J | Canal de contato |
| L | Observações |

Depois de colocar o arquivo, rode novamente o prompt de importação — ele vai
ler o `.xlsx`, gerar os INSERTs para os 104 registros restantes e executá-los
no banco (sem duplicar os 101 já importados).

## Estado atual confirmado no banco

- `leads_crm`: 40/40 estéticas de Brasília importadas (tag `importado`) — ver `sql/import_esteticas.sql`
- `creators`: 101/205 influencers importados — ver `sql/import_creators.sql`
- `financeiro` + `configuracoes`: dados de pré-lançamento já preenchidos — ver `sql/07_financeiro_inicial_prelancamento.sql`
