let customAlertModalElement; // Renomeado para evitar confusão com o nome da função showAlert
let customAlertTitleElement;
let customAlertMessageElement;
let customAlertOkBtnElement;
let closeCustomAlertModalElement;

document.addEventListener('DOMContentLoaded', () => {
    customAlertModalElement = document.getElementById('custom-alert-modal');
    customAlertTitleElement = document.getElementById('custom-alert-title');
    customAlertMessageElement = document.getElementById('custom-alert-message');
    customAlertOkBtnElement = document.getElementById('custom-alert-ok-btn');
    closeCustomAlertModalElement = document.getElementById('close-custom-alert-modal');

    if (customAlertOkBtnElement) {
        customAlertOkBtnElement.addEventListener('click', () => {
            if (customAlertModalElement) customAlertModalElement.classList.remove('visible');
        });
    }
    if (closeCustomAlertModalElement) {
        closeCustomAlertModalElement.addEventListener('click', () => {
            if (customAlertModalElement) customAlertModalElement.classList.remove('visible');
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target === customAlertModalElement) {
            if (customAlertModalElement) customAlertModalElement.classList.remove('visible');
        }
    });
});

/**
 * Exibe um modal de alerta personalizado com a mensagem e título fornecidos.
 * @param {string} message A mensagem a ser exibida no alerta.
 * @param {string} [title="Atenção!"] O título do alerta.
 */
export function showAlert(message, title = "Atenção!") {
    // Garante que os elementos são obtidos ou já foram obtidos pelo DOMContentLoaded
    if (!customAlertModalElement) { // Verifica a variável que é atribuída no DOMContentLoaded
        console.error("Custom alert modal elements not found. Attempting to get them now.");
        // Tenta obter novamente caso o DOMContentLoaded não tenha sido disparado ainda
        // (cenário menos comum para módulos, mas para robustez)
        customAlertModalElement = document.getElementById('custom-alert-modal');
        customAlertTitleElement = document.getElementById('custom-alert-title');
        customAlertMessageElement = document.getElementById('custom-alert-message');
        customAlertOkBtnElement = document.getElementById('custom-alert-ok-btn');
        closeCustomAlertModalElement = document.getElementById('close-custom-alert-modal');

        if (!customAlertModalElement) { // Se ainda não encontrou, volta para o alerta nativo
            console.error("Custom alert modal elements still not found after retry. Falling back to native alert.");
            alert(`${title}\n\n${message}`);
            return;
        }
    }

    if (customAlertTitleElement) customAlertTitleElement.textContent = title;
    if (customAlertMessageElement) customAlertMessageElement.textContent = message;
    if (customAlertModalElement) customAlertModalElement.classList.add('visible');
}
