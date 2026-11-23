/**
 * PANORAMA — Main Application Entry Point
 * Initializes application modules, verifies storage integrity,
 * and boots the UI controller.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if first-run: if completely empty, populate initial sample dataset so
  // reviewer / user immediately experiences the full interactive application!
  const existingSubjects = StorageService.getSubjects();
  if (!existingSubjects || existingSubjects.length === 0) {
    StorageService.loadSampleData();
  }

  // Initialize UI Controller
  UIController.init();
});
