// ============================================================
// Piano Benessere Pro - router.js
// Handles hash-based routing and calls section renderers
// ============================================================

(function(app) {

    // Store references to section rendering functions
    // These will be populated by the individual section JS files
    const routes = {};

    /**
     * Registers a section's rendering function with the router.
     * Called by each section module (e.g., app.router.registerRoute('dashboard', app.sections.dashboard.render)).
     * @param {string} sectionId - The hash identifier (e.g., 'dashboard').
     * @param {function} renderFunction - The function that renders the section's content.
     */
    function registerRoute(sectionId, renderFunction) {
        if (typeof renderFunction !== 'function') {
            console.error(`Failed to register route "${sectionId}": renderFunction is not a function.`);
            return;
        }
        routes[sectionId] = renderFunction;
        console.log(`Route registered: #${sectionId}`);
    }

    /**
     * Parses the URL hash to extract the section ID and parameters.
     * Example: #tracking/Lunedì -> { section: 'tracking', params: ['Lunedì'] }
     * Example: #dashboard -> { section: 'dashboard', params: [] }
     * @param {string} hash - The current window.location.hash.
     * @returns {{section: string, params: string[]}}
     */
    function parseHash(hash) {
        const cleanedHash = hash.startsWith('#') ? hash.substring(1) : hash;
        // Split by the first slash only to handle parameters correctly
        const parts = cleanedHash.split(/\/(.+)/); // Matches first '/' and captures the rest
        const section = parts[0] || app.config.DEFAULT_ROUTE; // Use default if hash is empty or just '#'
        // Decode URI components for parameters (e.g., handle spaces %20)
        const params = parts[1] ? parts[1].split('/').map(decodeURIComponent) : [];
        return { section, params };
    }

    /**
     * Handles the hash change event: parses the hash, finds the corresponding
     * route, and calls its render function.
     */
    function handleRouteChange() {
        app.ui.showLoading('Caricamento sezione...'); // Show loading indicator

        const { section: sectionId, params } = parseHash(window.location.hash);
        const renderFunction = routes[sectionId];

        // Update active link in sidebar
        app.ui.setActiveSidebarLink(sectionId);

        if (renderFunction) {
            console.log(`Routing to section: #${sectionId}`, "with params:", params);
            try {
                // Clear previous status messages on navigation
                // app.ui.showStatusMessage("", "info", 0); // Hide immediately

                // Call the section's render function, passing parameters using spread syntax
                renderFunction(...params);
                // IMPORTANT: The renderFunction itself is responsible for calling app.ui.setContent() and app.ui.hideLoading()
            } catch (error) {
                console.error(`Error rendering section "${sectionId}":`, error);
                app.ui.setContent('<div class="card"><div class="card-header">Errore</div><div class="card-body text-danger">Si è verificato un errore nel caricamento della sezione. Controlla la console per dettagli.</div></div>');
                app.ui.hideLoading(); // Ensure loading is hidden on error
            }
        } else {
            console.warn(`Route not found: #${sectionId}. Redirecting to default route (#${app.config.DEFAULT_ROUTE}).`);
            // If the route doesn't exist (or wasn't registered), redirect to the default
            app.router.navigateTo(app.config.DEFAULT_ROUTE);
            // No need to hide loading here, the redirect will trigger handleRouteChange again
        }
    }

    // --- Public API ---
    app.router = {
        /**
         * Initializes the router by adding the hashchange listener
         * and handling the initial page load route.
         */
        init: function() {
            if (!app.config || !app.ui) {
                 console.error("Router initialization failed: Core modules (config, ui) not found.");
                 return;
            }
            window.addEventListener('hashchange', handleRouteChange);
            handleRouteChange(); // Process the initial hash on page load
            console.log("Router initialized.");
        },

        /**
         * Programmatically navigates to a different hash/section.
         * @param {string} sectionId - The target section ID (e.g., 'tracking').
         * @param {string[]} [params=[]] - Optional parameters for the route.
         */
        navigateTo: function(sectionId, params = []) {
            const encodedParams = params.map(encodeURIComponent).join('/');
            const newHash = `#${sectionId}${encodedParams ? '/' + encodedParams : ''}`;
            if (window.location.hash !== newHash) {
                 window.location.hash = newHash;
            } else {
                // If navigating to the same hash, manually trigger reload if needed (usually not)
                // handleRouteChange();
                 console.log(`Already at hash: ${newHash}`);
            }
        },

        /**
         * Allows section modules to register their render functions.
         */
        register: registerRoute
    };

}(window.app = window.app || {}));