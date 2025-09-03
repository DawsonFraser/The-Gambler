document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://vrxhzvrsngugxfwrwftg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeGh6dnJzcmd1Z3hmd3J3ZnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjQ3MjQsImV4cCI6MjA3MTkwMDcyNH0.9tbvcp4A62HJvJ_QcCgv-XL7MAQDuRLNK2HaP2-79mg';
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
        myBetsNav: document.getElementById('my-bets-nav'),
        leaderboardNav: document.getElementById('leaderboard-nav'),
        logoutButton: document.getElementById('logout-button'),
    };

    const renderHeader = () => {
        if (!state.user) return;
        DOM.welcomeUsername.textContent = state.user.user_metadata.username || state.user.email;
    };

    const renderDashboard = () => {
        DOM.mainContent.innerHTML = `<h2>Dashboard</h2><p>Welcome, ${state.user.user_metadata.username || state.user.email}.</p>`;
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
        
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
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