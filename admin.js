import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, query, orderBy, limit, startAfter, where, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da Interface do Usuário (UI) ---
const adminContent = document.getElementById('admin-content');
const authGuardMessage = document.getElementById('auth-guard-message');
const questionsTbody = document.getElementById('questions-tbody');
const formTitle = document.getElementById('form-title');
const saveBtn = document.getElementById('save-question-btn');
const cancelBtn = document.getElementById('cancel-edit-btn');
const questionIdInput = document.getElementById('question-id');
const enunciadoInput = document.getElementById('enunciado');
const alt1Input = document.getElementById('alt1');
const alt2Input = document.getElementById('alt2');
const alt3Input = document.getElementById('alt3');
const alt4Input = document.getElementById('alt4');
const corretaSelect = document.getElementById('correta');
const nivelSelect = document.getElementById('nivel');
const temaInput = document.getElementById('tema');
const referenciaInput = document.getElementById('referencia');
const faixaCriancaCheckbox = document.getElementById('faixa-crianca');
const faixaAdolescenteCheckbox = document.getElementById('faixa-adolescente');
const faixaAdultoCheckbox = document.getElementById('faixa-adulto');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');

// Elementos da seção de sugestões
const suggestionsTbody = document.getElementById('suggestions-tbody');
const loadMoreSuggestionsBtn = document.getElementById('load-more-suggestions-btn');
const filterStatusSelect = document.getElementById('filter-status');

// Elementos do Modal de Resposta à Sugestão
const respondSuggestionModal = document.getElementById('respond-suggestion-modal');
const closeRespondSuggestionModal = document.getElementById('close-respond-suggestion-modal');
const suggestionUserName = document.getElementById('suggestion-user-name');
const suggestionMessageText = document.getElementById('suggestion-message-text');
const responseTextarea = document.getElementById('response-textarea');
const sendResponseBtn = document.getElementById('send-response-btn');
const cancelResponseBtn = document.getElementById('cancel-response-btn');

const suggestionsPerPage = 10;
let lastVisibleSuggestion = null;
let currentSuggestionBeingResponded = null;

// Elementos da nova seção de solicitações de moderador
const moderatorRequestsTbody = document.getElementById('moderator-requests-tbody');
const loadMoreModeratorRequestsBtn = document.getElementById('load-more-moderator-requests-btn');
const filterModeratorStatusSelect = document.getElementById('filter-moderator-status');

const requestsPerPage = 10;
let lastVisibleRequest = null;

// Planos para referência (mantidos para consistência, mas o ideal é que venham do Firestore em um app real)
const MODERATOR_PLANS = {
    "basico": { preco: 10, grupos: 1, maxConvidados: 5 },
    "plus": { preco: 20, grupos: 3, maxConvidados: 15 }
};

// --- Proteção de Rota (Verificação de Administrador) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().admin === true) {
            authGuardMessage.classList.add('hidden');
            adminContent.classList.remove('hidden');
            loadQuestions();
            loadSuggestions();
            loadModeratorRequests(); // Carregar solicitações de moderador ao carregar o painel
        } else {
            authGuardMessage.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta página.</p>';
        }
    } else {
        authGuardMessage.innerHTML = '<h2>Acesso Negado</h2><p>Faça login como administrador para continuar.</p>';
    }
});

// --- Lógica CRUD de Perguntas ---
async function loadQuestions() {
    questionsTbody.innerHTML = '<tr><td colspan="3">Carregando perguntas...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "perguntas"));
        if (querySnapshot.empty) {
            questionsTbody.innerHTML = '<tr><td colspan="3">Nenhuma pergunta cadastrada.</td></tr>';
            return;
        }
        questionsTbody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const question = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `<td>${question.enunciado}</td><td>${question.nivel}</td><td class="actions-cell"><button class="btn edit-btn" data-id="${doc.id}">Editar</button><button class="btn delete-btn" data-id="${doc.id}" style="background: var(--danger-color);">Excluir</button></td>`;
            questionsTbody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
        questionsTbody.innerHTML = '<tr><td colspan="3">Erro ao carregar perguntas.</td></tr>';
    }
}

saveBtn.addEventListener('click', async () => {
    const questionId = questionIdInput.value;
    const faixaEtaria = [];
    if (faixaCriancaCheckbox.checked) faixaEtaria.push("crianca");
    if (faixaAdolescenteCheckbox.checked) faixaEtaria.push("adolescente");
    if (faixaAdultoCheckbox.checked) faixaEtaria.push("adulto");
    if (faixaEtaria.length === 0) {
        alert("Por favor, selecione pelo menos uma faixa etária.");
        return;
    }
    const questionData = {
        enunciado: enunciadoInput.value.trim(),
        alternativas: [alt1Input.value.trim(), alt2Input.value.trim(), alt3Input.value.trim(), alt4Input.value.trim()],
        correta: parseInt(corretaSelect.value),
        nivel: nivelSelect.value,
        tema: temaInput.value.trim().toLowerCase(),
        referencia: referenciaInput.value.trim(),
        faixaEtaria: faixaEtaria,
        ultimaAtualizacao: serverTimestamp()
    };
    if (!questionData.enunciado || questionData.alternativas.some(alt => !alt)) {
        alert("Por favor, preencha todos os campos da pergunta e das alternativas.");
        return;
    }
    try {
        if (questionId) {
            await updateDoc(doc(db, 'perguntas', questionId), questionData);
            alert('Pergunta atualizada com sucesso!');
        } else {
            await addDoc(collection(db, "perguntas"), questionData);
            alert('Pergunta adicionada com sucesso!');
        }
        resetForm();
        loadQuestions();
    } catch (error) {
        console.error("Erro ao salvar pergunta: ", error);
        alert('Ocorreu um erro ao salvar.');
    }
});

questionsTbody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (target.classList.contains('edit-btn')) {
        const docSnap = await getDoc(doc(db, 'perguntas', id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            formTitle.textContent = 'Editar Pergunta';
            questionIdInput.value = id;
            enunciadoInput.value = data.enunciado;
            [alt1Input.value, alt2Input.value, alt3Input.value, alt4Input.value] = data.alternativas;
            corretaSelect.value = data.correta;
            nivelSelect.value = data.nivel;
            temaInput.value = data.tema;
            referenciaInput.value = data.referencia;
            faixaCriancaCheckbox.checked = data.faixaEtaria?.includes("crianca") || false;
            faixaAdolescenteCheckbox.checked = data.faixaEtaria?.includes("adolescente") || false;
            faixaAdultoCheckbox.checked = data.faixaEtaria?.includes("adulto") || false;
            saveBtn.textContent = 'Atualizar Pergunta';
            cancelBtn.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    }
    if (target.classList.contains('delete-btn')) {
        if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
            try {
                await deleteDoc(doc(db, "perguntas", id));
                alert('Pergunta excluída com sucesso!');
                loadQuestions();
            } catch (error) {
                console.error("Erro ao excluir pergunta:", error);
                alert("Ocorreu um erro ao excluir.");
            }
        }
    }
});

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    formTitle.textContent = 'Adicionar Nova Pergunta';
    questionIdInput.value = '';
    enunciadoInput.value = '';
    alt1Input.value = '';
    alt2Input.value = '';
    alt3Input.value = '';
    alt4Input.value = '';
    corretaSelect.value = '0';
    nivelSelect.value = 'facil';
    temaInput.value = '';
    referenciaInput.value = '';
    faixaCriancaCheckbox.checked = false;
    faixaAdolescenteCheckbox.checked = false;
    faixaAdultoCheckbox.checked = true;
    saveBtn.textContent = 'Salvar Pergunta';
    cancelBtn.classList.add('hidden');
}

exportBtn.addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "perguntas"));
        const perguntas = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            delete data.ultimaAtualizacao; // Remove campos de timestamp antes de exportar
            perguntas.push(data);
        });
        if (perguntas.length === 0) {
            alert("Nenhuma pergunta para exportar.");
            return;
        }
        const jsonString = JSON.stringify(perguntas, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_biblico_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao exportar perguntas:", error);
        alert("Ocorreu um erro ao exportar as perguntas.");
    }
});

importBtn.addEventListener('click', () => {
    const file = importFileInput.files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo JSON.");
        return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const perguntas = JSON.parse(event.target.result);
            if (!Array.isArray(perguntas) || perguntas.length === 0) {
                alert("Arquivo JSON inválido ou vazio.");
                return;
            }
            if (!confirm(`Deseja importar ${perguntas.length} perguntas? Isso pode substituir ou adicionar dados.`)) return;
            const batch = writeBatch(db);
            const perguntasCollection = collection(db, "perguntas");
            let importedCount = 0;
            perguntas.forEach(pergunta => {
                if (pergunta.enunciado && Array.isArray(pergunta.alternativas)) {
                    // Garante que faixaEtaria exista e seja um array
                    if (!pergunta.faixaEtaria || !Array.isArray(pergunta.faixaEtaria) || pergunta.faixaEtaria.length === 0) {
                        pergunta.faixaEtaria = ["adolescente", "adulto"]; // Valor padrão
                    }
                    batch.set(doc(perguntasCollection), {
                        ...pergunta,
                        ultimaAtualizacao: serverTimestamp() // Adiciona timestamp de última atualização
                    });
                    importedCount++;
                }
            });
            await batch.commit();
            alert(`${importedCount} perguntas importadas com sucesso!`);
            loadQuestions();
            importFileInput.value = '';
        } catch (error) {
            console.error("Erro ao importar perguntas:", error);
            alert("Erro ao processar o arquivo JSON ou importar perguntas.");
        }
    };
    reader.readAsText(file);
});

// --- Lógica de Sugestões ---
async function loadSuggestions(clear = true) {
    if (clear) {
        suggestionsTbody.innerHTML = '<tr><td colspan="5">Carregando sugestões...</td></tr>';
        lastVisibleSuggestion = null;
    }

    try {
        let q;
        const statusFilter = filterStatusSelect.value;

        // Base da query
        let baseQuery = collection(db, "sugestoes");
        
        // Aplica o filtro de status
        if (statusFilter === 'pending') {
            q = query(baseQuery, where("respondida", "==", false), orderBy("data", "desc"), limit(suggestionsPerPage));
        } else if (statusFilter === 'responded') {
            q = query(baseQuery, where("respondida", "==", true), orderBy("data", "desc"), limit(suggestionsPerPage));
        } else { // 'all'
            q = query(baseQuery, orderBy("data", "desc"), limit(suggestionsPerPage));
        }
        
        // Aplica startAfter para paginação, se não for uma carga inicial
        if (lastVisibleSuggestion && clear === false) {
             if (statusFilter === 'pending') {
                q = query(baseQuery, where("respondida", "==", false), orderBy("data", "desc"), startAfter(lastVisibleSuggestion), limit(suggestionsPerPage));
            } else if (statusFilter === 'responded') {
                q = query(baseQuery, where("respondida", "==", true), orderBy("data", "desc"), startAfter(lastVisibleSuggestion), limit(suggestionsPerPage));
            } else { // 'all'
                q = query(baseQuery, orderBy("data", "desc"), startAfter(lastVisibleSuggestion), limit(suggestionsPerPage));
            }
        }

        const querySnapshot = await getDocs(q);
        const newSuggestions = [];
        querySnapshot.forEach((doc) => {
            newSuggestions.push({ id: doc.id, ...doc.data() });
        });

        if (clear) {
            suggestionsTbody.innerHTML = ''; // Limpa a tabela para novas sugestões
        }

        if (newSuggestions.length === 0 && clear) {
            suggestionsTbody.innerHTML = '<tr><td colspan="5">Nenhuma sugestão cadastrada.</td></tr>';
            loadMoreSuggestionsBtn.classList.add('hidden');
            return;
        }

        newSuggestions.forEach((suggestion) => {
            const row = document.createElement('tr');
            // Converte timestamp do Firestore para formato legível
            const date = suggestion.data && typeof suggestion.data.toDate === 'function' ? suggestion.data.toDate().toLocaleString() : 'N/A';
            const status = suggestion.respondida ? 'Respondida' : 'Pendente';
            row.innerHTML = `
                <td>${suggestion.nome || 'Anônimo'}</td>
                <td>${suggestion.mensagem}</td>
                <td>${date}</td>
                <td>${status}</td>
                <td class="actions-cell">
                    <button class="btn respond-suggestion-btn" data-id="${suggestion.id}">Responder</button>
                    <button class="btn delete-suggestion-btn" data-id="${suggestion.id}" style="background: var(--danger-color);">Excluir</button>
                </td>
            `;
            suggestionsTbody.appendChild(row);
        });

        // Mostra/oculta o botão "Carregar Mais"
        if (newSuggestions.length < suggestionsPerPage) {
            loadMoreSuggestionsBtn.classList.add('hidden');
        } else {
            loadMoreSuggestionsBtn.classList.remove('hidden');
            lastVisibleSuggestion = querySnapshot.docs[querySnapshot.docs.length - 1]; // Armazena o último documento para paginação
        }

    } catch (error) {
        console.error("Erro ao carregar sugestões:", error);
        if (clear) {
            suggestionsTbody.innerHTML = '<tr><td colspan="5">Erro ao carregar sugestões.</td></tr>';
        }
        loadMoreSuggestionsBtn.classList.add('hidden');
    }
}

// Event listeners para a seção de sugestões
if (loadMoreSuggestionsBtn) {
    loadMoreSuggestionsBtn.addEventListener('click', () => loadSuggestions(false));
}

if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', () => loadSuggestions(true));
}

if (suggestionsTbody) {
    suggestionsTbody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id; // ID da sugestão

        if (target.classList.contains('respond-suggestion-btn')) {
            const docSnap = await getDoc(doc(db, 'sugestoes', id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentSuggestionBeingResponded = { id: id, ...data };
                suggestionUserName.textContent = data.nome || 'Anônimo';
                suggestionMessageText.textContent = data.mensagem;
                responseTextarea.value = ''; // Limpa o campo de resposta
                // Tenta carregar uma resposta existente, se houver
                const responseSnap = await getDoc(doc(db, 'sugestoes', id, 'respostas', 'adminResponse'));
                if (responseSnap.exists()) {
                    responseTextarea.value = responseSnap.data().resposta;
                }
                respondSuggestionModal.classList.add('visible');
            }
        }
        
        if (target.classList.contains('delete-suggestion-btn')) {
            if (confirm('Tem certeza que deseja excluir esta sugestão? Isso também excluirá qualquer resposta associada.')) {
                try {
                    // Excluir a subcoleção de respostas primeiro (se existir)
                    const responsesSnapshot = await getDocs(collection(db, 'sugestoes', id, 'respostas'));
                    const batch = writeBatch(db);
                    responsesSnapshot.forEach((resDoc) => {
                        batch.delete(resDoc.ref);
                    });
                    await batch.commit(); // Executa a exclusão das subcoleções

                    await deleteDoc(doc(db, "sugestoes", id)); // Exclui o documento da sugestão principal
                    alert('Sugestão excluída com sucesso!');
                    loadSuggestions(true); // Recarrega a lista
                } catch (error) {
                    console.error("Erro ao excluir sugestão:", error);
                    alert("Ocorreu um erro ao excluir a sugestão.");
                }
            }
        }
    });
}

// Lógica do Modal de Resposta
if (closeRespondSuggestionModal) {
    closeRespondSuggestionModal.addEventListener('click', () => {
        respondSuggestionModal.classList.remove('visible');
        currentSuggestionBeingResponded = null; // Reseta a sugestão atual
    });
}

if (cancelResponseBtn) {
    cancelResponseBtn.addEventListener('click', () => {
        respondSuggestionModal.classList.remove('visible');
        currentSuggestionBeingResponded = null; // Reseta a sugestão atual
    });
}

if (sendResponseBtn) {
    sendResponseBtn.addEventListener('click', async () => {
        if (!currentSuggestionBeingResponded) return;

        const responseText = responseTextarea.value.trim();
        if (!responseText) {
            alert('Por favor, escreva uma resposta.');
            return;
        }
        if (responseText.length > 500) {
            alert('A resposta não pode ter mais de 500 caracteres.');
            return;
        }

        sendResponseBtn.disabled = true;
        sendResponseBtn.textContent = 'Enviando...';

        try {
            const suggestionRef = doc(db, 'sugestoes', currentSuggestionBeingResponded.id);
            const responseRef = doc(db, 'sugestoes', currentSuggestionBeingResponded.id, 'respostas', 'adminResponse');

            const batch = writeBatch(db); // Inicia um batch para operações atômicas

            // Adiciona a operação de setDoc para a resposta ao batch
            batch.set(responseRef, {
                resposta: responseText,
                respondidoPor: auth.currentUser.displayName || 'Admin',
                dataResposta: serverTimestamp()
            }, { merge: true }); // Garante que a resposta seja criada/atualizada

            // Adiciona a operação de updateDoc para a sugestão principal ao batch
            batch.update(suggestionRef, {
                respondida: true,
                // Marca a sugestão como "não lida" para o usuário que a enviou
                [`lidaPor.${currentSuggestionBeingResponded.userId}`]: false
            });

            await batch.commit(); // Executa todas as operações do batch atomicamente

            alert('Resposta enviada com sucesso!');
            respondSuggestionModal.classList.remove('visible');
            loadSuggestions(true); // Recarrega a lista para mostrar o status atualizado
            currentSuggestionBeingResponded = null;

        } catch (error) {
            console.error("Erro ao enviar resposta:", error);
            alert("Ocorreu um erro ao enviar a resposta.");
        } finally {
            sendResponseBtn.disabled = false;
            sendResponseBtn.textContent = 'Enviar Resposta';
        }
    });
}

// --- Lógica de Solicitações de Moderador ---
async function loadModeratorRequests(clear = true) {
    if (clear) {
        moderatorRequestsTbody.innerHTML = '<tr><td colspan="7">Carregando solicitações...</td></tr>';
        lastVisibleRequest = null;
    }

    try {
        let q;
        const statusFilter = filterModeratorStatusSelect.value;

        let baseQuery = collection(db, "solicitacoesModerador");
        
        if (statusFilter === 'pending') {
            q = query(baseQuery, where("status", "==", "pendente"), orderBy("dataSolicitacao", "desc"), limit(requestsPerPage));
        } else if (statusFilter === 'approved') {
            q = query(baseQuery, where("status", "==", "aprovado"), orderBy("dataSolicitacao", "desc"), limit(requestsPerPage));
        } else if (statusFilter === 'rejected') {
            q = query(baseQuery, where("status", "==", "rejeitado"), orderBy("dataSolicitacao", "desc"), limit(requestsPerPage));
        } else { // 'all'
            q = query(baseQuery, orderBy("dataSolicitacao", "desc"), limit(requestsPerPage));
        }
        
        if (lastVisibleRequest && clear === false) {
             if (statusFilter === 'pending') {
                q = query(baseQuery, where("status", "==", "pendente"), orderBy("dataSolicitacao", "desc"), startAfter(lastVisibleRequest), limit(requestsPerPage));
            } else if (statusFilter === 'approved') {
                q = query(baseQuery, where("status", "==", "aprovado"), orderBy("dataSolicitacao", "desc"), startAfter(lastVisibleRequest), limit(requestsPerPage));
            } else if (statusFilter === 'rejected') {
                q = query(baseQuery, where("status", "==", "rejeitado"), orderBy("dataSolicitacao", "desc"), startAfter(lastVisibleRequest), limit(requestsPerPage));
            } else { // 'all'
                q = query(baseQuery, orderBy("dataSolicitacao", "desc"), startAfter(lastVisibleRequest), limit(requestsPerPage));
            }
        }

        const querySnapshot = await getDocs(q);
        const newRequests = [];
        querySnapshot.forEach((doc) => {
            newRequests.push({ id: doc.id, ...doc.data() });
        });

        if (clear) {
            moderatorRequestsTbody.innerHTML = '';
        }

        if (newRequests.length === 0 && clear) {
            moderatorRequestsTbody.innerHTML = '<tr><td colspan="7">Nenhuma solicitação de moderador.</td></tr>';
            loadMoreModeratorRequestsBtn.classList.add('hidden');
            return;
        }

        newRequests.forEach((request) => {
            const row = document.createElement('tr');
            const date = request.dataSolicitacao && typeof request.dataSolicitacao.toDate === 'function' ? request.dataSolicitacao.toDate().toLocaleString() : 'N/A';
            const statusColor = request.status === 'aprovado' ? 'color: green;' : (request.status === 'rejeitado' ? 'color: red;' : 'color: orange;');
            const statusText = request.status.charAt(0).toUpperCase() + request.status.slice(1);

            // Determina a visibilidade e estado dos botões
            const isApproved = request.status === 'aprovado';
            const approveBtnDisabled = isApproved ? 'disabled' : '';
            const rejectBtnDisabled = isApproved ? 'disabled' : ''; // Desabilita rejeitar se já aprovado
            const deactivateBtnHidden = isApproved ? '' : 'hidden'; // Mostra desativar APENAS se aprovado
            
            const actionsHtml = `
                <button class="btn approve-request-btn" data-id="${request.id}" ${approveBtnDisabled}>Aprovar</button>
                <button class="btn reject-request-btn" data-id="${request.id}" style="background: var(--danger-color);" ${rejectBtnDisabled}>Rejeitar</button>
                <button class="btn deactivate-moderator-btn ${deactivateBtnHidden}" data-user-id="${request.userId}" data-request-id="${request.id}" style="background: #6c757d;">Desativar</button>
            `;

            row.innerHTML = `
                <td>${request.userName || 'Anônimo'}</td>
                <td>${request.plano}</td>
                <td>${request.whatsapp || 'N/A'}</td>
                <td>${request.comprovanteURL ? `<a href="${request.comprovanteURL}" target="_blank">Ver Comprovante</a>` : 'N/A'}</td>
                <td>${date}</td>
                <td style="${statusColor}">${statusText}</td>
                <td class="actions-cell">${actionsHtml}</td>
            `;
            moderatorRequestsTbody.appendChild(row);
        });

        // Mostra/oculta o botão "Carregar Mais Solicitações"
        if (newRequests.length < requestsPerPage) {
            loadMoreModeratorRequestsBtn.classList.add('hidden');
        } else {
            loadMoreModeratorRequestsBtn.classList.remove('hidden');
            lastVisibleRequest = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

    } catch (error) {
        console.error("Erro ao carregar solicitações de moderador:", error);
        if (clear) {
            moderatorRequestsTbody.innerHTML = '<tr><td colspan="7">Erro ao carregar solicitações.</td></tr>';
        }
        loadMoreModeratorRequestsBtn.classList.add('hidden');
    }
}

// Event listeners para a seção de solicitações de moderador
if (loadMoreModeratorRequestsBtn) {
    loadMoreModeratorRequestsBtn.addEventListener('click', () => loadModeratorRequests(false));
}

if (filterModeratorStatusSelect) {
    filterModeratorStatusSelect.addEventListener('change', () => loadModeratorRequests(true));
}

if (moderatorRequestsTbody) {
    moderatorRequestsTbody.addEventListener('click', async (e) => {
        const target = e.target;
        const requestId = target.dataset.id; // ID da solicitação
        const userId = target.dataset.userId; // ID do usuário

        // Lógica para aprovar, rejeitar ou desativar moderador
        if (target.classList.contains('approve-request-btn')) {
            if (confirm('Tem certeza que deseja APROVAR esta solicitação?')) {
                await updateModeratorStatus(requestId, 'aprovado');
            }
        } else if (target.classList.contains('reject-request-btn')) {
            if (confirm('Tem certeza que deseja REJEITAR esta solicitação?')) {
                await updateModeratorStatus(requestId, 'rejeitado');
            }
        } else if (target.classList.contains('deactivate-moderator-btn')) {
            // Verificação de segurança: garantir que userId não é undefined/null
            if (!userId) {
                console.error("Erro: userId não encontrado no dataset do botão Desativar.", target);
                alert("Não foi possível identificar o usuário para desativar. Recarregue a página e tente novamente.");
                return;
            }
            if (confirm('Tem certeza que deseja DESATIVAR o status de moderador para este usuário?')) {
                await deactivateModerator(userId, requestId); // Passa o userId e o requestId
            }
        }
    });
}

// Função para atualizar o status de uma solicitação de moderador (Aprovar/Rejeitar)
async function updateModeratorStatus(requestId, status) {
    const requestRef = doc(db, 'solicitacoesModerador', requestId);
    try {
        const requestDoc = await getDoc(requestRef);
        if (!requestDoc.exists()) {
            alert("Solicitação não encontrada.");
            return;
        }
        const requestData = requestDoc.data();
        const userId = requestData.userId; // O ID do usuário associado à solicitação
        const userRef = doc(db, 'usuarios', userId);

        const batch = writeBatch(db);

        // 1. Atualizar o status da solicitação
        batch.update(requestRef, { status: status });

        // 2. Atualizar o documento do usuário com base no status
        if (status === 'aprovado') {
            batch.update(userRef, {
                moderador: true,
                plano: requestData.plano,
                gruposCriados: [], // Inicializa como vazio
                dataAtivacao: serverTimestamp()
            });
            alert(`Solicitação de ${requestData.userName} APROVADA! Usuário agora é moderador.`);
        } else if (status === 'rejeitado') {
            alert(`Solicitação de ${requestData.userName} REJEITADA.`);
            // Se rejeitado, também resetamos o status de moderador do usuário, caso ele já fosse.
            // Isso evita situações onde um moderador que tinha plano expirado/revogado e solicitou de novo
            // não fica "preso" como moderador sem plano.
            batch.update(userRef, {
                moderador: false,
                plano: null,
                gruposCriados: [],
                dataAtivacao: null
            });
        }

        await batch.commit(); // Executa as operações em batch
        loadModeratorRequests(true); // Recarrega a lista de solicitações
    } catch (error) {
        console.error(`Erro ao ${status} solicitação de moderador:`, error);
        alert(`Ocorreu um erro ao ${status} a solicitação.`);
    }
}

// NOVA FUNÇÃO: Desativar Moderador
async function deactivateModerator(userId, requestId) {
    // Verificação adicional, embora já feita no event listener
    if (!userId) {
        console.error("Erro interno: userId é indefinido ou nulo na função deactivateModerator.");
        alert("Erro interno: Não foi possível processar a desativação.");
        return;
    }

    const userRef = doc(db, 'usuarios', userId);
    const requestRef = doc(db, 'solicitacoesModerador', requestId); // Referência à solicitação de moderador original

    try {
        const batch = writeBatch(db);

        // 1. Resetar o status de moderador do usuário no documento de usuário
        batch.update(userRef, {
            moderador: false,
            plano: null,
            gruposCriados: [], // Importante para zerar a contagem de grupos criados e liberar o limite
            dataAtivacao: null
        });

        // 2. Atualizar o status da solicitação original para 'rejeitado'
        // Isso marca a solicitação como tratada e reflete a desativação.
        batch.update(requestRef, { status: 'rejeitado' }); 

        await batch.commit(); // Executa as operações atomicamente
        alert('Status de moderador desativado com sucesso!');
        loadModeratorRequests(true); // Recarrega a lista de solicitações para refletir a mudança
    } catch (error) {
        console.error("Erro ao desativar moderador:", error);
        alert("Não foi possível desativar o moderador.");
    }
}
