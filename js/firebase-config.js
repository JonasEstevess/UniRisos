/* Configuração do Firebase.
   Cole aqui o objeto que o console do Firebase mostra em
   Configurações do projeto > Seus apps > App da Web > Configuração do SDK.
   Esses valores são identificadores públicos do app: podem ficar no repositório.
   Quem protege os dados são as regras em firestore.rules.
   Enquanto apiKey estiver vazio, o site roda em modo de demonstração (dados só neste navegador). */
window.UR_FIREBASE = {
  apiKey: 'AIzaSyAGHpuwmH9dcGCCORxW2CPTO9IyPgN5Zhk',
  authDomain: 'uni-risos.firebaseapp.com',
  projectId: 'uni-risos',
  storageBucket: 'uni-risos.firebasestorage.app',
  messagingSenderId: '114227808044',
  appId: '1:114227808044:web:38340586da826d4f57ce89'
};

/* Chave pública das notificações no celular (Web Push). A chave privada fica só na Vercel. */
window.UR_PUSH_KEY = 'BP4LQJ8qUh_YKVM1GKOKLAFL5zDHbJmDfuJ-1jr9DqeCXCWLBjvwqGCHCChseCIhagadrH2sWQzB9q38ONdb5YU';
