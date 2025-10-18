// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.3; // <--- ATUALIZADO PARA VERSÃO 1.3

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

// --- IMPORTS ADICIONADOS PARA AUTENTICAÇÃO (Auth v9 Modular) ---
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged,
    updateProfile // Adicionado para atualizar o nome do usuário no cadastro
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"; // <--- NOVO IMPORT


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
const auth = getAuth(app); // <--- INICIALIZA O FIREBASE AUTH
const contentsRef = collection(db, "contents");

// --- 2. VARIÁVEIS DE ESTADO E CACHE ---
let allContent = [];
let currentUser = null; // Armazena o objeto de usuário logado
let isRegisterMode = true; // Começa no modo Cadastro para o modal Auth

// --- 3. REFERÊNCIAS DOM ---
const hamburgerMenu = document.getElementById('hamburger-menu');
const mainNav = document.getElementById('main-nav');
const menuOverlay = document.getElementById('menu-overlay');
const searchInput = document.getElementById('search-input');
const featuredContent = document.getElementById('featured-content');
const dynamicCategories = document.getElementById('dynamic-categories');
const mainContent = document.getElementById('main-content');
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal');
const detailsDownloadBtn = document.getElementById('details-download-btn');
const detailsLoginPrompt = document.getElementById('details-login-prompt');
let selectedItem = null; // Armazena o item atual no modal de detalhes

// --- REFERÊNCIAS DOM DO NOVO MODAL DE AUTENTICAÇÃO ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authMessage = document.getElementById('auth-message');
const mainNavUl = mainNav.querySelector('ul'); // Para adicionar o botão Sair

// --- 4. FUNÇÕES DE AUTENTICAÇÃO ---

const showAuthMessage = (message, isError = false) => {
    authMessage.textContent = message;
    authMessage.style.color = isError ? '#FF5555' : 'var(--highlight-color)';
    authMessage.style.display = 'block';
    setTimeout(() => { authMessage.style.display = 'none'; }, 5000);
};

const setupAuthListeners = () => {
    // Alternar entre Login e Cadastro
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        authTitle.textContent = isRegisterMode ? "Crie sua Conta" : "Faça Login";
        authSubmitBtn.textContent = isRegisterMode ? "Criar Conta" : "Entrar";
        authNameInput.style.display = isRegisterMode ? 'block' : 'none';
        toggleAuthBtn.textContent = isRegisterMode ? "Já Tenho Conta? Fazer Login" : "Criar Nova Conta";
        authMessage.style.display = 'none';
        authForm.reset();
    });

    // Envio do Formulário (Login ou Cadastro)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        const name = authNameInput.value;

        try {
            if (isRegisterMode) {
                // CADASTRAR COM EMAIL/SENHA
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Opcional: Atualizar nome do usuário
                if (name) {
                    await updateProfile(userCredential.user, { displayName: name }); 
                }
                showAuthMessage("Conta criada com sucesso! Você está logado.");
            } else {
                // LOGIN COM EMAIL/SENHA
                await signInWithEmailAndPassword(auth, email, password);
                showAuthMessage("Login realizado com sucesso!");
            }
            authModal.style.display = 'none';
        } catch (error) {
            // O Firebase tem códigos de erro específicos
            let errorMessage = "Erro na autenticação. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este email já está em uso. Tente fazer login.";
            } else if (error.code === 'auth/invalid-email' || error.code === 'auth/weak-password' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Email, senha ou formato inválido. Tente novamente.";
            } else {
                 console.error(error.message);
                 errorMessage = error.message;
            }
            showAuthMessage(errorMessage, true);
        }
    });

    // Google Sign-in
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // O Firebase cuida do cadastro automático se for o primeiro login do Google
            showAuthMessage("Login com Google realizado com sucesso!");
            authModal.style.display = 'none';
        } catch (error) {
            console.error(error.message);
            showAuthMessage(`Erro no Google Login: ${error.message}`, true);
        }
    });
};

const addSignOutButton = () => {
    // Remove o botão de Sair antigo se existir
    const existingSignOut = document.getElementById('sign-out-btn');
    if (existingSignOut) existingSignOut.remove();
    
    // Cria o novo botão de Sair
    const signOutLi = document.createElement('li');
    signOutLi.innerHTML = `<a href="#" id="sign-out-btn" style="color: #FF5555;">Sair (Logout)</a>`;
    mainNavUl.appendChild(signOutLi);

    document.getElementById('sign-out-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            alert("Você saiu da conta.");
            // O onAuthStateChanged cuidará do resto
        } catch (error) {
            alert("Erro ao sair: " + error.message);
        }
    });
};

const removeSignOutButton = () => {
    const existingSignOut = document.getElementById('sign-out-btn');
    if (existingSignOut) existingSignOut.closest('li').remove();
};

// Listener principal que monitora o estado de autenticação
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // USUÁRIO LOGADO
        console.log("Usuário logado:", user.email || user.displayName);
        detailsLoginPrompt.style.display = 'none'; // Oculta a mensagem de login no modal de detalhes
        detailsDownloadBtn.textContent = "Baixar Agora"; // Restaura o texto do botão
        detailsDownloadBtn.disabled = false;
        addSignOutButton(); // Mostra o botão de Sair
    } else {
        // USUÁRIO DESLOGADO
        console.log("Usuário deslogado.");
        removeSignOutButton(); // Remove o botão de Sair
    }
});


// --- 5. FUNÇÕES FIRESTORE (Não alteradas, exceto a referência à versão) ---

async function loadContentFromFirestore() {
    try {
        const q = query(contentsRef, orderBy("title", "asc"));
        const querySnapshot = await getDocs(q);
        allContent = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allContent.push({ id: doc.id, ...data });
        });
        
        renderContent(allContent);
        renderNavCategories(allContent);
    } catch (error) {
        console.error("Erro ao carregar conteúdo:", error);
        alert("Erro ao carregar conteúdo da loja. Tente recarregar.");
    }
}

async function checkForForcedUpdate() {
    try {
        const settingsDoc = doc(db, "settings", "ui");
        const settingsSnap = await getDoc(settingsDoc);

        if (settingsSnap.exists()) {
            const serverVersion = settingsSnap.data().version || 1.0;
            if (serverVersion > CURRENT_UI_VERSION) {
                alert(`Uma nova versão (${serverVersion.toFixed(1)}) está disponível! Recarregando...`);
                window.location.reload(true); // Força um hard reload
            } else {
                console.log(`Versão da UI (${CURRENT_UI_VERSION.toFixed(1)}) OK.`);
            }
        }
    } catch (error) {
        console.error("Erro ao checar versão:", error);
    }
}

// ... (Restante das funções de renderização, pesquisa e manipulação do DOM) ...
// As funções renderContent, renderNavCategories, renderSection, showDetailsModal, etc., não foram alteradas em sua lógica principal.

// --- 6. FUNÇÕES DE RENDERIZAÇÃO E DOM (Lógica de exibição e busca) ---

function renderContent(contentArray) {
    // Função que renderiza todo o conteúdo na página principal
    // (Omitido para brevidade, mantenha o código original aqui)
    
    // Exemplo de como renderizar o grid principal:
    featuredContent.innerHTML = '';
    dynamicCategories.innerHTML = '';
    
    // Agrupamento por Categoria (Exemplo de lógica)
    const grouped = contentArray.reduce((acc, item) => {
        const category = item.category || 'Outros';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});
    
    // Renderiza Destaques (os 3 primeiros itens, por exemplo)
    contentArray.slice(0, 3).forEach(item => {
        featuredContent.appendChild(createItemCard(item, true));
    });

    // Renderiza Seções de Categoria
    Object.keys(grouped).forEach(category => {
        if (category !== 'Destaque') { // Ignora se houver uma categoria "Destaque"
            dynamicCategories.appendChild(renderSection(category, grouped[category]));
        }
    });
}

function renderNavCategories(contentArray) {
    // Função que preenche a navegação lateral com links de categorias
    // (Omitido para brevidade, mantenha o código original aqui)
    
    const categories = [...new Set(contentArray.map(item => item.category))];
    const existingItems = mainNavUl.querySelectorAll('li:not(:first-child):not(:last-child)');
    existingItems.forEach(li => li.remove());

    categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-action="category" data-category="${category}">${category}</a>`;
        // Insere antes do último item (que pode ser o botão Sair)
        const signOutLi = document.getElementById('sign-out-btn') ? document.getElementById('sign-out-btn').closest('li') : null;
        if (signOutLi) {
            mainNavUl.insertBefore(li, signOutLi);
        } else {
            mainNavUl.appendChild(li);
        }
    });
}


function createItemCard(item, isFeatured = false) {
    // Função que cria o HTML para um único item (card)
    // (Omitido para brevidade, mantenha o código original aqui)
    const card = document.createElement('div');
    card.classList.add(isFeatured ? 'featured-item' : 'content-item');
    card.dataset.id = item.id;
    card.addEventListener('click', () => showDetailsModal(item));

    if (isFeatured) {
         card.innerHTML = `
            <img src="${item.icon_url || ''}" alt="${item.title}" class="featured-item-image">
            <div class="featured-item-info">
                <h4>${item.title}</h4>
                <p>${item.category}</p>
            </div>
        `;
    } else {
        card.innerHTML = `
            <img src="${item.icon_url || ''}" alt="${item.title}" class="item-icon">
            <p class="item-title">${item.title}</p>
            <p class="item-category">${item.category}</p>
        `;
    }
    return card;
}

function renderSection(categoryName, items) {
    // Função que cria a seção de uma categoria
    // (Omitido para brevidade, mantenha o código original aqui)
    const section = document.createElement('section');
    section.classList.add('category-section');
    section.id = `category-${categoryName.toLowerCase().replace(/\s/g, '-')}`;

    section.innerHTML = `
        <div class="section-header">
            <h2>${categoryName}</h2>
            <a href="#" data-category="${categoryName}" data-action="view-all">Ver Todos (${items.length})</a>
        </div>
        <div class="content-grid">
            </div>
    `;

    const grid = section.querySelector('.content-grid');
    // Mostra apenas os primeiros 6 itens na visualização principal
    items.slice(0, 6).forEach(item => {
        grid.appendChild(createItemCard(item));
    });
    
    // Adiciona listener 'Ver Todos'
    section.querySelector('[data-action="view-all"]').addEventListener('click', (e) => {
        e.preventDefault();
        showFullListModal(categoryName, items);
    });

    return section;
}

function showFullListModal(title, items) {
    // Função que exibe a lista completa de uma categoria em um modal
    // (Omitido para brevidade, mantenha o código original aqui)
    document.getElementById('full-list-title').textContent = title;
    const grid = document.getElementById('full-list-grid');
    grid.innerHTML = '';
    items.forEach(item => {
        grid.appendChild(createItemCard(item)); // Reutiliza a função de card
    });
    fullListModal.style.display = 'block';
}

function showDetailsModal(item) {
    // Função que exibe o modal de detalhes de um item
    selectedItem = item;
    
    document.getElementById('details-icon').src = item.icon_url || '';
    document.getElementById('details-title').textContent = item.title;
    document.getElementById('details-category-info').textContent = item.category;
    document.getElementById('details-full-description').textContent = item.description_full || item.description_short || 'Descrição completa não disponível.';
    
    // NOVO: Verifica o estado de login ao abrir o modal de detalhes
    if (!currentUser) {
        detailsLoginPrompt.textContent = "Faça login para poder baixar este item.";
        detailsLoginPrompt.style.display = 'block';
        detailsDownloadBtn.textContent = "Fazer Login para Baixar";
        detailsDownloadBtn.disabled = false; // Permite o clique para abrir o modal de login
    } else {
        detailsLoginPrompt.style.display = 'none';
        detailsDownloadBtn.textContent = "Baixar Agora";
        detailsDownloadBtn.disabled = false;
    }


    // Lógica de apps relacionados (mantenha o original)
    const relatedAppsSection = document.getElementById('related-apps-section');
    const relatedAppsGrid = document.getElementById('related-apps-grid');
    const related = allContent.filter(app => app.category === item.category && app.id !== item.id).slice(0, 3);

    relatedAppsGrid.innerHTML = '';
    if (related.length > 0) {
        relatedAppsSection.style.display = 'block';
        related.forEach(app => relatedAppsGrid.appendChild(createItemCard(app)));
    } else {
        relatedAppsSection.style.display = 'none';
    }

    detailsModal.style.display = 'block';
}


// --- 7. LISTENERS DE EVENTOS ---

// Listener do botão de download
detailsDownloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // SEÇÃO CRÍTICA: EXIGE LOGIN
    if (!currentUser) { 
        detailsModal.style.display = 'none'; // Fecha o modal de detalhes
        authModal.style.display = 'block';   // Abre o modal de login
        
        // Configura o modal de Auth para começar em Login por conveniência
        isRegisterMode = false;
        authTitle.textContent = "Faça Login";
        authSubmitBtn.textContent = "Entrar";
        authNameInput.style.display = 'none';
        toggleAuthBtn.textContent = "Criar Nova Conta";

        return; 
    }
    
    // SE O USUÁRIO ESTIVER LOGADO, PROSSEGUE COM O DOWNLOAD
    if (selectedItem && selectedItem.download_url) {
        window.open(selectedItem.download_url, '_blank');
    } else {
        alert("Link de download não disponível.");
    }
});


hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('open');
    if (hamburgerMenu.classList.contains('open')) {
        menuOverlay.style.display = 'block';
        mainNav.style.right = '0'; // Abre o menu
    } else {
        menuOverlay.style.display = 'none';
        mainNav.style.right = '-250px'; // Fecha o menu
    }
});

// Fechar Menu e Modais
document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Fechar Menu (clicando no overlay)
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
        mainNav.style.right = '-250px';
    }

    // Fechar Modais 
    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    if (target === detailsModal || target === fullListModal || target === authModal) { // Adicionado authModal
        target.style.display = 'none';
    }
});

// Listener de Pesquisa (debounce opcional)
searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredContent = allContent.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm) ||
        (item.description_short && item.description_short.toLowerCase().includes(searchTerm))
    );

    // Esconde a view principal e mostra a lista completa com os resultados
    if (searchTerm.length > 0) {
        mainContent.style.display = 'none';
        showFullListModal(`Resultados para "${searchTerm}"`, filteredContent);
    } else {
        mainContent.style.display = 'block';
        fullListModal.style.display = 'none';
        // Opcional: recarregar o conteúdo principal
        // renderContent(allContent);
    }
});

// Listener de Ações de Navegação e Seção (Início, Categoria)
mainNavUl.addEventListener('click', (e) => {
    const target = e.target;
    const action = target.dataset.action;
    const category = target.dataset.category;

    if (target.tagName === 'A' && action) {
        e.preventDefault();
        
        // Fechar Menu
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
        mainNav.style.right = '-250px';

        if (action === 'home') {
            mainContent.style.display = 'block';
            fullListModal.style.display = 'none';
            searchInput.value = '';
            // Rolar para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (action === 'category') {
            mainContent.style.display = 'block';
            fullListModal.style.display = 'none';
            searchInput.value = '';
            const section = document.getElementById(`category-${category.toLowerCase().replace(/\s/g, '-')}`);
            if (section) {
                 // Rolar até a seção da categoria
                 window.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' }); 
            }
        }
    }
});


// Mantém a animação de placeholder (mantenha o original)
const placeholderTexts = ["Pesquisar Apps, Jogos, Software...", "Experimente: GTA V, Xender, FRP tools..."];
let placeholderIndex = 0;
function updatePlaceholder() {
    if (searchInput !== document.activeElement && searchInput.value.length === 0) {
        searchInput.placeholder = placeholderTexts[placeholderIndex];
        placeholderIndex = (placeholderIndex + 1) % placeholderTexts.length;
    }
}
function startPlaceholderAnimation() {
    // Usado setInterval para atualizar o placeholder
    setInterval(updatePlaceholder, 10000); 
    updatePlaceholder(); 
}

// --- 8. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadContentFromFirestore();
    await checkForForcedUpdate(); 
    startPlaceholderAnimation();
    setupAuthListeners(); // Configura os listeners de login/cadastro
});
