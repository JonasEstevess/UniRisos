# Uni Risos

Site e aplicativo da Uni Risos, clínica odontológica no Jardim Iae, São Paulo.

- Página única com animações em JavaScript puro
- Agendamento online em 4 etapas, com horário reservado no servidor
- Cadastro e login do paciente, com lista de consultas e cancelamento
- Painel da clínica com a agenda em tempo real (`admin.html`)
- Aplicativo instalável no celular por link ou QR code (`instalar.html`)

Site: https://uni-risos.vercel.app
Instalação do app: https://uni-risos.vercel.app/instalar.html
Painel da clínica: https://uni-risos.vercel.app/admin.html

O site é hospedado na Vercel e publicado a cada push na `main`. O GitHub Pages (https://jonasestevess.github.io/UniRisos/) continua ativo como cópia.

## Rodando localmente

```bash
python -m http.server 5173
```

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Site e app do paciente |
| `admin.html` + `js/admin.js` | Painel da clínica |
| `instalar.html` | Página de instalação com QR code |
| `styles.css` | Identidade visual e layout |
| `js/main.js` | Animações, navegação e lista de tratamentos |
| `js/backend.js` | Acesso a dados: Firebase ou modo de demonstração |
| `js/firebase-config.js` | Configuração do projeto Firebase |
| `js/booking.js` | Fluxo de agendamento |
| `js/auth.js` | Cadastro, login e área do paciente |
| `js/store.js` | Utilitários e armazenamento do modo de demonstração |
| `js/pwa.js`, `sw.js`, `manifest.webmanifest` | Aplicativo instalável |
| `firestore.rules` | Regras de segurança do banco |
| `vercel.json` | Cabeçalhos da hospedagem na Vercel |

## Ligando o servidor (Firebase)

Enquanto `js/firebase-config.js` estiver vazio, o site roda em **modo de demonstração**: contas e consultas ficam só no navegador de quem usa. Para valer de verdade:

1. Crie um projeto em https://console.firebase.google.com.
2. Em **Authentication > Método de login**, ative **E-mail/senha**.
3. Em **Authentication > Configurações > Domínios autorizados**, adicione o domínio do site (hoje `uni-risos.vercel.app` e `jonasestevess.github.io`).
4. Em **Firestore Database**, crie o banco em modo de produção, região `southamerica-east1`.
5. Em **Firestore Database > Regras**, cole o conteúdo de `firestore.rules` e publique.
6. Em **Configurações do projeto > Seus apps**, adicione um app da Web e cole a configuração em `js/firebase-config.js`.
7. Faça commit e push. O site passa a usar o servidor.

### Liberando o painel da clínica

1. A pessoa da clínica cria uma conta normal pelo site.
2. Ela abre `admin.html`; a tela mostra o código da conta (`admins/...`).
3. No console do Firebase, em Firestore, crie a coleção `admins` com um documento cujo ID é esse código. Pode ficar vazio.

### Como os dados ficam protegidos

- `slots`: só data e hora dos horários ocupados, públicos, para mostrar a disponibilidade. Um horário já ocupado não pode ser gravado de novo.
- `bookings`: cada paciente lê e cancela só as próprias consultas; a clínica lê e altera todas.
- `users`: perfil do paciente, visível só para ele e para a clínica.

## Aplicativo

O app é um PWA: o paciente abre o link, toca em **Instalar app** e ganha o ícone na tela inicial, abrindo em tela cheia e com barra de navegação própria. O QR code em `assets/qr-instalar.svg` aponta para a página de instalação.

Se o endereço do site mudar, gere o QR code de novo:

```bash
npx qrcode -t svg -e M -q 2 -d 17211a -l 00000000 -o assets/qr-instalar.svg "https://NOVO-ENDERECO/instalar.html"
```

Ao publicar mudanças, aumente `VERSION` em `sw.js` para os aparelhos baixarem os arquivos novos.

### Play Store

O mesmo PWA pode ser empacotado para a loja com o PWABuilder (https://www.pwabuilder.com). Para o app abrir sem barra de endereço, o site precisa estar na raiz de um domínio (domínio próprio ou Firebase Hosting), onde fica o arquivo `/.well-known/assetlinks.json`. É necessária uma conta de desenvolvedor no Google Play Console.
