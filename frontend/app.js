document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://gausmmcqmpfignfivymi.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdXNtbWNxbXBmaWduZml2eW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTYwNzcsImV4cCI6MjA3MTYzMjA3N30.1_KPWn-hps2BV98-0rbN5pPFl8xBrGndfrB_chIZnSg';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- STATE MANAGEMENT ---
    const state = {
        user: null,
    };

    // --- DOM ELEMENTS ---
    const DOM = {
        authView: document.getElementById('auth-view'),
        appView: document.getElementById('app-view'),
        mainContent: document.getElementById('main-content'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        welcomeUsername: document.getElementById('welcome-username'),
        userBalance: document.getElementById('user-balance'),
        dashboardNav: document.getElementById('dashboard-nav'),
        myBetsNav: document.getElementById('my-bets-nav'),
        leaderboardNav: document.getElementById('leaderboard-nav'),
        logoutButton: document.getElementById('logout-button'),
    };

    // --- RENDER FUNCTIONS ---
    const renderHeader = () => {
        if (!state.user) return;
        DOM.welcomeUsername.textContent = state.user.email;
    };

    const renderDashboard = () => {
        DOM.mainContent.innerHTML = `<div class="dashboard-container"><h2>Dashboard</h2><p>Welcome to your dashboard.</p></div>`;
    };

    const renderGameCenter = async () => {
        const { data: games, error } = await supabaseClient.from('games').select(`
            *,
            home_team:home_team_id (team_name, abbreviation),
            away_team:away_team_id (team_name, abbreviation)
        `).eq('status', 'scheduled');

        if (error) {
            console.error('Error fetching games:', error);
            return;
        }

        const gamesHtml = games.map(game => `
            <div class="game-card">
                <div class="matchup">
                    <div class="team">${game.away_team.team_name}</div>
                    <span class="at-symbol">@</span>
                    <div class="team">${game.home_team.team_name}</div>
                </div>
            </div>
        `).join('');

        DOM.mainContent.innerHTML = `<div class="game-center-container"><h2>Weekly Games</h2>${gamesHtml}</div>`;
    };
    
    // --- EVENT HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target.elements['login-username'].value;
        const password = e.target.elements['login-password'].value;
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`Login Error: ${error.message}`);
        } else {
            showAppView(data.user);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const email = e.target.elements['register-username'].value;
        const password = e.target.elements['register-password'].value;
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert(`Registration Error: ${error.message}`);
        } else {
            alert('Registration successful! Please check your email to confirm.');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
        }
    };

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        showAuthView();
    };

    // --- VIEW MANAGEMENT ---
    const showAuthView = () => {
        state.user = null;
        DOM.authView.classList.remove('hidden');
        DOM.appView.classList.add('hidden');
    };

    const showAppView = (user) => {
        state.user = user;
        DOM.authView.classList.add('hidden');
        DOM.appView.classList.remove('hidden');
        renderHeader();
        renderDashboard();
    };

    // --- INITIALIZATION ---
    const init = async () => {
        DOM.loginForm.addEventListener('submit', handleLogin);
        DOM.registerForm.addEventListener('submit', handleRegister);
        DOM.logoutButton.addEventListener('click', handleLogout);

        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            DOM.loginForm.classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            DOM.loginForm.classList.remove('hidden');
        });

        DOM.dashboardNav.addEventListener('click', renderDashboard);
        DOM.myBetsNav.addEventListener('click', renderGameCenter);
        
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
            showAppView(data.session.user);
        } else {
            showAuthView();
        }
    };

    init();
});