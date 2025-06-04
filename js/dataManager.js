// ============================================================
// Piano Benessere Pro - dataManager.js
// Handles all interactions with localStorage (CRUD)
// ============================================================

(function(app) {

    // --- Private Helper Functions ---

    /**
     * Safely retrieves and parses JSON data from localStorage.
     * @param {string} key - The localStorage key.
     * @returns {object|array|null} Parsed data or null if not found or error.
     */
    const _getItem = (key) => {
        try {
            const item = localStorage.getItem(key);
            // Handle cases where item might be 'null' or 'undefined' as strings
            if (item === null || item === 'undefined') {
                return null;
            }
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error reading or parsing localStorage key "${key}":`, e);
            // Optionally notify the user about potential data corruption
            if (app.ui && app.ui.showStatusMessage) {
                app.ui.showStatusMessage(`Errore lettura dati (${key}). Dati potrebbero essere corrotti.`, 'error', 5000);
            }
            return null; // Return null on error to allow fallback
        }
    };

    /**
     * Safely stringifies and saves data to localStorage.
     * @param {string} key - The localStorage key.
     * @param {*} value - The value to save (will be JSON.stringify'd).
     * @returns {boolean} True if successful, false otherwise.
     */
    const _setItem = (key, value) => {
        try {
            // Ensure undefined values are stored as null strings for consistency
            const valueToStore = value === undefined ? null : value;
            localStorage.setItem(key, JSON.stringify(valueToStore));
            return true;
        } catch (e) {
            console.error(`Error writing localStorage key "${key}":`, e);
            // Specific handling for storage quota exceeded error
            if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota'))) {
                 // Use the global UI function for feedback
                 if (app.ui && app.ui.showStatusMessage) {
                    app.ui.showStatusMessage('Errore: Spazio di archiviazione locale pieno! Impossibile salvare.', 'error', 10000);
                 } else {
                    alert('Errore: Spazio di archiviazione locale pieno! Impossibile salvare altri dati.');
                 }
            } else {
                 // Generic save error message
                 if (app.ui && app.ui.showStatusMessage) {
                    app.ui.showStatusMessage(`Errore durante il salvataggio (${key}).`, 'error');
                 }
            }
            return false;
        }
    };

    /**
     * Safely removes an item from localStorage.
     * @param {string} key - The localStorage key.
     * @returns {boolean} True if successful or key didn't exist, false on error.
     */
    const _removeItem = (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing localStorage key "${key}":`, e);
             if (app.ui && app.ui.showStatusMessage) {
                app.ui.showStatusMessage(`Errore durante la rimozione dei dati (${key}).`, 'error');
            }
            return false;
        }
    };

    /**
     * Generates the specific localStorage key for daily data.
     * @param {string} prefix - The key prefix from config.
     * @param {string} day - The day name (e.g., "Lunedì").
     * @returns {string} The full localStorage key.
     */
    const _getDailyKey = (prefix, day) => {
        if (!app.config.DAYS_OF_WEEK.includes(day)) {
            console.warn(`Invalid day provided for key generation: ${day}`);
            // Return a generic key or handle error as needed
            return `${prefix}invalid_day`;
        }
        return `${prefix}${day}`;
    };

    /**
     * Initializes or validates the data structure for a given day's tracking data.
     * Ensures all expected fields (notes, water, activity, meals, supplements) exist.
     * @param {object|null} dayData - Existing data loaded from storage, or null.
     * @returns {object} A complete and validated data object for the day.
     */
    const _initializeOrValidateDayTrackingData = (dayData) => {
        const cleanData = dayData || {}; // Start with existing data or empty object

        // Ensure top-level fields exist
        cleanData.notes = cleanData.notes || "";
        cleanData.water = cleanData.water || ""; // Keep as string for flexibility (e.g., "1.5", "")
        cleanData.activity = cleanData.activity || "";
        cleanData.supplements = cleanData.supplements || {};
        cleanData.meals = cleanData.meals || {};

        // Ensure meal structures exist and are valid
        app.config.MEAL_TYPES.forEach(mealType => {
            const meal = cleanData.meals[mealType] || {};
            meal.itemsStatus = (typeof meal.itemsStatus === 'object' && meal.itemsStatus !== null) ? meal.itemsStatus : {};
            meal.ateOther = typeof meal.ateOther === 'boolean' ? meal.ateOther : false;
            meal.otherText = meal.otherText || "";
            cleanData.meals[mealType] = meal; // Assign back validated structure
        });

        // Ensure supplement structures exist
        app.config.SUPPLEMENTS.forEach(sup => {
            if (typeof cleanData.supplements[sup.id] !== 'boolean') {
                cleanData.supplements[sup.id] = false; // Default to false if missing or wrong type
            }
        });

        return cleanData;
    };


    // --- Public API ---
    app.dataManager = {

        // -- Tracking Data (Daily Food, Notes, Water, Activity, Supplements) --
        loadTrackingData: function(day) {
            const key = _getDailyKey(app.config.LOCALSTORAGE_KEYS.TRACKING_DATA_PREFIX, day);
            const data = _getItem(key);
            // Always return a validated structure, even if data was null or partial
            return _initializeOrValidateDayTrackingData(data);
        },

        saveTrackingData: function(day, data) {
             const key = _getDailyKey(app.config.LOCALSTORAGE_KEYS.TRACKING_DATA_PREFIX, day);
             // Optionally add more validation here before saving
             if (typeof data !== 'object' || data === null) {
                 console.error('Invalid data type provided for saveTrackingData');
                 return false;
             }
             // Ensure the data being saved conforms to the expected structure
             const validatedData = _initializeOrValidateDayTrackingData(data);
             return _setItem(key, validatedData);
        },

        // Load all tracking data for the entire week
        loadWeeklyTrackingData: function() {
            const weeklyData = {};
            app.config.DAYS_OF_WEEK.forEach(day => {
                // Use the single-day loader which includes validation
                weeklyData[day] = this.loadTrackingData(day);
            });
            return weeklyData;
        },

        // -- Workout Data (Daily) --
        loadWorkouts: function(day) {
            const key = _getDailyKey(app.config.LOCALSTORAGE_KEYS.WORKOUT_DATA_PREFIX, day);
            const data = _getItem(key);
            // Ensure it always returns an array
            return Array.isArray(data) ? data : [];
        },

        saveWorkouts: function(day, workouts) {
            const key = _getDailyKey(app.config.LOCALSTORAGE_KEYS.WORKOUT_DATA_PREFIX, day);
            if (!Array.isArray(workouts)) {
                 console.error('Invalid data type provided for saveWorkouts (must be an array)');
                 return false;
            }
            // Optional: Validate structure of each workout object in the array
            return _setItem(key, workouts);
        },

         // Load all workout data for the entire week
         loadWeeklyWorkoutData: function() {
            const weeklyData = {};
            app.config.DAYS_OF_WEEK.forEach(day => {
                weeklyData[day] = this.loadWorkouts(day);
            });
            return weeklyData;
        },

        // -- Editable Diet Plan --
        loadDietPlan: function() {
            const storedPlan = _getItem(app.config.LOCALSTORAGE_KEYS.DIET_PLAN);
            // IMPORTANT: Return stored plan OR a deep copy of the default from config
            // Deep copy prevents accidental modification of the default config object
            return storedPlan || JSON.parse(JSON.stringify(app.config.DEFAULT_WEEKLY_PLAN));
        },

        saveDietPlan: function(plan) {
            // Basic validation: ensure it's an object
            if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) {
                console.error('Invalid data type provided for saveDietPlan (must be an object)');
                return false;
            }
            // Optional: Add deeper validation to ensure days and meal structures are present
            return _setItem(app.config.LOCALSTORAGE_KEYS.DIET_PLAN, plan);
        },

        // -- Settings --
        loadSettings: function() {
            const storedSettings = _getItem(app.config.LOCALSTORAGE_KEYS.SETTINGS);
            // Merge stored settings with defaults to ensure all keys exist
            // Stored settings override defaults if present
            return { ...app.config.DEFAULT_SETTINGS, ...(storedSettings || {}) };
        },

        saveSettings: function(settings) {
             if (typeof settings !== 'object' || settings === null) {
                 console.error('Invalid data type provided for saveSettings');
                 return false;
             }
             // Before saving, merge with defaults to ensure all necessary keys are present?
             // Or just save what's provided? Let's just save what's provided, assuming
             // the load function handles merging with defaults.
             const settingsToSave = { ...settings }; // Create a shallow copy
             return _setItem(app.config.LOCALSTORAGE_KEYS.SETTINGS, settingsToSave);
        },

        // -- Weekly Cost --
        loadWeeklyCost: function() {
            const stored = _getItem(app.config.LOCALSTORAGE_KEYS.WEEKLY_COST);
            return stored !== null && stored !== undefined ? stored : '';
        },

        saveWeeklyCost: function(cost) {
            if (cost === undefined || cost === null || cost === '') {
                return _setItem(app.config.LOCALSTORAGE_KEYS.WEEKLY_COST, '');
            }
            const parsed = parseFloat(cost);
            if (isNaN(parsed)) {
                console.error('Invalid cost value provided for saveWeeklyCost');
                return false;
            }
            return _setItem(app.config.LOCALSTORAGE_KEYS.WEEKLY_COST, parsed);
        },

        // -- Data Reset Utility --
        resetAllData: function() {
            let success = true;
            console.warn("Attempting to reset all application data from localStorage...");

            // Generate all possible keys to remove
            const keysToRemove = [
                app.config.LOCALSTORAGE_KEYS.DIET_PLAN,
                app.config.LOCALSTORAGE_KEYS.SETTINGS,
                app.config.LOCALSTORAGE_KEYS.WEEKLY_COST,
            ];

            app.config.DAYS_OF_WEEK.forEach(day => {
                keysToRemove.push(_getDailyKey(app.config.LOCALSTORAGE_KEYS.TRACKING_DATA_PREFIX, day));
                keysToRemove.push(_getDailyKey(app.config.LOCALSTORAGE_KEYS.WORKOUT_DATA_PREFIX, day));
            });

            // Remove each key
            keysToRemove.forEach(key => {
                if (!_removeItem(key)) {
                    // Even if removal fails (e.g., key didn't exist), log but continue
                    console.log(`Attempted removal of key: ${key}`);
                    // Consider setting success = false only on actual error?
                    // For now, assume it worked unless _removeItem logs an error.
                }
            });

            console.log("Data reset process completed.");
            // Note: Success here mainly means the process ran without throwing errors from _removeItem.
            // It doesn't guarantee keys existed or were actually removed if permissions fail etc.
            return success; // Return value might need refinement based on strictness required
        }
    };

    // Initialize the dataManager property on the global app object
    console.log("DataManager initialized.");

}(window.app = window.app || {}));