// public/js/lms.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { generateAndDownloadCertificate } from './certificate-generator.js';

// Initialize Firebase
const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
let currentCourseId = null;
let currentCourseData = null;
let currentEnrollmentData = null;
let activeLessonIndex = 0;
let currentUser = null;

// UI Elements
const courseTitleHeader = document.getElementById('course-title-header');
const lessonsList = document.getElementById('lessons-list');
const videoPlayer = document.getElementById('video-player');
const videoPlaceholder = document.getElementById('video-placeholder');
const lessonTitle = document.getElementById('lesson-title');
const lessonContent = document.getElementById('lesson-content');
const markCompleteBtn = document.getElementById('mark-complete-btn');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');
const prevBtn = document.getElementById('prev-lesson');
const nextBtn = document.getElementById('next-lesson');
const progressText = document.getElementById('progress-text');
const sidebar = document.getElementById('sidebar');
const progressRing = document.getElementById('progress-ring');

// Helper: Extract Video ID from YouTube URL
function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// 1. Auth & Initialization
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const urlParams = new URLSearchParams(window.location.search);
        currentCourseId = urlParams.get('courseId');

        if (!currentCourseId) {
            alert("No course specified.");
            window.location.href = 'my-account.html';
            return;
        }
        await loadCourseData(user.uid, currentCourseId);
    } else {
        window.location.href = 'index.html';
    }
});

// 2. Load Data
async function loadCourseData(uid, courseId) {
    try {
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
            alert("Course not found.");
            window.location.href = 'my-account.html';
            return;
        }
        currentCourseData = courseSnap.data();

        const enrollmentRef = doc(db, "users", uid, "enrolledCourses", courseId);
        const enrollmentSnap = await getDoc(enrollmentRef);

        if (!enrollmentSnap.exists()) {
            alert("You are not enrolled in this course.");
            window.location.href = 'courses.html';
            return;
        }
        currentEnrollmentData = enrollmentSnap.data();

        // Resume Logic
        if (currentEnrollmentData.lastWatchedLesson !== undefined) {
             activeLessonIndex = currentEnrollmentData.lastWatchedLesson;
        } else if (currentEnrollmentData.completedLessons?.length > 0) {
            const completedSet = new Set(currentEnrollmentData.completedLessons);
            for(let i=0; i < currentCourseData.lessons.length; i++) {
                if(!completedSet.has(i.toString())) {
                    activeLessonIndex = i;
                    break;
                }
            }
        }

        loadLesson(activeLessonIndex);
        updateProgressUI();

    } catch (error) {
        console.error("Error loading LMS:", error);
    }
}

// 3. Render Sidebar
function renderSidebar() {
    courseTitleHeader.textContent = currentCourseData.title;
    lessonsList.innerHTML = '';
    const completedSet = new Set(currentEnrollmentData.completedLessons || []);

    currentCourseData.lessons.forEach((lesson, index) => {
        const isCompleted = completedSet.has(index.toString());
        const div = document.createElement('div');
        div.className = `p-3 rounded cursor-pointer flex items-center gap-3 transition hover:bg-gray-100 ${index === activeLessonIndex ? 'bg-brand-yellow/10 border-l-4 border-brand-yellow' : ''}`;
        div.onclick = () => {
             loadLesson(index);
             saveLastWatched(index);
        };

        div.innerHTML = `
            <div class="flex-shrink-0">
                ${isCompleted 
                    ? `<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
                    : `<div class="w-5 h-5 border-2 border-gray-300 rounded-full"></div>`
                }
            </div>
            <div class="text-sm font-medium ${index === activeLessonIndex ? 'text-brand-dark font-bold' : 'text-gray-600'}">
                ${lesson.title}
            </div>
        `;
        lessonsList.appendChild(div);
    });
}

// 4. Load Lesson
function loadLesson(index) {
    activeLessonIndex = index;
    const lesson = currentCourseData.lessons[index];

    const videoId = getYoutubeId(lesson.videoUrl);
    if (videoId) {
        videoPlayer.src = `https://www.youtube.com/embed/${videoId}?rel=0`;
        videoPlayer.classList.remove('hidden');
        videoPlaceholder.classList.add('hidden');
    } else {
        videoPlayer.classList.add('hidden');
        videoPlaceholder.classList.remove('hidden');
    }

    lessonTitle.textContent = lesson.title;
    lessonContent.innerHTML = lesson.textContent || "<p class='text-gray-500 italic'>No notes available.</p>";

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentCourseData.lessons.length - 1;

    renderSidebar(); 

    const completedSet = new Set(currentEnrollmentData.completedLessons || []);
    if (completedSet.has(index.toString())) {
        markCompleteBtn.classList.replace('bg-gray-200', 'bg-green-100');
        markCompleteBtn.classList.add('text-green-700');
        btnText.textContent = "Completed";
        btnIcon.innerHTML = `<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
        btnIcon.className = "w-5 h-5 bg-green-500 rounded-full flex items-center justify-center";
    } else {
        markCompleteBtn.classList.remove('bg-green-100', 'text-green-700');
        markCompleteBtn.classList.add('bg-gray-200', 'text-gray-500');
        btnText.textContent = "Mark Complete";
        btnIcon.className = "w-5 h-5 border-2 border-gray-400 rounded-full";
        btnIcon.innerHTML = "";
    }
}

// 5. Progress UI
function updateProgressUI() {
    const total = currentCourseData.lessons.length;
    const completed = (currentEnrollmentData.completedLessons || []).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressText.textContent = `${percent}% Completed`;
    if (progressRing) {
        progressRing.setAttribute("stroke-dasharray", `${percent}, 100`);
    }

    if (percent === 100) {
        handleCourseCompletion();
    }
}

// 6. Save Last Watched
async function saveLastWatched(index) {
    try {
        const enrollmentRef = doc(db, "users", currentUser.uid, "enrolledCourses", currentCourseId);
        await updateDoc(enrollmentRef, {
            lastWatchedLesson: index,
            lastAccessed: serverTimestamp()
        });
        currentEnrollmentData.lastWatchedLesson = index;
    } catch (e) { console.error("Error saving position", e); }
}

// 7. Mark Complete Logic
markCompleteBtn.addEventListener('click', async () => {
    const lessonId = activeLessonIndex.toString();
    if (currentEnrollmentData.completedLessons?.includes(lessonId)) return;

    try {
        const enrollmentRef = doc(db, "users", currentUser.uid, "enrolledCourses", currentCourseId);
        await updateDoc(enrollmentRef, {
            completedLessons: arrayUnion(lessonId),
            lastAccessed: serverTimestamp()
        });

        if (!currentEnrollmentData.completedLessons) currentEnrollmentData.completedLessons = [];
        currentEnrollmentData.completedLessons.push(lessonId);
        
        loadLesson(activeLessonIndex); // Refresh button state
        updateProgressUI();

    } catch (error) {
        console.error("Error marking complete:", error);
    }
});

// 8. Navigation
prevBtn.addEventListener('click', () => {
    if (activeLessonIndex > 0) {
        loadLesson(activeLessonIndex - 1);
        saveLastWatched(activeLessonIndex);
    }
});

nextBtn.addEventListener('click', () => {
    if (activeLessonIndex < currentCourseData.lessons.length - 1) {
        loadLesson(activeLessonIndex + 1);
        saveLastWatched(activeLessonIndex);
    }
});

// 9. Completion Modal
async function handleCourseCompletion() {
    const enrollmentRef = doc(db, "users", currentUser.uid, "enrolledCourses", currentCourseId);
    await updateDoc(enrollmentRef, {
        progress: 100,
        status: 'completed',
        completedAt: serverTimestamp()
    });

    document.getElementById('cert-course-name').textContent = currentCourseData.title;
    document.getElementById('cert-modal').classList.remove('hidden');

    if (!document.getElementById('btn-download-now')) {
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'btn-download-now';
        downloadBtn.className = "w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-green-700 transition mb-3";
        downloadBtn.innerText = "Download Certificate Now";
        downloadBtn.onclick = () => {
            generateAndDownloadCertificate(currentUser.displayName || "Student", currentCourseData.title, new Date().toLocaleDateString());
        };
        const modalActions = document.querySelector('#cert-modal .flex-col');
        modalActions.prepend(downloadBtn);
    }
}

// Sidebar Mobile Toggles
document.getElementById('open-sidebar').addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
document.getElementById('close-sidebar').addEventListener('click', () => sidebar.classList.add('-translate-x-full'));