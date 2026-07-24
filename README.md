# Escala Mecânica Offshore

Aplicação web para controle da escala 14x14 da equipe de mecânica de um navio de perfuração offshore, substituindo a planilha Excel utilizada pelo supervisor.

Uso exclusivamente interno, sem login e sem banco de dados online: **todos os dados ficam armazenados localmente no navegador via IndexedDB**.

## Tecnologias

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [TailwindCSS 4](https://tailwindcss.com/)
- [date-fns](https://date-fns.org/) (locale pt-BR)
- IndexedDB (sem dependências externas de persistência)

## Funcionalidades

### Escala (tela principal)

- Grade estilo planilha: cada linha é um colaborador, cada coluna é um dia do mês.
- Dias gerados automaticamente, com navegação entre meses e botão "Hoje".
- Cabeçalho de dias fixo no topo, coluna de colaboradores fixa à esquerda e rolagem horizontal.
- Linha **POB** fixa na base com o total de pessoas embarcadas por dia, recalculado automaticamente.
- Destaque do dia atual e dos fins de semana; filtro por turma.
- Clique em qualquer célula abre um painel lateral para editar **status**, **observação**, **motivo da dobra** e **data final da dobra**.

### Status (cada um com cor própria)

| Status       | Código | Cor      |
| ------------ | ------ | -------- |
| Escala       | E      | Verde    |
| Dobra        | D      | Âmbar    |
| Folga        | F      | Cinza    |
| Férias       | FÉ     | Azul     |
| Treinamento  | T      | Violeta  |
| Exame Médico | EX     | Ciano    |
| No Show      | NS     | Vermelho |

Compromissos do tipo "Outro" não alteram o status do dia, mas aparecem como marcador na célula.

### Regra da escala 14x14

- Todos trabalham em ciclo 14x14, sempre **sincronizado com a turma**: a escala é derivada da data âncora da turma (primeiro dia de um embarque), repetida para frente e para trás no tempo.
- **Dobra**: o colaborador permanece embarcado por mais dias e perde exatamente os dias de folga correspondentes. O próximo embarque **não muda** — o sistema recalcula automaticamente a folga restante e informa quantos dias sobram.

### Colaboradores

- Cadastro com nome, função (Supervisor, Chefe Mecânica, Mecânico, Assistente Mecânico, Coordenador, Outros), turma e situação (ativo/inativo).
- Colaboradores inativos não aparecem na escala nem contam no POB.
- **Disponibilidade automática**: o sistema identifica, para cada colaborador, se hoje ele está embarcado, em compromisso (treinamento, exame, férias) ou disponível na folga — informação usada para decidir quem pode cobrir férias. Mostra também o próximo embarque e os compromissos futuros.
- Gerenciador de compromissos da folga: treinamento, exame médico, férias e outros, com período, descrição e observações. Os compromissos aparecem na linha do colaborador na escala.

### Configurações

- **Turmas**: nome, cor de identificação e data âncora do ciclo, com indicação de embarcada/em folga e próximas datas.
- **Ciclo**: dias embarcado × dias de folga (padrão 14x14).
- **Dados**: exportação e importação de backup em JSON (com validação) e limpeza completa dos dados locais.

## Arquitetura

```
src/
├── components/
│   ├── collaborators/   # Formulário e gerenciador de compromissos
│   ├── icons/           # Ícones SVG inline
│   ├── layout/          # Sidebar, layout responsivo e cabeçalho de página
│   ├── schedule/        # Grade, célula, navegador de mês, legenda e drawer de edição
│   ├── settings/        # Turmas, ciclo e gestão de dados
│   └── ui/              # Kit de componentes reutilizáveis (Button, Modal, Drawer…)
├── constants/           # Cores/labels de status, funções e turmas
├── context/             # DataContext: estado global sincronizado com IndexedDB
├── db/                  # Conexão IndexedDB, repositórios genéricos e seed
├── pages/               # Escala, Colaboradores e Configurações
├── types/               # Tipos de domínio
└── utils/               # Motor da escala 14x14, datas, backup, ids
```

### Modelo de dados (IndexedDB)

| Store           | Conteúdo                                                        |
| --------------- | --------------------------------------------------------------- |
| `settings`      | Ciclo da escala (dias embarcado × folga)                        |
| `teams`         | Turmas com data âncora do ciclo                                 |
| `collaborators` | Colaboradores (nome, função, turma, ativo)                      |
| `overrides`     | Ajustes manuais de um único dia (status + observação)           |
| `dobras`        | Períodos de dobra (início, fim, motivo, observação)             |
| `appointments`  | Compromissos da folga (tipo, período, descrição, observação)    |

### Resolução do status de um dia

Precedência aplicada pelo motor de escala (`src/utils/schedule.ts`):

1. Ajuste manual de célula
2. Dobra
3. Compromisso (treinamento, exame médico, férias)
4. Ciclo base da turma (Escala / Folga)

## Executando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # typecheck + build de produção
npm run preview  # serve o build de produção
```
