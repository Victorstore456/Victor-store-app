// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.3; 

// --- 1. CONFIGURAÇÃO E IMPORTS FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    orderBy, 
    getDocs,
    doc,       
    getDoc,
    setDoc,    // NOVO: Importado setDoc para salvar o token
    addDoc     // NOVO: Importado addDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// --- IMPORTS FCM (Cloud Messaging) ---
import { 
    getMessaging, 
    getToken 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js"; 

// --- IMPORTS ADICIONADOS PARA AUTENTICAÇÃO (Auth v9 Modular) ---
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"; 


// CONFIGURAÇÃO DO FIREBASE: COM SEU SENDER ID EMBUTIDO
const firebaseConfig = {
    apiKey: "AIzaSyAqUbFJRI1CplOQptliKmVZH90LB2AlZus",
    authDomain: "victor-store-42568.firebaseapp.com",
    projectId: "victor-store-42568",
    storageBucket: "victor-store-42568.appspot.com",
    messagingSenderId: "772922119777", // <-- SUBSTITUÍDO
    appId: "1:772922119777:web:865d1d604b39e6a88b52f9",
    measurementId: "G-G6J8N6H9W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app); 

let currentUser = null; 

// CONSTANTES DO DOM (MANTIDAS)
const contentContainer = document.getElementById('content-container');
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal');
const hamburgerMenu = document.getElementById('hamburger-menu');
const menuOverlay = document.getElementById('menu-overlay');
const sidebar = document.getElementById('sidebar');
const categoryLinks = document.querySelectorAll('.category-link');
const fullListTitle = document.getElementById('full-list-title');
const fullListContent = document.getElementById('full-list-content');
const searchInput = document.getElementById('search-input');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authNameInput = document.getElementById('auth-name');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const authTitle = document.getElementById('auth-title');
const authMessage = document.getElementById('auth-message');
const logoutSidebarBtn = document.getElementById('logout-sidebar-btn'); 
const loginMenuBtn = document.getElementById('login-menu-btn');
const loginSidebarBtn = document.getElementById('login-sidebar-btn');

let isLoginMode = false;
let allContentData = []; 

// CHAVE VAPID PÚBLICA EMBUTIDA
const VAPID_PUBLIC_KEY = "BMq_hW3p14j6v9qB6FkR-lq-S2nK-f4E8g0C6gA-7rY0F8Z2wT5zP7X0Q4I3nB8O6V1wY5Z2X4E8G0I2L8K0N6W7X4E8G0I2L8K0N6W7X"; // <-- SUBSTITUÍDO


// ----------------------------------------------------
// --- FUNÇÕES DE NOTIFICAÇÃO PUSH ---
// ----------------------------------------------------

async function setupPushNotifications(user) {
    if (!('serviceWorker' in navigator)) {
        console.warn("Navegador não suporta Service Workers/Push Notifications.");
        return;
    }

    try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });

        if (currentToken) {
            console.log("Token de Notificação obtido com sucesso. Salvando no Firestore...");
            // Salva o token na coleção 'push_tokens', usando o UID do usuário como ID do documento
            const tokenRef = doc(db, 'push_tokens', user.uid);
            await setDoc(tokenRef, { 
                token: currentToken, 
                uid: user.uid,
                timestamp: new Date(),
                userAgent: navigator.userAgent
            }, { merge: true });

            console.log("Token salvo/atualizado no Firestore para o UID:", user.uid);
        } else {
            console.warn('Permissão de notificação negada. Solicite ao usuário para habilitar.');
        }
    } catch (err) {
        console.error('Erro ao configurar/obter o token FCM:', err);
    }
}


// ----------------------------------------------------
// --- FUNÇÕES DE UTILITY E UI (Seu código original mantido) ---
// ----------------------------------------------------

function setAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = 'block';
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

function showContentInModal(item) {
    document.getElementById('details-title').textContent = item.name;
    document.getElementById('details-category').textContent = item.category;
    document.getElementById('details-description').textContent = item.description;
    document.getElementById('details-img').src = item.imageURL || 'placeholder.jpg';
    document.getElementById('download-link-btn').href = item.downloadURL;
    detailsModal.style.display = 'flex';
}

function renderContent(data, container) {
    container.innerHTML = ''; 
    
    if (data.length === 0) {
        container.innerHTML = '<p class="no-content">Nenhum conteúdo encontrado para esta seção.</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.setAttribute('data-id', item.id);
        card.innerHTML = `
            <img src="${item.imageURL || 'placeholder.jpg'}" alt="${item.name}">
            <div class="card-info">
                <h3>${item.name}</h3>
                <p>${item.category}</p>
            </div>
        `;
        card.addEventListener('click', () => showContentInModal(item));
        container.appendChild(card);
    });
}

function filterAndRenderContent(searchTerm = '', category = 'all') {
    let filtered = allContentData;

    if (category !== 'all') {
        filtered = filtered.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.description.toLowerCase().includes(lowerSearchTerm) ||
            item.category.toLowerCase().includes(lowerSearchTerm)
        );
    }

    const homeContent = filtered.slice(0, 12);
    renderContent(homeContent, contentContainer);
}

// ----------------------------------------------------
// --- FUNÇÕES DE FIREBASE (Leitura de Dados, Seu código original mantido) ---
// ----------------------------------------------------

async function loadContentFromFirestore() {
    try {
        const q = query(collection(db, "content"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        allContentData = [];
        querySnapshot.forEach((doc) => {
            allContentData.push({ id: doc.id, ...doc.data() });
        });

        filterAndRenderContent(); 
    } catch (e) {
        console.error("Erro ao carregar conteúdo:", e);
        contentContainer.innerHTML = '<p class="error-content">Erro ao carregar o conteúdo da loja. Tente recarregar a página.</p>';
    }
}

async function checkForForcedUpdate() {
    try {
        const docRef = doc(db, "config", "version");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const serverVersion = docSnap.data().version || 0;
            if (serverVersion > CURRENT_UI_VERSION) {
                alert(`Uma nova versão da loja (${serverVersion}) está disponível. Por favor, recarregue a página para continuar. (Versão atual: ${CURRENT_UI_VERSION})`);
            }
        }
    } catch (e) {
        console.error("Erro ao verificar a versão:", e);
    }
}


// ----------------------------------------------------
// --- FUNÇÕES DE AUTENTICAÇÃO (Seu código original mantido) ---
// ----------------------------------------------------

function handleAuthError(error) {
    let message = 'Ocorreu um erro desconhecido.';
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Este e-mail já está sendo usado. Faça login.';
            break;
        case 'auth/invalid-email':
            message = 'O formato do e-mail é inválido.';
            break;
        case 'auth/operation-not-allowed':
            message = 'Login com e-mail/senha não está habilitado.';
            break;
        case 'auth/weak-password':
            message = 'A senha deve ter pelo menos 6 caracteres.';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'E-mail ou senha inválidos.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'O pop-up de login foi fechado.';
            break;
        default:
            message = `Erro: ${error.message}`;
    }
    setAuthMessage(message, 'error');
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    const name = authNameInput.value;

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isLoginMode ? 'Entrando...' : 'Criando...';
    authMessage.style.display = 'none';

    if (isLoginMode) {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                setAuthMessage('Login realizado com sucesso!', 'success');
                authModal.style.display = 'none';
            })
            .catch(handleAuthError)
            .finally(() => {
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Fazer Login';
            });
    } else {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                if (name) {
                    return updateProfile(userCredential.user, { displayName: name });
                }
                return userCredential;
            })
            .then(() => {
                setAuthMessage('Conta criada com sucesso!', 'success');
                authModal.style.display = 'none';
            })
            .catch(handleAuthError)
            .finally(() => {
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Criar Conta';
            });
    }
}

function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(() => {
            setAuthMessage('Login com Google realizado com sucesso!', 'success');
            authModal.style.display = 'none';
        })
        .catch(handleAuthError);
}

function handleLogout() {
    signOut(auth).then(() => {
        console.log("Usuário deslogado.");
        menuOverlay.style.display = 'none'; 
        window.location.reload(); 
    }).catch((error) => {
        console.error("Erro ao deslogar:", error);
    });
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Fazer Login' : 'Crie sua Conta';
    authSubmitBtn.textContent = isLoginMode ? 'Fazer Login' : 'Criar Conta';
    toggleAuthBtn.textContent = isLoginMode ? 'Não Tenho Conta? Criar Conta' : 'Já Tenho Conta? Fazer Login';
    authNameInput.style.display = isLoginMode ? 'none' : 'block';
    authMessage.style.display = 'none'; 
    authForm.reset();
}

function setupAuthListeners() {
    onAuthStateChanged(auth, (user) => {
        const userProfileLink = document.getElementById('user-profile-link');
        const userNameDisplay = document.getElementById('user-name-display');
        const logoutMenuBtn = document.getElementById('logout-menu-btn');
        const logoutSidebarBtn = document.getElementById('logout-sidebar-btn'); 

        if (user) {
            currentUser = user;
            loginMenuBtn.style.display = 'none';
            loginSidebarBtn.style.display = 'none';
            userProfileLink.style.display = 'flex';
            logoutMenuBtn.style.display = 'block';
            logoutSidebarBtn.style.display = 'block'; 

            const displayName = user.displayName || user.email;
            userNameDisplay.textContent = displayName;
            
            // CHAMA A FUNÇÃO DE NOTIFICAÇÃO PUSH AQUI
            setupPushNotifications(user); 

        } else {
            currentUser = null;
            loginMenuBtn.style.display = 'block';
            loginSidebarBtn.style.display = 'block';
            userProfileLink.style.display = 'none';
            logoutMenuBtn.style.display = 'none';
            logoutSidebarBtn.style.display = 'none'; 
            userNameDisplay.textContent = 'Visitante';
        }
    });
}


// ----------------------------------------------------
// --- LISTENERS DE EVENTOS (Seu código original mantido) ---
// ----------------------------------------------------

// Menu e Sidebar
hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('open');
    if (hamburgerMenu.classList.contains('open')) {
        menuOverlay.style.display = 'block';
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
        menuOverlay.style.display = 'none';
    }
});

// Fechar Menu e Modais
document.addEventListener('click', (event) => {
    const target = event.target;
    
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
        sidebar.classList.remove('open'); 
    }

    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    if (target === detailsModal || target === fullListModal || target === authModal) { 
        target.style.display = 'none';
    }
});

// Links de Categoria
categoryLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const category = event.currentTarget.getAttribute('data-category');
        fullListTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        
        let filteredContent;
        if (category === 'all') {
            filteredContent = allContentData;
        } else {
            filteredContent = allContentData.filter(item => item.category.toLowerCase() === category.toLowerCase());
        }
        
        renderContent(filteredContent, fullListContent);
        fullListModal.style.display = 'flex';
        
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
        sidebar.classList.remove('open');
    });
});

// Pesquisa
searchInput.addEventListener('input', () => {
    filterAndRenderContent(searchInput.value);
});

// Handlers de Autenticação
authForm.addEventListener('submit', handleAuthSubmit);
toggleAuthBtn.addEventListener('click', toggleAuthMode);
googleLoginBtn.addEventListener('click', handleGoogleLogin);
logoutSidebarBtn.addEventListener('click', handleLogout); 
document.getElementById('logout-menu-btn').addEventListener('click', handleLogout); 

// Abrir Modal de Autenticação
document.querySelectorAll('#login-menu-btn, #login-sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        isLoginMode = true;
        toggleAuthMode(); 
        authModal.style.display = 'flex';
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
        sidebar.classList.remove('open');
    });
});

// Mantém a animação de placeholder
const placeholderTexts = ["Pesquisar Apps, Jogos, Software...", "Experimente: GTA V, Xender, FRP tools..."];
let placeholderIndex = 0;
function updatePlaceholder() {
    if (searchInput !== document.activeElement && searchInput.value.length === 0) {
        searchInput.placeholder = placeholderTexts[placeholderIndex];
        placeholderIndex = (placeholderIndex + 1) % placeholderTexts.length;
    }
}
function startPlaceholderAnimation() {
    setInterval(updatePlaceholder, 10000); 
    updatePlaceholder(); 
}


// ----------------------------------------------------
// --- INICIALIZAÇÃO DO DOM ---
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // REGISTRO DO SERVICE WORKER (CRÍTICO PARA NOTIFICAÇÕES)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./firebase-messaging-sw.js')
        .then((registration) => {
            console.log('Service Worker de Notificação registrado com sucesso:', registration);
        })
        .catch((err) => {
            console.error('Falha no registro do Service Worker de Notificação:', err);
        });
    }

    await loadContentFromFirestore();
    await checkForForcedUpdate(); 
    setupAuthListeners(); 
    startPlaceholderAnimation(); 
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
