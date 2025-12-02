// public/js/my-account.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Initialize Firebase from the global config
const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const enrolledCoursesContainer = document.getElementById('enrolled-courses-container');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const welcomeMessage = document.getElementById('welcome-message');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
        welcomeMessage.textContent = `Welcome back, ${user.displayName || user.email}!`;
        fetchEnrolledCourses(user.uid);
    } else {
        // User is signed out.
        // Redirect to login page if they try to access this page without being logged in.
        window.location.href = 'login.html';
    }
});

async function fetchEnrolledCourses(userId) {
    try {
        const enrolledCoursesRef = collection(db, "users", userId, "enrolledCourses");
        const q = query(enrolledCoursesRef, orderBy("enrolledAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // User is enrolled in no courses.
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        let coursesHTML = '';
        querySnapshot.forEach(doc => {
            const course = doc.data();
            const progress = course.progress || 0;

            coursesHTML += `
                <div class="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden transform transition hover:-translate-y-1">
                    <div class="p-6">
                        <h3 class="text-xl font-bold font-serif text-gray-800 mb-2">${course.courseTitle}</h3>
                        <p class="text-sm text-gray-500 mb-4">Enrolled on: ${new Date(course.enrolledAt.seconds * 1000).toLocaleDateString()}</p>
                        
                        <!-- Progress Bar -->
                        <div class="mb-2">
                            <div class="flex justify-between mb-1">
                                <span class="text-xs font-medium text-gray-500">Progress</span>
                                <span class="text-xs font-medium text-gray-500">${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        
                        <a href="lms.html?courseId=${course.courseId}" class="inline-block mt-4 bg-blue-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            Go to Course
                        </a>
                    </div>
                </div>
            `;
        });

        enrolledCoursesContainer.innerHTML = coursesHTML;
        loadingState.classList.add('hidden');
        enrolledCoursesContainer.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        loadingState.textContent = 'Error loading your courses. Please try again.';
    }
}
