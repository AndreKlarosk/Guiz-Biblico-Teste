import { db } from './firebase.js';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const rankingTbody = document.getElementById('ranking-tbody');
const rankingTabs = document.querySelector('.ranking-tabs');
const scoreHeader = document.getElementById('ranking-score-header');

let currentRanking = 'Total';

window.addEventListener('DOMContentLoaded', async () => {
    await loadRanking();
});

rankingTabs.addEventListener('click', (e) => {
    if (e.target.matches('.btn')) {
        rankingTabs.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentRanking = e.target.dataset.ranking;
        loadRanking();
    }
});

async function loadRanking() {
    rankingTbody.innerHTML = '<tr><td colspan="3">Carregando ranking...</td></tr>';

    const orderByField = `stats.pontuacao${currentRanking}`;
    scoreHeader.textContent = `Pontuação ${currentRanking === 'Total' ? 'Total' : currentRanking}`;
    
    try {
        const q = query(
            collection(db, "usuarios"), 
            // A LINHA ABAIXO FOI ADICIONADA PARA CORRIGIR O PROBLEMA
            where("showInRanking", "==", true),
            where(orderByField, ">", 0),
            orderBy(orderByField, "desc"), 
            limit(100)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            rankingTbody.innerHTML = '<tr><td colspan="3">Nenhum jogador neste ranking ainda.</td></tr>';
            return;
        }

        rankingTbody.innerHTML = '';
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const score = user.stats[`pontuacao${currentRanking}`] || 0;
            const equippedBorder = user.bordaEquipada || 'default';
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="rank rank-${rank}">${rank}</td>
                <td class="member-info">
                    <a href="perfil.html?uid=${user.uid}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px;">
                        <div class="profile-photo-container ${equippedBorder}" style="width: 40px; height: 40px; padding: 2px;">
                            <img src="${user.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${user.nome}" style="width: 100%; height: 100%;">
                        </div>
                        <span>${user.nome}</span>
                    </a>
                </td>
                <td class="score">${score}</td>
            `;
            rankingTbody.appendChild(row);
            rank++;
        });

    } catch (error) {
        console.error(`Erro ao carregar o ranking ${currentRanking}:`, error);
        rankingTbody.innerHTML = '<tr><td colspan="3">Não foi possível carregar o ranking.</td></tr>';
    }
}