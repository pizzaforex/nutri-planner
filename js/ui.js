// ============================================================
// Piano Benessere Pro - ui.js
// UI manipulation functions, helpers, common component rendering
// ============================================================

(function(app) {

    let statusTimeout; // Timeout ID for the status message
    let currentChart = null; // Reference to the active Chart.js instance

    app.ui = {

        // --- Core DOM Manipulation ---

        /**
         * Sets the content of the main content area.
         * @param {string|Node} htmlContent - HTML string or DOM Node to inject.
         */
        setContent: function(htmlContent) {
            const contentArea = document.getElementById('content-area');
            if (!contentArea) {
                console.error("Fatal Error: Content area (#content-area) not found!");
                // Display error message directly in body if content area missing
                document.body.innerHTML = '<p style="color:red; padding:20px;">Errore critico: Impossibile caricare l\'area principale dell\'applicazione.</p>';
                return;
            }

            // --- Optional Transition Logic ---
            // Check if there's existing content to transition out
            // const oldSection = contentArea.querySelector('section');
            // if (oldSection) {
            //     oldSection.classList.add('fade-out');
            //     // Wait for fade out before clearing and adding new content
            //     setTimeout(() => {
            //         contentArea.innerHTML = ''; // Clear after fade
            //         this._appendContent(contentArea, htmlContent);
            //         this.hideLoading(); // Hide loading indicator *after* content is added
            //     }, 150); // Match CSS transition duration
            // } else {
                // If no old content, just set directly
                contentArea.innerHTML = ''; // Clear previous content immediately
                this._appendContent(contentArea, htmlContent);
                this.hideLoading(); // Hide loading indicator *after* content is added
            // }

        },

        /**
         * Helper to append string or Node content.
         * @private
         */
        _appendContent: function(parent, content) {
             if (typeof content === 'string') {
                // Basic check for script tags - A proper sanitizer (like DOMPurify) is recommended for production
                if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
                    console.warn("Attempted to inject script tag via setContent. Content blocked.");
                    parent.innerHTML = '<p class="text-danger">Contenuto bloccato per motivi di sicurezza.</p>';
                } else {
                    parent.innerHTML = content;
                }
            } else if (content instanceof Node) {
                parent.appendChild(content);
            }
        },

        /**
         * Creates a DOM element with specified attributes and content.
         * @param {string} tag - HTML tag name (e.g., 'div', 'button').
         * @param {object} attributes - Key-value pairs for element attributes (e.g., { class: 'my-class', id: 'my-id' }).
         * @param {string|Node|Array<Node|string>} [content] - Inner HTML string, a single DOM Node, or an array of Nodes/strings.
         * @returns {HTMLElement} The created DOM element.
         */
        renderElement: function(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            for (const key in attributes) {
                // Handle boolean attributes correctly
                if (typeof attributes[key] === 'boolean') {
                    if (attributes[key]) {
                        element.setAttribute(key, ''); // e.g., <button disabled>
                    }
                } else if (attributes[key] !== null && attributes[key] !== undefined) {
                    element.setAttribute(key, attributes[key]);
                }
            }

            if (content !== null && content !== undefined) {
                 if (Array.isArray(content)) {
                    content.forEach(child => {
                        if (child instanceof Node) {
                            element.appendChild(child);
                        } else if (child !== null && child !== undefined) {
                            // Append non-Node content as text node for safety
                            element.appendChild(document.createTextNode(String(child)));
                        }
                    });
                } else if (content instanceof Node) {
                    element.appendChild(content);
                } else {
                    // Treat as text content for safety, avoid innerHTML for arbitrary strings
                     element.textContent = String(content);
                }
            }
            return element;
        },

        // --- Loading State ---

        /** Shows the global loading indicator. */
        showLoading: function(message = 'Caricamento...') {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) {
                indicator.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${this.sanitize(message)}`;
                indicator.classList.add('visible');
            }
        },

        /** Hides the global loading indicator. */
        hideLoading: function() {
             const indicator = document.getElementById('loadingIndicator');
             if (indicator) indicator.classList.remove('visible');
        },

        // --- Status Messages ---

        /**
         * Displays a global status message at the bottom-right.
         * @param {string} message - The message text.
         * @param {'info'|'success'|'warning'|'error'} [type='info'] - Message type for styling.
         * @param {number} [duration=3000] - Duration in milliseconds before auto-hiding.
         */
        showStatusMessage: function(message, type = 'info', duration = 3000) {
            const statusElement = document.getElementById('statusMessageGlobal');
            if (!statusElement) return;

            clearTimeout(statusTimeout); // Clear any existing timeout

            statusElement.textContent = message; // Set text content directly (safer)
            statusElement.className = 'status-message-global visible'; // Reset classes and make visible
            statusElement.classList.add(type); // Add type class (info, success, error, warning)

            // Auto-hide after duration
            if (duration > 0) {
                statusTimeout = setTimeout(() => {
                    statusElement.classList.remove('visible');
                    // Optional: Clear text after fade out transition completes
                    // setTimeout(() => { statusElement.textContent = ''; }, 300); // Match CSS transition
                }, duration);
            }
        },

        // --- Navigation UI ---

        /**
         * Updates the active state of sidebar navigation links.
         * @param {string} sectionId - The ID of the currently active section (e.g., 'dashboard', 'tracking').
         */
        setActiveSidebarLink: function(sectionId) {
            const sidebar = document.getElementById('sidebarNav');
            if (!sidebar) return;
            sidebar.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.section === sectionId);
            });
        },

        /**
         * Sets the application version text in the sidebar footer.
         * @param {string} version - The version string.
         */
        setAppVersion: function(version) {
            const versionElement = document.getElementById('appVersion');
            if (versionElement) {
                versionElement.textContent = `Versione ${this.sanitize(version)}`;
            }
        },

        // --- Common Component Rendering ---

        /**
         * Renders the day selector buttons.
         * @param {string} containerId - ID of the container element for the buttons.
         * @param {string} currentDay - The currently selected day name.
         * @param {function(string)} selectDayCallback - Function to call when a day button is clicked, passing the selected day name.
         */
        renderDaySelector: function(containerId, currentDay, selectDayCallback) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Day selector container #${containerId} not found.`);
                return;
            }
            container.innerHTML = ''; // Clear previous buttons
            container.classList.add('day-selector'); // Ensure class is present

            app.config.DAYS_OF_WEEK.forEach(day => {
                const button = this.renderElement('button', {
                    type: 'button', // Explicitly set type
                    class: `button day-btn ${day === currentDay ? 'active' : ''}`,
                    'data-day': day,
                }, day); // Use textContent for day name

                // Add click listener only if it's not the active day
                if (day !== currentDay) {
                    button.addEventListener('click', () => selectDayCallback(day));
                } else {
                    button.setAttribute('disabled', ''); // Disable the active button
                }
                container.appendChild(button);
            });
        },

        // --- Chart.js Integration ---

        /**
         * Initializes or updates the weekly adherence bar chart.
         * @param {string} canvasId - The ID of the canvas element.
         * @param {object} weeklyData - The tracking data for the week.
         */
        renderWeeklyAdherenceChart: function(canvasId, weeklyData) {
            const canvasElement = document.getElementById(canvasId);
            if (!canvasElement) {
                 console.error(`Canvas element with id "${canvasId}" not found for chart.`);
                 return;
            }
            const ctx = canvasElement.getContext('2d');
            if (!ctx) {
                 console.error(`Failed to get 2D context for canvas "${canvasId}".`);
                 return;
            }

            // Destroy previous chart instance if it exists
             if (currentChart) {
                 currentChart.destroy();
                 currentChart = null;
             }

            const chartData = this._prepareChartData(weeklyData);

            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels, // Days of the week
                    datasets: [
                        {
                            label: 'Pasti Seguiti',
                            data: chartData.followed,
                            backgroundColor: 'rgba(40, 167, 69, 0.7)', // --success-color
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Parzialmente', // Shorter label
                            data: chartData.partial,
                            backgroundColor: 'rgba(255, 193, 7, 0.7)', // --warning-color
                            borderColor: 'rgba(255, 193, 7, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Altro',
                            data: chartData.other,
                            backgroundColor: 'rgba(253, 172, 83, 0.7)', // --accent-secondary
                            borderColor: 'rgba(253, 172, 83, 1)',
                            borderWidth: 1
                        },
                         {
                            label: 'Saltati', // Or 'Non Registrati'
                            data: chartData.skipped,
                            backgroundColor: 'rgba(108, 117, 125, 0.5)', // --text-tertiary muted
                            borderColor: 'rgba(108, 117, 125, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allow chart to fill container height
                    scales: {
                        x: {
                            stacked: true,
                            grid: { display: false } // Cleaner look
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            max: app.config.MEAL_TYPES.length, // Max value is the number of meals
                            ticks: {
                                stepSize: 1, // Show integer ticks (0, 1, 2, 3, 4, 5)
                                precision: 0 // Ensure whole numbers
                            },
                             title: {
                                display: true,
                                text: 'Numero Pasti'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Aderenza Settimanale ai Pasti',
                            padding: { top: 10, bottom: 20 },
                            font: { size: 16, weight: '600' }
                        },
                        tooltip: {
                            mode: 'index', // Show tooltip for all stacks on hover
                            intersect: false,
                            callbacks: { // Custom tooltip label
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed.y !== null) {
                                         label += context.parsed.y + (context.parsed.y === 1 ? ' pasto' : ' pasti');
                                    }
                                    return label;
                                }
                            }
                        },
                        legend: {
                            position: 'bottom', // Better placement
                            labels: { padding: 20 }
                        }
                    },
                    // Interaction tuning (optional)
                    // interaction: {
                    //     mode: 'index',
                    //     intersect: false,
                    // },
                    // animation: { duration: 500 } // Subtle animation
                }
            });
        },

        /**
         * Prepares data in the format required by Chart.js.
         * @private
         */
        _prepareChartData: function(weeklyData) {
            const labels = app.config.DAYS_OF_WEEK;
            const followed = [];
            const partial = [];
            const other = [];
            const skipped = [];
            const totalMeals = app.config.MEAL_TYPES.length;
            const dietPlan = app.dataManager.loadDietPlan(); // Needed to check suggested items

            labels.forEach(day => {
                let dayFollowed = 0;
                let dayPartial = 0;
                let dayOther = 0;
                let daySkipped = 0;
                const dayData = weeklyData[day]; // Data from loadWeeklyTrackingData (already validated)

                if (dayData && dayData.meals) {
                    app.config.MEAL_TYPES.forEach(mealType => {
                        const meal = dayData.meals[mealType];
                        const suggestedItems = dietPlan[day]?.[mealType]?.items || [];
                        const totalSuggested = suggestedItems.length;

                        if (meal) {
                            if (meal.ateOther) {
                                dayOther++;
                            } else {
                                let consumedCount = 0;
                                if (meal.itemsStatus) {
                                     consumedCount = Object.values(meal.itemsStatus).filter(status => status.consumed).length;
                                }

                                if (consumedCount > 0) {
                                    // Fully followed only if suggested items exist and all were consumed
                                    if (totalSuggested > 0 && consumedCount >= totalSuggested) {
                                        dayFollowed++;
                                    } else {
                                        dayPartial++; // Consumed at least one, but not all suggested (or none suggested)
                                    }
                                } else {
                                    daySkipped++; // No items consumed, not "ate other"
                                }
                            }
                        } else {
                            daySkipped++; // Meal data missing for this type
                        }
                    });
                } else {
                    daySkipped = totalMeals; // Day data missing completely
                }

                // --- Data Sanity Check ---
                // Ensure the sum for the day equals the total number of meals
                const totalCounted = dayFollowed + dayPartial + dayOther + daySkipped;
                if (totalCounted !== totalMeals) {
                    console.warn(`Chart data mismatch for ${day}. Counted: ${totalCounted}, Expected: ${totalMeals}. Adjusting skipped count.`);
                    // Prioritize recorded data, adjust skipped count
                    daySkipped = Math.max(0, totalMeals - (dayFollowed + dayPartial + dayOther));
                }

                followed.push(dayFollowed);
                partial.push(dayPartial);
                other.push(dayOther);
                skipped.push(daySkipped);
            });

            return { labels, followed, partial, other, skipped };
        },


        // --- Utilities ---

        /**
         * Basic HTML sanitizer using textContent assignment.
         * WARNING: This is NOT a replacement for a robust library like DOMPurify
         * if dealing with untrusted input. Use with caution.
         * @param {string} str - The string to sanitize.
         * @returns {string} The sanitized string.
         */
        sanitize: function(str) {
            if (str === null || str === undefined) return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML; // Converts special chars like < > & to entities
        },

        /**
         * Gets the Font Awesome icon name for a given meal type.
         * Moved here to be a central UI utility.
         * @param {string} mealType - The meal type key (e.g., 'colazione').
         * @returns {string} Font Awesome icon name (without 'fa-').
         */
        getMealIcon: function(mealType) {
            switch (mealType) {
                case 'colazione': return 'mug-saucer';
                case 'spuntinoMattina': return 'apple-whole';
                case 'pranzo': return 'utensils';
                case 'spuntinoPomeriggio': return 'cookie-bite';
                case 'cena': return 'plate-wheat';
                default: return 'circle-question'; // Default icon
            }
        },

        /**
        * Formats a date object into "DD MMM" format (e.g., "15 Lug").
        * @param {Date} date - The date object to format.
        * @returns {string} Formatted date string.
        */
        formatShortDate: function(date) {
            if (!(date instanceof Date)) return "";
             const options = { day: 'numeric', month: 'short' };
            return date.toLocaleDateString('it-IT', options);
        },

        /**
         * Toggles dark mode class on the body element.
         * @param {boolean} enabled - Whether dark mode should be enabled.
         */
        applyDarkMode: function(enabled) {
            document.body.classList.toggle('dark-mode', !!enabled);
        }


    };

    console.log("UI Module initialized.");

}(window.app = window.app || {}));