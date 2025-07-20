// Importando as funções necessárias do SDK v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sua configuração do Firebase (fornecida por você)
const firebaseConfig = {
  apiKey: "AIzaSyD4lmKZCuXjGtXLWEYpMRkQG8NqbXg9LOE",
  authDomain: "familia-sem-tedio.firebaseapp.com",
  projectId: "familia-sem-tedio",
  storageBucket: "familia-sem-tedio.firebasestorage.app",
  messagingSenderId: "1047210009041",
  appId: "1:1047210009041:web:12bab4f8ab53060f7bc0f0",
  measurementId: "G-MDNNDV2JWW"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que serão utilizados no projeto
export const auth = getAuth(app);
export const db = getFirestore(app);