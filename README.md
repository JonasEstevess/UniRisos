# Uni Risos

Site da Uni Risos, clínica odontológica no Jardim Iae, São Paulo.

- Página única com animações em JavaScript puro, sem dependências
- Agendamento online em 4 etapas, com envio do pedido pelo WhatsApp da clínica
- Cadastro e login do paciente, com lista de consultas

## Rodando

Abra `index.html` no navegador ou sirva a pasta:

```bash
python -m http.server 5173
```

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Marcação de todas as seções |
| `styles.css` | Identidade visual e layout responsivo |
| `js/main.js` | Animações, navegação e lista de tratamentos |
| `js/store.js` | Leitura e escrita no `localStorage` |
| `js/booking.js` | Fluxo de agendamento |
| `js/auth.js` | Cadastro, login e área do paciente |

## Limitações atuais

Contas e agendamentos ficam no `localStorage` do navegador. Para produção, troque `js/store.js` por uma API com banco de dados.
