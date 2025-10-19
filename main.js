// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.4; // <--- ATUALIZADO PARA VERSÃO 1.4

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
    updateProfile 
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
const auth = getAuth(app); // <--- INICIALIZA O FIREBASE AUTH


// ------------------------------------------------------------------
// NOVA FUNÇÃO: CHECAGEM DE ATUALIZAÇÃO FORÇADA
// ------------------------------------------------------------------
async function checkForForcedUpdate() {
    try {
        const settingsDocRef = doc(db, 'settings', 'config'); 
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
            const serverVersion = docSnap.data().web_ui_version || 1.0; 
            
            if (serverVersion > CURRENT_UI_VERSION) {
                console.log(`Nova versão de UI (${serverVersion}) disponível. Versão local: ${CURRENT_UI_VERSION}. Forçando atualização.`);
                
                if (confirm("Uma atualização de sistema essencial está disponível. Recarregar agora para ver as novidades?")) {
                    window.location.reload(true); 
                } else {
                    alert("Aguarde, a atualização é obrigatória para usar o aplicativo.");
                    setTimeout(() => window.location.reload(true), 500);
                }
            }
        }
    } catch (error) {
        console.error("Erro ao verificar versão de UI. Continuar com a versão atual.", error);
    }
}
// ------------------------------------------------------------------


let selectedItem = null; 
let allContent = []; 
let currentUser = null; // Armazena o objeto de usuário logado
let isRegisterMode = true; // Começa no modo Cadastro para o modal Auth

// Mapeamento dos tipos de conteúdo
const typeMap = {
    'jogo': 'Jogos',
    'app_geral': 'Apps (Geral)',
    'frp': 'FRP/Desbloqueio',
    'software': 'Software'
};

// Mapeamento de ícones para filtros (Lucide)
const filterIcons = {
    'all': 'list',
    'jogo': 'gamepad-2',
    'app_geral': 'app-window',
    'frp': 'lock-open',
    'software': 'monitor-dot'
};

// Tipos de conteúdo a serem exibidos como seções na tela inicial (ordem)
const contentSectionsOrder = ['jogo', 'app_geral', 'frp', 'software']; 

// NOVO: Parâmetros de injeção
const INJECTION_INTERVAL = 15; // Número de apps misturados antes da injeção
let injectionIndex = 0; // Índice para ciclar pelas categorias injetadas


// --- 2. REFERÊNCIAS DOM ---
const hamburgerBtn = document.getElementById('hamburger-btn');
const hamburgerMenu = document.getElementById('hamburger-menu');
const searchInput = document.getElementById('search-input');
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal'); 
const fullListTitle = document.getElementById('full-list-title'); 
const fullListGrid = document.getElementById('full-list-grid');   
const detailsDownloadBtn = document.getElementById('details-download-btn');
const detailsCategoryInfo = document.getElementById('details-category-info'); 
const searchResultsMessage = document.getElementById('search-results-message');
const menuOverlay = document.querySelector('.menu-overlay');
const relatedAppsGrid = document.getElementById('related-apps-grid'); 
const relatedAppsSection = document.getElementById('related-apps-section');
const categoryFilterBar = document.getElementById('category-filter-bar');
const mainContentContainer = document.getElementById('main-content-container'); 
const detailsLoginPrompt = document.getElementById('details-login-prompt'); 

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
const mainNavUl = document.getElementById('main-nav-ul'); 

// --- FUNÇÕES DE ANIMAÇÃO DE MODAL (NOVO) ---
const animateModalIn = (modalElement) => {
    modalElement.classList.remove('animate-out');
    modalElement.classList.add('animate-in');
    modalElement.style.display = 'flex';
}

const animateModalOut = (modalElement, callback = () => {}) => {
    modalElement.classList.remove('animate-in');
    modalElement.classList.add('animate-out');
    
    // Espera a animação terminar antes de esconder (0.3s definido no CSS)
    setTimeout(() => {
        modalElement.style.display = 'none';
        modalElement.classList.remove('animate-out');
        callback();
    }, 300); 
}


// --- 3. FUNÇÕES DE AUTENTICAÇÃO ---

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
                if (name) {
                    await updateProfile(userCredential.user, { displayName: name }); 
                }
                showAuthMessage("Conta criada com sucesso! Você está logado.");
            } else {
                // LOGIN COM EMAIL/SENHA
                await signInWithEmailAndPassword(auth, email, password);
                showAuthMessage("Login realizado com sucesso!");
            }
            animateModalOut(authModal); // Usa a nova animação
            // Fechar o menu hamburguer, caso esteja aberto
            hamburgerMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
        } catch (error) {
            let errorMessage = "Erro na autenticação. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este email já está em uso. Tente fazer login.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Email ou senha incorretos. Tente novamente.";
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
            showAuthMessage("Login com Google realizado com sucesso!");
            animateModalOut(authModal); // Usa a nova animação
            // Fechar o menu hamburguer, caso esteja aberto
            hamburgerMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
        } catch (error) {
            console.error(error.message);
            showAuthMessage(`Erro no Google Login: ${error.message}`, true);
        }
    });
};

const updateAuthMenuButton = (user) => {
    // Remove o botão antigo de Sair/Login
    const existingAuthBtn = document.getElementById('auth-menu-btn');
    if (existingAuthBtn) existingAuthBtn.closest('li').remove();

    const li = document.createElement('li');
    li.style.marginTop = '20px'; // Adiciona um pequeno espaçamento visual

    if (user) {
        // Usuário LOGADO: Mostrar botão de SAIR
        li.innerHTML = `
            <li><a href="#" id="auth-menu-btn" class="logout-icon" data-action="logout">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Sair
            </a></li>
        `;
        mainNavUl.appendChild(li);
        document.getElementById('auth-menu-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                alert("Você saiu da conta com sucesso.");
                hamburgerMenu.classList.remove('open');
                menuOverlay.style.display = 'none';
            } catch (error) {
                alert("Erro ao sair: " + error.message);
            }
        });
    } else {
        // Usuário DESLOGADO: Mostrar botão de LOGIN
        li.innerHTML = `
            <li><a href="#" id="auth-menu-btn" class="no-icon" data-action="show-login" style="background-color: var(--secondary-highlight-color); color: var(--text-color-light);">
                Fazer Login
            </a></li>
        `;
        mainNavUl.appendChild(li);
        document.getElementById('auth-menu-btn').addEventListener('click', (e) => {
            e.preventDefault();
            hamburgerMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
            // Configura e abre o modal de login
            isRegisterMode = false;
            authTitle.textContent = "Faça Login";
            authSubmitBtn.textContent = "Entrar";
            authNameInput.style.display = 'none';
            toggleAuthBtn.textContent = "Criar Nova Conta";
            authForm.reset();
            animateModalIn(authModal); // Usa a nova animação
        });
    }
    lucide.createIcons();
};

// Listener principal que monitora o estado de autenticação
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthMenuButton(user);
    if (user) {
        // USUÁRIO LOGADO
        detailsLoginPrompt.style.display = 'none'; // Oculta a mensagem de login no modal de detalhes
        detailsDownloadBtn.textContent = "Baixar Agora"; // Restaura o texto do botão
        detailsDownloadBtn.disabled = false;
    } 
    // Se o usuário estiver deslogado, a função updateAuthMenuButton cuidará da UI no menu.
});


// --- 4. FUNÇÕES UTILITÁRIAS ---

// Função para renderizar um card de App (USADO EM TODOS OS GRIDS)
function renderAppCard(data, gridElement) {
    const card = document.createElement('div');
    card.className = 'app-card glass-effect'; // Adiciona o glass-effect ao card
    
    card.dataset.search = `${data.name.toLowerCase()} ${data.category ? data.category.toLowerCase() : ''} ${data.type.toLowerCase()}`;
    card.dataset.type = data.type; 

    const descriptionText = data.category || data.description || 'Geral'; 
    
    card.innerHTML = `
        <img src="${data.image}" class="app-icon" alt="Ícone de ${data.name}" onerror="this.onerror=null; this.src='https://placehold.co/90x90/212B36/F8F9FA?text=${data.type.toUpperCase().substring(0,3)}';">
        <div class="app-title">${data.name}</div>
        <div class="app-description">${descriptionText}</div> `;
    
    card.addEventListener('click', () => {
        showDetailsModal(data);
    });

    gridElement.appendChild(card);
}

// --- 5. NOVAS FUNÇÕES DE RENDERIZAÇÃO DE LAYOUT (Mantido) ---

// Função para injetar uma Seção Horizontal de Categoria (para o feed dinâmico)
function injectHorizontalSection(typeId, sectionContent) {
    const sectionTitle = typeMap[typeId] || 'Destaques';
    
    const sectionElement = document.createElement('section');
    sectionElement.className = 'content-section';
    sectionElement.id = `${typeId}-injected-section`;
    
    sectionElement.innerHTML = `
        <div class="section-header">
            <h2>Destaques em ${sectionTitle}</h2>
            <a href="#" class="view-all-link" data-type-id="${typeId}">Ver todos <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg></a>
        </div>
        <div class="content-grid" id="${typeId}-injected-grid">
            </div>
    `;
    
    const gridElement = sectionElement.querySelector('.content-grid');
    sectionContent.forEach(data => renderAppCard(data, gridElement));
    mainContentContainer.appendChild(sectionElement); 
}

// Renderiza o layout principal dinâmico (Feed misturado + Seções Injetadas)
function renderDynamicFeedLayout(content) {
    mainContentContainer.innerHTML = '';
    
    // 1. Cria o contêiner do feed vertical misturado
    const feedContainer = document.createElement('div');
    feedContainer.className = 'dynamic-feed-container'; 
    mainContentContainer.appendChild(feedContainer);
    
    const injectedTypes = new Set();
    injectionIndex = 0; // Reseta o índice de injeção

    content.forEach((item, index) => {
        // 1. Renderiza o item no feed vertical misturado
        renderAppCard(item, feedContainer); 

        // 2. Verifica o ponto de injeção
        if ((index + 1) % INJECTION_INTERVAL === 0) {
            
            // Encontra a próxima categoria que ainda não foi injetada (e tem conteúdo)
            let typeToInject = null;
            let initialIndex = injectionIndex;
            
            do {
                let currentType = contentSectionsOrder[injectionIndex];
                if (!injectedTypes.has(currentType) && allContent.some(app => app.type === currentType)) {
                    typeToInject = currentType;
                    break;
                }
                injectionIndex = (injectionIndex + 1) % contentSectionsOrder.length;
            } while (injectionIndex !== initialIndex);

            if (typeToInject) {
                // 3. Performar injeção
                const sectionContent = allContent.filter(app => app.type === typeToInject).slice(0, 8);
                
                if (sectionContent.length > 0) {
                    // A injeção é feita diretamente no mainContentContainer
                    injectHorizontalSection(typeToInject, sectionContent);
                    injectedTypes.add(typeToInject);
                    
                    // Move para a próxima categoria para o próximo ciclo
                    injectionIndex = (injectionIndex + 1) % contentSectionsOrder.length;
                }
            }
        }
    });
    
    bindViewAllEvents();
}

// Renderiza a lista completa em grid vertical (usada para Filtros e Pesquisa)
function renderVerticalGrid(content, targetElement) {
    targetElement.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'full-list-grid';
    
    if (content.length === 0) {
         targetElement.innerHTML = `<div class="loading-message" style="width: 100%; text-align: center; padding: 30px; color: var(--text-color-light);">Nenhum item encontrado nesta visualização.</div>`;
         return;
    }
    
    content.forEach(data => renderAppCard(data, grid));
    targetElement.appendChild(grid);
}

// --- 6. LÓGICA DE CARREGAMENTO E FILTROS (Mantido) ---

async function loadContentFromFirestore() {
    const contentCollection = collection(db, 'content');
    
    try {
        const qAll = query(contentCollection, orderBy('createdAt', 'desc'));
        const snapshotAll = await getDocs(qAll);
        
        allContent = [];
        snapshotAll.forEach(doc => {
            const data = doc.data();
            if (typeMap[data.type]) { 
                allContent.push(data);
            }
        });

        // NOVO DEFAULT: Renderiza o layout dinâmico
        renderDynamicFeedLayout(allContent);

        // Renderiza os botões de filtro na barra superior
        renderCategoryFilters();
        
        startPlaceholderAnimation(); 
        console.log(`Conteúdo do Firestore carregado. ${allContent.length} itens.`);
        
    } catch (error) {
        console.error("Erro ao carregar o conteúdo do Firestore:", error);
        mainContentContainer.innerHTML = `<div class="loading-message" style="width: 100%; text-align: center; color: red;">Erro ao carregar o conteúdo: ${error.message}</div>`;
    }
}

// Renderiza os botões de filtro na barra de navegação
function renderCategoryFilters() {
    categoryFilterBar.innerHTML = ''; 
    
    // 1. Botão "Tudo"
    const allButton = document.createElement('button');
    allButton.className = 'filter-button active';
    allButton.dataset.filterType = 'all';
    allButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>Tudo`;
    allButton.addEventListener('click', () => filterByCategory('all'));
    categoryFilterBar.appendChild(allButton);
    
    // 2. Botões de Categorias Principais (Tipos)
    contentSectionsOrder.forEach(typeId => {
        if (allContent.some(item => item.type === typeId)) {
            const button = document.createElement('button');
            button.className = 'filter-button';
            button.dataset.filterType = typeId;
            const iconName = filterIcons[typeId] || 'layout-list';
            button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${iconName}">${lucide.icons[iconName] ? lucide.icons[iconName].contents : ''}</svg>${typeMap[typeId]}`;
            button.addEventListener('click', () => filterByCategory(typeId));
            categoryFilterBar.appendChild(button);
        }
    });
    
    lucide.createIcons(); 
}

// Lógica para filtrar a tela principal
function filterByCategory(typeId) {
    // Limpa a pesquisa e esconde a mensagem
    searchInput.value = '';
    searchResultsMessage.style.display = 'none';

    // 1. Atualiza o estado dos botões de filtro
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-button[data-filter-type="${typeId}"]`).classList.add('active');
    
    // 2. Controla o conteúdo principal
    if (typeId === 'all') {
        // Volta para o layout dinâmico
        renderDynamicFeedLayout(allContent);
    } else {
        // Exibe a lista completa (grid vertical) para a categoria selecionada
        const filteredContent = allContent.filter(item => item.type === typeId);
        
        // Limpa o conteúdo principal e renderiza o grid vertical
        mainContentContainer.innerHTML = '';
        renderVerticalGrid(filteredContent, mainContentContainer);
    }
}

// --- 7. LÓGICA DE PESQUISA EM TEMPO REAL (Mantido) ---

function filterContent(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    // Desativa todos os filtros na barra de navegação
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));

    if (searchTerm.length === 0) {
        filterByCategory('all'); // Retorna ao feed dinâmico (Novo estado inicial)
        return;
    }
    
    const results = allContent.filter(item => {
        const searchData = `${item.name.toLowerCase()} ${item.category ? item.category.toLowerCase() : ''} ${item.type.toLowerCase()}`;
        return searchData.includes(searchTerm);
    });
    
    // Limpa e prepara o container para os resultados da pesquisa
    mainContentContainer.innerHTML = '';
    searchResultsMessage.style.display = 'none';

    if (results.length === 0) {
        searchResultsMessage.textContent = `Nenhum resultado encontrado para "${searchTerm}".`;
        searchResultsMessage.style.display = 'block';
    } else {
        searchResultsMessage.style.display = 'none';
        // Renderiza os resultados da pesquisa como um grid vertical
        renderVerticalGrid(results, mainContentContainer);
    }
}

searchInput.addEventListener('input', (event) => {
    filterContent(event.target.value);
});

// --- 8. EVENTOS DOS MODAIS E "VER TODOS" ---

function showDetailsModal(itemData) {
    selectedItem = itemData; 
    
    document.getElementById('details-title').textContent = itemData.name;
    document.getElementById('details-icon').src = itemData.image;
    document.getElementById('details-icon').alt = `Capa de ${itemData.name}`;
    document.getElementById('details-full-description').textContent = itemData.fullDescription || itemData.description;
    
    const typeDisplay = typeMap[itemData.type] || 'Conteúdo';
    const categoryDisplay = itemData.category || 'Geral';
    detailsCategoryInfo.textContent = `${typeDisplay} / ${categoryDisplay}`;

    // NOVO: Lógica de Autenticação no Modal de Detalhes
    if (!currentUser) {
        detailsLoginPrompt.textContent = "Faça login para poder baixar este item.";
        detailsLoginPrompt.style.display = 'block';
        detailsDownloadBtn.textContent = "Fazer Login para Baixar";
        detailsDownloadBtn.disabled = false; 
    } else {
        detailsLoginPrompt.style.display = 'none';
        detailsDownloadBtn.textContent = "Baixar Agora";
        detailsDownloadBtn.disabled = false;
    }

    // Lógica para Conteúdo Relacionado 
    relatedAppsGrid.innerHTML = ''; 
    
    const relatedItems = allContent.filter(item => 
        item.type === itemData.type &&
        item.category === itemData.category && 
        item.name !== itemData.name 
    ).slice(0, 5); 

    if (relatedItems.length > 0) {
        relatedAppsSection.style.display = 'block';
        relatedItems.forEach(item => {
            renderAppCard(item, relatedAppsGrid); 
        });
    } else {
        relatedAppsSection.style.display = 'none';
    }

    animateModalIn(detailsModal); // Usa a nova função de animação
}

// Função para mostrar Modal de Lista Completa ("Ver Todos")
function showFullListModal(typeId) {
    const typeTitle = typeMap[typeId] || 'Categoria';
    
    fullListTitle.textContent = `Todos os Itens em: ${typeTitle}`;
    
    const fullContent = allContent.filter(item => item.type === typeId);
    
    // Usa a função de renderização de grid vertical
    renderVerticalGrid(fullContent, fullListGrid);
    
    animateModalIn(fullListModal); // Usa a nova função de animação
}

// Atribui o evento de clique aos links "Ver todos"
function bindViewAllEvents() {
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const typeId = event.currentTarget.dataset.typeId;
            showFullListModal(typeId);
        });
    });
}

// Adiciona evento de clique aos links do Menu Hamburguer para usar o filtro
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (event) => {
        // Apenas links com data-filter-type devem fechar o menu e filtrar
        if (link.dataset.filterType) {
            event.preventDefault();
            const typeId = link.dataset.filterType;
            filterByCategory(typeId);
            hamburgerMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
        }
    });
});

detailsDownloadBtn.addEventListener('click', () => {
    // SEÇÃO CRÍTICA: EXIGE LOGIN
    if (!currentUser) { 
        animateModalOut(detailsModal, () => { // Fecha com animação, depois abre o Auth
            // Configura o modal de Auth para começar em Login por conveniência
            isRegisterMode = false;
            authTitle.textContent = "Faça Login";
            authSubmitBtn.textContent = "Entrar";
            authNameInput.style.display = 'none';
            toggleAuthBtn.textContent = "Criar Nova Conta";
            authForm.reset();

            animateModalIn(authModal);   // Abre o modal de login com animação
        });
        return; 
    }

    // Se o usuário estiver logado, prossegue com o download
    const downloadUrl = selectedItem.downloadLink; 
    if (downloadUrl && downloadUrl.startsWith('http')) {
        window.location.href = downloadUrl;
    } else {
        alert("Erro: Link de download inválido ou não configurado no Firebase.");
    }
    animateModalOut(detailsModal); // Fecha com animação
});

// --- 9. INICIALIZAÇÃO E EVENTOS GERAIS ---

// Toggle do Menu Hamburguer
hamburgerBtn.addEventListener('click', () => {
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
    
    // Fechar Menu (clicando no overlay)
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    }

    // Fechar Modais (clicando no 'x' ou no overlay do modal)
    if (target.classList.contains('modal-close')) {
         const modal = target.closest('.modal');
         animateModalOut(modal); // Usa a nova animação
    }
    // Adicionado para fechar clicando no fundo (overlay) do modal
    if (target === detailsModal || target === fullListModal || target === authModal) { 
        animateModalOut(target); // Usa a nova animação
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
    setupAuthListeners(); // Configura os listeners de login/cadastro
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
