document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://vrxhzvrsngugxfwrwftg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeGh6dnJzbmd1Z3hmd3J3ZnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjQ3MjQsImV4cCI6MjA3MTkwMDcyNH0.9tbvcp4A62HJvJ_QcCgv-XL7MAQDuRLNK2HaP2-79mg';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const state = { user: null };

    const DOM = {
        authView: document.getElementById('auth-view'),
        appView: document.getElementById('app-view'),
        mainContent: document.getElementById('main-content'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegisterLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        welcomeUsername: document.getElementById('welcome-username'),
        userBalance: document.getElementById('user-balance'),
        dashboardNav: document.getElementById('dashboard-nav'),
        gamesNav: document.getElementById('games-nav'),
        leaderboardNav: document.getElementById('leaderboard-nav'),
        rewardsNav: document.getElementById('rewards-nav'),
        logoutButton: document.getElementById('logout-button'),
    };

    const renderHeader = async () => {
        if (!state.user) return;
        DOM.welcomeUsername.textContent = state.user.user_metadata.username || state.user.email;
        
        // Fetch the user's full profile to get balance and tier
        const { data, error } = await supabaseClient.from('users').select('balance, tier').eq('user_id', state.user.id).single();
        if(data) {
            DOM.userBalance.textContent = Number(data.balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        }
    };

    const renderDashboard = () => {
        DOM.mainContent.innerHTML = `<h2>Dashboard</h2><p>Welcome, ${state.user.user_metadata.username || state.user.email}.</p>`;
    };

    const renderGameCenter = async () => {
        const { data: games, error } = await supabaseClient.from('games').select(`
            *,
            home_team:home_team_id (team_name, abbreviation),
            away_team:away_team_id (team_name, abbreviation)
        `).eq('status', 'scheduled');

        if (error) {
            console.error('Error fetching games:', error);
            DOM.mainContent.innerHTML = `<p>Could not load games.</p>`;
            return;
        }

        const gamesHtml = games.map(game => {
            const gameDate = new Date(game.game_time);
            const formattedDate = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const formattedTime = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return `
                <div class="game-card">
                    <div class="game-info"><span>${formattedDate} - ${formattedTime}</span></div>
                    <div class="matchup">
                        <div class="team">
                            <span class="team-name">${game.away_team.team_name}</span>
                            <span class="team-line">${game.away_team_line > 0 ? '+' : ''}${game.away_team_line}</span>
                        </div>
                        <span class="at-symbol">@</span>
                        <div class="team">
                            <span class="team-name">${game.home_team.team_name}</span>
                            <span class="team-line">${game.home_team_line > 0 ? '+' : ''}${game.home_team_line}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        DOM.mainContent.innerHTML = `<div class="game-center-container"><h2>Weekly Games</h2>${games.length > 0 ? gamesHtml : '<p>No games scheduled yet.</p>'}</div>`;
    };

    const renderLeaderboard = async () => {
        const { data: leaderboard, error } = await supabaseClient.from('users').select('username, xp').order('xp', { ascending: false }).limit(10);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            DOM.mainContent.innerHTML = `<p>Could not load leaderboard.</p>`;
            return;
        }

        const leaderboardHtml = leaderboard.map((user, index) => `
            <div class="leaderboard-row">
                <span class="rank">${index + 1}</span>
                <span class="username">${user.username}</span>
                <span class="xp">${user.xp.toLocaleString()} XP</span>
            </div>`).join('');
        DOM.mainContent.innerHTML = `
            <div class="leaderboard-container">
                <h2>Leaderboard</h2>
                <div class="leaderboard-header"><span>Rank</span><span>Player</span><span>XP</span></div>
                <div class="leaderboard-list">${leaderboardHtml}</div>
            </div>`;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = DOM.loginForm.querySelector('#login-email').value;
        const password = DOM.loginForm.querySelector('#login-password').value;
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return alert(`Login Error: ${error.message}`);
        showAppView(data.user);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = DOM.registerForm.querySelector('#register-username').value;
        const email = DOM.registerForm.querySelector('#register-email').value;
        const password = DOM.registerForm.querySelector('#register-password').value;
        const { data, error } = await supabaseClient.auth.signUp({
            email, password,
            options: { data: { username: username } }
        });
        if (error) return alert(`Registration Error: ${error.message}`);
        alert('Registration successful!');
        DOM.registerForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
    };

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        showAuthView();
    };

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

    const init = async () => {
        DOM.loginForm.addEventListener('submit', handleLogin);
        DOM.registerForm.addEventListener('submit', handleRegister);
        DOM.logoutButton.addEventListener('click', handleLogout);
        DOM.dashboardNav.addEventListener('click', renderDashboard);
        DOM.gamesNav.addEventListener('click', renderGameCenter);
        DOM.leaderboardNav.addEventListener('click', renderLeaderboard);

        DOM.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.loginForm.classList.add('hidden');
            DOM.registerForm.classList.remove('hidden');
        });
        DOM.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.registerForm.classList.add('hidden');
            DOM.loginForm.classList.remove('hidden');
        });
        
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
            showAppView(data.session.user);
        } else {
            showAuthView();
        }
    };

    init();
});