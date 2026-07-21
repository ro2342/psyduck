# Setup do Google Cloud/Firebase pro sync do Psyduck (v0.2.0)

Checklist do que **você** precisa fazer manualmente no Google Cloud
Console e no Firebase Console antes de eu poder ligar o sync na nuvem
(v0.2.0 do roadmap). Eu não tenho ferramenta pra clicar nesses
consoles — só consigo escrever o código que usa o que você criar.
Mesmo padrão já validado no `theartistsway` (ver
`theartistsway/sincronizacao-nuvem-setup.md` se quiser comparar).

## 1. Criar o projeto (Firebase = Google Cloud por baixo)

1. Vá em https://console.firebase.google.com → "Adicionar projeto".
2. Nome sugerido: `psyduck` ou `psyduck-app` (não pode ser igual a um
   já existente globalmente — se `psyduck` estiver ocupado, algo como
   `psyduck-rod` funciona).
3. Pode desativar o Google Analytics (não precisamos).
4. Isso cria automaticamente um projeto correspondente no Google Cloud
   Console com o mesmo ID.

## 2. Ativar o Firestore

1. No Firebase Console do projeto: **Build → Firestore Database →
   Criar banco de dados**.
2. Modo: comece em **modo de teste** (regras abertas por 30 dias) —
   eu já vou escrever regras de segurança de verdade (por `uid`) antes
   disso expirar, mas modo de teste facilita o desenvolvimento inicial.
3. Localização: qualquer uma (ex.: `southamerica-east1` se quiser
   menor latência do Brasil, ou a padrão sugerida).

## 3. Tela de consentimento OAuth

No Google Cloud Console (mesmo projeto) → **APIs e Serviços → Tela de
consentimento OAuth**:
1. Tipo de usuário: **Externo**.
2. Nome do app: "Psyduck", e-mail de suporte: o seu.
3. Escopos: só os básicos — `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`. Não precisa pedir nenhum escopo
   sensível pro sync básico (Firestore usa o token do Firebase, não um
   escopo do Google direto).
4. Enquanto o app estiver em modo "Teste" (não publicado), só contas
   que você adicionar como "usuário de teste" conseguem logar — adicione
   o seu próprio e-mail do Google lá.

## 4. Criar os 3 tipos de cliente OAuth

Em **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente
OAuth**, criar os três (você pode fazer só o "Web application" agora,
que é o único que a v0.2.0 do PWA precisa — os outros dois só quando a
v0.3.0 do app UWP chegar):

1. **Aplicativo da Web** (pro PWA, v0.2.0):
   - Origens JavaScript autorizadas: `https://ro2342.github.io`
   - URIs de redirecionamento autorizados: `https://ro2342.github.io/psyduck/`
   - Vai gerar um **Client ID** (público, ok expor no código) e um
     **Client Secret** (não commitar em texto puro — eu já sei tratar
     isso via GitHub Actions secret + placeholder no código, mesmo
     esquema do theartistsway).

2. **TVs e dispositivos de entrada limitada** (Device Authorization
   Grant — só quando formos fazer o app UWP do Win10 Mobile, v0.3.0):
   adiar por enquanto.

3. **App para computador** (Desktop app — consentimento normal do
   Win11, v0.3.0): adiar por enquanto.

## 5. O que você me manda depois de criar o cliente "Aplicativo da Web"

Só três coisas (pode colar aqui na conversa ou eu leio se você salvar
num arquivo local que eu não commito):
- O **Client ID** (algo tipo `123456-abc.apps.googleusercontent.com`)
- O **Client Secret** (eu vou configurar como GitHub Actions secret,
  nunca aparece no código commitado — mesmo esquema do theartistsway)
- O **Firebase config** do projeto (Configurações do projeto → Geral →
  "Seus apps" → adicionar um app da Web → copia o objeto `firebaseConfig`)
  — o `apiKey` aí dentro é seguro de ficar público no código, é assim
  que o Firebase funciona.

## 6. GitHub Actions secrets (eu configuro, só preciso que você aprove)

Vou pedir permissão antes de mexer nas configurações do repositório,
mas pra referência, os secrets que a v0.2.0 vai precisar em
**Settings → Secrets and variables → Actions** do repo
`ro2342/psyduck`:
- `GOOGLE_OAUTH_WEB_CLIENT_SECRET`

(os outros dois — device grant e desktop — só quando a v0.3.0 chegar)

## O que eu faço depois que tiver isso

1. `www/js/auth.js` (novo) — login Google via Authorization Code +
   PKCE, troca o token do Google pelo login do Firebase (Identity
   Toolkit), guarda a sessão no IndexedDB.
2. `www/js/sync.js` (novo) — Firestore REST direto (sem SDK), um
   documento por store (`tasks`, `ducks`, `books`, `gamification`,
   `profile`), merge `mergeWholeBlob` (perfil) e `mergePerRecord` +
   tombstone (`deleted`) pro resto.
3. Botão "Sincronizar agora" nos Ajustes + sync automático debounced.
4. Regras de segurança do Firestore por `uid` (substitui o modo de
   teste antes de expirar).
