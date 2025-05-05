// ============================================================
// Piano Benessere Pro - sections/settings.js
// Logic for the Settings view
// ============================================================

(function(app) {

    let currentSettings = null; // Holds the loaded settings object { nutritionistEmail, waterGoalL, ... }
    let hasChanges = false;     // Tracks unsaved changes compared to loaded settings

    /** Loads settings from dataManager into `currentSettings`. */
    function _loadSettings() {
        try {
            currentSettings = app.dataManager.loadSettings(); // Gets merged defaults + saved values
            hasChanges = false; // Reset changes flag on load/re-load
            console.log("Settings loaded:", currentSettings);
        } catch (error) {
            console.error("Error loading settings:", error);
            currentSettings = { ...app.config.DEFAULT_SETTINGS }; // Fallback to defaults on error
            app.ui.showStatusMessage("Errore caricamento impostazioni, usando valori predefiniti.", 'error');
        }
    }

    /** Checks UI inputs against `currentSettings` and sets `hasChanges` flag. */
    function _checkForChanges() {
        if (!currentSettings) return;

        const emailInput = document.getElementById('nutritionistEmail');
        const waterGoalInput = document.getElementById('waterGoal');
        let changed = false;

        if (emailInput && currentSettings.nutritionistEmail !== emailInput.value.trim()) {
            changed = true;
        }
        if (waterGoalInput) {
            const currentGoal = parseFloat(currentSettings.waterGoalL) || 0;
            const newGoal = parseFloat(waterGoalInput.value) || 0;
             // Use a tolerance for floating point comparison if needed, but direct compare often okay here
             if (currentGoal !== newGoal) {
                 changed = true;
            }
        }
        // Add checks for other settings fields here...

        hasChanges = changed;
        _updateSaveButtonState(); // Update button based on changes
    }


    /** Saves the settings from UI input fields via dataManager. */
    function _saveSettings() {
         if (!currentSettings) {
             app.ui.showStatusMessage("Errore: Impostazioni non caricate, impossibile salvare.", 'error');
             return;
         }

         // Update the currentSettings object with values from the UI *before* saving
         const emailInput = document.getElementById('nutritionistEmail');
         const waterGoalInput = document.getElementById('waterGoal');
         if (emailInput) currentSettings.nutritionistEmail = emailInput.value.trim();
         if (waterGoalInput) currentSettings.waterGoalL = parseFloat(waterGoalInput.value) || app.config.DEFAULT_SETTINGS.waterGoalL;
         // Update currentSettings with other fields here...


         // Now check if there were actually changes after updating from UI
         // (This check might be redundant if _checkForChanges was called on input, but safe)
         // Let's rely on the hasChanges flag set by _checkForChanges
         if (!hasChanges) {
              app.ui.showStatusMessage("Nessuna modifica da salvare.", 'info', 1500);
              return;
         }

         const saveButton = document.getElementById('saveSettingsButton');
         if (saveButton) {
            saveButton.classList.add('loading');
            saveButton.disabled = true;
        }

         // Simulate async for UI feedback
         return new Promise((resolve) => {
             setTimeout(() => {
                 let success = false;
                 try {
                     success = app.dataManager.saveSettings(currentSettings); // Save the updated object
                     if (success) {
                         app.ui.showStatusMessage("Impostazioni salvate.", 'success');
                         hasChanges = false; // Reset flag after successful save
                         _updateSaveButtonState(); // Update button state
                         // Update the global config if needed (e.g., for mailto) - might require app reload for full effect
                         app.config.NUTRITIONIST_EMAIL = currentSettings.nutritionistEmail;
                         console.log("Settings saved and config potentially updated in memory.");
                     } else {
                         // Error message handled by dataManager for quota issues
                          app.ui.showStatusMessage("Errore nel salvataggio delle impostazioni.", 'error');
                     }
                 } catch (e) {
                      console.error("Unexpected error during settings save:", e);
                      app.ui.showStatusMessage("Errore critico salvataggio impostazioni.", 'error');
                      success = false;
                 } finally {
                     if (saveButton) {
                         saveButton.classList.remove('loading');
                          _updateSaveButtonState(); // Re-evaluate button state
                     }
                      resolve(success);
                 }
             }, 50); // Small delay
         });
    }

    /** Handles the reset data confirmation and action. */
    function _handleResetData() {
        const confirmationMessage = `ATTENZIONE!\n\nSei assolutamente sicuro di voler cancellare TUTTI i dati dell'applicazione?\n\nQuesto include:\n- Tracking giornaliero (pasti, acqua, attività, note, integratori)\n- Allenamenti registrati\n- Piano alimentare personalizzato (tornerà a quello di default)\n- Impostazioni salvate\n\nL'operazione NON può essere annullata!`;

        // Use a more user-friendly confirmation if possible, but window.confirm is the fallback
        if (window.confirm(confirmationMessage)) {
            console.warn("User confirmed data reset.");
            app.ui.showLoading("Reset di tutti i dati in corso...");

             // Use setTimeout to allow UI update before potentially blocking localStorage operations
             setTimeout(() => {
                 let success = false;
                 try {
                     success = app.dataManager.resetAllData();
                     if (success) {
                         app.ui.showStatusMessage("Tutti i dati sono stati resettati con successo!", 'success', 5000);
                         // Clear current state variables after successful reset
                         currentSettings = null;
                         hasChanges = false;
                         // Force a reload or navigate to dashboard to reflect reset state
                         // Reload is generally better after a full reset
                         // app.router.navigateTo(app.config.DEFAULT_ROUTE);
                         location.reload();
                     } else {
                         // Error message should be shown by dataManager if specific errors occurred
                         app.ui.showStatusMessage("Reset fallito o parziale. Alcuni dati potrebbero essere rimasti.", 'error', 7000);
                     }
                 } catch (e) {
                      console.error("Unexpected error during data reset:", e);
                       app.ui.showStatusMessage("Errore critico durante il reset.", 'error', 7000);
                       success = false;
                 } finally {
                      if (!success) { // Hide loading only if reload didn't happen
                           app.ui.hideLoading();
                      }
                 }
             }, 50);

        } else {
            console.log("Data reset cancelled by user.");
        }
    }

     /** Updates the enabled/disabled state of the save button based on `hasChanges`. */
    function _updateSaveButtonState() {
        const saveButton = document.getElementById('saveSettingsButton');
        if (saveButton) {
            const isLoading = saveButton.classList.contains('loading');
            saveButton.disabled = !hasChanges || isLoading;
        }
    }


    /** Main render function for the Settings section */
    function _renderSettingsSection() {
        console.log("Rendering Settings section");
        app.ui.showLoading('Caricamento impostazioni...');
        _loadSettings(); // Load current settings into `currentSettings`

        // Handle case where settings couldn't be loaded (though _loadSettings has fallback)
        if (!currentSettings) {
             app.ui.setContent('<p class="text-danger text-center mt-5">Errore critico: Impossibile caricare le impostazioni.</p>');
             return;
        }

        const container = app.ui.renderElement('section', { id: 'settings-section' });
        const header = app.ui.renderElement('h1', {}, [
            app.ui.renderElement('i', { class: 'fa-solid fa-gear me-2' }), 'Impostazioni'
        ]);
        container.appendChild(header);

        // Settings Form Card
        const formCard = app.ui.renderElement('div', { class: 'card mb-4 shadow-sm' }); // Margin bottom + shadow
        formCard.append(
            app.ui.renderElement('div', { class: 'card-header' }, [
                 app.ui.renderElement('h3', { class: 'mb-0 fs-5' }, [app.ui.renderElement('i', { class: 'fa-solid fa-sliders me-2' }), 'Preferenze']) // Smaller header
            ]),
            app.ui.renderElement('form', { id: 'settings-form', class: 'card-body' }, [ // Add form tag
                // Email Setting
                app.ui.renderElement('div', { class: 'mb-3' }, [ // Use mb-3 for spacing
                    app.ui.renderElement('label', { for: 'nutritionistEmail', class: 'form-label' }, 'Email Nutrizionista (per Notifica):'),
                    app.ui.renderElement('input', {
                        type: 'email', id: 'nutritionistEmail', name: 'nutritionistEmail', class: 'form-control',
                        value: app.ui.sanitize(currentSettings.nutritionistEmail || ''), // Use loaded value
                        placeholder: 'es: nome@esempio.com'
                    }),
                    app.ui.renderElement('div', {class: 'form-text text-muted small'}, 'Indirizzo usato dal pulsante "Salva e Notifica" nella sezione Tracking.') // Use div for form-text
                ]),
                // Water Goal Setting
                app.ui.renderElement('div', { class: 'mb-3' }, [
                    app.ui.renderElement('label', { for: 'waterGoal', class: 'form-label' }, 'Obiettivo Acqua Giornaliero (Litri):'),
                    app.ui.renderElement('input', {
                        type: 'number', id: 'waterGoal', name: 'waterGoal', class: 'form-control', style: 'max-width: 150px;', // Limit width
                        step: '0.1', min: '0',
                        value: app.ui.sanitize(String(currentSettings.waterGoalL ?? app.config.DEFAULT_SETTINGS.waterGoalL)) // Use loaded or default, ensure string
                    })
                ]),
                // Add more settings fields here... Example:
                // app.ui.renderElement('div', { class: 'mb-3 form-check form-switch' }, [
                //      app.ui.renderElement('input', {type: 'checkbox', class: 'form-check-input', id: 'someToggle', name: 'someToggle', checked: currentSettings.someToggle ?? false }),
                //      app.ui.renderElement('label', {class: 'form-check-label', for: 'someToggle'}, 'Attiva funzionalità X')
                // ]),

                 // Save Button (within the form, perhaps at the bottom)
                 app.ui.renderElement('div', { class: 'mt-4' }, [ // Margin top for separation
                     app.ui.renderElement('button', { type: 'button', id: 'saveSettingsButton', class: 'button button-primary', disabled: !hasChanges }, [
                         app.ui.renderElement('i', { class: 'fa-solid fa-save me-1' }), // Reduced margin
                         app.ui.renderElement('span', {class: 'btn-text'}, ' Salva Impostazioni'),
                         app.ui.renderElement('i', { class: 'fa-solid fa-spinner fa-spin spinner ms-1' })
                     ])
                 ])
            ]) // End of form element
        ); // End of formCard append
        container.appendChild(formCard);


        // Reset Data Card
        const resetCard = app.ui.renderElement('div', { class: 'card reset-section border-danger mt-5 shadow-sm' }); // Margin top
        resetCard.append(
            app.ui.renderElement('div', { class: 'card-header bg-danger text-white' }, [
                 app.ui.renderElement('h3', { class: 'mb-0 fs-5' }, [app.ui.renderElement('i', { class: 'fa-solid fa-triangle-exclamation me-2' }), 'Area Reset Dati'])
            ]),
            app.ui.renderElement('div', { class: 'card-body' }, [
                app.ui.renderElement('p', { class: 'text-danger mb-3' }, [
                    app.ui.renderElement('strong', {}, 'Attenzione: '), 'Questa azione cancellerà permanentemente tutti i dati salvati in locale (tracking giornaliero, allenamenti, piano alimentare modificato, impostazioni). L\'operazione non è reversibile.'
                ]),
                app.ui.renderElement('button', { type: 'button', id: 'resetDataButton', class: 'button button-danger' }, [
                     app.ui.renderElement('i', { class: 'fa-solid fa-trash-can me-2' }), 'Resetta Tutti i Dati dell\'Applicazione'
                ])
            ])
        );
        container.appendChild(resetCard);

        // --- Set Content & Add Listeners ---
        app.ui.setContent(container); // This also hides loading indicator

        // Add listeners after elements are in the DOM
        const settingsForm = document.getElementById('settings-form');
        const saveBtn = document.getElementById('saveSettingsButton');
        const resetBtn = document.getElementById('resetDataButton');

        if (settingsForm) {
            // Add listener to form inputs to detect changes
             settingsForm.addEventListener('input', _checkForChanges);
             // Prevent default form submission if accidentally triggered by enter key
             settingsForm.addEventListener('submit', (e) => e.preventDefault());
        }
        if (saveBtn) {
             saveBtn.addEventListener('click', _saveSettings);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', _handleResetData);
        }

        _updateSaveButtonState(); // Set initial button state based on loaded data (should be disabled)
        console.log("Settings section rendering complete.");
    }

    // --- Public API ---
    app.sections = app.sections || {}; // Ensure namespace exists
    app.sections.settings = {
        render: _renderSettingsSection // Expose the main render function
    };

}(window.app = window.app || {})); // Pass the global app object