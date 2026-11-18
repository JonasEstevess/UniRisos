# Uni Risos

Site, app e sistema de agenda da Uni Risos, clínica odontológica no Jardim Iae, São Paulo.

| Endereço | O que é |
| --- | --- |
| https://uni-risos.vercel.app | Site da clínica |
| https://uni-risos.vercel.app/app/ | App (paciente e clínica) |
| https://uni-risos.vercel.app/instalar.html | Página de instalação com QR code |
| https://uni-risos.vercel.app/privacidade.html | Política de privacidade (LGPD) |
| https://uni-risos.vercel.app/api/status | Mostra quais serviços do servidor estão ligados |

Hospedado na Vercel, publicado a cada push na `main`. O GitHub Pages (https://jonasestevess.github.io/UniRisos/) continua como cópia do site, sem o servidor de avisos.

## O que o sistema faz

**Paciente (no app)**
- Agenda em 3 passos: tratamento, dia e horário, confirmação. Cria a conta no próprio passo de confirmação.
- Vê, reagenda e cancela consultas; salva a consulta na agenda do celular.
- Recebe notificação quando a clínica confirma e lembrete na véspera (e por e-mail, se configurado).
- Recupera a senha, edita os dados e exclui a conta.

**Clínica (mesmo app, com conta liberada)**
- Agenda do dia em tempo real, com contagem de hoje, amanhã e consultas a confirmar.
- Confirma, cancela e chama o paciente no WhatsApp com mensagem pronta.
- Lança consultas marcadas por telefone, WhatsApp ou na recepção. O horário sai da agenda online na hora.
- Bloqueia dia inteiro ou horários (folga, feriado, atestado). Horários bloqueados somem do agendamento.
- Muda o horário de funcionamento e o intervalo de almoço.
- Recebe notificação de novo agendamento e de cancelamento, e um resumo diário da agenda de amanhã.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html`, `styles.css`, `js/main.js` | Site |
| `app/` | App mobile (`index.html`, `app.css`, `app.js`) |
| `js/servicos.js` | Lista de tratamentos (site e app) |
| `js/agenda.js` | Expediente, almoço e geração dos horários livres |
| `js/backend.js` | Login e dados: Firebase ou modo de demonstração |
| `js/firebase-config.js` | Configuração pública do Firebase e chave pública de notificações |
| `js/booking.js`, `js/auth.js` | Agendamento e conta no site |
| `js/store.js` | Utilitários e armazenamento do modo de demonstração |
| `js/pwa.js`, `sw.js`, `manifest.webmanifest` | Instalação, funcionamento sem internet e notificações |
| `api/` | Servidor na Vercel: avisos (`notify`), lembretes diários (`lembretes`), status |
| `firestore.rules` | Regras de segurança do banco |
| `vercel.json` | Cabeçalhos e agendamento dos lembretes (todo dia às 10h de Brasília) |
| `privacidade.html` | Política de privacidade |
| `admin.html` | Endereço antigo do painel; redireciona para `app/#agenda` |

## Rodando localmente

```bash
python -m http.server 5173
```

Abra `http://localhost:5173/app/`. Acrescente `?demo=1` para usar o modo de demonstração, em que tudo fica no navegador e qualquer conta criada vira conta da clínica. As funções de `api/` só rodam na Vercel.

## Configuração do servidor (Vercel)

Os avisos e lembretes precisam destas variáveis em **Vercel > projeto uni-risos > Settings > Environment Variables** (ambiente *Production*). Depois de salvar, faça um *Redeploy*.

| Variável | Obrigatória | De onde vem |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | sim | Firebase > Configurações do projeto > Contas de serviço > Gerar nova chave privada. Cole o conteúdo inteiro do arquivo JSON. |
| `VAPID_PUBLIC_KEY` | sim | Arquivo local `segredos-vercel.local.txt` (fora do git). Deve ser igual a `UR_PUSH_KEY` em `js/firebase-config.js`. |
| `VAPID_PRIVATE_KEY` | sim | Arquivo local `segredos-vercel.local.txt` |
| `CRON_SECRET` | sim | Arquivo local `segredos-vercel.local.txt`. A Vercel usa para autorizar o lembrete diário. |
| `SMTP_USER` | para e-mail | E-mail Gmail que vai enviar os avisos |
| `SMTP_PASS` | para e-mail | Senha de app do Gmail (Conta Google > Segurança > Senhas de app). Não é a senha normal. |
| `CLINIC_EMAIL` | não | Para onde vão os avisos da clínica. Se vazio, usa `SMTP_USER`. |
| `SITE_URL` | não | Padrão: `https://uni-risos.vercel.app` |

Depois do redeploy, `https://uni-risos.vercel.app/api/status` deve mostrar `true` em tudo o que foi configurado.

Para gerar novas chaves de notificação (se o arquivo local se perder), rode `npx web-push generate-vapid-keys` e atualize as duas variáveis e `UR_PUSH_KEY`. Aparelhos inscritos com a chave antiga precisam ativar as notificações de novo.

## Firebase

Projeto `uni-risos`. Login por e-mail e senha; Firestore na região `southamerica-east1`.

- **Domínios autorizados** (Authentication > Configurações): `uni-risos.vercel.app`, `jonasestevess.github.io` e qualquer domínio novo.
- **Regras**: o conteúdo de `firestore.rules`, publicado em Firestore > Regras. Mudou o arquivo, publique de novo.

### Liberando uma conta da clínica

1. A pessoa cria uma conta normal pelo app.
2. No console do Firebase, em Authentication > Usuários, copie o UID dela.
3. Em Firestore, na coleção `admins`, crie um documento com esse UID como ID (pode ter um campo `email` para identificar).
4. Ela sai e entra de novo no app: aparecem Agenda, Lançar e Horários.

### Coleções

- `slots`: horários ocupados por consulta ou bloqueio, só data e hora. Gravar um horário já ocupado é recusado pelas regras.
- `bookings`: consultas. O paciente lê e cancela as suas; a clínica lê, lança e altera todas.
- `blocks`: bloqueios de agenda, só a clínica.
- `config/agenda`: horário de funcionamento e almoço, alterado pela clínica no app.
- `users`: perfil do paciente e registro do aceite da política de privacidade.
- `pushSubs`: aparelhos que recebem notificação.
- `admins`: contas da clínica.

## Notificações e lembretes

- **Novo agendamento / cancelamento pelo paciente**: notificação para os aparelhos da clínica com avisos ligados e e-mail para `CLINIC_EMAIL`.
- **Confirmação / cancelamento pela clínica**: notificação e e-mail para o paciente.
- **Lembrete**: todo dia às 10h, para cada consulta do dia seguinte, e resumo da agenda para a clínica.
- No iPhone, notificações só funcionam com o app instalado na tela inicial (iOS 16.4 ou mais novo).
- WhatsApp automático exige a API oficial do WhatsApp Business (paga, com verificação da Meta). Por enquanto a clínica envia confirmações e lembretes pelo WhatsApp com um toque, com a mensagem já escrita.

## App instalável

O app é um PWA: o paciente abre o link ou o QR code, toca em **Instalar** e ganha o ícone na tela inicial, abrindo direto em `/app/`. Para gerar o QR code de outro endereço:

```bash
npx qrcode -t svg -e M -q 2 -d 17211a -l 00000000 -o assets/qr-instalar.svg "https://NOVO-ENDERECO/instalar.html"
```

Ao publicar mudanças, aumente `VERSION` em `sw.js` para os aparelhos baixarem os arquivos novos.

### Play Store

O mesmo PWA pode ser empacotado com o PWABuilder (https://www.pwabuilder.com). Para abrir sem barra de endereço, o site precisa de domínio próprio com o arquivo `/.well-known/assetlinks.json`. É necessária uma conta de desenvolvedor no Google Play Console.
