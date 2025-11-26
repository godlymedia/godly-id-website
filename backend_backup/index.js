// functions/index.js

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { generateCertificatePDF } = require("./utils/generateCertificate");

// Admin SDK already initialized in previous step or here if not
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Trigger: When an enrollment document is updated.
 * Path: users/{userId}/enrolledCourses/{courseId}
 * Goal: If status becomes 'completed' and no certificate exists, generate one.
 */
exports.generateCertificateOnCompletion = onDocumentUpdated(
  "users/{userId}/enrolledCourses/{courseId}",
  async (event) => {
    const newData = event.data.after.data();
    const previousData = event.data.before.data();
    const { userId, courseId } = event.params;

    // 1. Check if status changed to 'completed'
    if (newData.status === "completed" && previousData.status !== "completed") {
      logger.info(`Generating certificate for User: ${userId}, Course: ${courseId}`);

      try {
        // 2. Fetch required details
        // Get User Profile for Name
        const userSnap = await db.collection("users").doc(userId).get();
        const userData = userSnap.data();
        const studentName = userData.displayName || "Valued Student";

        // Get Course Details for Title (or use the one in enrollment if trustworthy)
        const courseName = newData.courseTitle || "Course";
        
        // Date
        const completionDate = new Date().toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // 3. Generate PDF Buffer
        const pdfBytes = await generateCertificatePDF(studentName, courseName, completionDate);
        const buffer = Buffer.from(pdfBytes);

        // 4. Upload to Firebase Storage
        const filePath = `certificates/${userId}/${courseId}_certificate.pdf`;
        const file = bucket.file(filePath);
        
        await file.save(buffer, {
            metadata: { contentType: "application/pdf" },
            public: true // Optional: Make public or generate signed URL
        });

        // 5. Get Download URL
        // If public:
        // const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        // Better: Get Signed URL (valid for long time) or make token based
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500' // Far future
        });

        // 6. Update Enrollment Doc with Certificate URL
        await event.data.after.ref.update({
            certificateUrl: url,
            certificateGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info("Certificate generated and URL saved.");

      } catch (error) {
        logger.error("Error generating certificate:", error);
      }
    }
  }
);

// Optional: Manual Trigger (Callable) for testing
exports.testGenerateCertificate = onCall(async (request) => {
    // For testing from frontend console if needed
    // Not implemented for prod safety
    return { message: "Use the automated trigger." };
});
