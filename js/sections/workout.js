// ============================================================
// Piano Benessere Pro - sections/workout.js
// Logic for the Workout Tracking view
// ============================================================

(function(app) {

    let currentDay = null;        // Name of the day being tracked
    let dayWorkouts = [];         // Array to hold workout objects {id, name, sets, reps, load, notes}

    // --- Data Persistence ---

    /** Saves the current `dayWorkouts` array to localStorage for the `currentDay`. */
    function _saveWorkouts() {
        if (!currentDay) {
             console.error("Cannot save workouts: currentDay not set.");
             return false;
        }
        // Save the current state of the dayWorkouts array
        if (app.dataManager.saveWorkouts(currentDay, dayWorkouts)) {
            console.log(`Workouts saved for ${currentDay}. Count: ${dayWorkouts.length}`);
            return true;
        } else {
            console.error(`Failed to save workouts for ${currentDay}.`);
            // Error message should be shown by dataManager for quota issues
            // Show generic error otherwise
             if (!localStorage.getItem(app.config.LOCALSTORAGE_KEYS.WORKOUT_DATA_PREFIX + currentDay)) {
                 app.ui.showStatusMessage("Errore nel salvataggio dell'allenamento.", 'error');
             }
            return false;
        }
    }

    // --- Workout Management ---

    /** Adds a new workout item to the `dayWorkouts` array and saves. */
    function _addWorkoutItem(name, sets, reps, load, notes) {
        const newWorkout = {
            // Use timestamp + random element for a slightly more robust unique ID than just timestamp
            id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: name.trim(),
            sets: sets.trim(),
            reps: reps.trim(),
            load: load.trim(), // Can be weight (e.g., "50kg") or duration (e.g., "30min")
            notes: notes.trim()
        };

        // Basic validation: At least a name is required
        if (!newWorkout.name) {
            app.ui.showStatusMessage("Inserisci almeno il nome dell'esercizio.", 'warning', 2000);
            document.getElementById('workout-name')?.focus(); // Focus the name input
            return;
        }

        // Add to local array optimistically
        dayWorkouts.push(newWorkout);
        console.log("Workout added locally:", newWorkout);

        // Attempt to save
        if (_saveWorkouts()) {
             app.ui.showStatusMessage(`Esercizio "${app.ui.sanitize(newWorkout.name)}" aggiunto.`, 'success', 1500);
             _renderWorkoutList(); // Re-render the list to show the new item
             _clearWorkoutForm(); // Clear the form for the next entry
        } else {
             // If save failed, roll back the local change
             dayWorkouts = dayWorkouts.filter(w => w.id !== newWorkout.id);
             console.log("Save failed, rolling back local addition.");
             // Error message already shown by _saveWorkouts
        }
    }

    /** Removes a workout item by its ID from `dayWorkouts` and saves. */
    function _removeWorkoutItem(workoutId) {
        const workoutToRemove = dayWorkouts.find(w => w.id === workoutId);
        if (!workoutToRemove) {
            console.warn(`Workout item with ID ${workoutId} not found for removal.`);
            return; // Item not found
        }

        // Optional confirmation (consider adding a setting for this)
        // if (!confirm(`Sei sicuro di voler rimuovere l'esercizio "${workoutToRemove.name}"?`)) {
        //     return;
        // }

        const initialLength = dayWorkouts.length;
        // Filter out the item immutably (create new array)
        dayWorkouts = dayWorkouts.filter(w => w.id !== workoutId);
        console.log("Workout removed locally:", workoutToRemove);

        if (dayWorkouts.length < initialLength) { // Check if filter actually removed something
             if (_saveWorkouts()) {
                 app.ui.showStatusMessage(`Esercizio "${app.ui.sanitize(workoutToRemove.name)}" rimosso.`, 'success', 1500);
                 _renderWorkoutList(); // Re-render the list reflecting the removal
             } else {
                 // If save failed, the local `dayWorkouts` is already modified.
                 // Reverting is complex. Let's show error and potentially advise refresh.
                 console.error("Failed to save after workout removal. Data might be inconsistent. Consider reloading.");
                 app.ui.showStatusMessage('Errore salvataggio dopo rimozione. Ricarica la pagina se necessario.', 'error', 5000);
                 // To be perfectly safe, could reload the data from storage here:
                 // dayWorkouts = app.dataManager.loadWorkouts(currentDay);
                 // _renderWorkoutList(); // Re-render with data from storage
             }
        } else {
             console.warn(`Filter did not remove item ${workoutId}, length unchanged.`);
        }
    }


    // --- UI Rendering ---

    /** Renders a single workout item as an LI element with enhanced styling. */
    function _renderWorkoutItem(workout) {
         const li = app.ui.renderElement('li', {
             class: 'workout-item list-group-item px-0 py-3', // Use list-group-item, remove padding for full width border
             'data-id': workout.id
         });

         // Main content wrapper
         const contentWrapper = app.ui.renderElement('div', { class: 'd-flex justify-content-between align-items-start' });

         // Left side: Name and Details
         const infoDiv = app.ui.renderElement('div', { class: 'flex-grow-1 me-3' }); // Takes most space, margin end

         const nameEl = app.ui.renderElement('h5', {class: 'workout-name fw-medium mb-1'}, app.ui.sanitize(workout.name)); // Medium weight, less margin
         infoDiv.appendChild(nameEl);

         const detailsEl = app.ui.renderElement('div', {class: 'workout-details text-muted small d-flex flex-wrap gap-2'}); // small text, flex for details
         const detailsMap = {
            sets: { icon: 'fa-layer-group', label: 'set' },
            reps: { icon: 'fa-repeat', label: 'reps' },
            load: { icon: 'fa-weight-hanging', label: '' } // No label for load/duration
         };
         ['sets', 'reps', 'load'].forEach(key => {
             if (workout[key]) {
                 const detailSpan = app.ui.renderElement('span', {class: 'd-inline-flex align-items-center'});
                 detailSpan.innerHTML = `<i class="fa-solid ${detailsMap[key].icon} fa-fw me-1 text-secondary"></i>${app.ui.sanitize(workout[key])} ${detailsMap[key].label}`;
                 detailsEl.appendChild(detailSpan);
             }
         });
         if (detailsEl.childElementCount === 0) { // If no details provided
              detailsEl.appendChild(app.ui.renderElement('span', {class:'fst-italic'}, 'Nessun dettaglio'));
         }
         infoDiv.appendChild(detailsEl);


         // Right side: Actions (Remove button)
         const actionsEl = app.ui.renderElement('div', {class: 'actions flex-shrink-0'});
         const removeBtn = app.ui.renderElement('button', {
             type: 'button',
             class: 'button button-sm button-link text-danger p-1 remove-workout-btn', // Link style, danger color, minimal padding
             title: 'Rimuovi esercizio'
         });
         removeBtn.innerHTML = '<i class="fa-solid fa-trash-can fa-lg"></i>'; // Larger icon
         removeBtn.addEventListener('click', (e) => {
             e.stopPropagation();
             _removeWorkoutItem(workout.id);
         });
         actionsEl.appendChild(removeBtn);

         contentWrapper.append(infoDiv, actionsEl);
         li.appendChild(contentWrapper);

         // Notes section (if notes exist) - appended after main content
         if (workout.notes) {
            const notesEl = app.ui.renderElement('div', {class: 'workout-notes text-muted small mt-2 border-top pt-2'}); // Add border/padding
            notesEl.innerHTML = `<strong class="text-secondary">Note:</strong> ${app.ui.sanitize(workout.notes)}`; // Clearer label
            li.appendChild(notesEl);
         }

         return li;
    }

    /** Renders the entire list of workout items for the current day. */
    function _renderWorkoutList() {
        const listContainer = document.getElementById('workout-list-container');
        const listHeaderCount = document.getElementById('workout-count');
        if (!listContainer || !listHeaderCount) {
             console.error("Workout list container or count span not found during render.");
             return;
        }
        listContainer.innerHTML = ''; // Clear previous list content

        listHeaderCount.textContent = `(${dayWorkouts.length})`; // Update count in header

        if (dayWorkouts.length === 0) {
            listContainer.appendChild(app.ui.renderElement('p', { class: 'text-muted mt-3 text-center' }, 'Nessun esercizio registrato per oggi.'));
        } else {
            // Use list-group for structure
            const ul = app.ui.renderElement('ul', { class: 'workout-list list-group list-group-flush' });
            dayWorkouts.forEach(workout => {
                ul.appendChild(_renderWorkoutItem(workout)); // Each item is a list-group-item
            });
            listContainer.appendChild(ul);
        }
    }

    /** Clears the input fields in the "Add Workout" form. */
    function _clearWorkoutForm() {
        const form = document.getElementById('add-workout-form');
        if (form) {
            form.reset(); // Resets all form fields to default values
            const nameInput = form.querySelector('#workout-name');
            if (nameInput) {
                nameInput.focus(); // Set focus back to the name input
            }
        }
    }

    /** Handles the submission of the "Add Workout" form. */
    function _handleFormSubmit(event) {
        event.preventDefault(); // Prevent default page reload
        const form = event.target;
        const name = form.elements['workout-name']?.value;
        const sets = form.elements['workout-sets']?.value;
        const reps = form.elements['workout-reps']?.value;
        const load = form.elements['workout-load']?.value;
        const notes = form.elements['workout-notes']?.value;

        // Basic check if form elements exist
        if (name === undefined || sets === undefined || reps === undefined || load === undefined || notes === undefined) {
            console.error("One or more form elements not found during workout submission.");
            app.ui.showStatusMessage("Errore nel form, impossibile aggiungere esercizio.", 'error');
            return;
        }

        _addWorkoutItem(name, sets, reps, load, notes);
    }


    /** Main render function for the Workout Tracker section */
    function renderWorkoutTrackerSection(dayParam) {
        // Determine the day, default to today if param invalid or missing
        const todayDayName = app.config.DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
        currentDay = (dayParam && app.config.DAYS_OF_WEEK.includes(dayParam)) ? dayParam : todayDayName;
        console.log(`Rendering Workout Tracker section for: ${currentDay}`);

        // Redirect if the provided dayParam was invalid but not empty
        if(dayParam && dayParam !== currentDay) {
             console.warn(`Invalid day parameter "${dayParam}", redirecting to "${currentDay}".`);
             app.router.navigateTo('workout', [currentDay]);
             return; // Stop rendering current view
        }

        app.ui.showLoading(`Caricamento workout ${currentDay}...`);

        // Load existing workouts for the day
        try {
             dayWorkouts = app.dataManager.loadWorkouts(currentDay);
        } catch (error) {
             console.error(`Error loading workouts for ${currentDay}:`, error);
             app.ui.setContent('<p class="text-danger">Errore nel caricamento dei dati workout.</p>');
             return;
        }

        // --- Build HTML Structure ---
        const container = app.ui.renderElement('section', { id: 'workout-section' });

        // Header and Day Selector
        const header = app.ui.renderElement('div', { class: 'tracking-header d-flex justify-content-between align-items-center flex-wrap mb-3' });
        const titleDate = _getDateForCurrentDay(); // Calculate date for the title
        const title = app.ui.renderElement('h1', {class:'mb-0'}, [
            app.ui.renderElement('i', { class: 'fa-solid fa-dumbbell me-2' }),
            ` Workout Tracker: ${currentDay} `,
             app.ui.renderElement('span', { class: 'current-date text-muted fw-normal fs-5 ms-1' }, `(${app.ui.formatShortDate(titleDate)})`)
        ]);
        header.appendChild(title);
        container.appendChild(header);

        const daySelectorContainer = app.ui.renderElement('div', { id: 'workout-day-selector-container'});
        container.appendChild(daySelectorContainer);

        // Add Workout Form Card
        const formCard = app.ui.renderElement('div', { class: 'card workout-form mt-4 shadow-sm' });
        formCard.append(
            app.ui.renderElement('div', { class: 'card-header' }, [
                app.ui.renderElement('h3', {class:'mb-0'}, [app.ui.renderElement('i', { class: 'fa-solid fa-plus me-2' }), 'Aggiungi Esercizio']) ]),
            app.ui.renderElement('form', { class: 'card-body', id: 'add-workout-form' }, [
                app.ui.renderElement('div', { class: 'mb-3' }, [ // Use mb-3 for spacing
                    app.ui.renderElement('label', { for: 'workout-name', class: 'form-label' }, 'Nome Esercizio *'),
                    app.ui.renderElement('input', { type: 'text', id: 'workout-name', name: 'workout-name', class: 'form-control', required: true }) ]),
                app.ui.renderElement('div', { class: 'row gx-3 mb-3' }, [ // Row with gutters and bottom margin
                    app.ui.renderElement('div', { class: 'col-md-4 mb-2 mb-md-0' }, [ // Responsive columns with mobile margin
                        app.ui.renderElement('label', { for: 'workout-sets', class: 'form-label' }, 'Serie'),
                        app.ui.renderElement('input', { type: 'text', id: 'workout-sets', name: 'workout-sets', class: 'form-control', placeholder: 'Es: 3' }) ]),
                    app.ui.renderElement('div', { class: 'col-md-4 mb-2 mb-md-0' }, [
                        app.ui.renderElement('label', { for: 'workout-reps', class: 'form-label' }, 'Ripetizioni'),
                        app.ui.renderElement('input', { type: 'text', id: 'workout-reps', name: 'workout-reps', class: 'form-control', placeholder: 'Es: 10-12' }) ]),
                    app.ui.renderElement('div', { class: 'col-md-4' }, [
                        app.ui.renderElement('label', { for: 'workout-load', class: 'form-label' }, 'Carico / Durata'),
                        app.ui.renderElement('input', { type: 'text', id: 'workout-load', name: 'workout-load', class: 'form-control', placeholder: 'Es: 50kg / 30min' }) ]) ]),
                 app.ui.renderElement('div', { class: 'mb-3' }, [
                    app.ui.renderElement('label', { for: 'workout-notes', class: 'form-label' }, 'Note Esercizio (opzionale)'),
                    app.ui.renderElement('textarea', { id: 'workout-notes', name: 'workout-notes', class: 'form-control', rows: '2' }) ]),
                app.ui.renderElement('button', { type: 'submit', class: 'button button-primary px-4' }, [ // More padding
                    app.ui.renderElement('i', {class: 'fa-solid fa-plus me-1'}), ' Aggiungi' ]) ]) );
        container.appendChild(formCard);

        // Workout List Card
        const listCard = app.ui.renderElement('div', { class: 'card workout-list-card mt-4 shadow-sm' });
        listCard.append(
            app.ui.renderElement('div', { class: 'card-header' }, [
                 app.ui.renderElement('h3', { class: 'mb-0' }, [
                     app.ui.renderElement('i', { class: 'fa-solid fa-list-check me-2' }),
                     `Esercizi Registrati `,
                     app.ui.renderElement('span', {id: 'workout-count', class: 'badge bg-secondary rounded-pill ms-2'}, `${dayWorkouts.length}`) // Use badge for count
                 ]) ]),
            app.ui.renderElement('div', { class: 'card-body p-0', id: 'workout-list-container' }) // Remove card body padding for list group
        );
        container.appendChild(listCard);

        // --- Set Content & Initialize ---
        app.ui.setContent(container); // Render the section

        // Render day selector after container is in DOM
        app.ui.renderDaySelector('workout-day-selector-container', currentDay, (selectedDay) => {
            // No explicit save needed before navigation, data is saved on add/remove
            app.router.navigateTo('workout', [selectedDay]); // Navigate using router
        });

        // Render the initial list content
        _renderWorkoutList();

        // Add form submit listener
        const formElement = document.getElementById('add-workout-form');
        if (formElement) {
            formElement.addEventListener('submit', _handleFormSubmit);
        } else {
             console.error("Workout form (#add-workout-form) not found after render.");
        }

        console.log(`Workout Tracker for ${currentDay} rendering complete.`);
        // Loading indicator hidden by setContent
    }

     // --- Helper (duplicated from tracking, ideally move to ui.js or shared util) ---
    function _getDateForCurrentDay() {
         if (!currentDay) return new Date();
         const today = new Date();
         const todayIndex = today.getDay();
         const targetDayIndex = app.config.DAYS_OF_WEEK.indexOf(currentDay);
         const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
         const diff = targetDayIndex - adjustedTodayIndex;
         const targetDate = new Date(today);
         targetDate.setDate(today.getDate() + diff);
         return targetDate;
    }

    // --- Public API ---
    app.sections = app.sections || {}; // Ensure namespace exists
    app.sections.workout = {
        render: renderWorkoutTrackerSection
    };

}(window.app = window.app || {})); // Pass the global app object