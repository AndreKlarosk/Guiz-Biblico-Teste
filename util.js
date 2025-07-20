// utils.js

// Elementos do Modal de Alerta Personalizado (Serão obtidos aqui)
const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertTitle = document.getElementById('custom-alert-title');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
const closeCustomAlertModal = document.getElementById('close-custom-alert-modal');

// Adiciona event listeners assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
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
    if (!customAlertModal) {
        console.error("Custom alert modal elements not found. Falling back to native alert.");
        alert(`${title}\n\n${message}`);
        return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    if (customAlertModal) customAlertModal.classList.add('visible');

    // Nenhuma necessidade de adicionar/remover listeners aqui, pois eles já são persistentes no DOMContentLoaded
    // A função apenas controla a visibilidade do modal.
}
