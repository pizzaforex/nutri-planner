// ============================================================
// Piano Benessere Pro - config.js
// Central configuration file
// ============================================================

// Encapsulate config in a global app object property
(function(app) {

    app.config = {
        APP_VERSION: "v9.0-Refactored", // New version identifier
        DEFAULT_ROUTE: "dashboard",     // Starting page hash

        // User-configurable settings (will be merged with saved settings)
        DEFAULT_SETTINGS: {
            nutritionistEmail: 'TUA_EMAIL_NUTRIZIONISTA@example.com', // !! SOSTITUISCI !!
            waterGoalL: 2.0, // Default daily water goal in Liters
        },

        // Application constants
        DAYS_OF_WEEK: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
        MEAL_TYPES: ["colazione", "spuntinoMattina", "pranzo", "spuntinoPomeriggio", "cena"],
        MEAL_NAMES: {
            colazione: "Colazione",
            spuntinoMattina: "Spuntino Mattina",
            pranzo: "Pranzo",
            spuntinoPomeriggio: "Spuntino Pomeriggio",
            cena: "Cena"
        },

        // LocalStorage Keys (using consistent prefix)
        LS_PREFIX: 'wellnessPro_',
        LOCALSTORAGE_KEYS: {
            TRACKING_DATA_PREFIX: 'wellnessPro_TrackData_', // Append Day Name
            WORKOUT_DATA_PREFIX: 'wellnessPro_WorkoutData_', // Append Day Name
            DIET_PLAN: 'wellnessPro_EditableDietPlan_v1', // Versioned key
            SETTINGS: 'wellnessPro_Settings_v1',          // Versioned key
            // Note: Removed weekly cost as separate key, can derive from tracking or keep if needed
        },

        // Default Editable Diet Plan (Structure from V8.1)
        // This will be used ONLY if no plan is found in localStorage
        // Kept verbose for clarity, can be shortened if needed
        DEFAULT_WEEKLY_PLAN: {
            "Lunedì": {
                colazione: { items: [ { name: "Yogurt greco", quantity: "150g" }, { name: "Frutti di bosco", quantity: "100g" }, { name: "Fiocchi d'avena", quantity: "40g" }, { name: "Mandorle", quantity: "10g" } ], substitute: "Latte p.s. 200ml + 4 fette biscottate integrali + marmellata senza zuccheri" },
                spuntinoMattina: { items: [ { name: "Mela", quantity: "1" }, { name: "Noci", quantity: "15g" } ], substitute: "1 Pera + 10 mandorle" },
                pranzo: { items: [ { name: "Salmone al vapore", quantity: "150g" }, { name: "Quinoa", quantity: "80g" }, { name: "Spinaci saltati", quantity: "200g" }, { name: "Olio EVO", quantity: "1 cucchiaio" } ], substitute: "Sgombro al forno 150g + Riso integrale 80g + Broccoli 200g" },
                spuntinoPomeriggio: { items: [ { name: "Pera", quantity: "1" }, { name: "Yogurt magro", quantity: "125g" } ], substitute: "Fragole 150g + 10g cioccolato fondente >80%" },
                cena: { items: [ { name: "Petto di pollo alla griglia", quantity: "130g" }, { name: "Patate dolci al forno", quantity: "150g" }, { name: "Broccoli al vapore", quantity: "200g" }, { name: "Olio EVO", quantity: "1 cucchiaio" } ], substitute: "Tacchino ai ferri 140g + Insalata mista abbondante + Pane integrale 40g" },
            },
            "Martedì": {
                colazione: { items: [ { name: "Latte p.s.", quantity: "200ml" }, { name: "Pane integrale", quantity: "50g" }, { name: "Ricotta", quantity: "80g" }, { name: "Marmellata s.z.", quantity: "20g" } ], substitute: "Porridge (Avena 40g, latte/acqua 200ml) + frutta fresca" },
                spuntinoMattina: { items: [ { name: "Banana", quantity: "1" }, { name: "Mandorle", quantity: "15g" } ], substitute: "Kiwi 2" },
                pranzo: { items: [ { name: "Zuppa legumi misti", quantity: "300g" }, { name: "Pasta integrale", quantity: "70g" }, { name: "Olio EVO", quantity: "1 cucchiaio" } ], substitute: "Insalata di farro 80g + verdure grigliate + Feta 50g" },
                spuntinoPomeriggio: { items: [ { name: "Kiwi", quantity: "2" }, { name: "Noci", quantity: "10g" } ], substitute: "Yogurt greco 150g" },
                cena: { items: [ { name: "Sgombro al forno", quantity: "150g" }, { name: "Insalata mista", quantity: "200g" }, { name: "Pane integrale", quantity: "30g" }, { name: "Olio EVO", quantity: "1 cucchiaio" } ], substitute: "Merluzzo al vapore 160g + Cavolfiore 200g + Patate lesse 100g" },
            },
             "Mercoledì": { colazione: { items: [ { name: "Porridge Avena", quantity: "50g" }, { name: "Latte / Bevanda Veg", quantity: "250ml" }, { name: "Frutta Fresca", quantity: "100g"} ], substitute: "Yogurt Greco 150g + Cereali Integrali 40g" }, spuntinoMattina: { items: [ { name: "Arancia", quantity: "1" } ], substitute: "Mandorle 20g" }, pranzo: { items: [ { name: "Lenticchie", quantity: "150g cotte" }, { name: "Riso Basmati", quantity: "70g" }, { name: "Carote Julienne", quantity: "150g" }, { name: "Olio EVO", quantity: "1 cucchiaio"} ], substitute: "Ceci 150g cotti + Bulgur 70g + Zucchine grigliate" }, spuntinoPomeriggio: { items: [ { name: "Yogurt Bianco", quantity: "125g" }, { name: "Semi di Chia", quantity: "5g" } ], substitute: "Frutta secca 20g" }, cena: { items: [ { name: "Merluzzo al Vapore", quantity: "180g" }, { name: "Finocchi Gratinati", quantity: "200g" }, { name: "Pane di Segale", quantity: "40g" }, { name: "Olio EVO", quantity: "1 cucchiaio"} ], substitute: "Platessa 180g + Cavolfiore 200g" } },
             "Giovedì": { colazione: { items: [ { name: "Fette Biscottate Integrali", quantity: "4" }, { name: "Miele", quantity: "15g" }, { name: "Latte P.S.", quantity: "200ml" } ], substitute: "Pancakes (50g farina avena, 1 uovo, 100ml albume) + Sciroppo Acero q.b." }, spuntinoMattina: { items: [ { name: "Mela", quantity: "1" }, { name: "Noci", quantity: "15g" } ], substitute: "Pompelmo 1" }, pranzo: { items: [ { name: "Insalata di Pollo", quantity: "130g pollo" }, { name: "Mais", quantity: "50g" }, { name: "Verdure Miste", quantity: "abbondanti" }, { name: "Pane Integrale", quantity: "30g"}, { name: "Olio EVO", quantity: "1 cucchiaio"} ], substitute: "Insalata di Tofu 150g + Quinoa 70g + Verdure" }, spuntinoPomeriggio: { items: [ { name: "Pera", quantity: "1" } ], substitute: "Yogurt greco 150g" }, cena: { items: [ { name: "Frittata (2 uova)", quantity: "2" }, { name: "Spinaci", quantity: "150g" }, { name: "Patate Lesse", quantity: "150g" }, { name: "Olio EVO", quantity: "1 cucchiaio"} ], substitute: "Uova sode 2 + Asparagi 200g + Pane integrale 40g" } },
             "Venerdì": { colazione: { items: [ { name: "Yogurt greco", quantity: "150g" }, { name: "Frutti di bosco", quantity: "100g" }, { name: "Noci", quantity: "20g"} ], substitute: "Latte p.s. 200ml + 4 biscotti secchi integrali" }, spuntinoMattina: { items: [ { name: "Banana", quantity: "1" } ], substitute: "Mandorle 20g" }, pranzo: { items: [ { name: "Pasta al Pesto", quantity: "80g pasta" }, { name: "Fagiolini", quantity: "100g" }, { name: "Parmigiano", quantity: "10g" }, { name: "Olio EVO", quantity: "1 cucchiaino (nel pesto)"} ], substitute: "Riso Venere 80g + Gamberetti 120g + Zucchine" }, spuntinoPomeriggio: { items: [ { name: "Kiwi", quantity: "2" } ], substitute: "Yogurt magro 125g" }, cena: { items: [ { name: "Pizza Margherita", quantity: "1 (moderata)" }, { name: "Insalata", quantity: "contorno" } ], substitute: "Salmone 150g + Patate al forno 150g + Verdure grigliate" } },
             "Sabato": { colazione: { items: [ { name: "Pane Integrale Tostato", quantity: "60g" }, { name: "Avocado", quantity: "1/2" }, { name: "Uovo in camicia", quantity: "1"} ], substitute: "Yogurt greco 150g + Granola 40g + Frutta" }, spuntinoMattina: { items: [ { name: "Frutta Secca Mista", quantity: "30g" } ], substitute: "Frullato (frutta 150g + latte 150ml)" }, pranzo: { items: [ { name: "Insalata di Farro", quantity: "80g farro" }, { name: "Pomodorini", quantity: "150g" }, { name: "Mozzarella Light", quantity: "80g" }, { name: "Basilico", quantity: "q.b." }, { name: "Olio EVO", quantity: "1 cucchiaio"} ], substitute: "Orzo 80g + Legumi misti 150g cotti + Verdure" }, spuntinoPomeriggio: { items: [ { name: "Pesca", quantity: "1" }, { name: "Mandorle", quantity: "10g"} ], substitute: "Cioccolato fondente (>75%) 15g" }, cena: { items: [ { name: "Hamburger di Manzo Magro", quantity: "150g" }, { name: "Pane per Hamburger", quantity: "1" }, { name: "Lattuga/Pomodoro", quantity: "q.b." }, { name: "Patatine Fritte (al forno)", quantity: "100g"} ], substitute: "Spiedini di carne mista 150g + Verdure grigliate + Pane 40g" } },
             "Domenica": { colazione: { items: [ { name: "Pancakes Integrali", quantity: "2-3 medi" }, { name: "Sciroppo d'acero/Miele", quantity: "q.b." }, { name: "Frutta fresca", quantity: "100g"} ], substitute: "Brioche integrale + Cappuccino" }, spuntinoMattina: { items: [ { name: "Spremuta d'Arancia", quantity: "200ml" } ], substitute: "Nessuno (se colazione abbondante)" }, pranzo: { items: [ { name: "Lasagna (porzione moderata) o Pasta al Forno", quantity: "1 porzione" }, { name: "Insalata Verde", quantity: "contorno" } ], substitute: "Arrosto di vitello 150g + Patate al forno 200g" }, spuntinoPomeriggio: { items: [ { name: "Macedonia di Frutta", quantity: "150g" } ], substitute: "Gelato artigianale (1 coppetta piccola)" }, cena: { items: [ { name: "Zuppa di Verdure", quantity: "abbondante" }, { name: "Formaggio Magro", quantity: "50g" }, { name: "Pane Integrale", quantity: "30g"} ], substitute: "Minestrone + Uovo sodo" } }
        },

        // Supplements List (from V8.1)
        SUPPLEMENTS: [
             { id: "diosmina", name: "Diosmina + Esperidina", dosage: "Es: 1 cpr mattina, 1 cpr sera", link: "https://..." },
             { id: "centella", name: "Centella Asiatica", dosage: "Es: 1 capsula al giorno", link: "https://..." },
             { id: "ippocastano", name: "Ippocastano", dosage: "Es: 1 capsula al mattino", link: "https://..." },
             { id: "viteRossa", name: "Vite Rossa", dosage: "Es: 1 misurino in acqua", link: "https://..." },
             { id: "magnesio", name: "Magnesio", dosage: "Es: 1 bustina la sera", link: "https://..." },
             { id: "mirtillo", name: "Mirtillo", dosage: "Es: 1 opercolo al giorno", link: "https://..." }
             // Add more supplements here as needed
        ],

    };

// Pass the global app object (or create it if it doesn't exist)
}(window.app = window.app || {}));