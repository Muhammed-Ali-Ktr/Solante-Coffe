// API Base URL
const API_BASE = '/api/admin';

// Token kontrolü - sessionStorage'da token varsa dashboard'a yönlendir
const checkAuth = () => {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        window.location.href = '/yonetim/dashboard';
    }
};

let failCount = 0;

const videoPlayer = document.getElementById("videoPlayer");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const successMessage = document.getElementById("successMessage");
const loginBtn = document.getElementById("loginBtn");

// Helper to load and play video safely
const updateVideo = (videoFile) => {
    if (!videoPlayer) return;
    const source = videoPlayer.querySelector('source');
    if (source) {
        source.src = `/videos/${videoFile}`;
        videoPlayer.load();
        videoPlayer.play().catch(err => console.warn('Video play prevented:', err));
    }
};

// Giriş formu
const handleLogin = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const username = formData.get('username').trim();
    const password = formData.get('password').trim();
    
    if (!username || !password) {
        showError('Lütfen kullanıcı adı ve şifrenizi girin.');
        return;
    }
    
    // UI'ı temizle
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Kullanıcı adı veya şifre hatalı!');
        }
        
        // BAŞARILI
        updateVideo("correct.mp4");
        successMessage.classList.add('show');
        failCount = 0;
        
        // Token'ı sessionStorage'a kaydet (tarayıcı kapanınca silinir)
        sessionStorage.setItem('adminToken', data.token);
        sessionStorage.setItem('adminUsername', data.username);
        
        // Dashboard'a yönlendir (video izlensin diye 1.5 sn gecikmeli)
        setTimeout(() => {
            window.location.href = '/yonetim/dashboard';
        }, 1500);
        
    } catch (error) {
        // BAŞARISIZ
        failCount++;
        if (failCount === 1) {
            updateVideo("wrong.mp4");
        } else {
            updateVideo("againwrong.mp4");
        }
        
        showError(error.message);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
    }
};

const showError = (message) => {
    if (errorText && errorMessage) {
        errorText.textContent = message;
        errorMessage.classList.add('show');
    }
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});
