import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB28X87t2LKbA3cIMKuIUQhcyXlHOT_Wik",
  authDomain: "echo-agent-bd26e.firebaseapp.com",
  projectId: "echo-agent-bd26e",
  storageBucket: "echo-agent-bd26e.appspot.com",
  messagingSenderId: "992283072217",
  appId: "1:992283072217:web:eed95db1e1caa79d6350c8",
  measurementId: "G-LCQJ3J5N41"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
