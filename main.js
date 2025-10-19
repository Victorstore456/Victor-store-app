// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 1.5; // <--- ATUALIZADO PARA V1.5

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

// ------------------------------------------------------------------
// NOVA LÓGICA DE CHECAGEM DE ATUALIZAÇÃO E NOTIFICAÇÃO
// ------------------------------------------------------------------

let latestUpdate = null; // Armazena os dados da notificação de atualização

async function checkForForcedUpdate() {
    try {
        const settingsDocRef = doc(db, 'settings', 'config'); 
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const serverVersion = data.web_ui_version || 1.0; 
            
            // 1. CHECAGEM OBRIGATÓRIA (Força o reload se a versão do servidor for maior)
            if (serverVersion > CURRENT_UI_VERSION) {
                console.log(`Nova versão de UI (${serverVersion}) disponível. Versão local: ${CURRENT_UI_VERSION}. Forçando atualização.`);
                if (confirm("Uma atualização de sistema essencial está disponível. Recarregar agora para ver as novidades?")) {
                    window.location.reload(true); 
                } else {
                    alert("Aguarde, a atualização é obrigatória para usar o aplicativo.");
                    setTimeout(() => window.location.reload(true), 500);
                }
                return; // Para a execução se for obrigatório
            }
            
            // 2. CHECAGEM DE NOTIFICAÇÃO (Mostra o alerta se houver um update NOVO ou RECENTE)
            const updateDocRef = doc(db, 'settings', 'latest_update');
            const updateSnap = await getDoc(updateDocRef);
            
            if (updateSnap.exists()) {
                latestUpdate = updateSnap.data();
                
                // Verifica se já foi marcada como vista no localStorage
                const lastSeenId = localStorage.getItem('lastUpdateId');
                
                if (latestUpdate.id && latestUpdate.id !== lastSeenId) {
                    console.log("Nova Notificação de Atualização Encontrada!");
                    updateNotificationUI(true); // Mostra o badge e o item de menu
                } else {
                    updateNotificationUI(false); // Esconde o badge e o item de menu
                }
            } else {
                updateNotificationUI(false); // Esconde se não houver documento
            }
        }
    } catch (error) {
        console.error("Erro ao verificar versão/notificação de UI:", error);
    }
}

// Atualiza a interface da notificação (Badge e item de menu)
function updateNotificationUI(isNew) {
    const badge = document.getElementById('hamburger-badge');
    const updateItem = document.getElementById('update-notification-item');
    
    if (isNew) {
        badge.style.display = 'block';
        updateItem.style.display = 'list-item'; // Torna o item visível
    } else {
        badge.style.display = 'none';
        updateItem.style.display = 'none'; // Esconde o item
    }
}

// Lógica de clique no link de notificação
function handleNotificationClick(event) {
    event.preventDefault();
    
    if (latestUpdate) {
        // Marca como visto no localStorage
        localStorage.setItem('lastUpdateId', latestUpdate.id);
        updateNotificationUI(false); // Esconde a notificação da UI
        
        // Abre o link de download/informação
        if (latestUpdate.link) {
            window.open(latestUpdate.link, '_blank');
        } else {
            alert('Nova Atualização! Não foi possível encontrar o link para o download. Entre em contato com o suporte.');
        }
        
        // Fecha o menu
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    } else {
        alert('Nenhuma informação de atualização disponível.');
    }
}


// ------------------------------------------------------------------


let selectedItem = null; 
let allContent = []; 

// CATEGORIAS PRINCIPAIS: Usado para mapear IDs para nomes de exibição
const typeMap = {
    'jogo': 'Jogos',
    'app_geral': 'Apps (Geral)',
    'frp': 'FRP/Desbloqueio',
    'software': 'Software'
};

// SUBCATEGORIAS: Adicionado para uniformidade (Espelho do Admin Panel)
const categoriesMap = {
    'jogo': ['Ação', 'Aventura', 'Puzzle', 'Estratégia', 'Simulação'],
    'app_geral': ['Produtividade', 'Redes Sociais', 'Ferramentas', 'Entretenimento'],
    'frp': ['Samsung', 'Motorola', 'Xiaomi', 'Geral'],
    'software': ['Sistema Operacional', 'Utilitários', 'Segurança', 'Design']
};

const filterIcons = {
    'all': 'list',
    'jogo': 'gamepad-2',
    'app_geral': 'app-window',
    'frp': 'lock-open',
    'software': 'monitor-dot'
};

const contentSectionsOrder = ['jogo', 'app_geral', 'frp', 'software']; 

const INJECTION_INTERVAL = 15; 
let injectionIndex = 0; 


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
const updateNotificationLink = document.getElementById('update-notification-link'); // Novo


// --- 3. FUNÇÕES UTILITÁRIAS ---

function renderAppCard(data, gridElement) {
    const card = document.createElement('div');
    card.className = 'app-card';
    
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

// --- 4. FUNÇÕES DE RENDERIZAÇÃO DE LAYOUT ---

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

function renderDynamicFeedLayout(content) {
    mainContentContainer.innerHTML = '';
    
    const feedContainer = document.createElement('div');
    feedContainer.className = 'dynamic-feed-container'; 
    mainContentContainer.appendChild(feedContainer);
    
    const injectedTypes = new Set();
    injectionIndex = 0; 

    content.forEach((item, index) => {
        renderAppCard(item, feedContainer); 

        if ((index + 1) % INJECTION_INTERVAL === 0) {
            
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
                const sectionContent = allContent.filter(app => app.type === typeToInject).slice(0, 8);
                
                if (sectionContent.length > 0) {
                    injectHorizontalSection(typeToInject, sectionContent);
                    injectedTypes.add(typeToInject);
                    
                    injectionIndex = (injectionIndex + 1) % contentSectionsOrder.length;
                }
            }
        }
    });
    
    bindViewAllEvents();
}

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

// --- 5. LÓGICA DE CARREGAMENTO E FILTROS ---

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

        renderDynamicFeedLayout(allContent);
        renderCategoryFilters();
        
        startPlaceholderAnimation(); 
        console.log(`Conteúdo do Firestore carregado. ${allContent.length} itens.`);
        
    } catch (error) {
        console.error("Erro ao carregar o conteúdo do Firestore:", error);
        mainContentContainer.innerHTML = `<div class="loading-message" style="width: 100%; text-align: center; color: red;">Erro ao carregar o conteúdo: ${error.message}</div>`;
    }
}

function renderCategoryFilters() {
    categoryFilterBar.innerHTML = ''; 
    
    const allButton = document.createElement('button');
    allButton.className = 'filter-button active';
    allButton.dataset.filterType = 'all';
    allButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>Tudo`;
    allButton.addEventListener('click', () => filterByCategory('all'));
    categoryFilterBar.appendChild(allButton);
    
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
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons(); 
    }
}

function filterByCategory(typeId) {
    searchInput.value = '';
    searchResultsMessage.style.display = 'none';

    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.filter-button[data-filter-type="${typeId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    if (typeId === 'all') {
        renderDynamicFeedLayout(allContent);
    } else {
        const filteredContent = allContent.filter(item => item.type === typeId);
        mainContentContainer.innerHTML = '';
        renderVerticalGrid(filteredContent, mainContentContainer);
    }
}

// --- 6. LÓGICA DE PESQUISA EM TEMPO REAL ---

function filterContent(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));

    if (searchTerm.length === 0) {
        filterByCategory('all'); 
        return;
    }
    
    const results = allContent.filter(item => {
        const searchData = `${item.name.toLowerCase()} ${item.category ? item.category.toLowerCase() : ''} ${item.type.toLowerCase()}`;
        return searchData.includes(searchTerm);
    });
    
    mainContentContainer.innerHTML = '';
    searchResultsMessage.style.display = 'none';

    if (results.length === 0) {
        searchResultsMessage.textContent = `Nenhum resultado encontrado para "${searchTerm}".`;
        searchResultsMessage.style.display = 'block';
    } else {
        searchResultsMessage.style.display = 'none';
        renderVerticalGrid(results, mainContentContainer);
    }
}

searchInput.addEventListener('input', (event) => {
    filterContent(event.target.value);
});

// --- 7. EVENTOS DOS MODAIS E "VER TODOS" ---

function showDetailsModal(itemData) {
    selectedItem = itemData; 
    
    document.getElementById('details-title').textContent = itemData.name;
    document.getElementById('details-icon').src = itemData.image;
    document.getElementById('details-icon').alt = `Capa de ${itemData.name}`;
    document.getElementById('details-full-description').textContent = itemData.fullDescription || itemData.description;
    
    const typeDisplay = typeMap[itemData.type] || 'Conteúdo';
    const categoryDisplay = itemData.category || 'Geral';
    detailsCategoryInfo.textContent = `${typeDisplay} / ${categoryDisplay}`;

    detailsDownloadBtn.disabled = false;
    detailsDownloadBtn.textContent = 'Baixar Agora';
    
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

    detailsModal.style.display = 'flex'; 
}

function showFullListModal(typeId) {
    const typeTitle = typeMap[typeId] || 'Categoria';
    
    fullListTitle.textContent = `Todos os Itens em: ${typeTitle}`;
    
    const fullContent = allContent.filter(item => item.type === typeId);
    
    renderVerticalGrid(fullContent, fullListGrid);
    
    fullListModal.style.display = 'flex';
}

function bindViewAllEvents() {
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const typeId = event.currentTarget.dataset.typeId;
            showFullListModal(typeId);
        });
    });
}

document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (event) => {
        if (link.dataset.filterType) {
            event.preventDefault();
            const typeId = link.dataset.filterType;
            filterByCategory(typeId);
            hamburgerMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
        }
    });
});

// Adiciona o listener para o NOVO link de notificação
updateNotificationLink.addEventListener('click', handleNotificationClick);


detailsDownloadBtn.addEventListener('click', () => {
    const downloadUrl = selectedItem.downloadLink; 
    if (downloadUrl && downloadUrl.startsWith('http')) {
        window.location.href = downloadUrl;
    } else {
        alert("Erro: Link de download inválido ou não configurado no Firebase.");
    }
    detailsModal.style.display = 'none';
});

// --- 8. INICIALIZAÇÃO E EVENTOS GERAIS ---

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
    
    if (target === menuOverlay) {
        hamburgerMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    }

    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    if (target === detailsModal || target === fullListModal) {
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
    // A checagem de versão agora também gerencia a notificação no menu
    await checkForForcedUpdate(); 
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
