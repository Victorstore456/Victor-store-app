// main.js

// Versão atual do CÓDIGO web. Apenas mude este número quando fizer uma GRANDE atualização.
// A versão do SERVIDOR (Firestore) deve ser MAIOR que esta para forçar o reload.
const CURRENT_UI_VERSION = 2.1; 

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
    setDoc, 
    updateDoc, 
    runTransaction, 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential, 
    EmailAuthProvider, 
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
const auth = getAuth(app); 

// --- FUNÇÕES UTilitÁRIAS E CONSTANTES DE ADMIN ---

// Seu e-mail de Administrador para notificação
const ADMIN_EMAIL = "Victorstore456@gmail.com"; 

// Funções para calcular idade (Requisito: Mínimo 18 anos)
function getAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function validateAge(dateString) {
    return getAge(dateString) >= 18;
}

// Função (Nível 2) para notificar o Administrador
async function notifyAdminForReset(email, whatsapp) {
    // **NOTA:** O envio do e-mail/link de redefinição único DEVE ser feito por um SERVIDOR (Cloud Function).
    try {
        // Simulação: Enviar dados para o seu servidor (Cloud Function)
        // Você precisará desenvolver esta função no seu backend.
        
        const successMessage = `Serás notificado no WhatsApp no numero ${whatsapp} para confirmar a identidade e redefinir a senha, por favor aguarde, geralmente demora no maximo 24h.`;
        alert(successMessage);
        
        resetModal.style.display = 'none';

    } catch (error) {
        console.error("Erro ao notificar administrador:", error);
        alert("Ocorreu um erro ao processar o pedido de ajuda. Tente novamente mais tarde.");
    }
}


// --- 2. VARIÁVEIS GLOBAIS E REFERÊNCIAS DOM (COMBINADAS) ---

let selectedItem = null; 
let allContent = []; // Conteúdo do Firestore
let currentUser = null; 
let currentCustomUserData = {}; // Dados personalizados do Firestore

// Mapeamento dos tipos de conteúdo (DO SEU CÓDIGO ORIGINAL)
const typeMap = {
    'jogo': 'Jogos',
    'app_geral': 'Apps (Geral)',
    'frp': 'FRP/Desbloqueio',
    'software': 'Software'
};

// Mapeamento de ícones para filtros (Lucide) (DO SEU CÓDIGO ORIGINAL)
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

// Referências DOM - Content
const hamburgerBtn = document.getElementById('hamburger-btn');
const navMenu = document.getElementById('hamburger-menu'); // ID no HTML
const menuOverlay = document.querySelector('.menu-overlay');
const searchInput = document.getElementById('search-input');
const contentGrid = document.getElementById('content-grid'); // Não usado diretamente, mas nomeado
const detailsModal = document.getElementById('details-modal');
const fullListModal = document.getElementById('full-list-modal');
const detailsDownloadBtn = document.getElementById('details-download-btn');
const searchResultsMessage = document.getElementById('search-results-message');
const relatedAppsGrid = document.getElementById('related-apps-grid'); 
const relatedAppsSection = document.getElementById('related-apps-section');
const categoryFilterBar = document.getElementById('category-filter-bar');
const mainContentContainer = document.getElementById('main-content-container'); 

// Referências DOM - Autenticação
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const toggleAuthLink = document.getElementById('toggle-auth-link');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const registerFields = document.getElementById('register-fields');
const authPasswordConfirm = document.getElementById('auth-password-confirm');
const authSubmitBtn = document.getElementById('auth-submit-btn');

// Referências DOM - Menu Hamburguer
const menuProfileContainer = document.getElementById('menu-profile-container');
const menuLoginLink = document.getElementById('menu-login-link');
const menuLogoutLink = document.getElementById('menu-logout-link');
const profileImageMenu = document.getElementById('profile-image-menu');
const profileNameMenu = document.getElementById('profile-name-menu');
const openProfileModalBtn = document.getElementById('open-profile-modal-btn');
const logoutBtn = document.getElementById('logout-btn');

// Referências DOM - Modais de Perfil e Reset
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const resetModal = document.getElementById('reset-modal');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const notRememberForm = document.getElementById('not-remember-form');


// --- 3. LÓGICA DE FIREBASE E AUTENTICAÇÃO (MANTIDA) ---

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

// B. Atualização da Interface (UI) - Adicionada lógica de Download Gate
function updateUIAfterAuth(user) {
    if (user) {
        // Usuário Logado
        menuLoginLink.style.display = 'none';
        menuProfileContainer.style.display = 'flex';
        menuLogoutLink.style.display = 'list-item';
        
        profileImageMenu.src = user.photoURL || 'assets/default_profile.png';
        profileNameMenu.textContent = user.displayName || 'Usuário';

        // Lógica do Download Gate (Habilitar botão)
        if (detailsDownloadBtn) detailsDownloadBtn.style.display = 'block'; 
        const loginPrompt = document.getElementById('details-login-prompt');
        if (loginPrompt) loginPrompt.style.display = 'none';

    } else {
        // Usuário Deslogado
        menuLoginLink.style.display = 'list-item';
        menuProfileContainer.style.display = 'none';
        menuLogoutLink.style.display = 'none';
        
        // Lógica do Download Gate (Desabilitar botão e mostrar prompt)
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
    const isRegistering = authForm.dataset.mode === 'register';

    if (isRegistering) {
        // Mudar para Login
        authForm.dataset.mode = 'login';
        authTitle.textContent = 'Faça Login';
        authSubmitBtn.textContent = 'Entrar';
        toggleAuthLink.textContent = 'Criar conta com E-mail'; 
        forgotPasswordLink.style.display = 'block'; 
        registerFields.style.display = 'none';
        authPasswordConfirm.style.display = 'none';
    } else {
        // Mudar para Cadastro
        authForm.dataset.mode = 'register';
        authTitle.textContent = 'Crie sua Conta';
        authSubmitBtn.textContent = 'Criar Conta';
        toggleAuthLink.textContent = 'Já tenho conta, Iniciar Sessão'; 
        forgotPasswordLink.style.display = 'none'; 
        registerFields.style.display = 'flex'; // Usar 'flex' para exibir
        authPasswordConfirm.style.display = 'block';
    }
});


// E. Submissão do Formulário de Login/Registro
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isRegistering = authForm.dataset.mode === 'register';

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isRegistering) {
        // --- LÓGICA DE REGISTRO COM VALIDAÇÃO DE IDADE E CAMPOS EXTRAS ---
        const name = document.getElementById('register-name').value;
        const confirmPassword = document.getElementById('auth-password-confirm').value;
        const bday = document.getElementById('register-bday').value;
        const partner = document.getElementById('register-partner').value; 
        const gender = document.getElementById('register-gender').value; 
        const photoFile = document.getElementById('register-photo').files[0]; 

        if (password !== confirmPassword) {
            alert("As palavras-passe não batem.");
            return;
        }
        
        // 1. **VERIFICAÇÃO DE IDADE**
        if (!validateAge(bday)) {
            alert("A idade mínima para criar uma conta é de 18 anos.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const photoURL = 'assets/default_profile.png'; // Placeholder URL

            await updateProfile(user, { 
                displayName: name, 
                photoURL: photoURL 
            });

            // Salva dados personalizados no Firestore
            await setDoc(doc(db, "users", user.uid), { 
                email: email,
                name: name,
                photoURL: photoURL,
                dateOfBirth: bday,
                partnerName: partner, 
                gender: gender, 
                createdAt: new Date()
            });

            alert("Conta criada com sucesso! Você já pode fazer o download.");
            authModal.style.display = 'none';

        } catch (error) {
            console.error("Erro ao criar conta:", error.code, error.message);
            if (error.code === 'auth/email-already-in-use') {
                alert("Este e-mail já está em uso.");
            } else if (error.code === 'auth/weak-password') {
                alert("A palavra-passe deve ter pelo menos 6 caracteres.");
            } else {
                alert(`Erro ao criar conta: ${error.message}`);
            }
        }
    } else {
        // Lógica de LOGIN
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authModal.style.display = 'none';
        } catch (error) {
            console.error("Erro no login:", error.code, error.message);
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
    toggleAuthLink.textContent = 'Criar conta com E-mail';
    forgotPasswordLink.style.display = 'block';
    registerFields.style.display = 'none';
    authPasswordConfirm.style.display = 'none';
    authModal.style.display = 'flex'; // Usa flex para centralizar
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
    
    profileModal.style.display = 'flex';
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

    // 1. Validação de Idade 
    if (!validateAge(newBday)) {
        alert("A idade mínima para manter a conta é de 18 anos.");
        return;
    }

    if (!currentPassword) {
        alert("Por favor, digite sua palavra-passe atual para confirmar as alterações.");
        return;
    }

    try {
        // 2. Re-autenticação
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // 3. Atualizar Senha (se houver)
        if (newPassword) {
            await updatePassword(currentUser, newPassword);
            console.log("Senha atualizada com sucesso.");
        }

        // 4. Atualizar Dados Básicos do Auth (Nome, Foto)
        let updatedPhotoURL = currentUser.photoURL;
        if (newPhotoFile) {
             // **PLACEHOLDER:** Implementar lógica de upload para o Firebase Storage aqui
             updatedPhotoURL = 'assets/new_profile_photo.png'; 
        }
        await updateProfile(currentUser, {
            displayName: newName,
            photoURL: updatedPhotoURL
        });

        // 5. Atualizar Dados Customizados no Firestore
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


// H. Lógica de Recuperação de Senha (Fluxo de Dois Níveis)

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    authModal.style.display = 'none';
    resetModal.style.display = 'flex'; // Usa flex para centralizar
    document.getElementById('reset-title').textContent = 'Redefinir Palavra-passe';
    forgotPasswordForm.style.display = 'flex';
    notRememberForm.style.display = 'none';
});

document.getElementById('nao-lembro-de-nada-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reset-title').textContent = 'Ajuda do Administrador';
    forgotPasswordForm.style.display = 'none';
    notRememberForm.style.display = 'flex';
});

// Submissão do Reset Nível 1 (Padrão Firebase)
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    // Campos bday e partner são coletados, mas a checagem é feita idealmente no Cloud Function.
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Um e-mail de redefinição de senha foi enviado para seu endereço. Por favor, verifique sua caixa de entrada.");
        resetModal.style.display = 'none';
        
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error.message);
        alert("Não foi possível enviar o e-mail de redefinição. Verifique se o e-mail está correto.");
    }
});

// Submissão do Reset Nível 2 (Notificação Admin)
notRememberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('not-remember-email').value;
    const whatsapp = document.getElementById('not-remember-whatsapp').value;
    
    await notifyAdminForReset(email, whatsapp);
});


// --- 4. FUNÇÕES DE CONTEÚDO E RENDERIZAÇÃO (DO SEU CÓDIGO ORIGINAL) ---

// Checagem de Versão
async function checkForForcedUpdate() {
    try {
        const settingsDocRef = doc(db, 'settings', 'config'); 
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
            const serverVersion = docSnap.data().web_ui_version || 1.6; 
            
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

// Renderiza um card de App (USADO EM TODOS OS GRIDS)
function renderAppCard(data, gridElement) {
    const card = document.createElement('div');
    card.className = 'app-card';
    
    card.dataset.id = data.id; // Adiciona ID para facilitar a busca (se o dado tiver ID)
    card.dataset.search = `${data.name.toLowerCase()} ${data.category ? data.category.toLowerCase() : ''} ${data.type.toLowerCase()}`;
    card.dataset.type = data.type; 

    const descriptionText = data.category || data.description || 'Geral'; 
    
    card.innerHTML = `
        <img src="${data.image}" class="app-icon" alt="Ícone de ${data.name}" onerror="this.onerror=null; this.src='https://placehold.co/90x90/212B36/F8F9FA?text=${data.type.toUpperCase().substring(0,3)}';">
        <div class="app-title">${data.name}</div>
        <div class="app-description">${descriptionText}</div> `;
    
    // Anexa o itemData ao elemento para fácil acesso no listener
    card.itemData = data; 

    gridElement.appendChild(card);
}

// Injeta uma Seção Horizontal de Categoria (para o feed dinâmico)
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
    
    const feedContainer = document.createElement('div');
    feedContainer.className = 'dynamic-feed-container'; 
    mainContentContainer.appendChild(feedContainer);
    
    const injectedTypes = new Set();
    injectionIndex = 0; 

    content.forEach((item, index) => {
        // 1. Renderiza o item no feed vertical misturado
        renderAppCard(item, feedContainer); 

        // 2. Verifica o ponto de injeção
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
                // 3. Performar injeção
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

// Renderiza a lista completa em grid vertical
function renderVerticalGrid(content, targetElement) {
    targetElement.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'full-list-grid';
    
    if (content.length === 0) {
         targetElement.innerHTML = `<div class="loading-message" style="width: 100%; text-align: center; padding: 30px;">Nenhum item encontrado nesta visualização.</div>`;
         return;
    }
    
    content.forEach(data => renderAppCard(data, grid));
    targetElement.appendChild(grid);
}

// Carregamento de Conteúdo Principal
async function loadContentFromFirestore() {
    const contentCollection = collection(db, 'content');
    
    try {
        const qAll = query(contentCollection, orderBy('createdAt', 'desc'));
        const snapshotAll = await getDocs(qAll);
        
        allContent = [];
        snapshotAll.forEach(doc => {
            const data = doc.data();
            // Adiciona o ID do documento ao objeto de dados
            allContent.push({...data, id: doc.id}); 
        });

        renderDynamicFeedLayout(allContent);
        renderCategoryFilters();
        
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
            // Certifique-se de que lucide está disponível
            const iconContent = (typeof lucide !== 'undefined' && lucide.icons[iconName]) ? lucide.icons[iconName].contents : '';
            button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${iconName}">${iconContent}</svg>${typeMap[typeId]}`;
            button.addEventListener('click', () => filterByCategory(typeId));
            categoryFilterBar.appendChild(button);
        }
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons(); 
    }
}

// Lógica para filtrar a tela principal
function filterByCategory(typeId) {
    searchInput.value = '';
    searchResultsMessage.style.display = 'none';

    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-button[data-filter-type="${typeId}"]`).classList.add('active');
    
    if (typeId === 'all') {
        renderDynamicFeedLayout(allContent);
    } else {
        const filteredContent = allContent.filter(item => item.type === typeId);
        mainContentContainer.innerHTML = '';
        renderVerticalGrid(filteredContent, mainContentContainer);
    }
}

// Lógica de Pesquisa
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


// Funções de Modal
function showDetailsModal(itemData) {
    selectedItem = itemData; 
    
    document.getElementById('details-title').textContent = itemData.name;
    document.getElementById('details-icon').src = itemData.image;
    document.getElementById('details-icon').alt = `Capa de ${itemData.name}`;
    document.getElementById('details-full-description').textContent = itemData.fullDescription || itemData.description;
    
    const typeDisplay = typeMap[itemData.type] || 'Conteúdo';
    const categoryDisplay = itemData.category || 'Geral';
    document.getElementById('details-category-info').textContent = `${typeDisplay} / ${categoryDisplay}`;

    // A lógica de Auth já faz a checagem e esconde/mostra o botão/prompt.
    updateUIAfterAuth(currentUser); 
    
    // Lógica para Conteúdo Relacionado 
    relatedAppsGrid.innerHTML = ''; 
    
    const relatedItems = allContent.filter(item => 
        item.type === itemData.type &&
        item.category === itemData.category && 
        item.id !== itemData.id // Usando o novo ID para comparação
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
    
    document.getElementById('full-list-title').textContent = `Todos os Itens em: ${typeTitle}`;
    
    const fullContent = allContent.filter(item => item.type === typeId);
    
    renderVerticalGrid(fullContent, document.getElementById('full-list-grid'));
    
    fullListModal.style.display = 'flex';
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

// --- 5. EVENTOS GERAIS E INICIALIZAÇÃO (COMBINADOS) ---

// Toggle do Menu Hamburguer
hamburgerBtn.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    menuOverlay.style.display = navMenu.classList.contains('open') ? 'block' : 'none';
});

// Adiciona evento de clique aos links do Menu Hamburguer para usar o filtro
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (event) => {
        if (link.dataset.filterType) {
            event.preventDefault();
            const typeId = link.dataset.filterType;
            filterByCategory(typeId);
            navMenu.classList.remove('open');
            menuOverlay.style.display = 'none';
        }
    });
});

// Abrir Modal de Detalhes
mainContentContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.app-card');
    if (card && card.itemData) {
        showDetailsModal(card.itemData);
    }
});

detailsDownloadBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert("Você precisa estar logado para fazer o download.");
        return;
    }
    const downloadUrl = selectedItem.downloadLink; 
    if (downloadUrl && downloadUrl.startsWith('http')) {
        window.location.href = downloadUrl;
    } else {
        alert("Erro: Link de download inválido ou não configurado no Firebase.");
    }
    detailsModal.style.display = 'none';
});


// Fechar Menu e Modais (Corrigido para incluir os novos modais)
document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Fechar Menu (clicando no overlay)
    if (target === menuOverlay) {
        navMenu.classList.remove('open');
        menuOverlay.style.display = 'none';
    }

    // Fechar Modais (clicando no 'x' ou no fundo do modal)
    if (target.classList.contains('modal-close')) {
         target.closest('.modal').style.display = 'none';
    }
    // Inclui todos os modais novos e antigos
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
    // Estas chamadas são cruciais para o carregamento inicial:
    await loadContentFromFirestore();
    await checkForForcedUpdate(); 
    startPlaceholderAnimation();
});
