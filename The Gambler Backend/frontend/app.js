document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_URL = 'https://the-gambler-v2.onrender.com';
    
    // ✅ YOUR NEW KEYS ARE INJECTED HERE:
    const SUPABASE_URL = 'https://loukmsueuremmjjlrcgx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdWttc3VldXJlbW1qamxyY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjg5NTUsImV4cCI6MjA4NDUwNDk1NX0.NCmJfiubbEANNEr7UYhCtYEL2tu3FHnyAOD3CtkPPUo';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let state = { user: null, token: null };

    // --- DOM ELEMENTS ---
    const DOM = {
        authView: document.getElementById('auth-view'),
        appView: document.getElementById('app-view'),
        mainContent: document.getElementById('main-content'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        welcomeUsername: document.getElementById('welcome-username'),
        logoutButton: document.getElementById('logout-button'),
        showRegisterLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        // Navigation
        dashboardNav: document.getElementById('dashboard-nav'),
        myBetsNav: document.getElementById('my-bets-nav'),
        leaderboardNav: document.getElementById('leaderboard-nav'),
    };

    // --- API SERVICE ---
    const apiService = {
        async request(endpoint, options = {}) {
            const url = `${API_URL}/api${endpoint}`;
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
            
            try {
                const response = await fetch(url, { ...options, headers });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error occurred');
                }
                return response.json();
            } catch (error) {
                console.error("API Error:", error);
                throw error;
            }
        },
        // Auth
        login: (username, password) => apiService.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
        register: (username, password) => apiService.request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
        // Data
        getWeeklyGames: () => apiService.request('/games/weekly'),
        getLeaderboard: () => apiService.request('/leaderboard'),
        // Social
        getFriends: () => apiService.request('/friends'),
        addFriend: (username) => apiService.request('/friends/add', { method: 'POST', body: JSON.stringify({ username }) }),
        acceptFriend: (friendshipId) => apiService.request(`/friends/accept/${friendshipId}`, { method: 'PUT' }),
    };

    // --- RENDERERS ---
    const renderDashboard = async () => {
        // Bankroll Widget
        const bankrollHTML = `
            <div class="card dashboard-card">
                <h3>Bankroll Builder</h3>
                <div class="bankroll-meter">
                    <label>Weekly Limit: $0 (Unlimited)</label>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 0%"></div></div>
                    <button class="btn-secondary small-btn">Set Limit</button>
                </div>
            </div>
        `;

        // Social Widget
        let friendsHTML = `<div class="card dashboard-card"><h3>Friends Center</h3><p>Loading...</p></div>`;
        try {
            const friendsData = await apiService.getFriends();
            const requestList = friendsData.pending_received.length > 0 
                ? friendsData.pending_received.map(f => `
                    <div class="friend-row">
                        <span>Has invited you: <strong>${f.username}</strong></span>
                        <button class="btn-accept" data-id="${f.friendship_id}">Accept</button>
                    </div>`).join('')
                : '<p class="faint-text">No pending requests.</p>';

            friendsHTML = `
                <div class="card dashboard-card">
                    <h3>Friends Center</h3>
                    <div class="friend-input-group">
                        <input type="text" id="friend-search-input" placeholder="Find user...">
                        <button id="btn-add-friend" class="btn">Add</button>
                    </div>
                    <h4>Requests</h4>
                    ${requestList}
                </div>
            `;
        } catch (e) { console.log("Friend fetch failed (Backend might be asleep):", e); }

        DOM.mainContent.innerHTML = `<h2>Dashboard</h2><div class="dashboard-grid">${bankrollHTML}${friendsHTML}</div>`;
        
        // Re-attach listeners
        const addBtn = document.getElementById('btn-add-friend');
        if(addBtn) addBtn.addEventListener('click', async () => {
            const username = document.getElementById('friend-search-input').value;
            if(username) { await apiService.addFriend(username); renderDashboard(); }
        });
        document.querySelectorAll('.btn-accept').forEach(btn => 
            btn.addEventListener('click', async (e) => {
                await apiService.acceptFriend(e.target.dataset.id); renderDashboard();
            })
        );
    };

    const renderGameCenter = async () => {
        DOM.mainContent.innerHTML = "<h2>Weekly Games</h2><p>Loading odds...</p>";
        try {
            const games = await apiService.getWeeklyGames();
            const gamesHtml = games.map(game => `
                <div class="game-card">
                    <div class="matchup">${game.away_team_name} @ ${game.home_team_name}</div>
                    <button class="btn-pick">Make Pick</button>
                </div>`).join('');
            DOM.mainContent.innerHTML = `<h2>Weekly Games</h2>${games.length ? gamesHtml : '<p>No games available.</p>'}`;
        } catch (e) { DOM.mainContent.innerHTML = `<p>Error loading games. Backend may be waking up.</p>`; }
    };

    // --- HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        const email = DOM.loginForm.querySelector('#login-email').value;
        const password = DOM.loginForm.querySelector('#login-password').value;
        
        console.log("Attempting login to:", SUPABASE_URL); // Debug log
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Login Error:", error);
            alert("Login Failed: " + error.message);
            return;
        }
        state.token = data.session.access_token;
        showAppView(data.user);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = DOM.registerForm.querySelector('#register-username').value;
        const email = DOM.registerForm.querySelector('#register-email').value;
        const password = DOM.registerForm.querySelector('#register-password').value;
        
        const { data, error } = await supabaseClient.auth.signUp({ 
            email, 
            password, 
            options: { data: { username } } 
        });
        
        if (error) {
            alert("Registration Failed: " + error.message);
            return;
        }
        alert('Registered! Check your email or log in.');
        toggleAuthMode();
    };

    const toggleAuthMode = () => {
        DOM.loginForm.classList.toggle('hidden');
        DOM.registerForm.classList.toggle('hidden');
    };

    const showAppView = (user) => {
        state.user = user;
        DOM.authView.classList.add('hidden');
        DOM.appView.classList.remove('hidden');
        DOM.welcomeUsername.textContent = user.user_metadata.username || user.email;
        renderDashboard();
    };

    // --- INIT ---
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.registerForm.addEventListener('submit', handleRegister);
    DOM.logoutButton.addEventListener('click', () => {
        supabaseClient.auth.signOut();
        location.reload();
    });
    DOM.showRegisterLink.addEventListener('click', toggleAuthMode);
    DOM.showLoginLink.addEventListener('click', toggleAuthMode);
    DOM.dashboardNav.addEventListener('click', renderDashboard);
    DOM.myBetsNav.addEventListener('click', renderGameCenter);

    // Auto-Login Check
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data.session) {
            state.token = data.session.access_token;
            showAppView(data.session.user);
        }
    });
});