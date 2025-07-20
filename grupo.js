import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, deleteField, arrayRemove, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showAlert } from './utils.js'; // Importa o showAlert

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-group');
const contentDiv = document.getElementById('group-content');
const notFoundDiv = document.getElementById('group-not-found');
const groupIcon = document.getElementById('group-icon');
const groupNameH2 = document.getElementById('group-name');
const groupCreatorSpan = document.getElementById('group-creator');
const groupDifficultySpan = document.getElementById('group-difficulty');
const rankingTbody = document.getElementById('ranking-tbody');
const groupActionsDiv = document.getElementById('group-actions');
const editGroupModal = document.getElementById('edit-group-modal');
const editGroupNameInput = document.getElementById('edit-group-name-input');
const editGroupDifficultySelect = document.getElementById('edit-group-difficulty-select');
const iconSelectionDiv = document.getElementById('icon-selection');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
const groupChatSection = document.getElementById('group-chat');
const chatMessagesDiv = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// Elementos do Modal de Transferência de Moderação
const transferModerationModal = document.getElementById('transfer-moderation-modal');
const closeTransferModerationModal = document.getElementById('close-transfer-moderation-modal');
const memberListTransfer = document.getElementById('member-list-transfer');
const cancelTransferBtn = document.getElementById('cancel-transfer-btn');


let currentUser = null;
let groupId = null;
let groupData = null;
let selectedIcon = null;
let unsubscribeChat = null;

const groupIcons = [
    'fas fa-book-bible', 'fas fa-cross', 'fas fa-dove', 'fas fa-church', 
    'fas fa-hands-praying', 'fas fa-lightbulb', 'fas fa-scroll', 'fas fa-star-of-david'
];

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    groupId = params.get('id');
    if (!groupId) { showNotFound(); return; }
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadGroupData();
    });

    // Event listeners para o modal de transferência de moderação
    if (closeTransferModerationModal) {
        closeTransferModerationModal.addEventListener('click', () => {
            if (transferModerationModal) transferModerationModal.classList.remove('visible');
        });
    }
    if (cancelTransferBtn) {
        cancelTransferBtn.addEventListener('click', () => {
            if (transferModerationModal) transferModerationModal.classList.remove('visible');
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == transferModerationModal) {
            if (transferModerationModal) transferModerationModal.classList.remove('visible');
        }
    });
});

async function loadGroupData() {
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');

    try {
        const groupRef = doc(db, 'grupos', groupId);
        const groupDoc = await getDoc(groupRef);

        if (groupDoc.exists()) {
            groupData = groupDoc.data();
            displayGroupData();
            if (contentDiv) contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar grupo:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayGroupData() {
    if (!groupData) return;
    if (groupIcon) groupIcon.className = `group-icon ${groupData.groupIcon || 'fas fa-users'}`;
    if (groupNameH2) groupNameH2.textContent = groupData.nomeDoGrupo;
    if (groupCreatorSpan) groupCreatorSpan.textContent = groupData.criadorNome;
    if (groupDifficultySpan) groupDifficultySpan.textContent = groupData.difficulty || 'Não definida';

    const members = Object.values(groupData.membros).sort((a, b) => b.pontuacaoNoGrupo - a.pontuacaoNoGrupo);
    const isCreator = currentUser && currentUser.uid === groupData.criadorUid;

    if (rankingTbody) {
        rankingTbody.innerHTML = '';
        members.forEach((member, index) => {
            const row = document.createElement('tr');
            const rankClass = `rank-${index + 1}`;
            
            const removeButtonHtml = isCreator && member.uid !== groupData.criadorUid
                ? `<button class="remove-member-btn btn-small" data-uid="${member.uid}" title="Remover Membro"><i class="fas fa-times"></i></button>`
                : '';

            row.innerHTML = `
                <td class="rank ${rankClass}">${index + 1}</td>
                <td class="member-info">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="profile-photo-container" style="width: 40px; height: 40px; padding: 2px;">
                            <img src="${member.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${member.nome}" style="width: 100%; height: 100%;">
                        </div>
                        <span>${member.nome}</span>
                    </div>
                    ${removeButtonHtml}
                </td>
                <td class="score">${member.pontuacaoNoGrupo}</td>
            `;
            rankingTbody.appendChild(row);
        });

        rankingTbody.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberUid = e.currentTarget.dataset.uid;
                removeMember(memberUid);
            });
        });
    }

    updateActionButtons();
}

function updateActionButtons() {
    if (!groupActionsDiv) return;
    groupActionsDiv.innerHTML = '';
    if (!currentUser) {
        groupActionsDiv.innerHTML = '<p>Faça login para interagir com o grupo.</p>';
        return;
    }

    const isMember = groupData.memberUIDs.includes(currentUser.uid);
    const isCreator = currentUser.uid === groupData.criadorUid;

    if (isMember) {
        if (groupChatSection) groupChatSection.classList.remove('hidden');
        loadChatMessages();

        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Jogar pelo Grupo';
        playBtn.addEventListener('click', () => {
            window.location.href = `index.html?groupId=${groupId}&difficulty=${groupData.difficulty}`;
        });
        groupActionsDiv.appendChild(playBtn);

        const inviteBtn = document.createElement('button');
        inviteBtn.className = 'btn btn-secondary';
        inviteBtn.innerHTML = '<i class="fas fa-share-alt"></i> Convidar Amigos';
        inviteBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => showAlert('Link de convite copiado!')) // Substituído alert
                .catch(() => showAlert('Não foi possível copiar o link.')); // Substituído alert
        });
        groupActionsDiv.appendChild(inviteBtn);
    } else {
        if (groupChatSection) groupChatSection.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();

        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn';
        joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
        joinBtn.addEventListener('click', joinGroup);
        groupActionsDiv.appendChild(joinBtn);
    }

    if (isCreator) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar';
        editBtn.addEventListener('click', openEditModal);
        groupActionsDiv.appendChild(editBtn);

        const transferBtn = document.createElement('button');
        transferBtn.className = 'btn btn-secondary';
        transferBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Transferir Moderação';
        transferBtn.addEventListener('click', openTransferModerationModal);
        groupActionsDiv.appendChild(transferBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn';
        deleteBtn.style.background = 'var(--danger-color)';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
        deleteBtn.addEventListener('click', deleteGroup);
        groupActionsDiv.appendChild(deleteBtn);
    }
}

// --- LÓGICA DO CHAT ---
function loadChatMessages() {
    if (unsubscribeChat) unsubscribeChat();

    const messagesRef = collection(db, 'grupos', groupId, 'mensagens');
    const q = query(messagesRef, orderBy('timestamp'));

    unsubscribeChat = onSnapshot(q, (querySnapshot) => {
        if (chatMessagesDiv) chatMessagesDiv.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const msg = doc.data();
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message');
            
            const isMyMessage = currentUser && msg.senderUid === currentUser.uid;
            if (isMyMessage) {
                messageElement.classList.add('my-message');
            }
            if (msg.silenced) { // Se a mensagem está silenciada (apenas para exibição)
                messageElement.classList.add('silenced');
            }
            if (msg.systemMessage) { // Mensagens do sistema (ex: silenciamento)
                messageElement.classList.add('system-message');
            }

            messageElement.innerHTML = `
                <div class="message-sender">${isMyMessage ? 'Eu' : msg.senderName || 'Sistema'}</div>
                <div class="message-bubble">${msg.text}</div>
            `;
            if (chatMessagesDiv) chatMessagesDiv.appendChild(messageElement);
        });
        if (chatMessagesDiv) chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        if (messageText.length === 0 || !currentUser) return;

        // Verificar se o usuário está silenciado
        const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
        const userData = userDoc.data();
        if (userData.silenciadoAte && userData.silenciadoAte.toDate() > new Date()) {
            showAlert("Você está silenciado e não pode enviar mensagens no momento. Tente novamente mais tarde.");
            chatInput.value = '';
            chatInput.disabled = false;
            chatInput.focus();
            return;
        }


        chatInput.disabled = true;

        try {
            const messagesRef = collection(db, 'grupos', groupId, 'mensagens');
            await addDoc(messagesRef, {
                text: messageText,
                senderUid: currentUser.uid,
                senderName: currentUser.displayName,
                timestamp: serverTimestamp(),
                silenced: false // Default para mensagens normais
            });
            chatInput.value = '';
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            showAlert("Não foi possível enviar a sua mensagem."); // Substituído alert
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });
}

// --- Outras Funções do Grupo ---
async function joinGroup() {
    if (!currentUser || !groupData) return;
    const joinBtn = groupActionsDiv.querySelector('button');
    if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A entrar...';
    }

    const newMemberData = {
        uid: currentUser.uid,
        nome: currentUser.displayName || "Jogador Anônimo",
        fotoURL: currentUser.photoURL || "https://placehold.co/40x40",
        pontuacaoNoGrupo: 0
    };

    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        await updateDoc(userRef, { conquistas: arrayUnion('socializador') });

        const groupRef = doc(db, 'grupos', groupId);
        await updateDoc(groupRef, {
            [`membros.${currentUser.uid}`]: newMemberData,
            memberUIDs: arrayUnion(currentUser.uid)
        });
        
        groupData.memberUIDs.push(currentUser.uid);
        groupData.membros[currentUser.uid] = newMemberData;
        displayGroupData();

    } catch (error) {
        console.error("Erro ao entrar no grupo:", error);
        showAlert("Não foi possível entrar no grupo."); // Substituído alert
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
        }
    }
}

async function removeMember(memberUid) {
    const memberToRemove = groupData.membros[memberUid];
    if (!memberToRemove) return;

    if (confirm(`Tem a certeza que deseja remover "${memberToRemove.nome}" do grupo?`)) {
        try {
            const groupRef = doc(db, 'grupos', groupId);
            await updateDoc(groupRef, {
                [`membros.${memberUid}`]: deleteField(),
                memberUIDs: arrayRemove(memberUid)
            });
            await loadGroupData();
        } catch (error) {
            console.error("Erro ao remover membro:", error);
            showAlert("Não foi possível remover o membro."); // Substituído alert
        }
    }
}

function openEditModal() {
    if (editGroupNameInput) editGroupNameInput.value = groupData.nomeDoGrupo;
    if (editGroupDifficultySelect) editGroupDifficultySelect.value = groupData.difficulty || 'facil';
    selectedIcon = groupData.groupIcon || 'fas fa-book-bible';
    
    if (iconSelectionDiv) {
        iconSelectionDiv.innerHTML = '';
        groupIcons.forEach(iconClass => {
            const iconElement = document.createElement('i');
            iconElement.className = iconClass;
            if (iconClass === selectedIcon) {
                iconElement.classList.add('selected');
            }
            iconElement.addEventListener('click', () => {
                const currentSelected = iconSelectionDiv.querySelector('.selected');
                if (currentSelected) {
                    currentSelected.classList.remove('selected');
                }
                iconElement.classList.add('selected');
                selectedIcon = iconClass;
            });
            iconSelectionDiv.appendChild(iconElement);
        });
    }

    if (editGroupModal) editGroupModal.classList.add('visible');
}

if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => editGroupModal.classList.remove('visible'));

if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => {
    const newName = editGroupNameInput.value.trim();
    const newDifficulty = editGroupDifficultySelect.value;
    if (newName.length < 3) {
        showAlert("O nome do grupo deve ter pelo menos 3 caracteres."); // Substituído alert
        return;
    }

    saveGroupBtn.disabled = true;
    saveGroupBtn.textContent = 'A salvar...';

    try {
        const groupRef = doc(db, 'grupos', groupId);
        await updateDoc(groupRef, {
            nomeDoGrupo: newName,
            groupIcon: selectedIcon,
            difficulty: newDifficulty
        });
        if (editGroupModal) editGroupModal.classList.remove('visible');
        await loadGroupData();
    } catch (error) {
        console.error("Erro ao editar grupo:", error);
        showAlert("Não foi possível salvar as alterações."); // Substituído alert
    } finally {
        saveGroupBtn.disabled = false;
        saveGroupBtn.textContent = 'Salvar Alterações';
    }
});

async function deleteGroup() {
    if (!currentUser || !groupData || currentUser.uid !== groupData.criadorUid) {
        showAlert("Você não tem permissão para excluir este grupo."); // Substituído alert
        return;
    }

    if (confirm(`Tem a certeza que deseja excluir o grupo "${groupData.nomeDoGrupo}"? Esta ação não pode ser desfeita.`)) {
        try {
            // Exclui o documento do grupo
            await deleteDoc(doc(db, 'grupos', groupId));

            // Remove o ID do grupo do array 'gruposCriados' do criador
            const userRef = doc(db, 'usuarios', currentUser.uid);
            await updateDoc(userRef, {
                gruposCriados: arrayRemove(groupId)
            });

            showAlert("Grupo excluído com sucesso."); // Substituído alert
            // Redireciona para a página inicial
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro ao excluir grupo:", error);
            showAlert("Não foi possível excluir o grupo."); // Substituído alert
        }
    }
}

function showNotFound() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.remove('hidden');
}

// --- Funções de Transferência de Moderação ---
async function openTransferModerationModal() {
    if (!currentUser || currentUser.uid !== groupData.criadorUid) {
        showAlert("Você precisa ser o criador do grupo para transferir a moderação.");
        return;
    }

    if (memberListTransfer) {
        memberListTransfer.innerHTML = '';
        const members = Object.values(groupData.membros);

        // Filtra para remover o próprio criador
        const otherMembers = members.filter(member => member.uid !== currentUser.uid);

        if (otherMembers.length === 0) {
            showAlert("Não há outros membros neste grupo para transferir a moderação.");
            return;
        }

        otherMembers.forEach(member => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<img src="${member.fotoURL || 'https://placehold.co/30x30'}" alt="${member.nome}"> <span>${member.nome}</span>`;
            listItem.dataset.uid = member.uid;
            listItem.dataset.name = member.nome;

            listItem.addEventListener('click', () => {
                if (confirm(`Tem certeza que deseja transferir a moderação para ${member.nome}?`)) {
                    transferModeration(member.uid, member.nome);
                }
            });
            memberListTransfer.appendChild(listItem);
        });

        if (transferModerationModal) transferModerationModal.classList.add('visible');
    }
}

async function transferModeration(newModeratorUid, newModeratorName) {
    if (!currentUser || !groupData || currentUser.uid !== groupData.criadorUid) {
        showAlert("Você não tem permissão para transferir a moderação deste grupo.");
        return;
    }

    if (newModeratorUid === currentUser.uid) {
        showAlert("Você não pode transferir a moderação para você mesmo.");
        return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Atualizar o grupo com o novo criador
        const groupRef = doc(db, 'grupos', groupId);
        batch.update(groupRef, {
            criadorUid: newModeratorUid,
            criadorNome: newModeratorName
        });

        // 2. Remover o grupo da lista de grupos criados do moderador antigo
        const oldModeratorRef = doc(db, 'usuarios', currentUser.uid);
        batch.update(oldModeratorRef, {
            gruposCriados: arrayRemove(groupId)
        });

        // Opcional: Se o moderador antigo não tiver mais grupos, remover o status de moderador e plano
        const oldModeratorDoc = await getDoc(oldModeratorRef);
        const oldModeratorData = oldModeratorDoc.data();
        if (oldModeratorData.gruposCriados && oldModeratorData.gruposCriados.length <= 1) { // <=1 porque ainda não removemos o grupo no batch
             // Se este for o último grupo que o antigo moderador tem, redefina o status
             // A segurança das regras do Firestore deve garantir que ele possa fazer isso em si mesmo.
             batch.update(oldModeratorRef, {
                 moderador: false,
                 plano: null,
                 dataAtivacao: null
             });
        }


        // 3. Adicionar o grupo à lista de grupos criados do novo moderador
        const newModeratorRef = doc(db, 'usuarios', newModeratorUid);
        // Garante que o novo moderador tenha os campos de moderador setados se ainda não tiver
        const newModeratorDoc = await getDoc(newModeratorRef);
        if (!newModeratorDoc.exists() || !newModeratorDoc.data().moderador) {
            // Se o novo moderador não for ainda um moderador (e não tem um plano),
            // ele "herda" o plano básico para este grupo, ou você pode ter uma lógica diferente
            // para usuários comuns que viram moderadores. Para simplificar, definimos um plano básico.
            batch.update(newModeratorRef, {
                moderador: true,
                plano: 'basico', // Ou lógica para definir plano
                dataAtivacao: serverTimestamp(),
                gruposCriados: arrayUnion(groupId)
            });
            showAlert(`Membro ${newModeratorName} foi promovido a Moderador com Plano Básico!`);
        } else {
             batch.update(newModeratorRef, {
                gruposCriados: arrayUnion(groupId)
            });
        }
       
        await batch.commit();

        showAlert(`Moderação do grupo transferida para ${newModeratorName} com sucesso!`);
        if (transferModerationModal) transferModerationModal.classList.remove('visible');
        loadGroupData(); // Recarrega os dados do grupo para atualizar a UI
        window.location.href = 'index.html'; // Redireciona para a página inicial, pois você não é mais o criador
    } catch (error) {
        console.error("Erro ao transferir moderação:", error);
        showAlert("Não foi possível transferir a moderação.");
    }
}
