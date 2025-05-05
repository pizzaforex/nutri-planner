// ============================================================
// Piano Benessere Pro - sections/reference.js
// Logic for the Reference Diet Plan view (Read-only display)
// ============================================================

(function(app) {

    /** Renders the content for a single meal in the reference view. */
    function _renderReferenceMeal(mealType, mealData) {
        // Check if the meal has any meaningful content to display
        const hasItems = mealData?.items && Array.isArray(mealData.items) && mealData.items.length > 0 && mealData.items.some(item => item.name?.trim());
        const hasSubstitute = mealData?.substitute && mealData.substitute.trim() !== '';
        const hasText = mealData?.text && mealData.text.trim() !== ''; // Fallback for old structure

        // If no content at all, return null so it's not rendered
        if (!hasItems && !hasSubstitute && !hasText) {
            return null;
        }

        const mealContainer = app.ui.renderElement('div', { class: 'reference-meal mb-4' }); // Increased bottom margin
        const mealName = app.config.MEAL_NAMES[mealType] || mealType;
        const icon = app.ui.getMealIcon(mealType); // Use shared UI helper

        // Meal Title (e.g., H5 or H6)
        const title = app.ui.renderElement('h5', { class: 'mb-2 text-primary-emphasis' }, [ // Styling for title
            app.ui.renderElement('i', { class: `fa-solid fa-${icon} me-2 text-primary opacity-75` }), // Styled icon
            mealName
        ]);
        mealContainer.appendChild(title);

        // Container for items and substitute, allows for consistent indentation
        const contentWrapper = app.ui.renderElement('div', { class: 'ps-2' }); // Slight indent for content

        // List of Items
        if (hasItems) {
            const list = app.ui.renderElement('ul', { class: 'list-unstyled mb-2' }); // Use list-unstyled
            mealData.items.forEach(item => {
                 const li = app.ui.renderElement('li', { class: 'd-flex align-items-start mb-1' }); // Flex for alignment
                 // Use a bullet point icon or character
                 li.innerHTML = `<i class="fa-solid fa-circle fa-2xs me-2 mt-1 text-secondary opacity-50"></i>
                                 <div>
                                     ${app.ui.sanitize(item.name)}
                                     <span class="text-muted small ms-1">(${app.ui.sanitize(item.quantity) || 'N/D'})</span>
                                 </div>`;
                 list.appendChild(li);
            });
            contentWrapper.appendChild(list);
        } else if (hasText) {
             // Fallback for text-only meal definition
             contentWrapper.appendChild(app.ui.renderElement('p', { class: 'mb-2 fst-italic text-muted' }, app.ui.sanitize(mealData.text)));
        } else if (!hasSubstitute) {
            // Only show placeholder if NO items AND NO substitute exist
             contentWrapper.appendChild(app.ui.renderElement('p', { class: 'text-muted fst-italic small mb-2' }, 'Nessun alimento specifico suggerito.'));
        }

        // Substitute Text - styled distinctly
        if (hasSubstitute) {
            const substituteEl = app.ui.renderElement('div', { class: 'substitute-text border-start border-warning border-3 ps-3 mt-2' }); // Style substitute
            // Use innerHTML carefully to preserve line breaks if needed, ensure sanitization
            substituteEl.innerHTML = `<strong class="d-block mb-1 text-warning-emphasis small">Alternativa:</strong><span class="text-muted">${app.ui.sanitize(mealData.substitute).replace(/\n/g, '<br>')}</span>`;
            contentWrapper.appendChild(substituteEl);
        }

        mealContainer.appendChild(contentWrapper); // Add indented content
        return mealContainer;
    }

    /** Main render function for the Reference section */
    function _renderReferenceSection() {
        console.log("Rendering Reference section");
        app.ui.showLoading('Caricamento piano di riferimento...');

        let dietPlan;
        try {
             dietPlan = app.dataManager.loadDietPlan(); // Load current plan (from storage or default)
        } catch(error) {
             console.error("Error loading diet plan for reference view:", error);
             app.ui.setContent('<p class="text-danger text-center mt-5">Errore critico: Impossibile caricare il piano alimentare di riferimento.</p>');
             return;
        }


        const container = app.ui.renderElement('section', { id: 'reference-section' });
        const header = app.ui.renderElement('h1', {}, [
            app.ui.renderElement('i', { class: 'fa-regular fa-rectangle-list me-2' }), 'Piano Alimentare di Riferimento'
        ]);
        const intro = app.ui.renderElement('p', { class: 'lead mb-4' }, 'Visualizza il piano alimentare suggerito attualmente in uso. Puoi modificarlo nella sezione "Editor Dieta".');
        container.append(header, intro);

        // Render each day using styled <details> elements
        app.config.DAYS_OF_WEEK.forEach((day, index) => {
            const dayPlan = dietPlan[day]; // May be undefined if day missing in plan

            // Use Bootstrap accordion styling for a cleaner look
            const accordionItem = app.ui.renderElement('div', { class: 'accordion-item mb-3 shadow-sm' });

            const accordionHeader = app.ui.renderElement('h2', { class: 'accordion-header', id: `heading-${day}` });
            const accordionButton = app.ui.renderElement('button', {
                class: 'accordion-button collapsed fw-medium fs-5', // Add styling classes
                type: 'button',
                'data-bs-toggle': 'collapse', // Need Bootstrap JS for this
                'data-bs-target': `#collapse-${day}`,
                'aria-expanded': 'false',
                'aria-controls': `collapse-${day}`
            });
            accordionButton.innerHTML = `<i class="fa-regular fa-calendar-days me-2"></i>${day}`;
            accordionHeader.appendChild(accordionButton);

            // Check if this is the current day to potentially open it by default
            const todayIndex = new Date().getDay();
            const currentDayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
            const isToday = (index === currentDayIndex);
            if (isToday) {
                // For Bootstrap accordion, add 'show' class to collapse div and remove 'collapsed' from button
                accordionButton.classList.remove('collapsed');
                accordionButton.setAttribute('aria-expanded', 'true');
            }

            const collapseDiv = app.ui.renderElement('div', {
                id: `collapse-${day}`,
                class: `accordion-collapse collapse ${isToday ? 'show' : ''}`, // Add 'show' if today
                'aria-labelledby': `heading-${day}`,
                // 'data-bs-parent': '#referenceAccordion' // Add parent ID if using accordion group
            });

            const accordionBody = app.ui.renderElement('div', { class: 'accordion-body p-4' }); // Add padding
            let hasContentForDay = false;

            // Render meals only if dayPlan exists
            if (dayPlan) {
                 app.config.MEAL_TYPES.forEach((mealType, mealIndex) => {
                     const mealData = dayPlan[mealType] || {}; // Ensure mealData exists
                     const mealElement = _renderReferenceMeal(mealType, mealData);
                     if (mealElement) { // Only append if the meal had content
                         accordionBody.appendChild(mealElement);
                         // Add separator between meals (optional)
                         // if (mealIndex < app.config.MEAL_TYPES.length - 1) {
                         //     accordionBody.appendChild(app.ui.renderElement('hr', { class: 'my-3 border-secondary-subtle' }));
                         // }
                         hasContentForDay = true;
                     }
                 });
            }

            // If no meals had any content for the day
            if (!hasContentForDay) {
                accordionBody.appendChild(app.ui.renderElement('p', { class: 'text-muted fst-italic' }, 'Nessun piano definito per questo giorno.'));
            }

            collapseDiv.appendChild(accordionBody);
            accordionItem.append(accordionHeader, collapseDiv);
            container.appendChild(accordionItem); // Add the accordion item to the main container
        });

        // --- Set Content ---
        app.ui.setContent(container); // This also hides the loading indicator

        // Note: Bootstrap JS is required for the accordion collapse functionality.
        // If not using Bootstrap JS, the <details>/<summary> approach from V8.1/previous refactor is needed.
        // This version assumes Bootstrap JS might be added or collapse handled differently.
        // To revert to <details>, replace accordion structure with the details/summary structure.

        console.log("Reference section rendering complete.");
    }

    // --- Public API ---
    app.sections = app.sections || {}; // Ensure namespace exists
    app.sections.reference = {
        render: _renderReferenceSection // Expose the main render function
    };

}(window.app = window.app || {})); // Pass the global app object