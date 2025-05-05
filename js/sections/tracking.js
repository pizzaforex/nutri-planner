// ============================================================
// Piano Benessere Pro - sections/tracking.js
// Logic for the Daily Tracking view (Adapted from V8.1 logic)
// ============================================================

(function(app) {

    let currentDay = null;        // Name of the day being tracked (e.g., "Lunedì")
    let currentDayData = null;    // Object holding tracking data for currentDay
    let currentDietPlan = null;   // The reference diet plan (potentially edited)
    let saveTimeout;              // ID for debounced save timeout
    let isSaving = false;         // Flag to prevent concurrent saves

    // --- Core Data Handling (Bound to currentDayData) ---

    /** Updates the in-memory `currentDayData` object from the UI elements. */
    function _updateDataFromUI() {
        if (!currentDay || !currentDayData) {
            console.warn("_updateDataFromUI called without currentDay or currentDayData");
            return;
        }
        console.log(`Updating data from UI for ${currentDay}`);

        const dayData = currentDayData; // Work directly on the state object

        // Update Meals Data
        app.config.MEAL_TYPES.forEach(mealType => {
            const mealContainer = document.getElementById(`${mealType}Section`); // Check if section exists
            if (!mealContainer) return; // Skip if meal section not rendered

            // Ensure meal structure exists in dayData (should be guaranteed by dataManager load)
             if (!dayData.meals) dayData.meals = {};
             if (!dayData.meals[mealType]) dayData.meals[mealType] = { itemsStatus: {}, ateOther: false, otherText: '' };

             const mealData = dayData.meals[mealType];
             const otherCheck = document.getElementById(`${mealType}AltroCheck`);
             const otherText = document.getElementById(`${mealType}AltroText`);
             const itemsContainer = document.getElementById(`${mealType}SuggestedItems`);

             mealData.ateOther = otherCheck ? otherCheck.checked : false;
             mealData.otherText = otherText ? otherText.value : '';
             mealData.itemsStatus = {}; // Reset and repopulate status

             if (itemsContainer) {
                 itemsContainer.querySelectorAll('.food-item').forEach(itemElement => {
                     const index = itemElement.dataset.itemIndex;
                     const consumedCheck = itemElement.querySelector('.food-item-check');
                     const quantityInput = itemElement.querySelector('.food-item-quantity');
                     // Ensure all elements are found before accessing properties
                     if (index !== undefined && consumedCheck && quantityInput) {
                         mealData.itemsStatus[index] = {
                             consumed: consumedCheck.checked,
                             actualQuantity: quantityInput.value
                         };
                     } else {
                          console.warn(`Missing elements in food item index ${index} for meal ${mealType}`);
                     }
                 });
             }
        });

        // Update Extra Tracking (Water/Activity)
        const waterInput = document.getElementById('dailyWater');
        const activityInput = document.getElementById('dailyActivity');
        if (waterInput) dayData.water = waterInput.value; // Keep as string
        if (activityInput) dayData.activity = activityInput.value;

        // Update Notes
        const notesInput = document.getElementById('dailyNotes');
        if (notesInput) dayData.notes = notesInput.value;

        // Update Supplements
         if (!dayData.supplements) dayData.supplements = {}; // Ensure supplements object exists
         app.config.SUPPLEMENTS.forEach(sup => {
             const checkbox = document.getElementById(`sup-${sup.id}`);
             if (checkbox) {
                 dayData.supplements[sup.id] = checkbox.checked;
             } else {
                 // Ensure default value if checkbox not rendered for some reason
                 if (typeof dayData.supplements[sup.id] !== 'boolean') {
                     dayData.supplements[sup.id] = false;
                 }
             }
         });

        // Note: Weekly cost is saved separately on its input change event
    }

    /** Saves the current `currentDayData` to localStorage. */
    function _saveData(isManual = false) {
        if (isSaving) {
             console.log("Save operation skipped: already saving.");
             return false; // Indicate save was skipped
        }
        if (!currentDay || !currentDayData) {
            console.error("Save operation failed: currentDay or currentDayData not set.");
            return false;
        }

        isSaving = true;
        const saveButton = document.getElementById('manualSaveButton');
        if (isManual && saveButton) {
            saveButton.classList.add('loading');
            saveButton.disabled = true;
        }

        // Ensure the very latest UI state is captured before saving
        _updateDataFromUI();

        // Debounce the status message slightly for auto-saves
        const statusDelay = isManual ? 0 : 200;
        // Show status immediately for manual save, delayed for auto-save
        if(isManual) app.ui.showStatusMessage(`Salvataggio ${currentDay}...`, 'info', 4000);
        else setTimeout(() => app.ui.showStatusMessage(`Salvataggio automatico ${currentDay}...`, 'info', 1500), statusDelay);


        // Use setTimeout to allow UI update (spinner) before potentially blocking localStorage write
        return new Promise((resolve) => { // Return a promise to handle async nature
            setTimeout(() => {
                let success = false;
                try {
                    success = app.dataManager.saveTrackingData(currentDay, currentDayData);

                    if (success) {
                        console.log(`Tracking data for ${currentDay} ${isManual ? 'manually' : 'automatically'} saved.`);
                        app.ui.showStatusMessage(`Dati ${currentDay} salvati ${isManual ? 'manualmente' : ''}.`, 'success');
                    } else {
                        // Error message handled by dataManager for quota errors
                        console.error(`Failed to save tracking data for ${currentDay}.`);
                        // Show generic error if not a quota issue
                        if (!localStorage.getItem(app.config.LOCALSTORAGE_KEYS.TRACKING_DATA_PREFIX + currentDay)) {
                            app.ui.showStatusMessage(`Errore salvataggio dati ${currentDay}!`, 'error');
                        }
                    }
                } catch (e) {
                    console.error(`Unexpected error during save operation for ${currentDay}:`, e);
                    app.ui.showStatusMessage(`Errore critico salvataggio dati ${currentDay}!`, 'error');
                    success = false;
                } finally {
                    if (isManual && saveButton) {
                        saveButton.classList.remove('loading');
                        saveButton.disabled = false;
                    }
                    isSaving = false; // Allow subsequent saves
                    resolve(success); // Resolve the promise with success status
                }
            }, 50); // Short delay for UI responsiveness
        });
    }

    /** Debounces the automatic save operation. */
    function _debouncedSave() {
        if (isSaving) return; // Don't queue auto-save if a save is in progress
        clearTimeout(saveTimeout);
        console.log("Debounced save timer started...");
        saveTimeout = setTimeout(() => {
            console.log("Debounced save executing.");
            _saveData(false);
        }, 1800); // Auto-save after 1.8s inactivity
    }

    /** Handles changes to the weekly cost input. */
    function _handleCostChange(event) {
        const costValue = event.target.value;
        // Use dataManager to save cost (could also be debounced if needed)
        // Let's save immediately for cost as it's a single field
        if(app.dataManager.saveWeeklyCost(costValue)) {
             console.log("Weekly cost saved:", costValue);
             // Optional: Show brief confirmation
             app.ui.showStatusMessage('Costo settimanale aggiornato.', 'info', 1000);
        } else {
             console.error("Failed to save weekly cost.");
             // Show error feedback?
             // app.ui.showStatusMessage('Errore salvataggio costo.', 'error');
        }
    }


    // --- UI Update Logic ---

    /** Updates the visual state (disabled, classes) of a meal section based on its data. */
    function _updateMealUIState(mealType) {
        const section = document.getElementById(`${mealType}Section`);
        const itemsContainer = document.getElementById(`${mealType}SuggestedItems`);
        const otherCheck = document.getElementById(`${mealType}AltroCheck`);
        const otherContentDiv = document.getElementById(`${mealType}AltroContent`);
        const copyBtn = section?.querySelector(`.copy-suggested-btn`);

        // Exit if essential elements are not found
        if (!section || !itemsContainer || !otherCheck || !otherContentDiv) {
            console.warn(`Skipping UI update for meal "${mealType}": Elements missing.`);
            return;
        }

        const isOtherChecked = otherCheck.checked;
        let isAnyItemChecked = false;
        let areAllItemsChecked = true; // Assume true initially
        let hasSuggestedItems = false;

        // Toggle visibility/disabled state based on 'Altro' checkbox
        otherContentDiv.style.display = isOtherChecked ? 'block' : 'none'; // Use style display
        itemsContainer.classList.toggle('disabled', isOtherChecked); // Use class to style disabled list items
        if (copyBtn) copyBtn.disabled = isOtherChecked;

        // Iterate through food items to set individual states and calculate summary status
        const itemCheckboxes = itemsContainer.querySelectorAll('.food-item-check');
        if (itemCheckboxes.length > 0) {
            hasSuggestedItems = true;
            itemCheckboxes.forEach(check => {
                const itemEl = check.closest('.food-item');
                const qtyInput = itemEl?.querySelector('.food-item-quantity');

                check.disabled = isOtherChecked; // Disable item checkbox if 'Altro' is checked
                if (qtyInput) {
                    qtyInput.disabled = isOtherChecked || !check.checked; // Disable quantity if 'Altro' or item not checked
                }

                if (!isOtherChecked) { // Only consider item status if 'Altro' is NOT checked
                    if (check.checked) {
                        isAnyItemChecked = true;
                    } else {
                        areAllItemsChecked = false; // If even one is unchecked, not all are checked
                    }
                } else {
                    // If 'Altro' is checked, force all items to be considered 'not checked' for status calculation
                    areAllItemsChecked = false;
                    isAnyItemChecked = false; // Cannot be partially followed if 'Altro' is checked
                }
            });
        } else {
             hasSuggestedItems = false;
             areAllItemsChecked = false; // No items means can't be "all checked"
        }

        // Apply status classes to the meal section container for visual feedback (e.g., side border color)
        section.classList.toggle('ate-other', isOtherChecked);
        section.classList.toggle('fully-followed', !isOtherChecked && hasSuggestedItems && areAllItemsChecked);
        // Partially followed if: not 'Altro', at least one item checked, BUT (not all items checked OR there were no suggested items initially)
        section.classList.toggle('partially-followed', !isOtherChecked && isAnyItemChecked && !(hasSuggestedItems && areAllItemsChecked));
        // Not followed if: not 'Altro' and NO items are checked
        section.classList.toggle('not-followed', !isOtherChecked && !isAnyItemChecked);

    }


    // --- Actions ---

    /** Copies suggested quantities to actual quantity inputs and checks the items. */
    function _copySuggestedQuantities(mealType) {
         // Ensure we have the latest diet plan loaded
        if (!currentDietPlan) {
            currentDietPlan = app.dataManager.loadDietPlan();
        }
        const suggestedMeal = currentDietPlan[currentDay]?.[mealType];
        if (!suggestedMeal || !suggestedMeal.items || suggestedMeal.items.length === 0) {
             app.ui.showStatusMessage("Nessun suggerimento da copiare per questo pasto.", 'info', 1500);
             return;
        }

        const itemsContainer = document.getElementById(`${mealType}SuggestedItems`);
        const otherCheck = document.getElementById(`${mealType}AltroCheck`);
        if (!itemsContainer || !otherCheck) return;

        // Ensure "Altro" is unchecked first
        if (otherCheck.checked) {
            otherCheck.checked = false;
            // Manually trigger UI update for the 'Altro' state before proceeding
            // We need to ensure related inputs/checks become enabled
            _updateMealUIState(mealType);
        }

        let itemsCopied = 0;
        suggestedMeal.items.forEach((item, index) => {
            const quantityInput = itemsContainer.querySelector(`#${mealType}-item-${index}-qty`);
            const checkbox = itemsContainer.querySelector(`#${mealType}-item-${index}-check`);

            // Copy only if elements exist and are NOW enabled
            if (quantityInput && checkbox && !checkbox.disabled) {
                 quantityInput.value = item.quantity || ''; // Use suggested quantity
                 checkbox.checked = true; // Check the item
                 // Ensure quantity input is enabled after checking
                 quantityInput.disabled = false;
                 itemsCopied++;
            }
        });

        if (itemsCopied > 0) {
             // Update UI state for all affected items again to be sure
             _updateMealUIState(mealType);
             // Trigger debounced save to capture changes
             _debouncedSave();
             app.ui.showStatusMessage(`Suggerimenti per ${app.config.MEAL_NAMES[mealType]} copiati.`, 'success', 1500);
        } else {
             app.ui.showStatusMessage("Nessun suggerimento applicabile o 'Altro' selezionato.", 'info', 1500);
        }
    }

    /** Calculates the date for the currently selected day name relative to today */
    function _getDateForCurrentDay() {
         if (!currentDay) return new Date(); // Fallback to today if currentDay isn't set
         const today = new Date();
         const todayIndex = today.getDay(); // 0=Sun, 1=Mon, ...
         const targetDayIndex = app.config.DAYS_OF_WEEK.indexOf(currentDay); // 0=Mon, ...

         // Calculate difference, adjusting for week start (Sunday=0 vs Monday=0)
         const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1; // 0=Mon, ..., 6=Sun
         const diff = targetDayIndex - adjustedTodayIndex;

         const targetDate = new Date(today);
         targetDate.setDate(today.getDate() + diff);
         return targetDate;
    }

    /** Generates the mailto link content. */
    async function _handleSaveAndNotify() {
        console.log("Manual Save & Notify button clicked.");
        // Use await to ensure save completes before generating mailto
        const saved = await _saveData(true);

        if (saved) {
            // Generate link *after* save is confirmed successful
            const mailtoLink = _generateMailtoLink(); // Needs currentDayData which is updated in _saveData
            if (mailtoLink) {
                try {
                    window.location.href = mailtoLink;
                } catch (e) {
                    console.error("Error opening mailto link:", e);
                    app.ui.showStatusMessage("Impossibile aprire client email.", 'error');
                }
            } else {
                app.ui.showStatusMessage("Errore generazione email.", 'error');
            }
        } else {
             console.log("Save failed, notification aborted.");
             // Error message should have been shown by _saveData
        }
    }

    /** Exports all tracked data to a CSV file. */
    function _exportDataToCSV() {
        console.log("Export CSV button clicked.");
        // Ensure latest data for the current day is saved before export
        _saveData(false).then(saved => { // Use the promise from _saveData
            if (!saved && isSaving) {
                // If autosave was already running, wait a bit longer and try again? Or just proceed?
                // Let's proceed with potentially slightly old data if autosave was running.
                console.warn("Autosave might be in progress, exporting potentially slightly outdated data.");
            }

            // Load all data needed for the export
            const weeklyTrackingData = app.dataManager.loadWeeklyTrackingData();
            const weeklyWorkoutData = app.dataManager.loadWeeklyWorkoutData();
            const dietPlan = app.dataManager.loadDietPlan();
            const weeklyCost = app.dataManager.loadWeeklyCost();

            let csvContent = "data:text/csv;charset=utf-8,";

            // Define Headers - Using the more granular approach from previous response
            const headers = [
                "Giorno", "Data",
                "Tipo_Record", "Nome_Record",
                "Dettaglio_1_Nome", "Dettaglio_1_Valore",
                "Dettaglio_2_Nome", "Dettaglio_2_Valore",
                "Dettaglio_3_Nome", "Dettaglio_3_Valore",
                "Dettaglio_4_Nome", "Dettaglio_4_Valore",
                "Dettaglio_5_Nome", "Dettaglio_5_Valore",
                "Testo_Libero",
                "Costo_Settimanale_EUR"
            ];
            csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";

            let costWritten = false; // Flag to write cost only once

            // Helper to format data for CSV cell
            const formatCell = (value) => {
                if (value === null || value === undefined) return '""';
                const stringValue = String(value);
                return `"${stringValue.replace(/"/g, '""')}"`;
            };

            // Iterate through each day
            app.config.DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const dayData = weeklyTrackingData[day];
                const dayWorkouts = weeklyWorkoutData[day];
                if (!dayData) return; // Skip if no data for day

                // Calculate date for this day
                const today = new Date();
                const currentDayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
                const adjustedCurrentDay = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // 0=Mon, ..., 6=Sun
                const diff = dayIndex - adjustedCurrentDay;
                const dateForDay = new Date(today);
                dateForDay.setDate(today.getDate() + diff);
                const formattedDate = app.ui.formatShortDate(dateForDay);

                let isFirstRowForCost = !costWritten;
                const costValue = isFirstRowForCost ? formatCell(weeklyCost) : '""';
                if (isFirstRowForCost && weeklyCost) costWritten = true;

                // 1. Daily Info Row
                 const dailyInfoRow = [
                    formatCell(day), formatCell(formattedDate),
                    formatCell("Info_Giornaliera"), formatCell("Riepilogo"),
                    formatCell("Acqua_L"), formatCell(dayData.water),
                    formatCell("Attivita"), formatCell(dayData.activity),
                    "", "", "", "", "", "", "", "", // Empty details
                    formatCell(dayData.notes), // Notes in free text
                    costValue
                ];
                csvContent += dailyInfoRow.join(",") + "\r\n";

                // 2. Meal Rows
                app.config.MEAL_TYPES.forEach(mealType => {
                    const mealUserData = dayData.meals[mealType];
                    const mealName = app.config.MEAL_NAMES[mealType];
                    const suggestedItems = dietPlan[day]?.[mealType]?.items || [];

                    if (mealUserData?.ateOther) {
                        const row = [
                            formatCell(day), formatCell(formattedDate),
                            formatCell("Pasto"), formatCell(mealName),
                            formatCell("Stato_Pasto"), formatCell("Altro"),
                            "", "", "", "", "", "", "", "", "", "",
                            formatCell(mealUserData.otherText), "" ];
                        csvContent += row.join(",") + "\r\n";
                    } else if (mealUserData?.itemsStatus) {
                         suggestedItems.forEach((item, index) => {
                             const itemStatus = mealUserData.itemsStatus[index];
                             if (itemStatus) { // Write a row for every suggested item status
                                const consumed = itemStatus.consumed ? "Sì" : "No";
                                const row = [
                                     formatCell(day), formatCell(formattedDate),
                                     formatCell("Pasto"), formatCell(mealName),
                                     formatCell("Item_Nome"), formatCell(item.name),
                                     formatCell("Qta_Suggerita"), formatCell(item.quantity),
                                     formatCell("Consumato"), formatCell(consumed),
                                     formatCell("Qta_Consumata"), formatCell(itemStatus.actualQuantity),
                                     "", "", "", "", // Empty details
                                     "", "" // Empty text, cost
                                ];
                                csvContent += row.join(",") + "\r\n";
                             }
                         });
                         // Check if skipped?
                         if (Object.keys(mealUserData.itemsStatus).length === 0 && !mealUserData.ateOther && suggestedItems.length > 0) {
                              const row = [
                                formatCell(day), formatCell(formattedDate),
                                formatCell("Pasto"), formatCell(mealName),
                                formatCell("Stato_Pasto"), formatCell("Saltato/Non registrato"),
                                "", "", "", "", "", "", "", "", "", "", "", "" ];
                              csvContent += row.join(",") + "\r\n";
                         }
                    }
                });

                // 3. Supplement Rows
                app.config.SUPPLEMENTS.forEach(sup => {
                     const taken = dayData.supplements?.[sup.id] || false;
                     const row = [
                         formatCell(day), formatCell(formattedDate),
                         formatCell("Integratore"), formatCell(sup.name),
                         formatCell("Preso"), formatCell(taken ? "Sì" : "No"),
                         formatCell("Dosaggio"), formatCell(sup.dosage),
                         formatCell("Link"), formatCell(sup.link && sup.link !== 'https://...' ? sup.link : ''), // Only add link if valid
                         "", "", "", "", "", "", "", "" ];
                     csvContent += row.join(",") + "\r\n";
                });

                // 4. Workout Rows
                dayWorkouts.forEach(workout => {
                     const row = [
                         formatCell(day), formatCell(formattedDate),
                         formatCell("Workout"), formatCell(workout.name),
                         formatCell("Serie"), formatCell(workout.sets),
                         formatCell("Reps"), formatCell(workout.reps),
                         formatCell("Carico/Durata"), formatCell(workout.load),
                         "", "", "", "", "", "", // Empty details
                         formatCell(workout.notes), // Notes in free text
                         "" // No cost
                     ];
                     csvContent += row.join(",") + "\r\n";
                });
            });

            // --- Create and trigger download link ---
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            link.setAttribute("download", `piano_benessere_pro_${timestamp}.csv`);
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link); // Clean up
            app.ui.showStatusMessage("Dati esportati in CSV.", 'success');

        }).catch(err => {
            console.error("Error during save before export:", err);
            app.ui.showStatusMessage("Errore durante salvataggio pre-export.", 'error');
        });
    }


    // --- Rendering ---

    /** Renders the HTML for a single meal section. */
    function _renderMealSection(mealType, mealUserData, suggestedItems) {
        const mealName = app.config.MEAL_NAMES[mealType];
        const isOtherChecked = mealUserData.ateOther;

        // Container
        const section = app.ui.renderElement('div', {
            class: 'meal-section card mb-4 shadow-sm', // Add bottom margin and shadow
            id: `${mealType}Section`,
            'data-meal': mealType
        });

        // Header
        const header = app.ui.renderElement('div', { class: 'meal-header card-header d-flex justify-content-between align-items-center' }); // Flex layout
        const title = app.ui.renderElement('h4', { class: 'meal-title mb-0' }, [ // Remove bottom margin
            app.ui.renderElement('i', { class: `fa-solid fa-${app.ui.getMealIcon(mealType)} me-2` }),
            mealName
        ]);
        const options = app.ui.renderElement('div', { class: 'meal-options d-flex align-items-center gap-3' }); // Use gap
        const copyButton = app.ui.renderElement('button', {
            type: 'button',
            class: 'copy-suggested-btn button button-sm button-outline-primary py-1 px-2', // Outline style, adjust padding
            'data-meal': mealType,
            title: 'Copia quantità e seleziona suggeriti',
            disabled: isOtherChecked
        }, [ app.ui.renderElement('i', { class: 'fa-solid fa-paste' }), app.ui.renderElement('span', { class: 'd-none d-sm-inline' }, ' Copia') ]); // Hide text on small screens
        copyButton.addEventListener('click', () => _copySuggestedQuantities(mealType));

        const altroOption = app.ui.renderElement('div', { class: 'meal-altro-option form-check form-switch' }); // Use form-switch style
        const altroCheck = app.ui.renderElement('input', {
            type: 'checkbox', class: 'meal-altro-check form-check-input', role: 'switch',
            id: `${mealType}AltroCheck`, 'data-meal': mealType,
            checked: isOtherChecked
        });
        const altroLabel = app.ui.renderElement('label', { class: 'form-check-label small pt-1', for: `${mealType}AltroCheck` }, 'Altro'); // Smaller label
        altroOption.append(altroCheck, altroLabel);

        options.append(copyButton, altroOption);
        header.append(title, options);

        // Body Content
        const body = app.ui.renderElement('div', { class: 'card-body pb-2' }); // Reduce bottom padding
        const itemsList = app.ui.renderElement('ul', {
            class: `meal-suggested-items list-unstyled mb-0 ${isOtherChecked ? 'disabled' : ''}`, // Remove bottom margin
            id: `${mealType}SuggestedItems`
        });

        // Populate Items List
        if (suggestedItems.length > 0) {
            suggestedItems.forEach((item, index) => {
                const itemStatus = mealUserData.itemsStatus?.[index] || { consumed: false, actualQuantity: '' };
                const isChecked = itemStatus.consumed && !isOtherChecked;
                const isQtyDisabled = !isChecked || isOtherChecked;

                const li = app.ui.renderElement('li', { class: 'food-item d-flex flex-wrap align-items-center border-bottom py-2', 'data-item-index': index }); // Flex layout, border

                // Checkbox, Name, Suggested Qty (takes most space)
                const checkLabelWrapper = app.ui.renderElement('label', { class: 'food-item-check-label form-check flex-grow-1 me-2 mb-1 mb-sm-0', for: `${mealType}-item-${index}-check`}); // Allow wrap on small screens
                const checkInput = app.ui.renderElement('input', {
                    type: 'checkbox', class: 'food-item-check form-check-input', id: `${mealType}-item-${index}-check`,
                    'data-meal': mealType, checked: isChecked, disabled: isOtherChecked
                });
                const nameSpan = app.ui.renderElement('span', { class: 'food-item-name ms-1' }, app.ui.sanitize(item.name)); // Margin start
                const suggestedQtySpan = app.ui.renderElement('span', { class: 'food-item-suggested-qty text-muted small ms-1' }, `(${app.ui.sanitize(item.quantity) || 'N/D'})`);
                checkLabelWrapper.append(checkInput, nameSpan, suggestedQtySpan);

                // Quantity Input (fixed width)
                const qtyWrapper = app.ui.renderElement('div', { class: 'food-item-quantity-wrapper flex-shrink-0' }); // Prevent shrinking
                const qtyInput = app.ui.renderElement('input', {
                    type: 'text', class: 'food-item-quantity form-control form-control-sm',
                    id: `${mealType}-item-${index}-qty`, style: 'width: 90px;', // Fixed width
                    placeholder: 'Q.tà',
                    value: app.ui.sanitize(itemStatus.actualQuantity),
                    'data-meal': mealType, disabled: isQtyDisabled
                 });
                 qtyWrapper.appendChild(qtyInput);

                 li.append(checkLabelWrapper, qtyWrapper);
                 itemsList.appendChild(li);
            });
             // Remove border from last item
             const lastItem = itemsList.querySelector('.food-item:last-child');
             if(lastItem) lastItem.classList.remove('border-bottom');

        } else {
            itemsList.appendChild(app.ui.renderElement('li', { class: 'text-muted fst-italic small py-2' }, 'Nessun alimento specifico suggerito.'));
        }

        // "Altro" Text Area
        const altroContent = app.ui.renderElement('div', { class: `meal-altro-content mt-2 ${isOtherChecked ? '' : 'd-none'}`, id: `${mealType}AltroContent` }); // Use d-none utility
        const altroTextarea = app.ui.renderElement('textarea', {
            class: 'form-control form-control-sm', id: `${mealType}AltroText`, 'data-meal': mealType,
            rows: '2', placeholder: 'Descrivi cosa hai mangiato in alternativa...'
        }, app.ui.sanitize(mealUserData.otherText)); // Use textContent for value
        altroContent.appendChild(altroTextarea);

        body.append(itemsList, altroContent);
        section.append(header, body);

        // Apply initial UI state classes after elements are created
        _updateMealUIState(mealType);

        return section;
    }

    /** Renders the supplements tracking section. */
    function _renderSupplementsSection(supplementsData) {
        const section = app.ui.renderElement('div', { class: 'supplements-section card mb-4 shadow-sm' }); // Style as card
        const header = app.ui.renderElement('div', { class: 'card-header' }, [
             app.ui.renderElement('h3', { class: 'mb-0' }, [app.ui.renderElement('i', { class: 'fa-solid fa-pills me-2' }), 'Monitoraggio Integratori'])
        ]);
        const list = app.ui.renderElement('ul', { id: 'supplementList', class: 'list-group list-group-flush card-body p-0' }); // list-group styling

        if (app.config.SUPPLEMENTS.length === 0) {
            list.innerHTML = '<li class="list-group-item text-muted">Nessun integratore configurato.</li>';
        } else {
            app.config.SUPPLEMENTS.forEach(sup => {
                const isChecked = supplementsData?.[sup.id] || false;
                const li = app.ui.renderElement('li', { class: 'supplement-item list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2' }); // Flex layout

                // Checkbox and Label part
                const checkGroup = app.ui.renderElement('div', { class: 'sup-info form-check flex-grow-1 me-2' });
                const checkbox = app.ui.renderElement('input', {
                    type: 'checkbox', class: 'form-check-input', id: `sup-${sup.id}`,
                    'data-supplement-id': sup.id, checked: isChecked
                });
                const label = app.ui.renderElement('label', { for: `sup-${sup.id}`, class: 'form-check-label' }, [
                    app.ui.renderElement('span', { class: 'fw-medium' }, app.ui.sanitize(sup.name)), // Use span with medium weight
                    app.ui.renderElement('span', { class: 'supplement-dosage text-muted small ms-2' }, `(${app.ui.sanitize(sup.dosage) || 'N/D'})`)
                ]);
                checkGroup.append(checkbox, label);


                // Link part (if exists) - aligned to the right
                let linkElement = '';
                if (sup.link && sup.link !== 'https://...') {
                    linkElement = app.ui.renderElement('a', {
                        href: sup.link, target: '_blank', rel: 'noopener noreferrer',
                        class: 'supplement-link button button-sm button-outline-secondary py-0 px-1', // Smaller outline button
                        title: 'Apri link prodotto (esterno)'
                    }, [app.ui.renderElement('i', { class: 'fa-solid fa-arrow-up-right-from-square small' })]);
                }

                li.append(checkGroup, linkElement || ''); // Append link if it exists
                list.appendChild(li);
            });
        }
        section.append(header, list);
        return section;
    }

    /** Adds event listeners specific to the tracking section UI. */
    function _addTrackingEventListeners(container) {
         // Use event delegation on the container for efficiency
         container.addEventListener('change', (event) => {
             const target = event.target;
             const mealType = target.dataset.meal;

             // --- Input Change Handlers ---
             // Food Item Checkbox Change
             if (target.classList.contains('food-item-check') && mealType) {
                 console.log(`Food item check changed: ${mealType}, item ${target.id}, checked: ${target.checked}`);
                 const otherCheck = document.getElementById(`${mealType}AltroCheck`);
                  if (target.checked && otherCheck?.checked) {
                     otherCheck.checked = false; // Uncheck "Altro" if an item is checked
                     _updateMealUIState(mealType); // Need to update UI for both changes
                 }
                 _updateMealUIState(mealType); // Update associated input disabled state etc.
                 _debouncedSave();
             }
             // "Altro" Checkbox Change
             else if (target.classList.contains('meal-altro-check') && mealType) {
                  console.log(`"Altro" check changed: ${mealType}, checked: ${target.checked}`);
                 if (target.checked) {
                     // Uncheck all items if "Altro" is checked
                     document.querySelectorAll(`#${mealType}SuggestedItems .food-item-check`).forEach(chk => {
                         if (chk.checked) chk.checked = false;
                     });
                 }
                 _updateMealUIState(mealType); // Update item list disabled state etc.
                 _debouncedSave();
             }
             // Supplement Checkbox Change
             else if (target.type === 'checkbox' && target.dataset.supplementId) {
                 console.log(`Supplement check changed: ${target.id}, checked: ${target.checked}`);
                 _debouncedSave();
             }
             // Daily text/number inputs (save on change - e.g., blur/enter)
             else if (target.id === 'dailyWater' || target.id === 'dailyActivity' || target.id === 'dailyNotes') {
                  console.log(`Daily input changed: ${target.id}, value: ${target.value}`);
                  _debouncedSave();
             }
             // Weekly Cost input
             else if (target.id === 'weeklyCost') {
                 console.log(`Weekly cost changed: ${target.value}`);
                 _handleCostChange(event); // Save cost immediately
             }
             // Food Item Quantity (also save on change/blur)
             else if (target.classList.contains('food-item-quantity')) {
                  console.log(`Quantity input changed: ${target.id}, value: ${target.value}`);
                  _debouncedSave();
             }
             // "Altro" Text Area (also save on change/blur)
             else if (target.closest('.meal-altro-content') && target.tagName === 'TEXTAREA') {
                console.log(`"Altro" textarea changed: ${target.id}, value: ${target.value}`);
                _debouncedSave();
            }
         });

         // Use 'input' for more immediate feedback on text areas if desired
         container.addEventListener('input', (event) => {
             const target = event.target;
              if (target.id === 'dailyNotes' ||
                 (target.closest('.meal-altro-content') && target.tagName === 'TEXTAREA'))
             {
                 _debouncedSave();
             }
         });

         // --- Button Click Handlers ---
         const manualSaveBtn = container.querySelector('#manualSaveButton');
         const exportBtn = container.querySelector('#exportButton');

         if (manualSaveBtn) {
             manualSaveBtn.addEventListener('click', _handleSaveAndNotify);
         } else { console.warn("Manual save button not found."); }

         if (exportBtn) {
            exportBtn.addEventListener('click', _exportDataToCSV);
         } else { console.warn("Export button not found."); }

         console.log("Tracking event listeners added.");
    }


    /** Main render function for the Tracking section */
    function renderTrackingSection(dayParam) {
        // Determine the day to render
        currentDay = dayParam || app.config.DAYS_OF_WEEK[0]; // Default to Monday if no day param
        // Validate the day parameter
        if (!app.config.DAYS_OF_WEEK.includes(currentDay)) {
            console.error(`Invalid day parameter received: ${dayParam}. Defaulting to ${app.config.DAYS_OF_WEEK[0]}.`);
            currentDay = app.config.DAYS_OF_WEEK[0];
            // Optionally redirect to the valid day hash
            app.router.navigateTo('tracking', [currentDay]);
            return; // Stop rendering if day is invalid and redirecting
        }

        console.log(`Rendering Tracking section for: ${currentDay}`);
        app.ui.showLoading(`Caricamento dati ${currentDay}...`);

        // --- Load Data ---
        try {
            currentDayData = app.dataManager.loadTrackingData(currentDay);
            currentDietPlan = app.dataManager.loadDietPlan();
        } catch (error) {
            console.error(`Error loading data for tracking section ${currentDay}:`, error);
            app.ui.setContent('<p class="text-danger">Errore nel caricamento dei dati per la sezione tracking.</p>');
            return; // Stop rendering if data loading fails
        }
        const weeklyCost = app.dataManager.loadWeeklyCost();
        const currentDayDiet = currentDietPlan[currentDay] || {}; // Fallback

        // --- Build HTML Structure ---
        const container = app.ui.renderElement('section', { id: 'tracking-section' });

        // Header with Title and Date
        const header = app.ui.renderElement('div', { class: 'tracking-header d-flex justify-content-between align-items-center flex-wrap mb-3' });
        const titleDate = _getDateForCurrentDay(); // Get Date object for the day
        const title = app.ui.renderElement('h1', { class: 'mb-0' }, [ // Remove bottom margin
            app.ui.renderElement('i', { class: 'fa-regular fa-calendar-check me-2' }),
            ` Tracking: ${currentDay} `,
            app.ui.renderElement('span', { class: 'current-date text-muted fw-normal fs-5 ms-1' }, `(${app.ui.formatShortDate(titleDate)})`)
        ]);
        header.appendChild(title);
        container.appendChild(header);

         // Day Selector
        const daySelectorContainer = app.ui.renderElement('div', { id: 'tracking-day-selector-container'});
        container.appendChild(daySelectorContainer); // Add container for day selector

        // --- Main Content Area (using rows and columns for potential layout adjustments) ---
        const mainRow = app.ui.renderElement('div', { class: 'row g-4' }); // Row with gutters

        // Left Column (Meals, Extra Tracking, Notes)
        const leftCol = app.ui.renderElement('div', { class: 'col-lg-8' });

        // Meal Sections
        app.config.MEAL_TYPES.forEach(mealType => {
            const suggestedItems = currentDayDiet[mealType]?.items || [];
            const mealSection = _renderMealSection(mealType, currentDayData.meals[mealType], suggestedItems);
            leftCol.appendChild(mealSection);
        });

        // Extra Tracking Card
        const extraTrackingCard = app.ui.renderElement('div', { class: 'extra-tracking-section card mb-4 shadow-sm' });
        extraTrackingCard.append(
            app.ui.renderElement('div', {class: 'card-header'}, [
                app.ui.renderElement('h3', {class:'mb-0'}, [
                    app.ui.renderElement('i', { class: 'fa-solid fa-person-running me-1' }),
                    app.ui.renderElement('i', { class: 'fa-solid fa-droplet me-2' }),
                    'Tracking Extra' ])]),
            app.ui.renderElement('div', {class: 'card-body row gx-3'}, [ // Use row for layout inside card
                 app.ui.renderElement('div', { class: 'col-md-6 form-group mb-2 mb-md-0' }, [ // Responsive columns
                     app.ui.renderElement('label', { for: 'dailyWater', class: 'form-label' }, 'Acqua (L):'),
                     app.ui.renderElement('input', { type: 'number', id: 'dailyWater', class: 'form-control', step: '0.1', min: '0', placeholder: 'Es: 1.5', value: app.ui.sanitize(currentDayData.water || '')})
                 ]),
                 app.ui.renderElement('div', { class: 'col-md-6 form-group' }, [
                     app.ui.renderElement('label', { for: 'dailyActivity', class: 'form-label' }, 'Attività Svolta:'),
                     app.ui.renderElement('input', { type: 'text', id: 'dailyActivity', class: 'form-control', placeholder: 'Es: Camminata 30min...', value: app.ui.sanitize(currentDayData.activity || '')})
                 ]) ]) );
        leftCol.appendChild(extraTrackingCard);

        // Notes Card
        const notesCard = app.ui.renderElement('div', { class: 'notes-section card mb-4 shadow-sm' });
        notesCard.append(
             app.ui.renderElement('div', {class: 'card-header'}, [
                app.ui.renderElement('h3', {class:'mb-0'}, [app.ui.renderElement('i', { class: 'fa-regular fa-pen-to-square me-2' }), 'Note del Giorno']) ]),
             app.ui.renderElement('div', {class: 'card-body'}, [
                app.ui.renderElement('textarea', { id: 'dailyNotes', class: 'form-control', rows: '4', placeholder: 'Come ti sei sentito? Sintomi, energia, sonno, ecc...' }, app.ui.sanitize(currentDayData.notes || '')) ]) );
        leftCol.appendChild(notesCard);

        // Right Column (Supplements, Cost, Actions) - Adjust breakpoint (lg) as needed
        const rightCol = app.ui.renderElement('div', { class: 'col-lg-4' });

        // Supplements Card
        const supplementsSection = _renderSupplementsSection(currentDayData.supplements);
        rightCol.appendChild(supplementsSection);

        // Cost Card (Weekly)
        const costCard = app.ui.renderElement('div', { class: 'cost-section card mb-4 shadow-sm' });
        costCard.append(
             app.ui.renderElement('div', {class: 'card-header'}, [
                 app.ui.renderElement('h3', {class:'mb-0'}, [app.ui.renderElement('i', { class: 'fa-solid fa-receipt me-2' }), 'Costo Settimanale']) ]),
             app.ui.renderElement('div', {class: 'card-body'}, [
                 app.ui.renderElement('p', {class: 'text-muted small mb-2'}, 'Costo stimato o effettivo per la spesa settimanale.'),
                 app.ui.renderElement('div', { class: 'input-group' }, [ // Use input group
                     app.ui.renderElement('span', { class: 'input-group-text' }, '€'), // Currency symbol
                     app.ui.renderElement('input', { type: 'number', id: 'weeklyCost', class: 'form-control', step: '0.01', placeholder: '0.00', value: app.ui.sanitize(weeklyCost || '')})
                 ]) ]) );
        rightCol.appendChild(costCard);

        // Action Buttons (Moved to right column)
        const actionsDiv = app.ui.renderElement('div', { class: 'tracking-actions d-grid gap-2' }); // Use d-grid for stacked buttons
        actionsDiv.append(
             app.ui.renderElement('button', { type: 'button', class: 'button button-primary w-100', id: 'manualSaveButton' }, [
                 app.ui.renderElement('i', { class: 'fa-solid fa-envelope' }),
                 app.ui.renderElement('span', {class: 'btn-text'}, ' Salva e Notifica'),
                 app.ui.renderElement('i', { class: 'fa-solid fa-spinner fa-spin spinner' })
            ]),
            app.ui.renderElement('button', { type: 'button', class: 'button button-secondary w-100', id: 'exportButton' }, [
                 app.ui.renderElement('i', { class: 'fa-solid fa-download' }),
                 app.ui.renderElement('span', {class: 'btn-text'}, ' Esporta CSV')
            ])
        );
        rightCol.appendChild(actionsDiv); // Add actions to the right column

        // Append columns to the main row
        mainRow.append(leftCol, rightCol);
        container.appendChild(mainRow); // Add the row layout to the main container

        // --- Final Assembly & Initialization ---
        app.ui.setContent(container); // Set the entire section content

        // Render day selector *after* container is in DOM
        app.ui.renderDaySelector('tracking-day-selector-container', currentDay, (selectedDay) => {
            // Save current day before navigating away? Let's trigger save explicitly.
            _saveData(false); // Trigger auto-save immediately before navigating
            app.router.navigateTo('tracking', [selectedDay]); // Use router to navigate
        });

        // Add event listeners for the newly rendered content
        _addTrackingEventListeners(container);

        console.log(`Tracking section for ${currentDay} rendering complete.`);
        // Loading indicator hidden by setContent
    }

    // --- Public API ---
    app.sections = app.sections || {}; // Ensure namespace exists
    app.sections.tracking = {
        render: renderTrackingSection
        // Expose helpers ONLY if absolutely necessary and cannot be moved to app.ui
        // getMealIcon: app.ui.getMealIcon // Example: Accessing from ui module is better
    };

}(window.app = window.app || {})); // Pass the global app object