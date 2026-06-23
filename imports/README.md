# Importação de dados — PURION OS

## Estado atual confirmado no banco (concluído)

- `leads_crm`: 40/40 estéticas de Brasília importadas (tag `importado`) — ver `sql/import_esteticas.sql`
- `creators`: **205/205 influencers importados** — ver `sql/import_creators.sql`
- `financeiro` + `configuracoes`: dados de pré-lançamento já preenchidos — ver `sql/07_financeiro_inicial_prelancamento.sql`

Os arquivos `.xlsx` de origem (`imports/*.xlsx`) não são versionados no repositório
(ver `.gitignore`) — o conteúdo já foi extraído integralmente para os arquivos
`.sql` acima, que servem como registro definitivo do que foi importado.
