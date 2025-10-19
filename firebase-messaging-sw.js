// firebase-messaging-sw.js

// Importe o SDK do Firebase
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// Configuração do Firebase: COM SEU SENDER ID EMBUTIDO
const firebaseConfig = {
    apiKey: "AIzaSyAqUbFJRI1CplOQptliKmVZH90LB2AlZus",
    authDomain: "victor-store-42568.firebaseapp.com",
    projectId: "victor-store-42568",
    storageBucket: "victor-store-42568.appspot.com",
    messagingSenderId: "772922119777", // <-- SUBSTITUÍDO
    appId: "1:772922119777:web:865d1d604b39e6a88b52f9",
    measurementId: "G-G6J8N6H9W"
};

// Inicialize o Firebase no Service Worker
firebase.initializeApp(firebaseConfig);

// Recupere a instância do Firebase Messaging
const messaging = firebase.messaging();

// Lida com a mensagem recebida enquanto a página NÃO está em primeiro plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensagem de fundo recebida: ', payload);

    const notificationTitle = payload.notification.title || "Victor Store - Nova Atualização";
    const notificationOptions = {
        body: payload.notification.body || "Verifique as novidades!",
        icon: '/icons/favicon-96x96.png', // Altere se o caminho do ícone for diferente
        data: payload.data,
        // O click_action é importante para direcionar o usuário ao clicar na notificação
        click_action: payload.data.url 
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
