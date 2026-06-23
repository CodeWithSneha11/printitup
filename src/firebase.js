import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyBhv509ZsNNQbT9Qkaw9dvDp6vcx6aHa88",
  authDomain: "printitup-7e507.firebaseapp.com",
  projectId: "printitup-7e507",
  storageBucket: "printitup-7e507.firebasestorage.app",
  messagingSenderId: "423223276838",
  appId: "1:423223276838:web:d8565209b2b27d99703de7",
  measurementId: "G-J3N9NQZ7QL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);