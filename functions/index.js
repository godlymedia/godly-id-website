const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.setAdminClaim = onDocumentWritten("users/{userId}", (event) => {
  const userData = event.data.after.data();
  const userId = event.params.userId;

  // Check if the role is 'admin'
  if (userData && userData.role === "admin") {
    // Set custom claim for admin
    return admin.auth().setCustomUserClaims(userId, { admin: true });
  } else {
    // Remove custom claim if role is not admin
    return admin.auth().setCustomUserClaims(userId, { admin: false });
  }
});
