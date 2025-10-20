// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.9; 

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
    setDoc, // NOVO: Para salvar dados personalizados
    updateDoc, // NOVO: Para atualizar dados personalizados
    runTransaction, // NOVO: Para operações seguras
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential, // Para exigir a senha na edição
    EmailAuthProvider, // Para reautenticação
    signOut 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyAqUbFJRI1CplOQptliKmVZH90LB2AlZus",
    authDomain: "victor-store-42568.firebaseapp.com",
    projectId: "victor-store-42568",
    storageBucket: "victor-store-42568.firebasestorage.app",
    messagingSenderId: "977015403689",
    appId: "1:977015403689:web:724a68bf4f7ff27f3065b8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Inicializa o Auth

// --- 2. VARIÁVEIS GLOBAIS E REFERÊNCIAS DOM ---

let selectedItem = null; 
let currentUser = null; 
let currentCustomUserData = {}; // Armazena os dados personalizados do Firestore

const hamburgerMenu = document.getElementById('hamburger-menu');
const navMenu = document.getElementById('nav-menu');
const menuOverlay = document.getElementById('menu-overlay');
const searchInput = document.getElementById('search-input');
const contentGrid = document.getElementById('content-grid');
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal');
const detailsDownloadBtn = document.getElementById('details-download-btn');

// Novas Referências de Autenticação
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const toggleAuthLink = document.getElementById('toggle-auth-link');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const registerFields = document.getElementById('register-fields');
const authPasswordConfirm = document.getElementById('auth-password-confirm');
const authSubmitBtn = document.getElementById('auth-submit-btn');

// Novas Referências do Menu Hamburguer
const menuProfileContainer = document.getElementById('menu-profile-container');
const menuLoginLink = document.getElementById('menu-login-link');
const menuLogoutLink = document.getElementById('menu-logout-link');
const profileImageMenu = document.getElementById('profile-image-menu');
const profileNameMenu = document.getElementById('profile-name-menu');
const openProfileModalBtn = document.getElementById('open-profile-modal-btn');
const logoutBtn = document.getElementById('logout-btn');

// Novas Referências dos Modais de Perfil e Reset
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const resetModal = document.getElementById('reset-modal');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const notRememberForm = document.getElementById('not-remember-form');


// --- 3. LÓGICA DE FIREBASE E AUTENTICAÇÃO ---

// A. Gerenciamento do Estado do Usuário
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUIAfterAuth(user);
    if (user) {
        fetchUserProfile(user.uid); 
    } else {
        currentCustomUserData = {};
    }
});

// B. Atualização da Interface (UI)
function updateUIAfterAuth(user) {
    if (user) {
        // Usuário Logado: Atualiza Menu e Botão de Download
        menuLoginLink.style.display = 'none';
        menuProfileContainer.style.display = 'flex';
        menuLogoutLink.style.display = 'list-item';
        
        // Dados básicos do Auth
        profileImageMenu.src = user.photoURL || 'assets/default_profile.png';
        profileNameMenu.textContent = user.displayName || 'Usuário';

        // Lógica do Download Gate
        if (detailsDownloadBtn) detailsDownloadBtn.style.display = 'block'; 
        const loginPrompt = document.getElementById('details-login-prompt');
        if (loginPrompt) loginPrompt.style.display = 'none';

    } else {
        // Usuário Deslogado
        menuLoginLink.style.display = 'list-item';
        menuProfileContainer.style.display = 'none';
        menuLogoutLink.style.display = 'none';
        
        // Lógica do Download Gate
        if (detailsDownloadBtn) detailsDownloadBtn.style.display = 'none';
        const loginPrompt = document.getElementById('details-login-prompt');
        if (loginPrompt) {
            loginPrompt.textContent = "Para fazer o download, faça Login ou crie uma conta.";
            loginPrompt.style.display = 'block';
        }
    }
}

// C. Gerenciamento de Dados Customizados (Firestore)
async function fetchUserProfile(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentCustomUserData = docSnap.data();
            // Atualiza UI com dados customizados (se necessário)
        } else {
            console.log("Perfil customizado não encontrado para o UID: " + uid);
            currentCustomUserData = {};
        }
    } catch (e) {
        console.error("Erro ao buscar perfil customizado:", e);
    }
}

// D. Lógica de Alternância de Formulário (Login/Registro)
toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (authForm.dataset.mode === 'login') {
        // Mudar para Registro
        authForm.dataset.mode = 'register';
        authTitle.textContent = 'Criar Conta';
        authSubmitBtn.textContent = 'Criar Conta';
        toggleAuthLink.textContent = 'Já tenho conta';
        registerFields.style.display = 'block';
        authPasswordConfirm.style.display = 'block';
    } else {
        // Mudar para Login
        authForm.dataset.mode = 'login';
        authTitle.textContent = 'Faça Login';
        authSubmitBtn.textContent = 'Entrar';
        toggleAuthLink.textContent = 'Criar conta com Google/E-mail';
        registerFields.style.display = 'none';
        authPasswordConfirm.style.display = 'none';
    }
});


// E. Submissão do Formulário de Login/Registro
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isRegistering = authForm.dataset.mode === 'register';

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isRegistering) {
        const name = document.getElementById('register-name').value;
        const confirmPassword = document.getElementById('auth-password-confirm').value;
        const bday = document.getElementById('register-bday').value;
        const gender = document.getElementById('register-gender').value;
        const partner = document.getElementById('register-partner').value;
        const photoFile = document.getElementById('register-photo').files[0];

        if (password !== confirmPassword) {
            alert("As palavras-passe não batem.");
            return;
        }
        
        try {
            // 1. Cria a conta no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // **NOTA IMPORTANTE: Upload de Fotos**
            // A lógica de upload de arquivo para o Storage é complexa e omitida aqui.
            // Você deve implementar o upload e obter a URL. Usaremos um placeholder.
            const photoURL = 'assets/default_profile.png'; // Placeholder URL

            // 2. Atualiza o perfil básico (Nome e Foto)
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL
            });
            
            // 3. Salva dados personalizados no Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                name: name,
                photoURL: photoURL,
                dateOfBirth: bday,
                gender: gender,
                partnerName: partner, // Nome do(a) namorado(a)
                createdAt: new Date()
            });

            alert("Conta criada com sucesso! Seja bem-vindo(a).");
            authModal.style.display = 'none';
            // onAuthStateChanged cuidará da atualização da UI.

        } catch (error) {
            console.error("Erro ao registrar: ", error);
            alert("Erro ao criar conta: " + error.message);
        }

    } else {
        // Lógica de Login
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authModal.style.display = 'none';
            // onAuthStateChanged cuidará da atualização da UI.
        } catch (error) {
            console.error("Erro ao logar: ", error);
            // Mensagem de erro personalizada solicitada
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                 alert("Os dados que digitou não batem");
            } else {
                 alert("Erro de Login: " + error.message);
            }
        }
    }
});

// F. Abrir/Fechar Modais e Botões de Ação
document.getElementById('open-auth-modal-btn').addEventListener('click', (e) => {
    e.preventDefault();
    // Reseta para a tela de Login
    authForm.dataset.mode = 'login';
    authTitle.textContent = 'Faça Login';
    authSubmitBtn.textContent = 'Entrar';
    toggleAuthLink.textContent = 'Criar conta com Google/E-mail';
    registerFields.style.display = 'none';
    authPasswordConfirm.style.display = 'none';
    document.getElementById('auth-modal').style.display = 'block';
});

openProfileModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentUser || !currentCustomUserData) return;
    
    // Preenche o formulário de edição com os dados atuais
    document.getElementById('edit-name-input').value = currentUser.displayName || '';
    document.getElementById('edit-bday-input').value = currentCustomUserData.dateOfBirth || '';
    document.getElementById('edit-gender-input').value = currentCustomUserData.gender || '';
    document.getElementById('edit-partner-input').value = currentCustomUserData.partnerName || '';
    document.getElementById('current-profile-image').src = currentUser.photoURL || 'assets/default_profile.png';
    
    profileModal.style.display = 'block';
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        alert("Sessão encerrada com sucesso.");
        navMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    } catch (error) {
        console.error("Erro ao sair: ", error);
    }
});


// G. Lógica de Edição de Perfil (Exigindo Re-autenticação)
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const newName = document.getElementById('edit-name-input').value;
    const newBday = document.getElementById('edit-bday-input').value;
    const newGender = document.getElementById('edit-gender-input').value;
    const newPartner = document.getElementById('edit-partner-input').value;
    const currentPassword = document.getElementById('edit-password-input').value;
    const newPassword = document.getElementById('new-password-input').value;
    const newPhotoFile = document.getElementById('edit-photo').files[0];

    if (!currentPassword) {
        alert("Por favor, digite sua palavra-passe atual para confirmar as alterações.");
        return;
    }

    try {
        // 1. Re-autenticação: Exigir a senha atual
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // 2. Atualizar Senha (se houver)
        if (newPassword) {
            await updatePassword(currentUser, newPassword);
            console.log("Senha atualizada com sucesso.");
        }

        // 3. Atualizar Dados Básicos do Auth (Nome, Foto)
        let updatedPhotoURL = currentUser.photoURL;
        if (newPhotoFile) {
             // **PLACEHOLDER:** Implementar lógica de upload para o Firebase Storage aqui e obter a nova URL.
             updatedPhotoURL = 'assets/new_profile_photo.png'; 
        }
        await updateProfile(currentUser, {
            displayName: newName,
            photoURL: updatedPhotoURL
        });

        // 4. Atualizar Dados Customizados no Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, {
            name: newName,
            photoURL: updatedPhotoURL,
            dateOfBirth: newBday,
            gender: newGender,
            partnerName: newPartner
        });

        alert("Perfil atualizado com sucesso!");
        profileModal.style.display = 'none';
        document.getElementById('edit-password-input').value = '';
        document.getElementById('new-password-input').value = '';

    } catch (error) {
        console.error("Erro ao atualizar perfil: ", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("Palavra-passe atual incorreta. As alterações não foram salvas.");
        } else {
            alert("Erro ao atualizar perfil: " + error.message);
        }
    }
});


// H. Lógica de Recuperação de Senha (Customizada e Backend Necessário)

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    authModal.style.display = 'none';
    resetModal.style.display = 'block';
    document.getElementById('reset-title').textContent = 'Esquecí senha';
    forgotPasswordForm.style.display = 'block';
    notRememberForm.style.display = 'none';
});

document.getElementById('nao-lembro-de-nada-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reset-title').textContent = 'Não lembro de nada';
    forgotPasswordForm.style.display = 'none';
    notRememberForm.style.display = 'block';
});

// Submissão do Reset Simples (Com validação Customizada - REQUER BACKEND SEGURO)
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const bday = document.getElementById('reset-bday').value;
    const partner = document.getElementById('reset-partner').value;

    alert("AVISO: Esta etapa requer um serviço de BACKEND (Firebase Cloud Functions) para verificar a data de nascimento e o nome do(a) namorado(a) com segurança, e então enviar o email de redefinição de senha do Firebase.");
    
    // **Ação do CLIENTE:** Envia os dados para o Backend
    // fetch('/api/secure-password-reset', { method: 'POST', body: JSON.stringify({ email, bday, partner }) });

    // **SIMULAÇÃO DE SUCESSO:** Se o backend confirmar, ele enviaria a senha, ou você chama:
    // sendPasswordResetEmail(auth, email);

    // Simplificando para mostrar o próximo passo da UI (CÓDIGO AUTOMÁTICO - NÃO RECOMENDADO)
    resetModal.style.display = 'none';
    alert("Um código (link) foi enviado para o seu e-mail (simulação). Por favor, verifique.");
});

// Submissão do Reset Complexo (Notificação Admin - REQUER BACKEND)
notRememberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('not-remember-email').value;
    const whatsapp = document.getElementById('not-remember-whatsapp').value;

    alert(`AVISO: O sistema irá notificar seu Painel de Administração (Backend) que o usuário ${email} e ${whatsapp} precisa de ajuda. Isso requer a implementação do Firebase Admin SDK e FCM no seu servidor.`);
    
    // **Ação do CLIENTE:** Envia os dados para o Backend
    // fetch('/api/admin-notify-reset', { method: 'POST', body: JSON.stringify({ email, whatsapp }) });

    // Se a requisição for bem-sucedida, informa o usuário:
    resetModal.style.display = 'none';
    alert("Seu pedido foi enviado ao administrador. Você receberá um link de redefinição via e-mail ou WhatsApp em breve.");
});


// --- 4. FUNÇÕES EXISTENTES E MANIPULAÇÃO DOM ---

// ... Funções loadContentFromFirestore, createItemCard, checkForForcedUpdate, etc., devem ser mantidas aqui ...

// [CÓDIGO EXISTENTE: loadContentFromFirestore]
async function loadContentFromFirestore() { /* ... */ }

// [CÓDIGO EXISTENTE: createItemCard]
function createItemCard(item) { /* ... */ }

// [CÓDIGO EXISTENTE: checkForForcedUpdate]
async function checkForForcedUpdate() { /* ... */ }

// [CÓDIGO EXISTENTE: Listeners (Abertura/Fechamento de Modais e Menu)]

// Abrir Modal de Detalhes
contentGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.content-card');
    if (card) {
        // ... (Lógica existente para abrir detalhes) ...
        // Atualiza a visibilidade do botão/prompt após carregar os detalhes:
        updateUIAfterAuth(currentUser); 
    }
});

// Fechar Menu e Modais (Atualização para fechar novos modais)
document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Fechar Menu (clicando no overlay)
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    }

    // Fechar Modais 
    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    if (target === detailsModal || target === fullListModal || target === authModal || target === profileModal || target === resetModal) {
        target.style.display = 'none';
    }
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

document.addEventListener('DOMContentLoaded', async () => {
    await loadContentFromFirestore();
    await checkForForcedUpdate(); 
    startPlaceholderAnimation();
});
