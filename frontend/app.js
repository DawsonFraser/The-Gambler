document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        token: null,
        user: null,
        socket: null,
    };

    // --- DOM ELEMENTS ---
    const DOM = {
        authView: document.getElementById('auth-view'),
        appView: document.getElementById('app-view'),
        mainContent: document.getElementById('main-content'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        welcomeUsername: document.getElementById('welcome-username'),
        userTierIcon: document.getElementById('user-tier-icon'),
        userTierName: document.getElementById('user-tier-name'),
        userBalance: document.getElementById('user-balance'),
        dashboardNav: document.getElementById('dashboard-nav'),
        myBetsNav: document.getElementById('my-bets-nav'),
        rewardsNav: document.getElementById('rewards-nav'),
        leaderboardNav: document.getElementById('leaderboard-nav'),
        logoutButton: document.getElementById('logout-button'),
    };

    const API_URL = 'https://the-gambler-v2.onrender.com';

    // --- API SERVICE ---
    const apiService = {
        async request(endpoint, options = {}) {
            const url = `${API_URL}/api${endpoint}`;
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`;
            }
            const config = { ...options, headers };

            try {
                const response = await fetch(url, config);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'An unknown error occurred');
                }
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json();
                } else {
                    return response.text();
                }
            } catch (error) {
                alert(`API Error: ${error.message}`);
                throw error;
            }
        },
        login: (username, password) => apiService.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
        register: (username, password) => apiService.request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
        getWeeklyGames: () => apiService.request('/games/weekly'),
        getFriends: () => apiService.request('/friends'),
        getPendingChallenges: () => apiService.request('/p2p/challenges'),
        getLeaderboard: () => apiService.request('/leaderboard'),
        acceptChallenge: (betId) => apiService.request(`/p2p/accept/${betId}`, { method: 'PUT' }),
        acceptFriend: (friendshipId) => apiService.request(`/friends/accept/${friendshipId}`, { method: 'PUT' }),
    };

    // --- RENDER FUNCTIONS ---
    const renderHeader = () => {
        if (!state.user) return;
        DOM.welcomeUsername.textContent = state.user.username;
        DOM.userTierName.textContent = `Tier ${state.user.tier}`;
        DOM.userBalance.textContent = Number(state.user.balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    const renderDashboard = () => {
        DOM.mainContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-column">
                    <h3>Incoming P2P Challenges</h3>
                    <div id="incoming-challenges-list" class="list-container"></div>
                </div>
                <div class="dashboard-column">
                    <h3>Friends</h3>
                    <div id="friends-list" class="list-container"></div>
                    <h3>Pending Friend Requests</h3>
                    <div id="pending-friends-list" class="list-container"></div>
                </div>
            </div>`;
        fetchAndRenderDashboardData();
    };

    const fetchAndRenderDashboardData = async () => {
        try {
            const [challenges, friendsData] = await Promise.all([
                apiService.getPendingChallenges(),
                apiService.getFriends()
            ]);

            const challengesList = document.getElementById('incoming-challenges-list');
            if (challenges.length > 0) {
                challengesList.innerHTML = challenges.map(c => `
                    <div class="list-item">
                        <span>Bet: "${c.description}" (${c.wager}) from <strong>${c.challenger_name}</strong></span>
                        <button class="btn-accept" data-bet-id="${c.bet_id}">Accept</button>
                    </div>`).join('');
            } else {
                challengesList.innerHTML = '<p>No incoming challenges.</p>';
            }

            const friendsList = document.getElementById('friends-list');
            if (friendsData.friends.length > 0) {
                friendsList.innerHTML = friendsData.friends.map(f => `<div class="list-item"><span>${f.username}</span></div>`).join('');
            } else {
                friendsList.innerHTML = '<p>You have no friends yet.</p>';
            }

            const pendingList = document.getElementById('pending-friends-list');
            if (friendsData.pending_received.length > 0) {
                pendingList.innerHTML = friendsData.pending_received.map(p => `
                    <div class="list-item">
                        <span>Request from <strong>${p.username}</strong></span>
                        <button class="btn-accept-friend" data-friendship-id="${p.friendship_id}">Accept</button>
                    </div>`).join('');
            } else {
                pendingList.innerHTML = '<p>No new friend requests.</p>';
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            DOM.mainContent.innerHTML = '<p>Could not load dashboard data.</p>';
        }
    };

    const renderGameCenter = async () => {
        try {
            const games = await apiService.getWeeklyGames();
            const gamesHtml = games.map(game => {
                const gameDate = new Date(game.game_time);
                const formattedDate = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const formattedTime = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                return `
                    <div class="game-card">
                        <div class="game-info"><span>${formattedDate} - ${formattedTime}</span></div>
                        <div class="matchup">
                            <div class="team">
                                <span class="team-name">${game.away_team_name}</span>
                                <span class="team-line">${game.away_team_line > 0 ? '+' : ''}${game.away_team_line}</span>
                            </div>
                            <span class="at-symbol">@</span>
                            <div class="team">
                                <span class="team-name">${game.home_team_name}</span>
                                <span class="team-line">${game.home_team_line > 0 ? '+' : ''}${game.home_team_line}</span>
                            </div>
                        </div>
                        <div class="pick-buttons">
                            <button class="btn-pick" data-game-id="${game.game_id}" data-team-abbr="${game.away_team_abbr}">Pick ${game.away_team_abbr}</button>
                            <button class="btn-pick" data-game-id="${game.game_id}" data-team-abbr="${game.home_team_abbr}">Pick ${game.home_team_abbr}</button>
                        </div>
                    </div>`;
            }).join('');
            DOM.mainContent.innerHTML = `
                <div class="game-center-container">
                    <h2>Weekly Games</h2>
                    <div class="games-list">${games.length > 0 ? gamesHtml : '<p>No games scheduled yet.</p>'}</div>
                </div>`;
        } catch (error) {
            console.error('Failed to render game center:', error);
        }
    };
    
    const renderLeaderboard = async () => {
        try {
            const leaderboard = await apiService.getLeaderboard();
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
        } catch (error) {
            console.error('Failed to render leaderboard:', error);
        }
    };

    // --- EVENT HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        const username = e.target.elements['login-username'].value;
        const password = e.target.elements['login-password'].value;
        try {
            const data = await apiService.login(username, password);
            state.token = data.accessToken;
            localStorage.setItem('token', state.token);
            const userPayload = JSON.parse(atob(state.token.split('.')[1])).user;
            showAppView(userPayload);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = e.target.elements['register-username'].value;
        const password = e.target.elements['register-password'].value;
        try {
            const data = await apiService.register(username, password);
            alert(data.message);
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
        } catch (error) {
            console.error('Registration failed:', error);
        }
    };

    const handleLogout = () => {
        if (state.socket) {
            state.socket.disconnect();
        }
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        showAuthView();
    };

    // --- VIEW MANAGEMENT & SOCKETS ---
    const showAuthView = () => {
        DOM.authView.classList.remove('hidden');
        DOM.appView.classList.add('hidden');
    };

    const showAppView = (user) => {
        state.user = user;
        DOM.authView.classList.add('hidden');
        DOM.appView.classList.remove('hidden');
        renderHeader();
        renderDashboard();
        
        state.socket = io(API_URL);
        
        state.socket.on('connect', () => {
            console.log('Connected to real-time server!');
            state.socket.emit('join_room', state.user.id);
        });

        state.socket.on('new_challenge', (notification) => {
            alert(`New P2P Challenge from ${notification.challenger_name}!`);
            if (document.querySelector('.dashboard-container')) {
                fetchAndRenderDashboardData();
            }
        });

        state.socket.on('challenge_accepted', (notification) => {
            alert(`${notification.opponent_name} accepted your challenge!`);
        });
    };

    // --- INITIALIZATION ---
    const init = () => {
        DOM.loginForm.addEventListener('submit', handleLogin);
        DOM.registerForm.addEventListener('submit', handleRegister);
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            DOM.loginForm.classList.add('hidden');
            DOM.registerForm.classList.remove('hidden');
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            DOM.registerForm.classList.add('hidden');
            DOM.loginForm.classList.remove('hidden');
        });

        DOM.dashboardNav.addEventListener('click', renderDashboard);
        DOM.myBetsNav.addEventListener('click', renderGameCenter);
        DOM.leaderboardNav.addEventListener('click', renderLeaderboard);
        DOM.logoutButton.addEventListener('click', handleLogout);

        DOM.mainContent.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-accept')) {
                const betId = e.target.dataset.betId;
                try {
                    await apiService.acceptChallenge(betId);
                    alert('Challenge accepted!');
                    renderDashboard();
                } catch (error) {
                    console.error('Failed to accept challenge:', error);
                }
            }
            if (e.target.classList.contains('btn-accept-friend')) {
                const friendshipId = e.target.dataset.friendshipId;
                try {
                    await apiService.acceptFriend(friendshipId);
                    alert('Friend request accepted!');
                    renderDashboard();
                } catch (error) {
                    console.error('Failed to accept friend request:', error);
                }
            }
        });

        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                state.token = storedToken;
                const userPayload = JSON.parse(atob(state.token.split('.')[1])).user;
                showAppView(userPayload);
            } catch (e) {
                localStorage.removeItem('token');
                showAuthView();
            }
        } else {
            showAuthView();
        }
    };

    init();
});
