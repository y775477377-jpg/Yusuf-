import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHt28i2oc4hz3O3b6YPFZ4iIylJKcu5X4",
  authDomain: "yusuf-a3fa9.firebaseapp.com",
  databaseURL: "https://yusuf-a3fa9-default-rtdb.firebaseio.com",
  projectId: "yusuf-a3fa9",
  storageBucket: "yusuf-a3fa9.firebasestorage.app",
  messagingSenderId: "366684014367",
  appId: "1:366684014367:web:50caa30c3e8a085c53522a"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);