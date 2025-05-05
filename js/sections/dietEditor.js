// ============================================================
// Piano Benessere Pro - sections/dietEditor.js
// Logic for the Diet Plan Editor view
// ============================================================

(function(app) {

    let currentPlan = null; // Holds the plan being edited (deep copy)
    let hasChanges = false; // Flag to track unsaved changes

    // --- Data Handling ---

    /** Loads a deep copy of the diet plan from dataManager for editing. */
    function _loadPlanForEditing() {
        try {
            // Get the current plan (from storage or default)
            const planSource = app.dataManager.loadDietPlan();
            // Create a deep copy to prevent modifying the source directly
            currentPlan = JSON.parse(JSON.stringify(planSource));
            hasChanges = false; // Reset changes flag on load
            console.log("Diet plan loaded for editing.");
        } catch (e) {
            console.error("Error loading or parsing diet plan for editing:", e);
            app.ui.showStatusMessage("Errore caricamento piano alimentare per la modifica.", 'error');
            currentPlan = null; // Ensure plan is null on error
        }
    }

    /** Saves the edited `currentPlan` back to localStorage via dataManager. */
    function _saveEditedPlan() {
        if (!currentPlan) {
            app.ui.showStatusMessage("Nessun piano caricato da salvare.", 'error');
            return false;
        }
        if (!hasChanges) {
            app.ui.showStatusMessage("Nessuna modifica da salvare.", 'info', 1500);
            return false; // Don't save if nothing changed
        }

        // Basic Validation Example: Check for empty item names before saving
        let isValid = true;
        app.config.DAYS_OF_WEEK.forEach(day => {
            app.config.MEAL_TYPES.forEach(mealType => {
                const items = currentPlan[day]?.[mealType]?.items;
                if (items && items.some(item => !item.name.trim())) {
                    isValid = false;
                    console.warn(`Validation failed: Empty item name found in ${day} - ${mealType}`);
                }
            });
        });

        if (!isValid) {
             app.ui.showStatusMessage("Errore: Alcuni nomi di alimento sono vuoti. Compila tutti i nomi prima di salvare.", 'error', 4000);
             return false;
        }


        const saveButton = document.getElementById('saveDietPlanButton');
        if (saveButton) {
            saveButton.classList.add('loading');
            saveButton.disabled = true;
        }

        // Use setTimeout for UI feedback
        return new Promise((resolve) => {
            setTimeout(() => {
                let success = false;
                try {
                    success = app.dataManager.saveDietPlan(currentPlan);
                    if (success) {
                        app.ui.showStatusMessage("Piano alimentare salvato con successo!", 'success');
                        hasChanges = false; // Reset changes flag
                        _updateSaveButtonState(); // Update button state after successful save
                        // Optionally, re-render the editor to confirm changes? Usually not needed.
                    } else {
                        app.ui.showStatusMessage("Errore nel salvataggio del piano alimentare.", 'error');
                        // Keep hasChanges = true to allow retry?
                    }
                } catch (e) {
                     console.error("Unexpected error during diet plan save:", e);
                     app.ui.showStatusMessage("Errore critico salvataggio piano.", 'error');
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

    /**
     * Updates the in-memory `currentPlan` when an input value changes.
     * Sets the `hasChanges` flag. Debounces the change detection slightly.
     */
    let inputChangeTimeout;
    function _handleInputChange(event, day, mealType, itemIndex, field) {
        if (!currentPlan) return;

        clearTimeout(inputChangeTimeout);
        inputChangeTimeout = setTimeout(() => {
            try {
                const meal = currentPlan[day]?.[mealType];
                if (!meal) {
                    console.warn(`Meal data not found for ${day} - ${mealType} during input change.`);
                    return;
                }

                const newValue = event.target.value;
                let changed = false;

                if (field === 'substitute') {
                    if (meal.substitute !== newValue) {
                         meal.substitute = newValue;
                         changed = true;
                    }
                } else if (field === 'name' || field === 'quantity') {
                    if (meal.items && meal.items[itemIndex] !== undefined) {
                        if (meal.items[itemIndex][field] !== newValue) {
                             meal.items[itemIndex][field] = newValue;
                             changed = true;
                        }
                    } else {
                        console.warn(`Item index ${itemIndex} not found for ${day} - ${mealType} during input change.`);
                        return;
                    }
                } else {
                    console.warn(`Unknown field "${field}" for input change.`);
                    return;
                }

                if (changed) {
                    hasChanges = true;
                    _updateSaveButtonState(); // Enable save button
                    console.log(`Change detected: ${day}/${mealType}/${itemIndex !== null ? `item[${itemIndex}]` : ''}/${field}`);
                }

            } catch (error) {
                console.error("Error handling input change:", error);
            }
        }, 150); // Debounce input changes slightly (150ms)
    }

    /** Adds a new, empty item to a meal in the `currentPlan`. */
    function _handleAddItem(day, mealType) {
         if (!currentPlan) return;

         // Ensure day and meal objects exist, initialize if necessary
         if (!currentPlan[day]) currentPlan[day] = {};
         if (!currentPlan[day][mealType]) currentPlan[day][mealType] = { items: [], substitute: '' };
         if (!Array.isArray(currentPlan[day][mealType].items)) { // Ensure items is an array
             currentPlan[day][mealType].items = [];
         }

         const meal = currentPlan[day][mealType];
         meal.items.push({ name: "", quantity: "" }); // Add empty item object
         hasChanges = true;
         console.log(`Added empty item to ${day} - ${mealType}`);

         // Re-render the specific meal editor section to show the new row dynamically
         const mealContainer = document.getElementById(`editor-meal-${day}-${mealType}`);
         const dayBodyContainer = mealContainer?.parentElement; // Find parent to replace child
         if (mealContainer && dayBodyContainer) {
            console.log(`Re-rendering meal editor for ${day} - ${mealType}`);
            const newMealEditor = _renderMealEditor(day, mealType, meal); // Render the updated meal
            dayBodyContainer.replaceChild(newMealEditor, mealContainer); // Replace the old DOM node

            // Focus on the new item's name input for better UX
            const newItemInputs = newMealEditor.querySelectorAll('.diet-item-editor:last-child .name-input');
            if (newItemInputs.length > 0) {
                 setTimeout(() => newItemInputs[0].focus(), 0); // Use timeout to ensure element is focusable
            }
             _updateSaveButtonState(); // Enable save button
         } else {
             console.error("Could not find container to re-render meal editor after add. Falling back to full re-render.");
             _renderDietEditor(); // Fallback to full re-render if specific replacement fails
         }
    }

     /** Removes an item from a meal in the `currentPlan`. */
     function _handleRemoveItem(day, mealType, itemIndex) {
         if (!currentPlan || !currentPlan[day]?.[mealType]?.items) {
             console.warn(`Cannot remove item: data missing for ${day} - ${mealType}`);
             return;
         }

         const meal = currentPlan[day][mealType];
          if (meal.items[itemIndex] !== undefined) {
             const removedItemName = meal.items[itemIndex].name || 'Alimento senza nome';
             meal.items.splice(itemIndex, 1); // Remove item from the array
             hasChanges = true;
             console.log(`Removed item at index ${itemIndex} from ${day} - ${mealType}`);

             // Re-render the specific meal editor section
             const mealContainer = document.getElementById(`editor-meal-${day}-${mealType}`);
             const dayBodyContainer = mealContainer?.parentElement;
             if (mealContainer && dayBodyContainer) {
                 console.log(`Re-rendering meal editor for ${day} - ${mealType} after removal`);
                 const newMealEditor = _renderMealEditor(day, mealType, meal);
                 dayBodyContainer.replaceChild(newMealEditor, mealContainer);
                 _updateSaveButtonState(); // Update save button state
                 app.ui.showStatusMessage(`"${app.ui.sanitize(removedItemName)}" rimosso (salva per confermare).`, 'info', 2000);
             } else {
                 console.error("Could not find container to re-render meal editor after remove. Falling back to full re-render.");
                 _renderDietEditor(); // Fallback to full re-render
             }
         } else {
              console.warn(`Item index ${itemIndex} not found for removal in ${day} - ${mealType}`);
         }
    }

    /** Updates the enabled/disabled state and text of the main save button. */
    function _updateSaveButtonState() {
        const saveButton = document.getElementById('saveDietPlanButton');
        if (saveButton) {
            const isLoading = saveButton.classList.contains('loading');
            saveButton.disabled = !hasChanges || isLoading;
            // Optionally change text or style when changes are present
            // saveButton.querySelector('.btn-text').textContent = hasChanges ? 'Salva Modifiche*' : 'Salva Modifiche';
        }
    }


    // --- Rendering ---

    /** Renders the editor controls for a single meal. */
    function _renderMealEditor(day, mealType, mealData) {
        const mealName = app.config.MEAL_NAMES[mealType];
        // Unique ID for the meal container to allow targeted re-rendering
        const mealContainerId = `editor-meal-${day}-${mealType}`;
        const mealContainer = app.ui.renderElement('div', { class: 'diet-editor-meal border rounded p-3 mb-3 bg-white', id: mealContainerId }); // Styles for separation

        // Meal Header with Title and Add Button
        const header = app.ui.renderElement('div', { class: 'diet-editor-meal-header d-flex justify-content-between align-items-center mb-3'});
        const title = app.ui.renderElement('h5', {class: 'mb-0 text-primary'}, [ // Use h5, primary color
            app.ui.renderElement('i', { class: `fa-solid fa-${app.ui.getMealIcon(mealType)} me-2` }), // Use UI helper
            mealName
        ]);
        const addItemBtn = app.ui.renderElement('button', { type: 'button', class: 'button button-sm button-outline-success add-item-btn py-1 px-2' }, [ // Outline success
             app.ui.renderElement('i', { class: 'fa-solid fa-plus' }), ' Alimento'
        ]);
        addItemBtn.addEventListener('click', () => _handleAddItem(day, mealType));
        header.append(title, addItemBtn);
        mealContainer.appendChild(header);

        // Editor for Items
        const itemsList = app.ui.renderElement('div', { class: 'diet-editor-items-list mb-3'});
        // Ensure mealData.items is always an array for safety
        const items = Array.isArray(mealData?.items) ? mealData.items : [];

        if (items.length > 0) {
            items.forEach((item, index) => {
                const itemEditorId = `editor-${day}-${mealType}-item-${index}`;
                // Use Bootstrap row/cols for alignment and responsiveness
                const itemEditor = app.ui.renderElement('div', { class: 'diet-item-editor row gx-2 mb-2 align-items-center border-bottom pb-2', id: itemEditorId });

                // Name Input (takes more space)
                const nameCol = app.ui.renderElement('div', {class: 'col-sm'}); // Auto width on small, takes space on larger
                const nameInput = app.ui.renderElement('input', {
                    type: 'text', class: 'form-control form-control-sm name-input',
                    value: app.ui.sanitize(item.name), placeholder: 'Nome Alimento *', required: true, // Add placeholder and required
                    'aria-label': `Nome alimento ${index + 1} per ${mealName} ${day}`
                });
                // Use 'input' event for potentially faster hasChanges update
                nameInput.addEventListener('input', (e) => _handleInputChange(e, day, mealType, index, 'name'));
                nameCol.appendChild(nameInput);

                // Quantity Input (fixed width column)
                const qtyCol = app.ui.renderElement('div', {class: 'col-sm-4 col-md-3'}); // Adjust column size
                const qtyInput = app.ui.renderElement('input', {
                    type: 'text', class: 'form-control form-control-sm qty-input',
                    value: app.ui.sanitize(item.quantity), placeholder: 'Quantità (es: 100g)',
                     'aria-label': `Quantità alimento ${index + 1} per ${mealName} ${day}`
                });
                 qtyInput.addEventListener('input', (e) => _handleInputChange(e, day, mealType, index, 'quantity'));
                 qtyCol.appendChild(qtyInput);

                // Actions (Remove button - smallest column)
                const actionsCol = app.ui.renderElement('div', { class: 'col-auto' });
                const removeBtn = app.ui.renderElement('button', {
                     type: 'button',
                     class: 'button button-sm button-link text-danger remove-item-btn p-1', // Minimal padding
                     title: 'Rimuovi questo alimento' });
                removeBtn.innerHTML = '<i class="fa-solid fa-xmark fa-fw"></i>'; // Use X mark icon
                removeBtn.addEventListener('click', () => _handleRemoveItem(day, mealType, index));
                actionsCol.appendChild(removeBtn);

                itemEditor.append(nameCol, qtyCol, actionsCol);
                itemsList.appendChild(itemEditor);
            });
              // Remove border from last item for cleaner look
             const lastItem = itemsList.querySelector('.diet-item-editor:last-child');
             if(lastItem) lastItem.classList.remove('border-bottom', 'pb-2');

        } else {
            itemsList.appendChild(app.ui.renderElement('p', { class: 'text-muted fst-italic small' }, 'Nessun alimento specifico. Aggiungine uno.'));
        }
        mealContainer.appendChild(itemsList);

        // Editor for Substitute Text
        const substituteGroup = app.ui.renderElement('div', { class: 'form-group diet-editor-substitute mt-2' }); // Add margin top
        substituteGroup.append(
             app.ui.renderElement('label', { class: 'form-label form-label-sm text-muted', for:`subst-${day}-${mealType}` }, 'Alternativa suggerita (opzionale):'),
             app.ui.renderElement('textarea', {
                 class: 'form-control form-control-sm', rows: '2', id: `subst-${day}-${mealType}`,
                 placeholder: 'Descrivi un pasto alternativo...'
                }, app.ui.sanitize(mealData?.substitute || '')) // Use textContent
        );
        substituteGroup.querySelector('textarea').addEventListener('input', (e) => _handleInputChange(e, day, mealType, null, 'substitute'));
        mealContainer.appendChild(substituteGroup);

        return mealContainer;
    }

    /** Main render function for the Diet Editor section */
    function _renderDietEditor() {
        console.log("Rendering Diet Editor section");
        app.ui.showLoading('Caricamento editor dieta...');
        _loadPlanForEditing(); // Load a fresh deep copy of the plan

        if (!currentPlan) {
            // Error message handled by _loadPlanForEditing
            app.ui.setContent('<p class="text-danger text-center mt-5">Errore critico: Impossibile caricare il piano alimentare per la modifica.</p>');
            return;
        }

        const container = app.ui.renderElement('section', { id: 'diet-editor-section' });
        const header = app.ui.renderElement('h1', {}, [
            app.ui.renderElement('i', { class: 'fa-solid fa-pen-ruler me-2' }), 'Editor Piano Alimentare'
        ]);
        const intro = app.ui.renderElement('p', { class: 'lead mb-4' }, 'Modifica il piano alimentare di riferimento qui sotto. Le modifiche verranno applicate alle sezioni Tracking e Riferimento dopo aver cliccato su "Salva Modifiche".');
        container.append(header, intro);

        // --- Render Editor for Each Day ---
        app.config.DAYS_OF_WEEK.forEach(day => {
            // Use card styling for each day's container
            const dayContainer = app.ui.renderElement('div', { class: 'diet-editor-day card mb-4 shadow-sm' });

            const dayHeader = app.ui.renderElement('div', { class: 'card-header bg-light' }); // Light background for header
            dayHeader.appendChild(app.ui.renderElement('h3', {class:'mb-0 fs-5 fw-medium'}, day)); // Day name styling
            dayContainer.appendChild(dayHeader);

            // Card body to contain the meal editors for the day
            const dayBody = app.ui.renderElement('div', { class: 'card-body p-lg-4'});

            app.config.MEAL_TYPES.forEach(mealType => {
                 // Ensure meal data structure exists in the plan being edited
                 if (!currentPlan[day]) currentPlan[day] = {};
                 const mealData = currentPlan[day][mealType] || { items: [], substitute: '' }; // Default if meal missing
                 currentPlan[day][mealType] = mealData; // Ensure it's set back in the working copy

                const mealEditor = _renderMealEditor(day, mealType, mealData);
                dayBody.appendChild(mealEditor);
                 // Add a visual separator between meals (optional)
                 // if (mealType !== app.config.MEAL_TYPES[app.config.MEAL_TYPES.length - 1]) {
                 //     dayBody.appendChild(app.ui.renderElement('hr', {class: 'my-3 border-secondary-subtle'}));
                 // }
            });
            dayContainer.appendChild(dayBody);
            container.appendChild(dayContainer); // Add the day's card to the main container
        });

        // --- Sticky Save Button Footer ---
        // Ensures the save button is always visible, especially on long pages
        const actionsFooter = app.ui.renderElement('div', { class: 'diet-editor-actions-footer sticky-bottom bg-body-tertiary p-3 border-top text-end shadow' }); // Use standard BS classes
        const saveButton = app.ui.renderElement('button', {
            type: 'button',
            class: 'button button-primary button-lg', // Large button
            id: 'saveDietPlanButton',
            disabled: !hasChanges // Initially disabled if no changes
        });
        // Use innerHTML for complex button content with spans and icons
        saveButton.innerHTML = '<i class="fa-solid fa-save me-2"></i><span class="btn-text">Salva Modifiche al Piano</span><i class="fa-solid fa-spinner fa-spin spinner ms-2"></i>';
        saveButton.addEventListener('click', _saveEditedPlan); // Attach save handler
        actionsFooter.appendChild(saveButton);
        container.appendChild(actionsFooter); // Append footer to the main section container

        // --- Set Content in the Main Area ---
        app.ui.setContent(container); // This also hides the loading indicator
        _updateSaveButtonState(); // Set initial state of the save button

         console.log("Diet Editor rendering complete.");
    }

    // --- Public API ---
    app.sections = app.sections || {}; // Ensure namespace exists
    app.sections.dietEditor = {
        render: _renderDietEditor // Expose the main render function
    };

}(window.app = window.app || {})); // Pass the global app object