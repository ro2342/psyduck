// data.js — fonte única de texto de interface e configuração dos métodos.
// Nada de lógica aqui, só dados (mesmo papel do data.js do theartistsway).

const APP_VERSION = "0.1.19";

const UI_STRINGS = {
  appName: "Psyduck",
  tagline: "Vamos desconfundir sua cabeça hoje.",
  nav: {
    home: "Início",
    tasks: "Tarefas",
    farm: "Fazenda",
    kanban: "Kanban",
    eisenhower: "Matriz Eisenhower",
    oneThreeFive: "1-3-5 do dia",
    pomodoro: "Pomodoro",
    timeboxing: "Time-Boxing",
    timeAudit: "Auditoria de Tempo",
    methods: "Métodos",
    settings: "Ajustes",
  },
};

// Variantes de pato colecionáveis — cada tarefa concluída tem uma chance
// de "chocar" um novo Psyduck pra família no lago (mecânica tipo
// Pokémon/gacha). Pesos maiores = mais comum. `accessory` é um detalhe
// visual extra só pras variantes incomuns/raras, desenhado em mascot.js.
const DUCK_VARIANTS = [
  { id: "classic", label: "Clássico", rarity: "comum", weight: 45, bodyColor: "#fbd669", bellyColor: "#f6c445", beakColor: "#f2861f" },
  { id: "cream", label: "Creme", rarity: "comum", weight: 25, bodyColor: "#fff1cf", bellyColor: "#ffe3a0", beakColor: "#e8a33d" },
  { id: "dusk", label: "Entardecer", rarity: "incomum", weight: 15, bodyColor: "#8fb8e8", bellyColor: "#6f9bd6", beakColor: "#e8a33d", accessory: "none" },
  { id: "blossom", label: "Flor de Cerejeira", rarity: "incomum", weight: 10, bodyColor: "#f3a8c4", bellyColor: "#ec86ac", beakColor: "#e8763f", accessory: "flower" },
  { id: "mint", label: "Menta", rarity: "incomum", weight: 8, bodyColor: "#a6e3c4", bellyColor: "#7fd1a6", beakColor: "#e8a33d", accessory: "none" },
  { id: "golden", label: "Dourado Raro", rarity: "raro", weight: 3, bodyColor: "#ffd23f", bellyColor: "#ffb100", beakColor: "#c9660a", accessory: "crown" },
  { id: "starry", label: "Estrelado Raro", rarity: "raro", weight: 2, bodyColor: "#4a3f8f", bellyColor: "#372d70", beakColor: "#e8a33d", accessory: "stars" },
];

const DUCK_NAME_POOL = [
  "Toddy", "Migalha", "Bolinha", "Nino", "Pipoca", "Fubá", "Amendoim", "Bilu",
  "Cacau", "Suco", "Broa", "Sopinha", "Pudim", "Torrada", "Waffle", "Mel",
  "Canela", "Café", "Biscoito", "Gemada", "Limão", "Cravo", "Aveia", "Panqueca",
];


// Os 10 métodos, com explicação curta (pro "Reminder/Cheat Sheet") e a
// rota da ferramenta funcional correspondente. `builtin` = true quando
// o método não precisa de tela própria (ex.: Time Blocking e a Regra dos
// 2 Minutos vivem dentro da tela de Tarefas, não são views separadas).
const METHOD_CONFIGS = [
  {
    id: "timeBlocking",
    name: "Time Blocking",
    short: "Eu faço *tarefa* de *hora início* até *hora fim*.",
    explanation:
      "Reserve blocos fixos de tempo na sua agenda pra tarefas ou tipos de atividade específicos. Reduz a sobrecarga de decidir o que fazer a cada minuto — e evita, por exemplo, checar e-mail 30 vezes por hora.",
    route: "#/tasks",
    builtin: true,
  },
  {
    id: "pomodoro",
    name: "Técnica Pomodoro",
    short: "Eu faço *tarefa* por *x minutos*, depois pauso *x minutos*. Repete.",
    explanation:
      "Trabalhe por um período fixo (10 a 30 minutos), depois faça uma pausa de 5 a 10 minutos. A cada 4 ciclos, uma pausa mais longa.",
    route: "#/pomodoro",
  },
  {
    id: "twoMinute",
    name: "Regra dos 2 Minutos",
    short: "Se *tarefa* leva menos de 2 minutos, eu faço agora.",
    explanation:
      "Se algo leva menos de dois minutos, faça na hora. Ajuda a limpar tarefinhas pequenas antes que elas se acumulem.",
    route: "#/tasks?filter=twoMinute",
    builtin: true,
  },
  {
    id: "eisenhower",
    name: "Matriz de Eisenhower",
    short: "Um quadro que organiza tarefas por urgência e importância.",
    explanation:
      "Quatro quadrantes: Urgente+Importante (faça agora), Importante mas não urgente (decida quando fazer), Urgente mas não importante (delegue), nem urgente nem importante (faça depois). Tudo bem se o Wordle for urgente e importante.",
    route: "#/eisenhower",
  },
  {
    id: "abcdz",
    name: "Sistema de Prioridade ABCD–Z",
    short: "Cada tarefa ganha uma letra de prioridade/dificuldade.",
    explanation:
      "A = maior prioridade/maior dor de cabeça, B = um pouco menos, e assim por diante. Priorizar é difícil pra muita gente — inclusive pra quem criou esse método — mas ajuda bastante quem consegue usar.",
    route: "#/tasks?sort=priority",
    builtin: true,
  },
  {
    id: "timeAuditing",
    name: "Auditoria de Tempo",
    short: "Registre como você gasta seu tempo e revise depois de 1-2 semanas.",
    explanation:
      "Anote como o seu tempo foi gasto ao longo do dia. Depois de uma ou duas semanas, revise de verdade pra descobrir onde reorganizar prioridades.",
    route: "#/time-audit",
  },
  {
    id: "kanban",
    name: "Método Kanban",
    short: "Cartões num quadro visual: A Fazer, Fazendo, Feito.",
    explanation:
      "Visualize o trabalho num quadro com colunas. Limite quantas tarefas podem estar 'Fazendo' ao mesmo tempo pra não se sobrecarregar.",
    route: "#/kanban",
  },
  {
    id: "timeboxing",
    name: "Time-Boxing",
    short: "Reserve um tempo fixo pra uma tarefa chata e pare quando acabar.",
    explanation:
      "Dê um tempo fixo pra uma tarefa e pare de trabalhar nela quando o tempo acabar. Ótimo pra tarefas chatas — cinco minutos rendem muito mais do que parece, tipo lavar a louça.",
    route: "#/timeboxing",
  },
  {
    id: "oneThreeFive",
    name: "Regra 1-3-5",
    short: "Escolha 1 tarefa grande, 3 médias e 5 pequenas por dia.",
    explanation:
      "Todo dia, escolha uma tarefa grande, três médias e cinco pequenas pra focar. Simples de montar e fácil de olhar de novo no meio do dia.",
    route: "#/one-three-five",
  },
  {
    id: "paretoRule",
    name: "Regra 80/20 (Princípio de Pareto)",
    short: "Foque nos 20% de tarefas que geram 80% do resultado.",
    explanation:
      "Identifique e foque nas tarefas de alto impacto. Tente eliminar ou delegar o que não importa tanto ou só consome tempo.",
    route: "#/tasks?filter=highImpact",
    builtin: true,
  },
];

// Curva de XP: quanto custa cada nível (índice = nível atual, valor =
// XP total acumulado necessário pra alcançar o próximo).
const XP_LEVEL_STEP = 120;

const BADGE_CONFIGS = [
  { id: "firstTask", name: "Primeiro passo", desc: "Concluiu a primeira tarefa.", check: (s) => s.tasksCompleted >= 1 },
  { id: "streak3", name: "Pegando o ritmo", desc: "3 dias seguidos concluindo algo.", check: (s) => s.streak >= 3 },
  { id: "streak7", name: "Uma semana inteira", desc: "7 dias seguidos concluindo algo.", check: (s) => s.streak >= 7 },
  { id: "tasks10", name: "Dez de boas", desc: "10 tarefas concluídas.", check: (s) => s.tasksCompleted >= 10 },
  { id: "tasks50", name: "Meio século", desc: "50 tarefas concluídas.", check: (s) => s.tasksCompleted >= 50 },
  { id: "pomodoro10", name: "Fazendeiro de tomates", desc: "10 ciclos de Pomodoro completos.", check: (s) => s.pomodorosCompleted >= 10 },
  { id: "levelUp5", name: "Nível 5", desc: "Chegou ao nível 5.", check: (s) => s.level >= 5 },
];

window.PsyduckData = {
  APP_VERSION,
  UI_STRINGS,
  METHOD_CONFIGS,
  XP_LEVEL_STEP,
  BADGE_CONFIGS,
  DUCK_VARIANTS,
  DUCK_NAME_POOL,
};
