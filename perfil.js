import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp, deleteDoc, query, where, getDocs, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-profile');
const contentDiv = document.getElementById('profile-content');
const notFoundDiv = document.getElementById('profile-not-found');
const profilePhotoContainer = document.getElementById('profile-photo-container');
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileBio = document.getElementById('profile-bio');
const editBioBtn = document.getElementById('edit-bio-btn');
const shareProfileBtn = document.getElementById('share-profile-btn');
const statScore = document.getElementById('stat-score');
const statQuizzes = document.getElementById('stat-quizzes');
const statCorrect = document.getElementById('stat-correct');
const statAccuracy = document.getElementById('stat-accuracy');
const achievementsGrid = document.getElementById('achievements-grid');
const editBioModal = document.getElementById('edit-bio-modal');
const bioTextarea = document.getElementById('bio-textarea');
const saveBioBtn = document.getElementById('save-bio-btn');
const cancelBioBtn = document.getElementById('cancel-bio-btn');
const showInRankingCheckbox = document.getElementById('show-in-ranking-checkbox');
const settingsSection = document.getElementById('profile-settings');
const dobInput = document.getElementById('dob-input');
const saveDobBtn = document.getElementById('save-dob-btn');
const statScoreFacil = document.getElementById('stat-score-facil');
const statScoreMedio = document.getElementById('stat-score-medio');
const statScoreDificil = document.getElementById('stat-score-dificil');

// Elementos da seção de Bordas
const bordersSection = document.getElementById('profile-borders-section');
const changeBorderBtn = document.getElementById('change-border-btn');
const bordersModal = document.getElementById('borders-modal');
const closeBordersModal = document.getElementById('close-borders-modal');
const bordersGridModal = document.getElementById('borders-grid-modal');

// Elementos do Modal de Sugestão
const sendSuggestionBtn = document.getElementById('send-suggestion-btn');
const suggestionModal = document.getElementById('suggestion-modal');
const closeSuggestionModal = document.getElementById('close-suggestion-modal');
const suggestionTextarea = document.getElementById('suggestion-textarea');
const sendSuggestionModalBtn = document.getElementById('send-suggestion-modal-btn');
const cancelSuggestionModalBtn = document.getElementById('cancel-suggestion-modal-btn');

// Elementos do Cabeçalho para o usuário logado
const profileHeaderUserInfo = document.getElementById('profile-header-user-info');
const profilePhotoHeader = document.getElementById('profile-photo-header');
const profilePhotoContainerHeader = document.getElementById('profile-photo-container-header');
const profileNameHeader = document.getElementById('profile-name-header');
const logoutBtnProfile = document.getElementById('logout-btn-profile'); // O novo botão de logout no perfil

// Elementos do Sininho de Notificação
const notificationBell = document.getElementById('notification-bell');
const notificationCount = document.getElementById('notification-count');
const notificationsModal = document.getElementById('notifications-modal');
const closeNotificationsModal = document.getElementById('close-notifications-modal');
const respondedSuggestionsList = document.getElementById('responded-suggestions-list');
const markAllAsReadBtn = document.getElementById('mark-all-as-read-btn');

let currentUser = null;
let profileUid = null;
let unsubscribeSuggestions = null;

// LISTA DE CONQUISTAS EXPANDIDA
const allAchievements = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou seu primeiro quiz.', icon: '📖' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' },
    'discipulo_dedicado': { title: 'Discípulo Dedicado', description: 'Jogou 50 quizzes.', icon: '🚶‍♂️' },
    'veterano_da_palavra': { title: 'Veterano da Palavra', description: 'Jogou 100 quizzes.', icon: '🏃‍♂️' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1.000 pontos totais.', icon: '📜' },
    'sabio_de_israel': { title: 'Sábio de Israel', description: 'Alcançou 5.000 pontos totais.', icon: '👑' },
    'conselheiro_real': { title: 'Conselheiro Real', description: 'Alcançou 10.000 pontos totais.', icon: '🏛️' },
    'patriarca_do_saber': { title: 'Patriarca do Saber', description: 'Alcançou 25.000 pontos totais.', icon: '🌟' },
    'mestre_da_palavra': { title: 'Mestre da Palavra', description: 'Acertou 100 perguntas.', icon: '✒️' },
    'escriba_habil': { title: 'Escriba Hábil', description: 'Acertou 500 perguntas.', icon: '✍️' },
    'doutor_da_lei': { title: 'Doutor da Lei', description: 'Acertou 1.000 perguntas.', icon: '🎓' },
    'quase_la': { title: 'Quase Lá', description: 'Fez 90 pontos em um único quiz.', icon: '🥈' },
    'perfeccionista': { title: 'Perfeccionista', description: 'Fez 100 pontos em um único quiz.', icon: '🏆' },
    'impecavel': { title: 'Impecável', description: 'Completou um quiz sem errar nenhuma pergunta.', icon: '🎯' },
    'explorador_facil': { title: 'Explorador Dócil', description: 'Alcançou 1.000 pontos no nível Fácil.', icon: '🐑' },
    'desafiante_medio': { title: 'Desafiante Sólido', description: 'Alcançou 1.000 pontos no nível Médio.', icon: '🗿' },
    'estrategista_dificil': { title: 'Estrategista Audaz', description: 'Alcançou 1.000 pontos no nível Difícil.', icon: '🦁' },
    'fundador_de_grupo': { title: 'Fundador', description: 'Criou seu primeiro grupo.', icon: '🏗️' },
    'socializador': { title: 'Socializador', description: 'Entrou em um grupo.', icon: '🤝' },
    'competidor': { title: 'Competidor', description: 'Jogou uma partida por um grupo.', icon: '⚔️' },
    'campeao_de_grupo': { title: 'Campeão de Grupo', description: 'Alcançou 1.000 pontos em um grupo.', icon: '🥇' },
    'competicao_ouro': { title: 'Campeão da Competição', description: 'Venceu uma competição em 1º lugar.', icon: '🏆' },
    'competicao_prata': { title: 'Vice-Campeão', description: 'Ficou em 2º lugar em uma competição.', icon: '🥈' },
    'competicao_bronze': { title: 'Pódio de Bronze', description: 'Ficou em 3º lugar em uma competição.', icon: '🥉' },
    'competicao_honra': { title: 'Menção Honrosa', description: 'Ficou em 4º lugar em uma competição.', icon: '🎖️' }
};

// DEFINIÇÃO DAS BORDAS
const allBorders = {
    'default': { name: 'Padrão' },
    'simples_azul': { name: 'Azul Simples' },
    'simples_verde': { name: 'Verde Simples' },
    'simples_roxo': { name: 'Roxo Simples' },
    'floral_verde': { name: 'Floral Verde' },
    'geometrico_teal': { name: 'Geométrico Teal' },
    'folhas_violeta': { name: 'Folhas Violeta' },
    'galhos_cinza': { name: 'Galhos Cinza' },
    // Novas bordas de competição
    'borda_competicao_ouro': { name: 'Campeão (Ouro)' },
    'borda_competicao_prata': { name: 'Vice-Campeão (Prata)' },
    'borda_competicao_bronze': { name: 'Pódio (Bronze)' },
    'borda_competicao_honra': { name: 'Menção Honrosa' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');
    if (!profileUid) {
        showNotFound();
        return;
    }
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');
    
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadProfileData();

        // Lógica para o botão de SAIR no PERFIL
        if (currentUser) {
            if (profileHeaderUserInfo) profileHeaderUserInfo.classList.remove('hidden');
            if (logoutBtnProfile) logoutBtnProfile.classList.remove('hidden'); // Mostrar o botão de sair
            if (currentUser.uid === profileUid) { // Se for o perfil do próprio usuário logado
                setupNotificationListener(currentUser.uid);
            } else { // Se for outro perfil, ocultar sininho e botão de sugestão (já está no displayProfileData, mas reforça)
                if (notificationBell) notificationBell.classList.add('hidden');
                if (sendSuggestionBtn) sendSuggestionBtn.classList.add('hidden');
            }
        } else { // Se o usuário não está logado
            if (profileHeaderUserInfo) profileHeaderUserInfo.classList.add('hidden');
            if (logoutBtnProfile) logoutBtnProfile.classList.add('hidden'); // Ocultar o botão de sair
            if (notificationBell) notificationBell.classList.add('hidden');
            if (sendSuggestionBtn) sendSuggestionBtn.classList.add('hidden');
        }
    });

    // Event Listener para o botão de SAIR no perfil
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                // Redirecionar para a página inicial ou exibir mensagem de logout
                window.location.href = '/index.html'; 
            }).catch(console.error);
        });
    }

    // Event listeners para o modal de bordas
    if (changeBorderBtn) changeBorderBtn.addEventListener('click', () => {
        if (bordersModal) bordersModal.classList.add('visible');
    });
    if (closeBordersModal) closeBordersModal.addEventListener('click', () => {
        if (bordersModal) bordersModal.classList.remove('visible');
    });
    window.addEventListener('click', (event) => {
        if (event.target == bordersModal) {
            bordersModal.classList.remove('visible');
        }
    });

    // Event listeners para o modal de sugestão
    if (sendSuggestionBtn) sendSuggestionBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Você precisa estar logado para enviar uma sugestão.");
            return;
        }
        if (suggestionModal) suggestionModal.classList.add('visible');
    });
    if (closeSuggestionModal) closeSuggestionModal.addEventListener('click', () => {
        if (suggestionModal) suggestionModal.classList.remove('visible');
        suggestionTextarea.value = '';
    });
    if (cancelSuggestionModalBtn) cancelSuggestionModalBtn.addEventListener('click', () => {
        if (suggestionModal) suggestionModal.classList.remove('visible');
        suggestionTextarea.value = '';
    });
    if (sendSuggestionModalBtn) sendSuggestionModalBtn.addEventListener('click', async () => {
        const message = suggestionTextarea.value.trim();
        if (!message) {
            alert('Escreva algo para enviar.');
            return;
        }
        if (message.length > 500) {
            alert('A sugestão não pode ter mais de 500 caracteres.');
            return;
        }

        sendSuggestionModalBtn.disabled = true;
        sendSuggestionModalBtn.textContent = 'Enviando...';

        try {
            await addDoc(collection(db, 'sugestoes'), {
                userId: currentUser.uid,
                nome: currentUser.displayName,
                mensagem: message,
                data: serverTimestamp(),
                respondida: false
            });
            alert('Obrigado pela sua contribuição! Sua sugestão será analisada com carinho. 😊');
            if (suggestionModal) suggestionModal.classList.remove('visible');
            suggestionTextarea.value = '';
        } catch (error) {
            console.error("Erro ao enviar sugestão:", error);
            alert("Não foi possível enviar sua sugestão. Tente novamente.");
        } finally {
            sendSuggestionModalBtn.disabled = false;
            sendSuggestionModalBtn.textContent = 'Enviar';
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == suggestionModal) {
            suggestionModal.classList.remove('visible');
            suggestionTextarea.value = '';
        }
    });

    // Event listeners para o modal de notificações
    if (notificationBell) {
        notificationBell.addEventListener('click', async () => {
            if (notificationsModal) notificationsModal.classList.add('visible');
            await loadRespondedSuggestions();
        });
    }
    if (closeNotificationsModal) {
        closeNotificationsModal.addEventListener('click', () => {
            if (notificationsModal) notificationsModal.classList.remove('visible');
        });
    }
    if (markAllAsReadBtn) {
        markAllAsReadBtn.addEventListener('click', async () => {
            if (!currentUser) return;
            const q = query(collection(db, 'sugestoes'),
                            where('userId', '==', currentUser.uid),
                            where('respondida', '==', true),
                            where(`lidaPor.${currentUser.uid}`, '!=', true));
            
            try {
                const querySnapshot = await getDocs(q);
                const batch = writeBatch(db);
                querySnapshot.forEach(docSnapshot => {
                    const suggestionRef = doc(db, 'sugestoes', docSnapshot.id);
                    batch.update(suggestionRef, { [`lidaPor.${currentUser.uid}`]: true });
                });
                await batch.commit();
                alert('Todas as notificações foram marcadas como lidas.');
                if (notificationsModal) notificationsModal.classList.remove('visible');
                // O listener já cuidará de atualizar a contagem
            } catch (error) {
                console.error("Erro ao marcar todas como lidas:", error);
                alert("Não foi possível marcar todas as notificações como lidas.");
            }
        });
    }
});

async function loadProfileData() {
    try {
        const userRef = doc(db, 'usuarios', profileUid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            displayProfileData(userDoc.data());
            if (contentDiv) contentDiv.classList.remove('hidden');
            // Popula o cabeçalho superior com as informações do usuário logado
            if (currentUser) {
                if (profilePhotoHeader) profilePhotoHeader.src = currentUser.photoURL || "https://placehold.co/45x45/e0e0e0/333?text=?";
                if (profileNameHeader) profileNameHeader.textContent = currentUser.displayName || "Você";
                if (profilePhotoContainerHeader) {
                    profilePhotoContainerHeader.className = 'profile-photo-container';
                    const equippedBorder = userDoc.data().bordaEquipada || 'default';
                    if (equippedBorder !== 'default') {
                        profilePhotoContainerHeader.classList.add(equippedBorder);
                    }
                }
            }
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayProfileData(data) {
    if (profilePhoto) profilePhoto.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
    if (profileName) profileName.textContent = data.nome || 'Jogador Anônimo';
    if (profileBio) profileBio.textContent = data.bio || '';

    const isOwnProfile = currentUser && currentUser.uid === profileUid;
    if (editBioBtn) editBioBtn.classList.toggle('hidden', !isOwnProfile);
    if (changeBorderBtn) changeBorderBtn.classList.toggle('hidden', !isOwnProfile);
    if (settingsSection) settingsSection.classList.toggle('hidden', !isOwnProfile);
    if (sendSuggestionBtn) sendSuggestionBtn.classList.toggle('hidden', !isOwnProfile);

    const equippedBorder = data.bordaEquipada || 'default';
    if (profilePhotoContainer) {
        profilePhotoContainer.className = 'profile-photo-container';
        if (equippedBorder !== 'default') {
            profilePhotoContainer.classList.add(equippedBorder);
        }
    }

    if (isOwnProfile) {
        if (showInRankingCheckbox) showInRankingCheckbox.checked = data.showInRanking !== false;
        if (dobInput && data.dataDeNascimento) dobInput.value = data.dataDeNascimento;
        
        if (bordersGridModal) {
            bordersGridModal.innerHTML = '';
            
            const userAchievements = new Set(data.conquistas || []);
            const unlockedBorders = new Set(data.bordasDesbloqueadas || []);

            // Lógica para desbloquear bordas automaticamente com base nas conquistas
            if (userAchievements.has('competicao_ouro')) unlockedBorders.add('borda_competicao_ouro');
            if (userAchievements.has('competicao_prata')) unlockedBorders.add('borda_competicao_prata');
            if (userAchievements.has('competicao_bronze')) unlockedBorders.add('borda_competicao_bronze');
            if (userAchievements.has('competicao_honra')) unlockedBorders.add('borda_competicao_honra');

            // Bordas que todos os usuários possuem (garantir que estejam desbloqueadas)
            unlockedBorders.add('default');
            unlockedBorders.add('simples_azul');
            unlockedBorders.add('simples_verde');
            unlockedBorders.add('simples_roxo');
            unlockedBorders.add('floral_verde');
            unlockedBorders.add('geometrico_teal');
            unlockedBorders.add('folhas_violeta');
            unlockedBorders.add('galhos_cinza');

            Object.keys(allBorders).forEach(key => {
                if (unlockedBorders.has(key)) {
                    const border = allBorders[key];
                    const borderElement = document.createElement('div');
                    borderElement.className = 'profile-photo-container';
                    borderElement.classList.add(key);
                    if (key === equippedBorder) {
                        borderElement.classList.add('selected');
                    }
                    borderElement.dataset.borderKey = key;
                    borderElement.title = border.name;
                    borderElement.style.width = '80px';
                    borderElement.style.height = '80px';
                    borderElement.style.cursor = 'pointer';
                    borderElement.style.display = 'inline-flex';
                    borderElement.style.alignItems = 'center';
                    borderElement.style.justifyContent = 'center';
                    borderElement.style.margin = '5px';

                    const img = document.createElement('img');
                    img.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    borderElement.appendChild(img);
                    
                    borderElement.addEventListener('click', async () => {
                        try {
                            const userRef = doc(db, 'usuarios', currentUser.uid);
                            await updateDoc(userRef, { bordaEquipada: key });
                            if(bordersModal) bordersModal.classList.remove('visible');
                            loadProfileData(); // Recarrega os dados do perfil para atualizar a borda
                        } catch(err) {
                            console.error("Erro ao equipar borda:", err);
                            alert("Não foi possível salvar sua escolha.");
                        }
                    });

                    bordersGridModal.appendChild(borderElement);
                }
            });
        }
    }

    const stats = data.stats || {};
    const totalCertas = stats.respostasCertasTotal || 0;
    const totalErradas = stats.respostasErradasTotal || 0;
    const totalRespostas = totalCertas + totalErradas;
    const accuracy = totalRespostas > 0 ? ((totalCertas / totalRespostas) * 100).toFixed(0) : 0;

    if (statScore) statScore.textContent = stats.pontuacaoTotal || 0;
    if (statScoreFacil) statScoreFacil.textContent = stats.pontuacaoFacil || 0;
    if (statScoreMedio) statScoreMedio.textContent = stats.pontuacaoMedio || 0;
    if (statScoreDificil) statScoreDificil.textContent = stats.pontuacaoDificil || 0;
    if (statQuizzes) statQuizzes.textContent = stats.quizzesJogadosTotal || 0;
    if (statCorrect) statCorrect.textContent = totalCertas;
    if (statAccuracy) statAccuracy.textContent = `${accuracy}%`;

    if (achievementsGrid) {
        achievementsGrid.innerHTML = '';
        const userAchievements = new Set(data.conquistas || []);
        Object.keys(allAchievements).forEach(key => {
            const achievement = allAchievements[key];
            const isUnlocked = userAchievements.has(key);
            const achievElement = document.createElement('div');
            achievElement.className = 'achievement-badge' + (isUnlocked ? '' : ' locked');
            achievElement.innerHTML = `<div class="achievement-icon">${achievement.icon}</div><div class="achievement-info"><h4>${achievement.title}</h4><p>${achievement.description}</p></div>`;
            achievementsGrid.appendChild(achievElement);
        });
    }
}

function showNotFound() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.remove('hidden');
}

if (editBioBtn) editBioBtn.addEventListener('click', () => {
    if (bioTextarea) bioTextarea.value = profileBio.textContent;
    if (editBioModal) editBioModal.classList.add('visible');
});
if (cancelBioBtn) cancelBioBtn.addEventListener('click', () => {
    if (editBioModal) editBioModal.classList.remove('visible');
});
if (saveBioBtn) saveBioBtn.addEventListener('click', async () => {
    const newBio = bioTextarea.value.trim();
    if (newBio.length > 150) {
        alert("A biografia não pode ter mais de 150 caracteres.");
        return;
    }
    saveBioBtn.disabled = true;
    saveBioBtn.textContent = 'Salvando...';
    try {
        await updateDoc(doc(db, 'usuarios', profileUid), { bio: newBio });
        if (profileBio) profileBio.textContent = newBio;
        if (editBioModal) editBioModal.classList.remove('visible');
    }
    catch (error) {
        console.error("Erro ao salvar a bio:", error);
        alert("Não foi possível salvar a bio.");
    } finally {
        saveBioBtn.disabled = false;
        saveBioBtn.textContent = 'Salvar';
    }
});
if (saveDobBtn) {
    saveDobBtn.addEventListener('click', async () => {
        const dobValue = dobInput.value;
        if (!dobValue) {
            alert("Por favor, selecione uma data válida.");
            return;
        }
        saveDobBtn.disabled = true;
        saveDobBtn.textContent = '...';
        try {
            await updateDoc(doc(db, 'usuarios', profileUid), { dataDeNascimento: dobValue });
            alert("Data de nascimento atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar data de nascimento:", error);
            alert("Não foi possível salvar a data.");
        } finally {
            saveDobBtn.disabled = false;
            saveDobBtn.textContent = 'Salvar';
        }
    });
}
if (shareProfileBtn) shareProfileBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link do perfil copiado!'))
        .catch(() => alert('Não foi possível copiar o link.'));
});
if (showInRankingCheckbox) showInRankingCheckbox.addEventListener('change', async (e) => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
            showInRanking: e.target.checked
        });
    } catch (error) {
        console.error("Erro ao atualizar preferência de ranking:", error);
        alert("Não foi possível salvar sua preferência.");
    }
});

// --- Lógica de Notificações de Sugestões ---
function setupNotificationListener(uid) {
    if (unsubscribeSuggestions) {
        unsubscribeSuggestions();
    }

    const q = query(
        collection(db, 'sugestoes'),
        where('userId', '==', uid),
        where('respondida', '==', true)
    );

    unsubscribeSuggestions = onSnapshot(q, async (snapshot) => {
        let unreadCount = 0;
        const respondedSuggestions = [];

        for (const docSnapshot of snapshot.docs) {
            const suggestion = { id: docSnapshot.id, ...docSnapshot.data() };
            
            // Buscar a resposta do admin
            const responseDoc = await getDoc(doc(db, 'sugestoes', suggestion.id, 'respostas', 'adminResponse'));
            if (responseDoc.exists()) {
                const responseData = responseDoc.data();
                suggestion.adminResponse = responseData.resposta;
                
                // Verifica se a sugestão foi lida por este usuário
                const isRead = suggestion.lidaPor && suggestion.lidaPor[uid] === true;
                if (!isRead) {
                    unreadCount++;
                }
                respondedSuggestions.push(suggestion);
            }
        }
        updateNotificationUI(unreadCount);
        // Armazena as sugestões respondidas para exibir no modal
        notificationBell.respondedSuggestions = respondedSuggestions;
    }, (error) => {
        console.error("Erro ao ouvir por sugestões respondidas:", error);
    });
}

function updateNotificationUI(count) {
    if (notificationCount) notificationCount.textContent = count;
    if (notificationBell) {
        if (count > 0) {
            notificationBell.classList.remove('hidden');
            notificationBell.classList.add('has-notifications');
        } else {
            notificationBell.classList.remove('has-notifications');
            notificationBell.classList.add('hidden');
        }
    }
}

async function loadRespondedSuggestions() {
    if (!respondedSuggestionsList) return;
    respondedSuggestionsList.innerHTML = '';

    const respondedSuggestions = notificationBell.respondedSuggestions || [];

    if (respondedSuggestions.length === 0) {
        respondedSuggestionsList.innerHTML = '<p>Nenhuma sugestão respondida ainda.</p>';
        markAllAsReadBtn.classList.add('hidden');
        return;
    }

    // Ordenar as sugestões para mostrar as não lidas primeiro, depois as lidas (mais recentes primeiro)
    respondedSuggestions.sort((a, b) => {
        const aIsRead = a.lidaPor && a.lidaPor[currentUser.uid];
        const bIsRead = b.lidaPor && b.lidaPor[currentUser.uid];

        if (aIsRead && !bIsRead) return 1;
        if (!aIsRead && bIsRead) return -1;
        
        // Se ambos têm o mesmo status de leitura, ordena pela data da sugestão
        const dateA = a.data ? a.data.toDate().getTime() : 0;
        const dateB = b.data ? b.data.toDate().getTime() : 0;
        return dateB - dateA;
    });


    for (const suggestion of respondedSuggestions) {
        const suggestionItem = document.createElement('div');
        suggestionItem.classList.add('suggestion-item');
        const isRead = suggestion.lidaPor && suggestion.lidaPor[currentUser.uid] === true;
        if (isRead) {
            suggestionItem.classList.add('read');
        } else {
            suggestionItem.classList.add('unread');
        }

        const date = suggestion.data ? new Date(suggestion.data.toDate()).toLocaleString() : 'N/A';

        suggestionItem.innerHTML = `
            <div class="suggestion-header">
                <h4>Sua Sugestão:</h4>
                <p>"${suggestion.mensagem}"</p>
                <span class="suggestion-date">${date}</span>
            </div>
            <div class="response-content">
                <h5>Resposta do Admin:</h5>
                <p>"${suggestion.adminResponse || 'Nenhuma resposta disponível.'}"</p>
            </div>
            <button class="btn btn-small mark-as-read-btn" data-id="${suggestion.id}">${isRead ? 'Lida' : 'Marcar como lida'}</button>
        `;
        respondedSuggestionsList.appendChild(suggestionItem);

        // Adiciona evento para marcar como lida
        const markBtn = suggestionItem.querySelector('.mark-as-read-btn');
        if (markBtn) {
            markBtn.addEventListener('click', async () => {
                if (!currentUser) return;
                try {
                    const suggestionRef = doc(db, 'sugestoes', suggestion.id);
                    await updateDoc(suggestionRef, { [`lidaPor.${currentUser.uid}`]: true });
                    markBtn.textContent = 'Lida';
                    markBtn.disabled = true;
                    suggestionItem.classList.remove('unread');
                    suggestionItem.classList.add('read');
                    // O listener já cuidará de atualizar a contagem
                } catch (error) {
                    console.error("Erro ao marcar como lida:", error);
                    alert("Não foi possível marcar como lida.");
                }
            });
        }
    }

    if (respondedSuggestions.length > 0 && respondedSuggestions.some(s => !(s.lidaPor && s.lidaPor[currentUser.uid]))) {
        markAllAsReadBtn.classList.remove('hidden');
    } else {
        markAllAsReadBtn.classList.add('hidden');
    }
}
