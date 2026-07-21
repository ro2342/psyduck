# SPEC — Dashboard Pixel-Art de Rotina/Família

> Este documento descreve, componente por componente, um app de referência visto em vídeo.
> Regra pro Claude Code: \*\*implementar exatamente o que está descrito abaixo, um bloco por vez.
> Não adicionar features, não "melhorar" o design, não trocar por componentes genéricos.\*\*

\---

## 1\. Conceito

Um dashboard pessoal/familiar em formato de web app (rodando local, ex: `localhost:XXXX`),
com estética pixel-art estilo Stardew Valley. A metade de cima da tela é uma **cena viva**
(cenário animado). A metade de baixo é uma **grid de painéis funcionais** (estilo "cartas de
papel"/pergaminho bege) com dados reais: tarefas, livros, clima, lembretes recorrentes e um
sistema de energia/meditação.

Não é um jogo — é produtividade/hábitos disfarçada de jogo de fazenda.

\---

## 2\. Layout geral

```
┌─────────────────────────────────────────────────────────────┐
│                     CENA (pixel art, animada)                │  \~45% da altura
│  céu com ciclo dia/noite · casa · árvores · lago · horta      │
│  avatares da família andando · cachorro                       │
└─────────────────────────────────────────────────────────────┘
┌───────────┬───────────────┬─────────────┬───────────────────┐
│ EVENTOS   │    TODOS      │   LIVROS    │      SOFÁ         │
│  DE HOJE  │  (checklist)  │ (leitura)   │ (check-in/chat)   │
├───────────┤               │             │                    │
│ LEMBRETES │               ├─────────────┤                    │
│(recorrente)│              │   CLIMA     │                    │
└───────────┴───────────────┴─────────────┴───────────────────┘
```

4 colunas de painéis, cada uma com fundo bege/pergaminho, cantos arredondados, borda marrom,
título em caixa alta no topo do painel.

\---

## 3\. Cena pixel-art (topo)

**Fundo:**

* Gradiente de céu que muda com o horário real do sistema:

  * Dia (06:00–18:00): azul claro, sol visível se movendo em arco leve.
  * Noite (18:00–06:00): azul escuro/roxo, estrelas piscando, lua no lugar do sol.
* Chão: faixa verde (grama), sem perspectiva 3D — é 2D estilo side-scroller de fazenda.

**Elementos fixos na cena:**

* Casa de madeira (cabana) no canto esquerdo, com chaminé (fumaça saindo à noite/inverno).
* 2–3 árvores tipo pinheiro espalhadas.
* Um lago oval à direita, com folhas de lírio e sapos boiando (número de sapos pode variar).
* Uma horta (canteiro) que aparece plantada em algumas cenas — indica progresso ao longo do
tempo (quanto mais tarefas completadas, mais a horta cresce: terra vazia → mudas → plantas
crescidas).
* Um varal/estrutura de madeira (tipo suporte de secar roupa) por perto da casa.

**Personagens (sprites 16-bit, parados ou andando lateralmente):**

* Avatar adulto 1 (mulher)
* Avatar adulto 2 (homem)
* Avatar bebê/criança pequena
* Cachorro (anda sozinho pela cena, movimento independente)
* Os avatares representam os membros da família cadastrados no app (nome, ícone).

**Animação de meditação/leitura:**

* Quando o usuário ativa "meditar" ou está lendo, a câmera/foco vai para o lago.
* Um sapo aparece sentado numa folha de lírio no centro do lago.
* Nesse modo aparece o painel "AMANDA" (ver seção 7) sobrepondo a cena.

\---

## 4\. Painel "EVENTOS DE HOJE"

* Lista simples de eventos do dia (calendário do dia atual).
* Estado vazio: texto "Nenhum evento hoje".
* Cada evento: horário + título.

## 5\. Painel "TODOS" (tarefas)

* Checklist simples: checkbox + texto da tarefa.
* Sem categorias visíveis — lista única, ordem de criação ou prioridade manual.
* Ao marcar concluído: risca o texto (ou remove da lista — decidir e manter consistente).
* Itens de exemplo observados: tarefas de trabalho/pessoais misturadas (ex: "marcar dentista",
"resetar finanças", "vídeo dashboard").

## 6\. Painel "LEMBRETES" (recorrentes)

Diferente de TODOS: são tarefas **recorrentes com frequência definida**, não itens únicos.

* Cada lembrete mostra:

  * Título (ex: "Comprar de beterraba")
  * Contador de dias/frequência (ex: "a cada 30", "a cada 15")
  * **4 bolinhas/dots** abaixo do título, representando um ciclo de repetição — preenchidas
conforme o progresso dentro do ciclo atual (streak visual, tipo "3 de 4 completos").
* É basicamente um habit tracker de tarefas com intervalo fixo, com indicador visual de streak.

## 7\. Painel "LIVROS" (leitura) + energia

* Lista de livros em andamento: capa em miniatura, título, "Cap. N" (capítulo atual).
* Botão "CAPÍTULO +10" por livro: ao clicar, avança 1 capítulo E soma +10 de energia.
* Energia é um recurso compartilhado do sistema (ver "AMANDA" abaixo), não por livro.

**Painel "AMANDA" (overlay de meditação/leitura):**

* Nome do personagem/modo + barra de energia "ENERGIA 0/100" (ou X/100).
* Mesma lista de livros com botão de capítulo.
* Seção "MEDITAR" com botões de duração: 5 / 10 / 15 / 20 (minutos).

  * Ao escolher, inicia um timer; ao completar, soma energia (ex.: +20 por sessão, escalando
com a duração).
* A barra de energia sobe visualmente (gráfico de área/linha crescendo) conforme livros lidos
e minutos meditados se acumulam ao longo do dia.

## 8\. Painel "CLIMA"

* Clima real via API (ex. Open-Meteo, OpenWeather), baseado na localização do usuário.
* Mostra: temperatura atual (°F e °C), ícone de condição ("céu limpo" etc.), máxima/mínima do
dia.
* Gráfico de linha simples: temperatura ao longo do dia (curva tipo sino, sobe de manhã, pico
à tarde, cai à noite).

## 9\. Painel "SOFÁ" (companion / check-in)

* Estilo feed de chat/diário, com um personagem nomeado (ex. "Sofia") fazendo perguntas de
check-in diário.
* Cada entrada tem: nome, timestamp, mensagem/pergunta (ex: "Café da manhã?", "Café da manhã
ok? Você já tomou um copo d'água hoje?").
* Botões de resposta rápida sob cada pergunta: algo como "Sim" / "1x" / "Não ainda" (respostas
curtas pré-definidas, não campo de texto livre).
* Funciona como um sistema de check-ins de hábito básico (hidratação, refeições, etc.),
conversacional em vez de checklist.

## 10\. Pontuação / resumo do dia

* Ao final do dia (ou dashboard geral), aparece uma nota tipo "5 estrelas" — um score
consolidado do dia baseado em: tarefas concluídas + lembretes em dia + energia acumulada +
check-ins do sofá respondidos.

\---

## 11\. Modelo de dados (sugestão mínima)

```
FamilyMember { id, name, spriteType (adult\_f | adult\_m | child | pet) }

Todo { id, text, done, createdAt }

Reminder {
  id, text, intervalDays, cycleProgress (0-4), lastCompletedAt
}

Book {
  id, title, coverUrl, currentChapter, totalChapters (opcional)
}

EnergyLog { id, date, source (reading|meditation), amount, timestamp }

MeditationSession { id, durationMinutes, completedAt }

CheckIn { id, question, answerOptions\[], answeredValue, timestamp }

WeatherCache { date, tempCurrent, tempHigh, tempLow, condition, hourlySeries\[] }

DayScore { date, stars (1-5), breakdown }
```

\---

## 12\. Stack sugerido (compatível com o que você já usa)

* Next.js + TypeScript (mesma base do Teacher Rod LMS)
* Canvas/DOM+CSS para a cena pixel-art (não precisa de engine de jogo — sprites PNG com
posição CSS/JS, ciclo dia-noite via classe CSS trocada por horário)
* SQLite/Prisma para persistência local
* API de clima real (Open-Meteo é gratuita e sem API key)

