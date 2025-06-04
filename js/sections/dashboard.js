// ============================================================
// Piano Benessere Pro - sections/dashboard.js
// Logic for the Dashboard view
// ============================================================

(function(app) {

    // Private function specific to the dashboard rendering
    function _renderDashboard() {
        console.log("Rendering Dashboard section...");
        // Ensure core modules are available
        if (!app.config || !app.dataManager || !app.ui) {
             console.error("Dashboard render failed: Core modules missing.");
             app.ui.setContent('<p class="text-danger">Errore caricamento dashboard: Moduli mancanti.</p>')
             return;
        }

        app.ui.showLoading('Caricamento dashboard...'); // Show specific loading message

        // --- Load Required Data ---
        const settings = app.dataManager.loadSettings();
        const weeklyTrackingData = app.dataManager.loadWeeklyTrackingData();
        const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ...
        const currentDayName = app.config.DAYS_OF_WEEK[todayIndex === 0 ? 6 : todayIndex - 1]; // Adjust for Monday start
        const todayData = weeklyTrackingData[currentDayName]; // Already validated by dataManager

        // --- Calculate Summaries ---
        const waterConsumed = parseFloat(todayData.water) || 0;
        const waterGoal = parseFloat(settings.waterGoalL) || app.config.DEFAULT_SETTINGS.waterGoalL; // Use default from config if not set
        const waterPercentage = waterGoal > 0 ? Math.min(100, Math.round((waterConsumed / waterGoal) * 100)) : 0;
        const waterProgressText = `${waterConsumed.toFixed(1)} / ${waterGoal.toFixed(1)} L`;
        const waterComplete = waterConsumed >= waterGoal; // Check if goal is met or exceeded

        const activityDesc = todayData.activity || "Nessuna attività registrata";
        // Truncate long activity descriptions for display in the card
        const truncatedActivity = activityDesc.length > 35 ? activityDesc.substring(0, 35) + '...' : activityDesc;

        // Use chart data helper for meal summary
        // Ensure the helper exists before calling
        const chartDataToday = app.ui._prepareChartData ? app.ui._prepareChartData({ [currentDayName]: todayData }) : { followed: [0], partial: [0], other: [0], skipped: [0] };
        const mealsSummary = {
            followed: chartDataToday.followed[0] || 0,
            partial: chartDataToday.partial[0] || 0,
            other: chartDataToday.other[0] || 0,
            skipped: chartDataToday.skipped[0] || 0
        };
        const totalMealsToday = app.config.MEAL_TYPES.length;
        // Simple adherence score: 1 point for followed, 0.5 for partial
        const adherenceScore = mealsSummary.followed + mealsSummary.partial * 0.5;
        const adherencePercentage = totalMealsToday > 0 ? Math.round((adherenceScore / totalMealsToday) * 100) : 0;
        // Use innerHTML for the summary text to allow <small> tags
        const mealsSummaryHTML = `${mealsSummary.followed} <small>Seguiti</small> / ${mealsSummary.partial} <small>Parziali</small> / ${mealsSummary.other} <small>Altro</small>`;

        // --- Build HTML Structure ---
        const container = app.ui.renderElement('section', { id: 'dashboard-section' });

        const headerDate = new Date(); // Get current date for display
        const header = app.ui.renderElement('h1', {}, [
            app.ui.renderElement('i', { class: 'fa-solid fa-chart-line me-2' }), // Add margin
            ` Dashboard `,
            app.ui.renderElement('span', { class: 'text-muted fw-normal fs-5' }, `(${currentDayName}, ${app.ui.formatShortDate(headerDate)})`) // Format date
        ]);
        container.appendChild(header);

        // Summary Cards Grid
        const grid = app.ui.renderElement('div', { class: 'row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 mb-4' }); // Use Bootstrap grid

        // Water Card
        grid.appendChild(app.ui.renderElement('div', { class: 'col' }, [ // Column wrapper
            app.ui.renderElement('div', { class: 'card summary-card h-100' }, [ // Use h-100 for equal height cards
                app.ui.renderElement('div', { class: `summary-icon-wrapper ${waterComplete ? 'bg-success-subtle' : 'bg-info-subtle'}` }, [ // Colored wrapper
                     app.ui.renderElement('i', { class: `fa-solid fa-droplet fs-1 ${waterComplete ? 'text-success' : 'text-info'}` }) // Icon styling
                ]),
                app.ui.renderElement('div', { class: 'summary-content flex-grow-1' }, [ // flex-grow needed
                    app.ui.renderElement('span', { class: 'value d-block fs-4 fw-bold' }, waterProgressText), // Styling value
                    app.ui.renderElement('span', { class: 'label text-muted' }, `Acqua Bevuta (${waterPercentage}%)`)
                ])
            ])
        ]));

        // Activity Card
        grid.appendChild(app.ui.renderElement('div', { class: 'col' }, [
             app.ui.renderElement('div', { class: 'card summary-card h-100' }, [
                 app.ui.renderElement('div', { class: 'summary-icon-wrapper bg-warning-subtle' }, [ // Warning color for activity
                      app.ui.renderElement('i', { class: 'fa-solid fa-person-running fs-1 text-warning' })
                 ]),
                 app.ui.renderElement('div', { class: 'summary-content flex-grow-1' }, [
                     app.ui.renderElement('span', { class: 'value d-block fs-5', title: app.ui.sanitize(activityDesc) }, app.ui.sanitize(truncatedActivity)), // Use fs-5 for potentially longer text
                     app.ui.renderElement('span', { class: 'label text-muted' }, 'Attività di Oggi')
                 ])
             ])
         ]));

        // Meals Card
        grid.appendChild(app.ui.renderElement('div', { class: 'col' }, [
             app.ui.renderElement('div', { class: 'card summary-card h-100' }, [
                 app.ui.renderElement('div', { class: 'summary-icon-wrapper bg-primary-subtle' }, [ // Primary color for meals
                      app.ui.renderElement('i', { class: 'fa-solid fa-utensils fs-1 text-primary' })
                 ]),
                 app.ui.renderElement('div', { class: 'summary-content flex-grow-1' }, [
                     app.ui.renderElement('span', { class: 'value d-block fs-5' }, mealsSummaryHTML), // Use innerHTML
                     app.ui.renderElement('span', { class: 'label text-muted' }, `Pasti Oggi (~${adherencePercentage}% aderenza)`)
                 ])
             ])
         ]));

        // Append grid to container AFTER populating it
        container.appendChild(grid);


        // Chart Card
        const chartCard = app.ui.renderElement('div', { class: 'card mb-4' }, [
            app.ui.renderElement('div', { class: 'card-header' }, [
                app.ui.renderElement('h3', { class: 'mb-0' }, [ // remove margin from h3
                    app.ui.renderElement('i', { class: 'fa-solid fa-chart-bar me-2' }), 'Riepilogo Settimanale Pasti'
                ])
            ]),
            app.ui.renderElement('div', { class: 'card-body' }, [
                app.ui.renderElement('div', { class: 'chart-container', style: 'height: 300px; position: relative;' }, [ // Set height and relative position
                    app.ui.renderElement('canvas', { id: 'weeklyAdherenceChart' })
                ])
            ])
        ]);
        container.appendChild(chartCard);


        // Quick Links Card
        const quickLinksCard = app.ui.renderElement('div', { class: 'card' }, [
            app.ui.renderElement('div', { class: 'card-header' }, [
                app.ui.renderElement('h3', { class: 'mb-0' }, [
                     app.ui.renderElement('i', { class: 'fa-solid fa-link me-2' }), 'Accesso Rapido'
                ])
            ]),
            app.ui.renderElement('div', { class: 'card-body quick-links d-flex flex-wrap gap-2' }, [ // Use flexbox and gap
                 app.ui.renderElement('a', { href: `#tracking/${currentDayName}`, class: 'button button-secondary' }, [
                     app.ui.renderElement('i', { class: 'fa-regular fa-calendar-check' }),
                     app.ui.renderElement('span', {class: 'btn-text'}, ' Tracking Oggi')
                 ]),
                 app.ui.renderElement('a', { href: `#workout/${currentDayName}`, class: 'button button-secondary' }, [
                     app.ui.renderElement('i', { class: 'fa-solid fa-dumbbell' }),
                     app.ui.renderElement('span', {class: 'btn-text'}, ' Workout Oggi')
                 ]),
                 app.ui.renderElement('a', { href: '#dietEditor', class: 'button button-secondary' }, [
                     app.ui.renderElement('i', { class: 'fa-solid fa-pen-ruler' }),
                      app.ui.renderElement('span', {class: 'btn-text'}, ' Editor Dieta')
                 ]),
                  app.ui.renderElement('a', { href: '#reference', class: 'button button-secondary' }, [
                     app.ui.renderElement('i', { class: 'fa-regular fa-rectangle-list' }),
                      app.ui.renderElement('span', {class: 'btn-text'}, ' Piano Riferimento')
                 ])
            ])
        ]);
        container.appendChild(quickLinksCard);

        // --- Add Specific CSS for Summary Card Icons (can be moved to style.css) ---
         const styleElement = app.ui.renderElement('style', {}, `
            .summary-card { flex-direction: row; align-items: center; }
            .summary-icon-wrapper { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: var(--spacing-md); }
            /* Add styles for card layout if needed */
            @media (max-width: 767px) { .summary-card { flex-direction: column; text-align: center; } .summary-icon-wrapper { margin-right: 0; margin-bottom: var(--spacing-sm); } }
            .quick-links a { text-decoration: none; }
         `);
         container.appendChild(styleElement);


        // --- Set Content & Initialize Chart ---
        app.ui.setContent(container); // This hides the loading indicator

        // Use setTimeout to ensure the canvas is rendered and sized before creating the chart
        setTimeout(() => {
            try {
                 // Check if Chart.js is loaded
                 if (typeof Chart === 'undefined') {
                     throw new Error("Chart.js library is not loaded.");
                 }
                 app.ui.renderWeeklyAdherenceChart('weeklyAdherenceChart', weeklyTrackingData);
            } catch(e) {
                 console.error("Failed to render chart:", e);
                 const chartContainer = document.getElementById('weeklyAdherenceChart')?.parentElement;
                 if (chartContainer) {
                     chartContainer.innerHTML = `<p class="text-danger text-center p-3"><i class="fas fa-exclamation-triangle me-1"></i> Impossibile caricare il grafico. ${e.message}</p>`;
                 }
            }
        }, 100); // Increased delay slightly to ensure DOM ready

         console.log("Dashboard rendering complete.");
    }

    // --- Public API ---
    // Expose the render function for this section
    app.sections = app.sections || {}; // Ensure sections namespace exists
    app.sections.dashboard = {
        render: _renderDashboard // Assign the private function to the public render method
    };

}(window.app = window.app || {})); // Pass the global app object