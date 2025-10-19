// main.js

// ... (O restante do código permanece o mesmo, incluindo CURRENT_UI_VERSION, Firebase Config e checkForForcedUpdate)

// --- 2. REFERÊNCIAS DOM ---
// ... (O restante do código permanece o mesmo)


let selectedItem = null; 
let allContent = []; 

// CATEGORIAS PRINCIPAIS: Usado para mapear IDs para nomes de exibição
// ... (O restante do código permanece o mesmo)


// --- 3. FUNÇÕES UTILITÁRIAS ---

function renderAppCard(data, gridElement) {
    const card = document.createElement('div');
    card.className = 'app-card';
    
    card.dataset.search = `${data.name.toLowerCase()} ${data.category ? data.category.toLowerCase() : ''} ${data.type.toLowerCase()}`;
    card.dataset.type = data.type; 

    // --- CORREÇÃO DE IMAGEM ---
    // Verifica se a URL da imagem é válida, caso contrário usa um placeholder
    const imageUrl = data.image && data.image.startsWith('http') 
        ? data.image 
        : `https://placehold.co/90x90/212B36/F8F9FA?text=${data.type.toUpperCase().substring(0,3)}`;
        
    const descriptionText = data.category || data.description || 'Geral'; 
    
    card.innerHTML = `
        <img src="${imageUrl}" class="app-icon" alt="Ícone de ${data.name}" 
             onerror="this.onerror=null; this.src='https://placehold.co/90x90/212B36/F8F9FA?text=${data.type.toUpperCase().substring(0,3)}';"
        >
        <div class="app-title">${data.name}</div>
        <div class="app-description">${descriptionText}</div> `;
    
    card.addEventListener('click', () => {
        showDetailsModal(data);
    });

    gridElement.appendChild(card);
}

// ... (As funções renderDynamicFeedLayout, renderVerticalGrid e loadContentFromFirestore permanecem as mesmas)


// --- 7. EVENTOS DOS MODAIS E "VER TODOS" ---

function showDetailsModal(itemData) {
    selectedItem = itemData; 
    
    document.getElementById('details-title').textContent = itemData.name;
    
    // --- CORREÇÃO DE IMAGEM NA MODAL ---
    const modalImageUrl = itemData.image && itemData.image.startsWith('http') 
        ? itemData.image 
        : `https://placehold.co/90x90/212B36/F8F9FA?text=${itemData.type.toUpperCase().substring(0,3)}`;
        
    document.getElementById('details-icon').src = modalImageUrl;
    document.getElementById('details-icon').alt = `Capa de ${itemData.name}`;
    document.getElementById('details-icon').onerror = function() {
        this.src = `https://placehold.co/90x90/212B36/F8F9FA?text=${itemData.type.toUpperCase().substring(0,3)}`;
        this.onerror = null; 
    };
    
    document.getElementById('details-full-description').textContent = itemData.fullDescription || itemData.description;
    
    const typeDisplay = typeMap[itemData.type] || 'Conteúdo';
    const categoryDisplay = itemData.category || 'Geral';
    detailsCategoryInfo.textContent = `${typeDisplay} / ${categoryDisplay}`;

    detailsDownloadBtn.disabled = false;
    detailsDownloadBtn.textContent = 'Baixar Agora';
    
    // --- CORREÇÃO DE DESABILITAR DOWNLOAD SE NÃO HOUVER LINK ---
    if (!itemData.downloadLink || !itemData.downloadLink.startsWith('http')) {
        detailsDownloadBtn.disabled = true;
        detailsDownloadBtn.textContent = 'Link de Download Indisponível';
    }

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

// ... (As funções bindViewAllEvents e filterByCategory permanecem as mesmas)

// Listener do botão de download
detailsDownloadBtn.addEventListener('click', () => {
    // 1. Verifica se o item e o link existem
    if (!selectedItem || !selectedItem.downloadLink) {
        alert("Erro: O link de download não foi encontrado. Contate o suporte.");
        return;
    }
    
    const downloadUrl = selectedItem.downloadLink; 
    
    // 2. Faz o download de forma segura
    if (downloadUrl.startsWith('http')) {
        // Usa window.open para garantir que a modal feche, mas o download inicie
        window.open(downloadUrl, '_blank'); 
        
        // 3. Feedback visual (Opcional, mas recomendado)
        detailsDownloadBtn.textContent = 'Download Iniciado!';
        detailsDownloadBtn.disabled = true;
        
        // Fecha a modal após um breve atraso
        setTimeout(() => {
            detailsModal.style.display = 'none';
        }, 1500);
        
    } else {
        alert("Erro: O link de download é inválido ou não foi configurado corretamente no banco de dados.");
    }
});

// ... (O restante do código, como os listeners do menu e a inicialização, permanece o mesmo)
