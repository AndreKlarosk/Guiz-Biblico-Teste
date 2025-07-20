// utils.js

let customAlertModal;
let customAlertTitle;
let customAlertMessage;
let customAlertOkBtn;
let closeCustomAlertModal;

// Adiciona event listeners assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Obtenha as referências aos elementos do modal APENAS quando o DOM estiver pronto
    customAlertModal = document.getElementById('custom-alert-modal');
    customAlertTitle = document.getElementById('custom-alert-title');
    customAlertMessage = document.getElementById('custom-alert-message');
    customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    closeCustomAlertModal = document.getElementById('close-custom-alert-modal');

    // Agora que os elementos foram obtidos, adicione os event listeners
    if (customAlertOkBtn) {
        customAlertOkBtn.addEventListener('click', () => {
            if (customAlertModal) customAlertModal.classList.remove('visible');
        });
    }
    if (closeCustomAlertModal) {
        closeCustomAlertModal.addEventListener('click', () => {
            if (customAlertModal) customAlertModal.classList.remove('visible');
        });
    }
    window.addEventListener('click', (event) => {
        // Verifica se o clique foi diretamente no backdrop do modal
        if (event.target === customAlertModal) {
            if (customAlertModal) customAlertModal.classList.remove('visible');
        }
    });
});

/**
 * Exibe um modal de alerta personalizado com a mensagem e título fornecidos.
 * @param {string} message A mensagem a ser exibida no alerta.
 * @param {string} [title="Atenção!"] O título do alerta.
 */
export function showAlert(message, title = "Atenção!") {
    // Verifica se os elementos do modal foram carregados (agora estarão após DOMContentLoaded)
    if (!customAlertModal) {
        console.error("Custom alert modal elements not found. Falling back to native alert.");
        alert(`${title}\n\n${message}`);
        return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    if (customAlertModal) customAlertModal.classList.add('visible');
}
