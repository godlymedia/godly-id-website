// public/js/auth.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Initialize Firebase using the global config
const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Auth State Observer ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is signed in:", user.uid);
    
    // Check User Profile and Role in Firestore
    const userRef = doc(db, "users", user.uid);
    try {
        const userSnap = await getDoc(userRef);
        let userRole = 'student'; // Default role

        if (userSnap.exists()) {
            userRole = userSnap.data().role || 'student'; // Get role, default to student
        } else {
            // Create new user profile if it doesn't exist
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                createdAt: new Date(),
                role: 'student', // Default role
                courses: [] // To track enrolled courses
            });
            console.log("User profile created in Firestore");
        }
        
        // Update UI based on user and their role
        updateUIForLogin(user, userRole);

    } catch (e) {
        console.error("Error checking user profile:", e);
        // Still try to update UI, but without admin rights
        updateUIForLogin(user, 'student');
    }
  } else {
    console.log("User is signed out");
    updateUIForLogout();
  }
});

// --- UI Updates ---
function updateUIForLogin(user, role) {
  const loginBtns = document.querySelectorAll('.auth-login-btn');
  const logoutBtns = document.querySelectorAll('.auth-logout-btn');
  const myAccountLinks = document.querySelectorAll('.auth-my-account-link');
  const adminLinks = document.querySelectorAll('.auth-admin-link'); // New
  const userNames = document.querySelectorAll('.auth-user-name');

  loginBtns.forEach(btn => btn.style.display = 'none');
  
  logoutBtns.forEach(btn => {
    btn.style.display = 'inline-block'; // or block depending on layout
    btn.onclick = logoutUser;
  });

  myAccountLinks.forEach(link => {
    link.style.display = 'inline-block';
  });
  
  // Show admin link ONLY if user is an admin
  adminLinks.forEach(link => {
      if (role === 'admin') {
          link.style.display = 'inline-block'; // or block
      } else {
          link.style.display = 'none';
      }
  });

  userNames.forEach(span => {
    span.textContent = user.displayName || user.email;
  });
}

function updateUIForLogout() {
  const loginBtns = document.querySelectorAll('.auth-login-btn');
  const logoutBtns = document.querySelectorAll('.auth-logout-btn');
  const myAccountLinks = document.querySelectorAll('.auth-my-account-link');
  const adminLinks = document.querySelectorAll('.auth-admin-link'); // New
  const userNames = document.querySelectorAll('.auth-user-name');

  loginBtns.forEach(btn => btn.style.display = 'inline-block');
  logoutBtns.forEach(btn => btn.style.display = 'none');
  myAccountLinks.forEach(link => link.style.display = 'none');
  adminLinks.forEach(link => link.style.display = 'none'); // Hide on logout
  
  userNames.forEach(span => span.textContent = '');
}

// --- Auth Actions ---

// Sign Up
async function signupUser(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Signup Error:", error);
    throw error;
  }
}

// Login
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
}

// Google Login
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Login Error:", error);
    throw error;
  }
}

// Forgot Password
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Reset Password Error:", error);
        throw error;
    }
}

// Logout
async function logoutUser() {
  try {
    await signOut(auth);
    window.location.href = 'index.html'; // Redirect to home after logout
  } catch (error) {
    console.error("Logout Error:", error);
  }
}

// Export functions to be used globally
window.authFn = {
  signupUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword
};

export {
    signupUser,
    loginUser,
    loginWithGoogle,
    logoutUser,
    resetPassword
};
