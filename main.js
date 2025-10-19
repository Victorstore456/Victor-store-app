// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.6; // <--- ATUALIZADO PARA V1.6 (com Auth)

// --- 1. CONFIGURAÇÃO E IMPORTS FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    orderBy, 
    getDocs,
    doc,       
    getDoc     
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// NOVO: Imports para Autenticação
import {
    getAuth,
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
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
// NOVO: Inicializa o Firebase Auth
const auth = getAuth(app);


// --- 2. VARIÁVEIS GLOBAIS E DOM ---
const contentGrid = document.getElementById('content-grid');
const searchInput = document.getElementById('search-input');
const hamburgerMenu = document.getElementById('hamburger-menu');
const menuOverlay = document.getElementById('menu-overlay');
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal');
const forcedUpdateNotification = document.getElementById('forced-update-notification');
const categoryLinks = document.querySelectorAll('.category-link');

let allContent = []; // Armazena todo o conteúdo do Firestore
let originalContent = []; // Cópia para resetar filtros
let filteredContent = []; // Conteúdo exibido atualmente


// NOVO: Variável global para rastrear o estado de autenticação
let currentUser = null; // Armazenará o objeto do usuário logado ou null

// Elementos do Modal de Autenticação
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const toggleAuthBtn = document.getElementById('toggle-auth-mode');
const googleSignInBtn = document.getElementById('google-sign-in-btn');

let isLoginMode = true; // Controla se o formulário está em modo Login ou Cadastro


// --- 3. FUNÇÕES DE EXIBIÇÃO E FILTRAGEM ---

// Carrega o conteúdo principal (Apps/Jogos) do Firestore
async function loadContentFromFirestore() {
    console.log("Iniciando carregamento do conteúdo principal...");
    try {
        const q = query(collection(db, "content"), orderBy("dateAdded", "desc"));
        const querySnapshot = await getDocs(q);
        
        allContent = [];
        querySnapshot.forEach((doc) => {
            // Garante que o downloadLink existe ou usa #
            const data = doc.data();
            allContent.push({ id: doc.id, ...data, downloadLink: data.downloadLink || '#' });
        });

        originalContent = [...allContent]; // Salva uma cópia original
        displayContent(allContent);
        console.log(`Conteúdo carregado: ${allContent.length} itens.`);
        
    } catch (error) {
        console.error("Erro ao buscar o conteúdo do Firestore:", error);
        contentGrid.innerHTML = `<p class="error-message">Erro ao carregar conteúdo. Tente recarregar a página.</p>`;
    }
}

// Cria o HTML para um único item
function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => showDetailsModal(item);

    // Ajusta o ícone/imagem com base no tipo
    const iconUrl = item.iconUrl || './assets/default-icon.png';
    const iconClass = item.contentType === 'APK' ? 'apk-icon-style' : '';

    card.innerHTML = `
        <img src="${iconUrl}" alt="Ícone de ${item.title}" class="${iconClass}">
        <div class="card-info">
            <h4 class="card-title">${item.title}</h4>
            <p class="card-category">${item.category}</p>
        </div>
    `;
    return card;
}

// Exibe a lista de conteúdo no grid principal
function displayContent(content) {
    contentGrid.innerHTML = '';
    if (content.length === 0) {
        contentGrid.innerHTML = `<p class="no-results-message">Nenhum resultado encontrado. Tente outra busca ou filtro.</p>`;
        return;
    }
    content.forEach(item => {
        contentGrid.appendChild(createContentCard(item));
    });
}

// Lógica de pesquisa em tempo real
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    // Se a busca estiver vazia, volta para o conteúdo original ou filtrado por categoria
    if (searchTerm === "") {
        displayContent(filteredContent.length > 0 ? filteredContent : originalContent);
        return;
    }

    const currentSource = filteredContent.length > 0 ? filteredContent : originalContent;
    const searchResults = currentSource.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
    );
    
    displayContent(searchResults);
});

// Lógica de filtro por categoria
categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = e.currentTarget.getAttribute('data-category');
        
        // Remove a classe 'active' de todos os links e adiciona ao clicado
        categoryLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Fecha o menu
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';

        // Filtra o conteúdo
        if (category === 'all') {
            filteredContent = [];
            displayContent(originalContent);
            document.getElementById('grid-title').textContent = 'Recentes e Destaques';
        } else {
            filteredContent = originalContent.filter(item => item.category === category);
            displayContent(filteredContent);
            document.getElementById('grid-title').textContent = category;
        }
        
        // Limpa a busca após o filtro
        searchInput.value = '';
    });
});

// Exibe o modal de detalhes do item
function showDetailsModal(item) {
    // 1. Preencher detalhes
    document.getElementById('details-icon').src = item.iconUrl || './assets/default-icon.png';
    document.getElementById('details-title').textContent = item.title;
    document.getElementById('details-category-info').textContent = `${item.contentType} | Versão: ${item.version}`;
    document.getElementById('details-full-description').textContent = item.description;

    // 2. Lógica de Proteção de Download (NOVO)
    const downloadBtn = document.getElementById('details-download-btn');
    const loginPrompt = document.getElementById('details-login-prompt');
    const downloadLink = item.downloadLink || '#'; 

    if (currentUser) {
        // Usuário logado: Mostra o botão de download real
        downloadBtn.textContent = 'Baixar Agora';
        downloadBtn.onclick = () => {
            window.open(downloadLink, '_blank');
            // Opcional: Fechar o modal
            document.getElementById('details-modal').style.display = 'none';
        };
        downloadBtn.style.display = 'block';
        loginPrompt.style.display = 'none';
    } else {
        // Usuário deslogado: Mostra a mensagem e esconde o botão real
        loginPrompt.textContent = 'Faça Login para Baixar este item.';
        loginPrompt.style.display = 'block';
        downloadBtn.textContent = 'Fazer Login';
        downloadBtn.onclick = () => {
            document.getElementById('details-modal').style.display = 'none';
            showAuthModal(); // Chama a função para mostrar o modal de login
        };
        downloadBtn.style.display = 'block'; // Deixa o botão visível, mas com a função de login
    }


    // 3. Carregar e exibir conteúdo relacionado
    loadRelatedContent(item.category, item.id);
    
    // 4. Exibir o modal
    detailsModal.style.display = 'block';
}

// Carrega conteúdo relacionado para o modal de detalhes
function loadRelatedContent(category, currentItemId) {
    const relatedSection = document.getElementById('related-apps-section');
    const relatedGrid = document.getElementById('related-apps-grid');
    relatedGrid.innerHTML = '';

    // Filtra o conteúdo com base na categoria, excluindo o item atual
    const related = originalContent
        .filter(item => item.category === category && item.id !== currentItemId)
        .slice(0, 5); // Limita a 5 itens relacionados

    if (related.length > 0) {
        relatedSection.style.display = 'block';
        related.forEach(item => {
            relatedGrid.appendChild(createContentCard(item));
        });
    } else {
        relatedSection.style.display = 'none';
    }
}


// Exibe o modal de lista completa (para "Ver Tudo")
function showFullListModal(title, content) {
    document.getElementById('full-list-title').textContent = title;
    const grid = document.getElementById('full-list-grid');
    grid.innerHTML = '';
    content.forEach(item => {
        grid.appendChild(createContentCard(item));
    });
    fullListModal.style.display = 'block';
}


// --- 4. FUNÇÕES DE VERSÃO E ATUALIZAÇÃO FORÇADA ---

// Checa a versão do servidor
async function checkForForcedUpdate() {
    try {
        const docRef = doc(db, "config", "versionControl");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const serverVersion = docSnap.data().uiVersion;
            const notificationText = docSnap.data().notificationText || "Nova atualização disponível!";
            const notificationActive = docSnap.data().notificationActive;

            // Se o servidor tiver uma versão maior, força o reload
            if (serverVersion > CURRENT_UI_VERSION) {
                console.warn(`Atualização forçada: Versão do servidor (${serverVersion}) > Versão local (${CURRENT_UI_VERSION})`);
                forcedUpdateNotification.style.display = 'flex';
                document.getElementById('update-notification-text').textContent = "Atualização obrigatória do App! Recarregue a página.";
            } else if (notificationActive) {
                // Se a notificação não é obrigatória, mas está ativa
                forcedUpdateNotification.style.display = 'flex';
                document.getElementById('update-notification-text').textContent = notificationText;
            } else {
                forcedUpdateNotification.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Erro ao checar a versão do servidor:", error);
    }
}


// --- 5. LÓGICA DE AUTENTICAÇÃO (NOVO) ---

// Função para abrir o modal de autenticação
function showAuthModal() {
    // Garante que o menu e outros modais estejam fechados
    hamburgerMenu.classList.remove('open');
    menuOverlay.style.display = 'none';
    detailsModal.style.display = 'none';
    fullListModal.style.display = 'none';

    // Garante que o modo seja login por padrão ao abrir
    isLoginMode = true;
    updateAuthModalUI();
    authModal.style.display = 'block';
}

// Função para alternar entre Login e Cadastro
function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    updateAuthModalUI();
}

// Função para atualizar a interface do modal (título, campos, botão)
function updateAuthModalUI() {
    const nameGroup = document.getElementById('auth-name-group');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (isLoginMode) {
        authTitle.textContent = 'Entrar na Conta';
        nameGroup.style.display = 'none';
        toggleAuthBtn.textContent = 'Não tem conta? Crie uma!';
        submitBtn.textContent = 'Entrar';
    } else {
        authTitle.textContent = 'Criar Nova Conta';
        nameGroup.style.display = 'block';
        toggleAuthBtn.textContent = 'Já tem conta? Faça Login!';
        submitBtn.textContent = 'Cadastrar';
    }
    // Limpar campos
    authForm.reset();
}

// Handler de Submissão do Formulário (Login/Cadastro)
async function handleAuthSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const nameInput = document.getElementById('auth-name');
    const name = nameInput && nameInput.value ? nameInput.value.trim() : '';

    // Validação básica
    if (!email || !password || (!isLoginMode && !name)) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    try {
        if (isLoginMode) {
            // Lógica de Login
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login bem-sucedido!");
        } else {
            // Lógica de Cadastro
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Opcional: Salvar o nome no perfil ou no Firestore se necessário
            // await updateProfile(userCredential.user, { displayName: name });
            alert("Conta criada com sucesso! Você já está logado.");
        }
        authModal.style.display = 'none'; // Fecha o modal
    } catch (error) {
        console.error("Erro na autenticação:", error);
        // Mensagens de erro amigáveis
        let errorMessage = "Ocorreu um erro na autenticação.";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = "Email ou senha incorretos.";
                break;
            case 'auth/email-already-in-use':
                errorMessage = "Este email já está em uso.";
                break;
            case 'auth/weak-password':
                errorMessage = "A senha deve ter pelo menos 6 caracteres.";
                break;
            default:
                errorMessage += ` (${error.message})`;
        }
        alert(errorMessage);
    }
}

// Login com Google
async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        alert("Login com Google bem-sucedido!");
        authModal.style.display = 'none'; // Fecha o modal
    } catch (error) {
        console.error("Erro ao logar com Google:", error);
        // Não é necessário alerta, pois a interface do Google já informa a falha
    }
}

// Logout
async function handleLogout() {
    try {
        await signOut(auth);
        // A interface será atualizada pelo onAuthStateChanged
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
    }
}

// Listener global para o estado de autenticação (Importante!)
onAuthStateChanged(auth, (user) => {
    currentUser = user; // Atualiza a variável global
    updateHeaderUI(); // Atualiza a interface (botão de login/perfil)
});

// Atualiza o botão do menu (Login ou Perfil/Logout)
function updateHeaderUI() {
    const loginMenuItem = document.getElementById('menu-login-item');
    const profileMenuItem = document.getElementById('menu-profile-item');

    // Remove listeners existentes para evitar duplicação (boas práticas)
    if (loginMenuItem) loginMenuItem.removeEventListener('click', showAuthModal);
    if (profileMenuItem) profileMenuItem.removeEventListener('click', handleLogout);

    if (currentUser) {
        // Usuário logado
        const userName = currentUser.displayName || currentUser.email;
        // Mostra o nome do usuário (ou a primeira parte do email)
        profileMenuItem.innerHTML = `<i data-lucide="user-circle"></i> <span>Perfil: ${userName.split('@')[0]}</span>`;
        profileMenuItem.style.display = 'flex';
        profileMenuItem.addEventListener('click', handleLogout); // Usar como botão de Logout
        
        loginMenuItem.style.display = 'none';
    } else {
        // Usuário deslogado
        loginMenuItem.style.display = 'flex';
        profileMenuItem.style.display = 'none';
        loginMenuItem.addEventListener('click', showAuthModal);
    }
    
    // Para renderizar os ícones do Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}


// --- 6. FUNÇÕES DE UI E EVENTOS ---

// Toggle do Menu Hamburger
hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('open');
    if (hamburgerMenu.classList.contains('open')) {
        menuOverlay.style.display = 'block';
    } else {
        menuOverlay.style.display = 'none';
    }
});

// Fechar Menu e Modais
document.addEventListener('click', (event) => {
    const target = event.target;
    
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    }

    // Fecha qualquer modal clicando no 'X' ou na área externa
    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    if (target === detailsModal || target === fullListModal || target === authModal) {
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

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', async () => {
    // Carregamento de conteúdo e UI básica
    await loadContentFromFirestore();
    await checkForForcedUpdate(); 
    startPlaceholderAnimation();
    
    // Inicia os ícones do Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // NOVO: Adiciona os listeners de autenticação
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
    if (toggleAuthBtn) toggleAuthBtn.addEventListener('click', toggleAuthMode);
    if (googleSignInBtn) googleSignInBtn.addEventListener('click', signInWithGoogle);
});
