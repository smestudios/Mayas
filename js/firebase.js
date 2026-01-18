// admin/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBccFLv-DFsIVC85KxwHr_q0jXLj_YoKEs",
  authDomain: "sistema-ventas-mayas.firebaseapp.com",
  projectId: "sistema-ventas-mayas",
  storageBucket: "sistema-ventas-mayas.firebasestorage.app",
  messagingSenderId: "665498193982",
  appId: "1:665498193982:web:92a04b8816356baeab016f"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
