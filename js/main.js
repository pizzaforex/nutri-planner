// ============================================================
// Piano Benessere Pro - main.js
// Main application entry point and initialization
// ============================================================

// Create the main application object if it doesn't exist
window.app = window.app || {};

// Immediately Invoked Function Expression (IIFE) to scope initialization
(function(app) {
    'use strict'; // Enable strict mode

    /**
     * Initializes the entire application.
     * This function is called once the DOM is fully loaded.
     */
    function initializeApp() {
        console.log(`Initializing Piano Benessere Pro (${app.config?.APP_VERSION || 'unknown version'})...`);

        // --- Prerequisites Check ---
        if (!app.config || !app.dataManager || !app.ui || !app.router) {
            console.error("Initialization failed: One or more core modules (config, dataManager, ui, router) are missing.");
            document.body.innerHTML = '<p style="color:red; padding:20px;">Errore critico: Impossibile avviare l\'applicazione. Moduli principali mancanti.</p>';
            return;
        }
         // Check for section modules (at least one should exist)
        if (!app.sections || Object.keys(app.sections).length === 0) {
             console.error("Initialization failed: No section modules found in app.sections.");
             // Allow app to load but show error?
             // return;
        }


        // --- Register Section Routes ---
        // Each section module should have exposed its render function.
        // Example structure assumes sections are added like: app.sections.dashboard = { render: ... }
        if (app.sections) {
             for (const sectionId in app.sections) {
                 if (app.sections.hasOwnProperty(sectionId) && app.sections[sectionId].render) {
                     app.router.register(sectionId, app.sections[sectionId].render);
                 } else {
                      console.warn(`Could not register route for section "${sectionId}": render function not found.`);
                 }
             }
        } else {
             console.warn("app.sections object not found. No routes will be registered.");
        }


        // --- Initialize UI Elements ---
        app.ui.setAppVersion(app.config.APP_VERSION);

        // Apply theme based on saved settings
        const initSettings = app.dataManager.loadSettings();
        app.ui.applyDarkMode(initSettings.darkMode);


        // --- Initialize Router ---
        // The router will handle the initial route based on the URL hash
        app.router.init();


        // --- Final Steps ---
        console.log("Application initialization complete.");
        // Loading indicator will be hidden by the first successful setContent call in the router/section render.
        // If the initial route fails, the loading indicator might stay visible.
        // Consider adding a timeout failsafe to hide it if needed.
         setTimeout(() => {
             const indicator = document.getElementById('loadingIndicator');
             if (indicator && indicator.classList.contains('visible')) {
                 console.warn("Loading indicator still visible after init timeout, hiding it.");
                 app.ui.hideLoading();
                 // Optionally show an error if content area is still empty
                 const contentArea = document.getElementById('content-area');
                  if (!contentArea || contentArea.innerHTML.trim() === '') {
                       app.ui.setContent('<p class="text-danger">Caricamento iniziale fallito.</p>')
                  }
             }
         }, 3000); // Hide after 3 seconds if still visible


        // Example: Pre-load some data if needed (usually handled by sections)
        // const settings = app.dataManager.loadSettings();
        // console.log("Loaded settings:", settings);
    }

    // --- DOM Ready Execution ---
    // Ensures the DOM is ready before trying to manipulate it.
    if (document.readyState === 'loading') {
        // Loading hasn't finished yet
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // `DOMContentLoaded` has already fired
        initializeApp();
    }

}(window.app)); // Pass the global app object