/**
 * ServerCraft Windows Edition - React Application
 * Version: 2026.1.6.44D
 * Copyright 2026 TierOne Development
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ClustersView from './ClustersView';
import FeedbackView from './FeedbackView';
import CustomDomainCard from './components/CustomDomainCard';
import ServerSalesCard from './components/ServerSalesCard';

// API Base URL from environment
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Game default ports with port ranges for auto-allocation
const GAME_DEFAULTS = {
    arma3: { port: 2302, queryPort: 2303, requiresOwnership: true, portRange: { start: 2302, end: 2401 } },
    dayz_vanilla: { port: 2402, queryPort: 30116, requiresOwnership: false, portRange: { start: 2402, end: 2501 } },
    dayz_modded: { port: 2502, queryPort: 30216, requiresOwnership: false, portRange: { start: 2502, end: 2601 } },
    rust: { port: 28015, queryPort: 28016, requiresOwnership: false, portRange: { start: 28015, end: 28114 } },
    arma_reforger: { port: 2001, queryPort: 17777, requiresOwnership: true, portRange: { start: 2001, end: 2100 } },
    project_zomboid: { port: 16261, queryPort: 16262, requiresOwnership: false, portRange: { start: 16261, end: 16360 } },
    valheim: { port: 2456, queryPort: 2457, requiresOwnership: false, portRange: { start: 2456, end: 2555 } },
    squad: { port: 7787, queryPort: 27165, requiresOwnership: false, portRange: { start: 7787, end: 7886 } },
    ground_branch: { port: 7777, queryPort: 7777, requiresOwnership: false, portRange: { start: 7777, end: 7876 } },
    icarus: { port: 17777, queryPort: 17777, requiresOwnership: false, portRange: { start: 17777, end: 17876 } },
    no_one_survived: { port: 7900, queryPort: 7900, requiresOwnership: false, portRange: { start: 7900, end: 7999 } },
    fivem: { port: 30120, queryPort: 30120, requiresOwnership: false, portRange: { start: 30120, end: 30219 } },
    source_engine: { port: 27015, queryPort: 27015, requiresOwnership: false, portRange: { start: 27015, end: 27114 } },
    minecraft: { port: 25565, queryPort: 25565, requiresOwnership: false, portRange: { start: 25565, end: 25664 } }
};

// Resource-conservative polling intervals (in ms) - v1.6.2026.0C optimized
const POLL_INTERVALS = {
    STATS_IDLE: 10000,     // 10 seconds when no servers running (was 5s)
    STATS_ACTIVE: 3000,    // 3 seconds when servers are running (was 2s)
    SERVERS_IDLE: 30000,   // 30 seconds when idle (was 15s)
    SERVERS_ACTIVE: 5000,  // 5 seconds when active
    WORKSHOP_BROWSE: 60000 // 60 seconds for workshop data refresh
};

// Security Questions List
const SECURITY_QUESTIONS = [
    "What is your pet's name?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite movie?"
];

// ==================== AUTH COMPONENTS ====================

// Login Screen Component
function LoginScreen({ onLogin, showPasswordReset, setShowPasswordReset }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 2FA State
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    
    // Password Reset State
    const [resetStep, setResetStep] = useState(1);
    const [securityQuestions, setSecurityQuestions] = useState([]);
    const [securityAnswers, setSecurityAnswers] = useState(['', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Load saved remember me preference
    const savedRemember = localStorage.getItem('servercraft_remember_me') === 'true';
    
    // Set initial remember me state from localStorage
    useEffect(() => {
        if (savedRemember && !rememberMe) {
            setRememberMe(true);
        }
    }, [savedRemember, rememberMe]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        const result = await onLogin(username, password, rememberMe);
        
        setLoading(false);
        if (!result.success) {
            setError(result.error);
        } else if (result.requires_2fa) {
            // Show 2FA input screen
            setRequires2FA(true);
            setTempToken(result.temp_token);
        }
    };
    
    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE}/api/auth/2fa/verify-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    temp_token: tempToken,
                    code: twoFACode 
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                setError(error.detail || 'Invalid 2FA code');
                setLoading(false);
                return;
            }
            
            const data = await response.json();
            
            // Store token and complete login
            localStorage.setItem('servercraft_auth_token', data.token);
            localStorage.setItem('servercraft_remember_me', rememberMe.toString());
            
            // Call parent's login completion handler
            const loginResult = { 
                success: true, 
                token: data.token,
                username: data.username,
                must_change_password: data.must_change_password,
                has_security_questions: data.has_security_questions
            };
            
            // Pass the complete data to parent
            await onLogin(null, null, null, loginResult);
            
        } catch (error) {
            setError('Connection failed');
        }
        
        setLoading(false);
    };
    
    const loadSecurityQuestions = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/security-questions`);
            const data = await response.json();
            if (data.questions && data.questions.length >= 3) {
                setSecurityQuestions(data.questions);
                setSecurityAnswers(new Array(data.questions.length).fill(''));
                return true;
            }
            setError('Security questions not set up. Contact administrator.');
            return false;
        } catch (e) {
            setError('Failed to load security questions');
            return false;
        }
    };
    
    const handleForgotPassword = async () => {
        const loaded = await loadSecurityQuestions();
        if (loaded) {
            setShowPasswordReset(true);
            setResetStep(1);
        }
    };
    
    const handleVerifyAnswers = async () => {
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-security`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: securityAnswers })
            });
            
            if (response.ok) {
                const data = await response.json();
                setResetToken(data.reset_token);
                setResetStep(2);
            } else {
                setError('Security answers incorrect. Please try again.');
            }
        } catch (e) {
            setError('Verification failed');
        }
        
        setLoading(false);
    };
    
    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset_token: resetToken, new_password: newPassword })
            });
            
            if (response.ok) {
                setShowPasswordReset(false);
                setResetStep(1);
                setError('');
                alert('Password reset successfully! Please login with your new password.');
            } else {
                const data = await response.json();
                setError(data.detail || 'Reset failed');
            }
        } catch (e) {
            setError('Reset failed');
        }
        
        setLoading(false);
    };
    
    if (showPasswordReset) {
        return (
            <div className="login-screen">
                <div className="login-container">
                    <div className="login-header">
                        <i className="fas fa-gamepad login-logo"></i>
                        <h1>ServerCraft</h1>
                        <p>Password Reset</p>
                    </div>
                    
                    {resetStep === 1 ? (
                        <div className="login-form">
                            <h3><i className="fas fa-shield-alt"></i> Security Questions</h3>
                            <p className="reset-instructions">Please answer your security questions to reset your password.</p>
                            
                            {securityQuestions.map((question, index) => (
                                <div className="form-group" key={index}>
                                    <label>{question}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={securityAnswers[index]}
                                        onChange={(e) => {
                                            const newAnswers = [...securityAnswers];
                                            newAnswers[index] = e.target.value;
                                            setSecurityAnswers(newAnswers);
                                        }}
                                        placeholder="Your answer..."
                                    />
                                </div>
                            ))}
                            
                            {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowPasswordReset(false)}
                                >
                                    <i className="fas fa-arrow-left"></i> Back to Login
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={handleVerifyAnswers}
                                    disabled={loading || securityAnswers.some(a => !a.trim())}
                                >
                                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : <><i className="fas fa-check"></i> Verify</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="login-form">
                            <h3><i className="fas fa-key"></i> Set New Password</h3>
                            
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password..."
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password..."
                                />
                            </div>
                            
                            {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                            
                            <button 
                                type="button" 
                                className="btn btn-primary login-btn"
                                onClick={handleResetPassword}
                                disabled={loading || !newPassword || !confirmPassword}
                            >
                                {loading ? <><i className="fas fa-spinner fa-spin"></i> Resetting...</> : <><i className="fas fa-save"></i> Reset Password</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Show 2FA verification screen if required
    if (requires2FA) {
        return (
            <div className="login-screen">
                <Snowflakes />
                <div className="login-container">
                    <div className="login-header">
                        <i className="fas fa-shield-alt login-logo"></i>
                        <h1>Two-Factor Authentication</h1>
                        <p>Enter your 6-digit code</p>
                    </div>
                    
                    <form className="login-form" onSubmit={handle2FASubmit}>
                        <div className="form-group">
                            <label><i className="fas fa-mobile-alt"></i> Authentication Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={twoFACode}
                                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code..."
                                maxLength={6}
                                autoFocus
                                style={{ textAlign: 'center', fontSize: '1.5em', letterSpacing: '0.5em' }}
                            />
                            <small style={{ display: 'block', marginTop: '0.5em', color: '#aaa' }}>
                                Open your authenticator app and enter the 6-digit code
                            </small>
                        </div>
                        
                        {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                        
                        <button type="submit" className="btn btn-primary login-btn" disabled={loading || twoFACode.length !== 6}>
                            {loading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : <><i className="fas fa-check-circle"></i> Verify</>}
                        </button>
                        
                        <button 
                            type="button" 
                            className="forgot-password-link" 
                            onClick={() => {
                                setRequires2FA(false);
                                setTwoFACode('');
                                setError('');
                            }}
                        >
                            <i className="fas fa-arrow-left"></i> Back to Login
                        </button>
                    </form>
                    
                    <div className="login-footer">
                        <p className="copyright">© 2026 TierOne Development</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="login-screen">
            <Snowflakes />
            <div className="login-container">
                <div className="login-header">
                    <i className="fas fa-gamepad login-logo"></i>
                    <h1>ServerCraft</h1>
                    <p>Windows Edition</p>
                </div>
                
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label><i className="fas fa-user"></i> Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username..."
                            autoFocus
                        />
                    </div>
                    
                    <div className="form-group">
                        <label><i className="fas fa-lock"></i> Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                        />
                    </div>
                    
                    <div className="form-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Remember me for 30 days</span>
                        </label>
                    </div>
                    
                    {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                    
                    <button type="submit" className="btn btn-primary login-btn" disabled={loading || !username || !password}>
                        {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
                    </button>
                    
                    <button type="button" className="forgot-password-link" onClick={handleForgotPassword}>
                        <i className="fas fa-question-circle"></i> Forgot Password?
                    </button>
                </form>
                
                <div className="login-footer">
                    <p>Default: Admin / Password123!</p>
                    <p className="copyright">© 2026 TierOne Development</p>
                </div>
            </div>
        </div>
    );
}

// Password Change Screen (First Login)
function PasswordChangeScreen({ currentUsername, isFirstTime, onPasswordChange, onUsernameChange, onLogout }) {
    const [step, setStep] = useState(1);
    const [newUsername, setNewUsername] = useState(currentUsername === 'Admin' ? '' : currentUsername);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleUsernameSubmit = async () => {
        if (newUsername.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }
        if (newUsername.toLowerCase() === 'admin') {
            setError('Please choose a different username');
            return;
        }
        
        setError('');
        setLoading(true);
        
        const result = await onUsernameChange(newUsername);
        setLoading(false);
        
        if (result.success) {
            setStep(2);
        } else {
            setError(result.error);
        }
    };
    
    const handlePasswordSubmit = async () => {
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword === 'Password123!') {
            setError('Please choose a different password');
            return;
        }
        
        setError('');
        setLoading(true);
        
        const result = await onPasswordChange(currentPassword, newPassword);
        setLoading(false);
        
        if (!result.success) {
            setError(result.error);
        }
    };
    
    return (
        <div className="login-screen">
            <Snowflakes />
            <div className="login-container password-change">
                <div className="login-header">
                    <i className="fas fa-shield-alt login-logo"></i>
                    <h1>Account Setup</h1>
                    <p>{isFirstTime ? 'Please change your default credentials' : 'Change your password'}</p>
                </div>
                
                <div className="setup-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Username</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Password</span>
                    </div>
                </div>
                
                {step === 1 ? (
                    <div className="login-form">
                        <div className="form-group">
                            <label><i className="fas fa-user"></i> New Username</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Choose a username..."
                                autoFocus
                            />
                            <small>Current: {currentUsername}</small>
                        </div>
                        
                        {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                        
                        <button 
                            type="button" 
                            className="btn btn-primary login-btn"
                            onClick={handleUsernameSubmit}
                            disabled={loading || !newUsername}
                        >
                            {loading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-arrow-right"></i> Continue</>}
                        </button>
                    </div>
                ) : (
                    <div className="login-form">
                        <div className="form-group">
                            <label><i className="fas fa-key"></i> Current Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password..."
                                autoFocus
                            />
                        </div>
                        
                        <div className="form-group">
                            <label><i className="fas fa-lock"></i> New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Choose a new password..."
                            />
                            <small>Minimum 8 characters</small>
                        </div>
                        
                        <div className="form-group">
                            <label><i className="fas fa-lock"></i> Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password..."
                            />
                        </div>
                        
                        {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                        
                        <div className="form-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                            >
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={handlePasswordSubmit}
                                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                            >
                                {loading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Complete Setup</>}
                            </button>
                        </div>
                    </div>
                )}
                
                <button className="logout-link" onClick={onLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>
    );
}

// Security Questions Setup Screen
function SecurityQuestionsSetup({ onSetup, onSkip }) {
    const [selectedQuestions, setSelectedQuestions] = useState([
        { question: SECURITY_QUESTIONS[0], answer: '' },
        { question: SECURITY_QUESTIONS[1], answer: '' },
        { question: SECURITY_QUESTIONS[2], answer: '' }
    ]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleQuestionChange = (index, newQuestion) => {
        const updated = [...selectedQuestions];
        updated[index].question = newQuestion;
        setSelectedQuestions(updated);
    };
    
    const handleAnswerChange = (index, answer) => {
        const updated = [...selectedQuestions];
        updated[index].answer = answer;
        setSelectedQuestions(updated);
    };
    
    const handleSubmit = async () => {
        // Validate
        for (let q of selectedQuestions) {
            if (!q.answer || q.answer.trim().length < 2) {
                setError('All answers must be at least 2 characters');
                return;
            }
        }
        
        // Check for duplicate questions
        const questions = selectedQuestions.map(q => q.question);
        if (new Set(questions).size !== questions.length) {
            setError('Please select different questions');
            return;
        }
        
        setError('');
        setLoading(true);
        
        const result = await onSetup(selectedQuestions);
        setLoading(false);
        
        if (!result.success) {
            setError(result.error);
        }
    };
    
    const getAvailableQuestions = (currentIndex) => {
        const selected = selectedQuestions
            .filter((_, i) => i !== currentIndex)
            .map(q => q.question);
        return SECURITY_QUESTIONS.filter(q => !selected.includes(q));
    };
    
    return (
        <div className="login-screen">
            <Snowflakes />
            <div className="login-container security-setup">
                <div className="login-header">
                    <i className="fas fa-shield-alt login-logo"></i>
                    <h1>Security Setup</h1>
                    <p>Set up security questions for password recovery</p>
                </div>
                
                <div className="login-form">
                    <div className="security-notice">
                        <i className="fas fa-info-circle"></i>
                        <p>These questions will be used to verify your identity if you forget your password.</p>
                    </div>
                    
                    {selectedQuestions.map((q, index) => (
                        <div className="security-question-group" key={index}>
                            <div className="form-group">
                                <label>Question {index + 1}</label>
                                <select
                                    className="form-select"
                                    value={q.question}
                                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                                >
                                    {getAvailableQuestions(index).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    {/* Include current selection */}
                                    {!getAvailableQuestions(index).includes(q.question) && (
                                        <option value={q.question}>{q.question}</option>
                                    )}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Answer</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={q.answer}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    placeholder="Your answer..."
                                />
                            </div>
                        </div>
                    ))}
                    
                    {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                    
                    <button 
                        type="button" 
                        className="btn btn-primary login-btn"
                        onClick={handleSubmit}
                        disabled={loading || selectedQuestions.some(q => !q.answer.trim())}
                    >
                        {loading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Security Questions</>}
                    </button>
                    
                    <button className="skip-link" onClick={onSkip}>
                        Skip for now (not recommended)
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==================== ONBOARDING WIZARD ====================
function OnboardingWizard({ systemStats, upnpStatus, onComplete, onSkip }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedGames, setSelectedGames] = useState([]);
    const [upnpChoice, setUpnpChoice] = useState(null); // null, 'enable', 'skip'
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState(null);
    
    const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
    
    const SUPPORTED_GAMES = [
        { id: 'arma3', name: 'Arma 3', icon: '🎖️', requiresSteam: true },
        { id: 'arma_reforger', name: 'Arma Reforger', icon: '🪖', requiresSteam: true },
        { id: 'dayz_vanilla', name: 'DayZ (Vanilla)', icon: '🧟', requiresSteam: false },
        { id: 'dayz_modded', name: 'DayZ (Modded)', icon: '🧟‍♂️', requiresSteam: false },
        { id: 'rust', name: 'Rust', icon: '🦀', requiresSteam: false },
        { id: 'project_zomboid', name: 'Project Zomboid', icon: '🧟', requiresSteam: false },
        { id: 'valheim', name: 'Valheim', icon: '⚔️', requiresSteam: false },
        { id: 'squad', name: 'Squad', icon: '🎯', requiresSteam: false },
        { id: 'ground_branch', name: 'Ground Branch', icon: '🔫', requiresSteam: false },
        { id: 'icarus', name: 'ICARUS', icon: '🌍', requiresSteam: false },
        { id: 'no_one_survived', name: 'No One Survived', icon: '☠️', requiresSteam: false },
        { id: 'fivem', name: 'FiveM (GTA V RP)', icon: '🚗', requiresSteam: false },
        { id: 'source_engine', name: 'Source Engine Games', icon: '🎮', requiresSteam: false },
        { id: 'minecraft', name: 'Minecraft', icon: '⛏️', requiresSteam: false }
    ];
    
    const toggleGame = (gameId) => {
        if (selectedGames.includes(gameId)) {
            setSelectedGames(selectedGames.filter(id => id !== gameId));
        } else {
            setSelectedGames([...selectedGames, gameId]);
        }
    };
    
    const generateRecommendations = () => {
        const cpuCores = systemStats?.cpu?.cores || 4;
        const totalRam = systemStats?.memory?.total_gb || 8;
        const availableRam = systemStats?.memory?.available_gb || 4;
        
        const recommendations = {
            maxServers: Math.floor(cpuCores / 2), // Conservative estimate
            ramPerServer: Math.floor(availableRam / (selectedGames.length || 1)),
            selectedGames: selectedGames.map(id => SUPPORTED_GAMES.find(g => g.id === id)?.name),
            warnings: []
        };
        
        if (totalRam < 8) {
            recommendations.warnings.push('⚠️ Low RAM detected. Consider running 1-2 servers maximum.');
        }
        if (cpuCores < 4) {
            recommendations.warnings.push('⚠️ Limited CPU cores. Performance may be impacted with multiple servers.');
        }
        if (selectedGames.length > recommendations.maxServers) {
            recommendations.warnings.push(`⚠️ You selected ${selectedGames.length} games but your system is recommended for ${recommendations.maxServers} concurrent servers.`);
        }
        
        setRecommendations(recommendations);
    };
    
    const handleNext = () => {
        if (currentStep === 2 && selectedGames.length > 0) {
            generateRecommendations();
        }
        setCurrentStep(currentStep + 1);
    };
    
    const handleComplete = async () => {
        setLoading(true);
        
        // Save onboarding preferences
        const onboardingData = {
            completed: true,
            selectedGames,
            upnpEnabled: upnpChoice === 'enable',
            completedAt: new Date().toISOString()
        };
        
        localStorage.setItem('servercraft_onboarding', JSON.stringify(onboardingData));
        
        // If user chose to enable UPnP, trigger it
        if (upnpChoice === 'enable') {
            try {
                await fetch(`${API_BASE}/api/upnp/enable`, { method: 'POST' });
            } catch (error) {
                console.error('Failed to enable UPnP:', error);
            }
        }
        
        setLoading(false);
        onComplete(onboardingData);
    };
    
    return (
        <div className="onboarding-overlay">
            <Snowflakes />
            <div className="onboarding-container">
                {/* Progress Bar */}
                <div className="onboarding-progress">
                    <div className="progress-bar">
                        {[1, 2, 3, 4].map(step => (
                            <div 
                                key={step} 
                                className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                            >
                                <div className="step-circle">{step}</div>
                                <div className="step-label">
                                    {step === 1 && 'Welcome'}
                                    {step === 2 && 'Select Games'}
                                    {step === 3 && 'Network Setup'}
                                    {step === 4 && 'Recommendations'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Step Content */}
                <div className="onboarding-content">
                    {/* Step 1: Welcome */}
                    {currentStep === 1 && (
                        <div className="onboarding-step">
                            <div className="step-header">
                                <i className="fas fa-rocket step-icon"></i>
                                <h2>Welcome to ServerCraft!</h2>
                                <p>Let's get you set up in just a few quick steps</p>
                            </div>
                            <div className="step-body">
                                <div className="feature-list">
                                    <div className="feature-item">
                                        <i className="fas fa-server"></i>
                                        <h4>Easy Server Management</h4>
                                        <p>Create and manage game servers with just a few clicks</p>
                                    </div>
                                    <div className="feature-item">
                                        <i className="fas fa-download"></i>
                                        <h4>Automatic Updates</h4>
                                        <p>Keep your servers up-to-date with SteamCMD integration</p>
                                    </div>
                                    <div className="feature-item">
                                        <i className="fas fa-network-wired"></i>
                                        <h4>Smart Port Management</h4>
                                        <p>Automatic port allocation and UPnP configuration</p>
                                    </div>
                                </div>
                            </div>
                            <div className="step-actions">
                                <button className="btn btn-primary" onClick={handleNext}>
                                    <i className="fas fa-arrow-right"></i> Get Started
                                </button>
                                <button className="btn btn-gray" onClick={onSkip}>
                                    Skip Setup
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Step 2: Select Games */}
                    {currentStep === 2 && (
                        <div className="onboarding-step">
                            <div className="step-header">
                                <i className="fas fa-gamepad step-icon"></i>
                                <h2>Which games will you host?</h2>
                                <p>Select the games you're interested in (you can add more later)</p>
                            </div>
                            <div className="step-body">
                                <div className="game-grid">
                                    {SUPPORTED_GAMES.map(game => (
                                        <div 
                                            key={game.id}
                                            className={`game-card ${selectedGames.includes(game.id) ? 'selected' : ''}`}
                                            onClick={() => toggleGame(game.id)}
                                        >
                                            <span className="game-icon">{game.icon}</span>
                                            <span className="game-name">{game.name}</span>
                                            {game.requiresSteam && <span className="steam-badge">🔑 Steam</span>}
                                            {selectedGames.includes(game.id) && <i className="fas fa-check-circle selected-icon"></i>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="step-actions">
                                <button className="btn btn-gray" onClick={() => setCurrentStep(1)}>
                                    <i className="fas fa-arrow-left"></i> Back
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleNext}
                                    disabled={selectedGames.length === 0}
                                >
                                    Continue ({selectedGames.length} selected) <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Step 3: Network Setup */}
                    {currentStep === 3 && (
                        <div className="onboarding-step">
                            <div className="step-header">
                                <i className="fas fa-network-wired step-icon"></i>
                                <h2>Network Configuration</h2>
                                <p>Configure automatic port forwarding (optional)</p>
                            </div>
                            <div className="step-body">
                                <div className="upnp-explanation">
                                    <div className="info-card">
                                        <h4><i className="fas fa-question-circle"></i> What is UPnP?</h4>
                                        <p>UPnP (Universal Plug and Play) automatically opens ports on your router so players can connect to your servers from the internet.</p>
                                    </div>
                                    
                                    <div className="upnp-status-card">
                                        <h4>Your Router Status</h4>
                                        <div className="status-row">
                                            <span>UPnP Available:</span>
                                            <span className={upnpStatus.available ? 'status-yes' : 'status-no'}>
                                                {upnpStatus.available ? '✅ Yes' : '❌ No'}
                                            </span>
                                        </div>
                                        {upnpStatus.external_ip && (
                                            <div className="status-row">
                                                <span>External IP:</span>
                                                <span>{upnpStatus.external_ip}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="choice-cards">
                                        <div 
                                            className={`choice-card ${upnpChoice === 'enable' ? 'selected' : ''} ${!upnpStatus.available ? 'disabled' : ''}`}
                                            onClick={() => upnpStatus.available && setUpnpChoice('enable')}
                                        >
                                            <i className="fas fa-check-circle choice-icon"></i>
                                            <h4>Enable UPnP</h4>
                                            <p>Recommended for most users. Automatically configures your router.</p>
                                            {!upnpStatus.available && <p className="disabled-note">Not available on your router</p>}
                                        </div>
                                        <div 
                                            className={`choice-card ${upnpChoice === 'skip' ? 'selected' : ''}`}
                                            onClick={() => setUpnpChoice('skip')}
                                        >
                                            <i className="fas fa-cog choice-icon"></i>
                                            <h4>Manual Setup</h4>
                                            <p>I'll configure port forwarding manually on my router.</p>
                                        </div>
                                    </div>
                                    
                                    {upnpChoice === 'skip' && (
                                        <div className="warning-card">
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <p><strong>Note:</strong> You'll need to manually forward ports on your router for players to connect from the internet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="step-actions">
                                <button className="btn btn-gray" onClick={() => setCurrentStep(2)}>
                                    <i className="fas fa-arrow-left"></i> Back
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleNext}
                                    disabled={upnpChoice === null}
                                >
                                    Continue <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Step 4: Recommendations */}
                    {currentStep === 4 && recommendations && (
                        <div className="onboarding-step">
                            <div className="step-header">
                                <i className="fas fa-chart-line step-icon"></i>
                                <h2>System Recommendations</h2>
                                <p>Based on your hardware and selected games</p>
                            </div>
                            <div className="step-body">
                                <div className="recommendations-grid">
                                    <div className="rec-card">
                                        <i className="fas fa-server"></i>
                                        <h4>Recommended Servers</h4>
                                        <div className="rec-value">{recommendations.maxServers}</div>
                                        <p>Concurrent servers</p>
                                    </div>
                                    <div className="rec-card">
                                        <i className="fas fa-memory"></i>
                                        <h4>RAM per Server</h4>
                                        <div className="rec-value">{recommendations.ramPerServer} GB</div>
                                        <p>Average allocation</p>
                                    </div>
                                    <div className="rec-card">
                                        <i className="fas fa-microchip"></i>
                                        <h4>System Resources</h4>
                                        <div className="rec-value">{systemStats?.cpu?.cores || 4} Cores</div>
                                        <p>{systemStats?.memory?.total_gb || 8} GB RAM Total</p>
                                    </div>
                                </div>
                                
                                {recommendations.warnings.length > 0 && (
                                    <div className="warnings-section">
                                        <h4><i className="fas fa-exclamation-triangle"></i> Important Notes</h4>
                                        {recommendations.warnings.map((warning, i) => (
                                            <div key={i} className="warning-item">{warning}</div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="selected-games-summary">
                                    <h4>Your Selected Games:</h4>
                                    <div className="games-list">
                                        {recommendations.selectedGames.map((game, i) => (
                                            <span key={i} className="game-tag">{game}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="step-actions">
                                <button className="btn btn-gray" onClick={() => setCurrentStep(3)}>
                                    <i className="fas fa-arrow-left"></i> Back
                                </button>
                                <button 
                                    className="btn btn-success" 
                                    onClick={handleComplete}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Finishing Setup...</>
                                    ) : (
                                        <><i className="fas fa-check"></i> Complete Setup</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== SNOWFLAKES COMPONENT ====================
function Snowflakes() {
    const [isWinter, setIsWinter] = useState(false);
    const [snowflakeStyles, setSnowflakeStyles] = useState([]);
    
    useEffect(() => {
        const month = new Date().getMonth();
        // December (11), January (0), February (1)
        const winterMonth = month === 11 || month === 0 || month === 1;
        setIsWinter(winterMonth);
        
        // Generate random styles only once on mount
        if (winterMonth) {
            const styles = Array.from({ length: 50 }, () => ({
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${10 + Math.random() * 20}s`,
                opacity: 0.3 + Math.random() * 0.7,
                fontSize: `${8 + Math.random() * 12}px`
            }));
            setSnowflakeStyles(styles);
        }
    }, []);
    
    if (!isWinter || snowflakeStyles.length === 0) return null;
    
    return (
        <div className="snowflakes-container">
            {snowflakeStyles.map((style, i) => (
                <div key={i} className="snowflake" style={style}>
                    ❄
                </div>
            ))}
        </div>
    );
}

// ==================== END AUTH COMPONENTS ====================

function App() {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authToken, setAuthToken] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showLoginScreen, setShowLoginScreen] = useState(true);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [needsSecurityQuestions, setNeedsSecurityQuestions] = useState(false);
    const [currentUsername, setCurrentUsername] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    
    // AFK timeout state
    const lastActivityRef = useRef(null);
    const afkTimeoutRef = useRef(null);
    const AFK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    
    // Initialize lastActivityRef on mount
    useEffect(() => {
        lastActivityRef.current = Date.now();
    }, []);
    
    // State
    const [currentView, setCurrentView] = useState('dashboard');
    const [servers, setServers] = useState([]);
    const [games, setGames] = useState({});
    const [systemStats, setSystemStats] = useState(null);
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [steamcmdStatus, setSteamcmdStatus] = useState({ installed: false });
    const [upnpStatus, setUpnpStatus] = useState({});
    const [settings, setSettings] = useState({});
    const [toasts, setToasts] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [consoleOutputs, setConsoleOutputs] = useState({});
    const [showSpecsModal, setShowSpecsModal] = useState(false);
    
    // Refs for WebSocket and intervals
    const statsWsRef = useRef(null);
    const pollIntervalRef = useRef(null);
    
    // Reset activity timer on user interaction
    const resetActivityTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);
    
    // Set up activity listeners
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetActivityTimer));
        return () => {
            events.forEach(event => window.removeEventListener(event, resetActivityTimer));
        };
    }, [resetActivityTimer]);
    
    // AFK check interval - uses inline logout to avoid declaration order issues
    useEffect(() => {
        if (!isAuthenticated) return;
        
        const checkAFK = async () => {
            const rememberMe = localStorage.getItem('servercraft_remember_me') === 'true';
            
            // Don't auto-logout if remember me is enabled
            if (rememberMe) return;
            
            const timeSinceActivity = Date.now() - lastActivityRef.current;
            if (timeSinceActivity > AFK_TIMEOUT) {
                // Auto logout due to inactivity - inline logout
                const token = localStorage.getItem('servercraft_auth_token');
                if (token) {
                    try {
                        await fetch(`${API_BASE}/api/auth/logout?token=${token}`, { method: 'POST' });
                    } catch (err) {
                        // Ignore logout errors
                    }
                }
                localStorage.removeItem('servercraft_auth_token');
                setAuthToken(null);
                setIsAuthenticated(false);
                setShowLoginScreen(true);
                setMustChangePassword(false);
                setNeedsSecurityQuestions(false);
            }
        };
        
        afkTimeoutRef.current = setInterval(checkAFK, 60000); // Check every minute
        return () => {
            if (afkTimeoutRef.current) clearInterval(afkTimeoutRef.current);
        };
    }, [isAuthenticated, AFK_TIMEOUT]);
    
    // Validate session on mount
    useEffect(() => {
        const validateStoredSession = async () => {
            const savedToken = localStorage.getItem('servercraft_auth_token');
            
            if (!savedToken) {
                setAuthLoading(false);
                setShowLoginScreen(true);
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/api/auth/validate?token=${savedToken}`, {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.valid) {
                    setAuthToken(savedToken);
                    setIsAuthenticated(true);
                    setCurrentUsername(data.username);
                    setMustChangePassword(data.must_change_password);
                    setNeedsSecurityQuestions(!data.has_security_questions);
                    setShowLoginScreen(false);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('servercraft_auth_token');
                    localStorage.removeItem('servercraft_remember_me');
                    setShowLoginScreen(true);
                }
            } catch (error) {
                console.error('Session validation error:', error);
                setShowLoginScreen(true);
            }
            
            setAuthLoading(false);
        };
        
        validateStoredSession();
    }, []);
    
    // Handle login
    const handleLogin = async (username, password, rememberMe, completedLoginData = null) => {
        try {
            // If completedLoginData is provided, we're completing a 2FA login
            if (completedLoginData) {
                setAuthToken(completedLoginData.token);
                setIsAuthenticated(true);
                setCurrentUsername(completedLoginData.username);
                setMustChangePassword(completedLoginData.must_change_password || false);
                setNeedsSecurityQuestions(!completedLoginData.has_security_questions);
                setShowLoginScreen(false);
                return { success: true };
            }
            
            // Regular login flow
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, remember_me: rememberMe })
            });
            
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.detail || 'Login failed' };
            }
            
            const data = await response.json();
            
            // Check if 2FA is required
            if (data.requires_2fa) {
                return { 
                    success: true, 
                    requires_2fa: true,
                    temp_token: data.temp_token,
                    username: data.username
                };
            }
            
            // No 2FA required - complete login
            localStorage.setItem('servercraft_auth_token', data.token);
            localStorage.setItem('servercraft_remember_me', rememberMe.toString());
            
            setAuthToken(data.token);
            setIsAuthenticated(true);
            setCurrentUsername(data.username);
            setMustChangePassword(data.must_change_password);
            setNeedsSecurityQuestions(!data.has_security_questions);
            setShowLoginScreen(false);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Connection failed' };
        }
    };
    
    // Handle logout
    const handleLogout = async (isAFK = false) => {
        const token = localStorage.getItem('servercraft_auth_token');
        
        if (token) {
            try {
                await fetch(`${API_BASE}/api/auth/logout?token=${token}`, { method: 'POST' });
            } catch (err) {
                // Ignore logout API errors - user still gets logged out locally
            }
        }
        
        localStorage.removeItem('servercraft_auth_token');
        // Keep remember_me setting for next login
        
        setAuthToken(null);
        setIsAuthenticated(false);
        setShowLoginScreen(true);
        setMustChangePassword(false);
        setNeedsSecurityQuestions(false);
        
        if (isAFK) {
            showToast('You have been logged out due to inactivity', 'warning');
        }
    };
    
    // Handle password change
    const handlePasswordChange = async (currentPassword, newPassword) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/change-password?token=${authToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });
            
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.detail || 'Password change failed' };
            }
            
            setMustChangePassword(false);
            showToast('Password changed successfully', 'success');
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Connection failed' };
        }
    };
    
    // Handle username change
    const handleUsernameChange = async (newUsername) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/change-username?token=${authToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_username: newUsername })
            });
            
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.detail || 'Username change failed' };
            }
            
            setCurrentUsername(newUsername);
            showToast('Username changed successfully', 'success');
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Connection failed' };
        }
    };
    
    // Handle security questions setup
    const handleSecurityQuestionsSetup = async (questions) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/security-questions/setup?token=${authToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions })
            });
            
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.detail || 'Setup failed' };
            }
            
            setNeedsSecurityQuestions(false);
            
            // Check if onboarding should be shown for first-time users
            const onboardingData = localStorage.getItem('servercraft_onboarding');
            if (!onboardingData) {
                setShowOnboarding(true);
            }
            
            showToast('Security questions saved', 'success');
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Connection failed' };
        }
    };
    
    // Check if onboarding should be shown (for existing users who haven't seen it)
    useEffect(() => {
        if (!isAuthenticated || needsSecurityQuestions || mustChangePassword) return;
        
        const onboardingData = localStorage.getItem('servercraft_onboarding');
        const specsAcknowledged = localStorage.getItem('servercraft_specs_acknowledged');
        
        // Show onboarding if not completed and specs modal not shown yet
        if (!onboardingData && !specsAcknowledged) {
            setShowOnboarding(true);
        } else if (!specsAcknowledged && !onboardingData) {
            // Only show specs modal if onboarding was already completed/skipped
            setShowSpecsModal(true);
        } else if (!specsAcknowledged && onboardingData) {
            // Onboarding was completed, now show specs modal
            setShowSpecsModal(true);
        }
    }, [isAuthenticated, needsSecurityQuestions, mustChangePassword]);
    
    const acknowledgeSpecs = () => {
        localStorage.setItem('servercraft_specs_acknowledged', 'true');
        setShowSpecsModal(false);
    };

    // Toast notification
    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    // Load data
    const loadGames = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/games`);
            const data = await response.json();
            setGames(data);
        } catch (error) {
            console.error('Failed to load games:', error);
        }
    }, []);

    const loadServers = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/servers`);
            const data = await response.json();
            setServers(data);
        } catch (error) {
            console.error('Failed to load servers:', error);
        }
    }, []);

    const checkSteamCMDStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/steamcmd/status`);
            const data = await response.json();
            setSteamcmdStatus(data);
        } catch (error) {
            console.error('Failed to check SteamCMD status:', error);
        }
    }, []);

    const checkUPnPStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/upnp/status`);
            const data = await response.json();
            setUpnpStatus(data);
        } catch (error) {
            console.error('Failed to check UPnP status:', error);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/settings`);
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }, []);

    // Resource-conservative stats polling - adjusts based on server activity
    const pollSystemStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/stats/system`);
            if (response.ok) {
                const data = await response.json();
                setSystemStats(data);
            }
        } catch (error) {
            // Silent fail - reduce console spam
        }
    }, []);

    // Determine if any servers are running for adaptive polling
    const hasRunningServers = servers.some(s => s.status === 'running');

    // Resource-conservative polling with adaptive intervals
    useEffect(() => {
        let wsConnected = false;
        
        // Calculate poll interval based on server activity
        const getPollInterval = () => hasRunningServers ? POLL_INTERVALS.STATS_ACTIVE : POLL_INTERVALS.STATS_IDLE;

        const connectStatsWs = () => {
            try {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = API_BASE.replace(/^https?:\/\//, '');
                statsWsRef.current = new WebSocket(`${wsProtocol}//${wsHost}/ws/stats`);

                statsWsRef.current.onopen = () => {
                    wsConnected = true;
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                };

                statsWsRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setSystemStats(data.system);
                };

                statsWsRef.current.onclose = () => {
                    wsConnected = false;
                    // Start resource-conservative polling fallback
                    if (!pollIntervalRef.current) {
                        pollSystemStats();
                        pollIntervalRef.current = setInterval(pollSystemStats, getPollInterval());
                    }
                    // Try to reconnect WebSocket after longer delay (resource conservative)
                    setTimeout(connectStatsWs, 10000);
                };

                statsWsRef.current.onerror = () => {
                    wsConnected = false;
                    statsWsRef.current.close();
                };
            } catch (error) {
                // Start polling fallback with adaptive interval
                if (!pollIntervalRef.current) {
                    pollSystemStats();
                    pollIntervalRef.current = setInterval(pollSystemStats, getPollInterval());
                }
            }
        };

        connectStatsWs();
        pollSystemStats();

        return () => {
            if (statsWsRef.current) {
                statsWsRef.current.close();
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [pollSystemStats, hasRunningServers]);

    // Initial load with resource-conservative polling
    useEffect(() => {
        loadGames();
        loadServers();
        checkSteamCMDStatus();
        checkUPnPStatus();
        loadSettings();

        // Adaptive server polling - more frequent when servers are running
        const serverPollInterval = hasRunningServers ? POLL_INTERVALS.SERVERS_ACTIVE : POLL_INTERVALS.SERVERS_IDLE;
        const interval = setInterval(loadServers, serverPollInterval);
        return () => clearInterval(interval);
    }, [loadGames, loadServers, checkSteamCMDStatus, checkUPnPStatus, loadSettings, hasRunningServers]);

    // Server actions
    const startServer = async (serverId) => {
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}/start`, {
                method: 'POST'
            });
            if (response.ok) {
                showToast('Server starting...', 'success');
                loadServers();
            } else {
                const data = await response.json();
                showToast(data.detail || 'Failed to start server', 'error');
            }
        } catch (error) {
            showToast('Failed to start server', 'error');
        }
    };

    const stopServer = async (serverId) => {
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}/stop`, {
                method: 'POST'
            });
            if (response.ok) {
                showToast('Server stopped', 'success');
                loadServers();
            } else {
                const data = await response.json();
                showToast(data.detail || 'Failed to stop server', 'error');
            }
        } catch (error) {
            showToast('Failed to stop server', 'error');
        }
    };

    const restartServer = async (serverId) => {
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}/restart`, {
                method: 'POST'
            });
            if (response.ok) {
                showToast('Server restarting...', 'success');
                loadServers();
            } else {
                showToast('Failed to restart server', 'error');
            }
        } catch (error) {
            showToast('Failed to restart server', 'error');
        }
    };

    const installServer = async (serverId) => {
        showToast('Installing server files...', 'info');
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}/install`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Server installation started', 'success');
            } else {
                showToast(data.detail || 'Installation failed', 'error');
            }
        } catch (error) {
            showToast('Failed to install server', 'error');
        }
    };

    const deleteServer = async (serverId) => {
        if (!window.confirm('Are you sure you want to delete this server?')) return;
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('Server deleted', 'success');
                closeServerTab(serverId);
                loadServers();
            } else {
                showToast('Failed to delete server', 'error');
            }
        } catch (error) {
            showToast('Failed to delete server', 'error');
        }
    };

    const createServer = async (serverData) => {
        try {
            const response = await fetch(`${API_BASE}/api/servers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverData)
            });
            if (response.ok) {
                const server = await response.json();
                showToast('Server created successfully', 'success');
                setShowCreateModal(false);
                loadServers();
                openServerTab(server.id);
            } else {
                const data = await response.json();
                showToast(data.detail || 'Failed to create server', 'error');
            }
        } catch (error) {
            showToast('Failed to create server', 'error');
        }
    };

    // Tab management
    const openServerTab = (serverId) => {
        setCurrentView('servers');
        if (!openTabs.includes(serverId)) {
            setOpenTabs(prev => [...prev, serverId]);
        }
        setActiveTab(serverId);
        loadConsoleOutput(serverId);
    };

    const closeServerTab = (serverId) => {
        setOpenTabs(prev => prev.filter(id => id !== serverId));
        if (activeTab === serverId) {
            const remaining = openTabs.filter(id => id !== serverId);
            setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
    };

    const loadConsoleOutput = async (serverId) => {
        try {
            const response = await fetch(`${API_BASE}/api/servers/${serverId}/console`);
            const data = await response.json();
            setConsoleOutputs(prev => ({ ...prev, [serverId]: data.lines || [] }));
        } catch (error) {
            console.error('Failed to load console:', error);
        }
    };

    const sendConsoleCommand = async (serverId, command) => {
        try {
            await fetch(`${API_BASE}/api/servers/${serverId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            setConsoleOutputs(prev => ({
                ...prev,
                [serverId]: [...(prev[serverId] || []), `> ${command}`]
            }));
        } catch (error) {
            showToast('Failed to send command', 'error');
        }
    };

    // SteamCMD actions
    const installSteamCMD = async () => {
        showToast('Installing SteamCMD...', 'info');
        try {
            const response = await fetch(`${API_BASE}/api/steamcmd/install`, {
                method: 'POST'
            });
            if (response.ok) {
                showToast('SteamCMD installed successfully', 'success');
                checkSteamCMDStatus();
            } else {
                showToast('Failed to install SteamCMD', 'error');
            }
        } catch (error) {
            showToast('Failed to install SteamCMD', 'error');
        }
    };

    const steamLogin = async (username, password, guardCode) => {
        try {
            const response = await fetch(`${API_BASE}/api/steamcmd/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, guard_code: guardCode || null })
            });
            const data = await response.json();
            if (data.requires_guard) {
                showToast('Steam Guard code required', 'info');
                return { requiresGuard: true };
            } else if (data.success) {
                showToast('Logged in successfully', 'success');
                checkSteamCMDStatus();
                return { success: true };
            } else {
                showToast(data.error || 'Login failed', 'error');
                return { error: data.error };
            }
        } catch (error) {
            showToast('Login failed', 'error');
            return { error: 'Login failed' };
        }
    };

    const steamLogout = async () => {
        try {
            await fetch(`${API_BASE}/api/steamcmd/logout`, { method: 'POST' });
            showToast('Logged out', 'success');
            checkSteamCMDStatus();
        } catch (error) {
            showToast('Logout failed', 'error');
        }
    };

    // Calculate stats
    const runningServers = servers.filter(s => s.status === 'running').length;
    const stoppedServers = servers.filter(s => s.status !== 'running').length;
    
    // Show loading screen while checking auth
    if (authLoading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-content">
                    <i className="fas fa-gamepad fa-spin"></i>
                    <p>Loading ServerCraft...</p>
                </div>
            </div>
        );
    }
    
    // Show login screen if not authenticated
    if (showLoginScreen || !isAuthenticated) {
        return (
            <LoginScreen
                onLogin={handleLogin}
                showPasswordReset={showPasswordReset}
                setShowPasswordReset={setShowPasswordReset}
            />
        );
    }
    
    // Show password change screen if required
    if (mustChangePassword) {
        return (
            <PasswordChangeScreen
                currentUsername={currentUsername}
                isFirstTime={true}
                onPasswordChange={handlePasswordChange}
                onUsernameChange={handleUsernameChange}
                onLogout={handleLogout}
            />
        );
    }
    
    // Show security questions setup if needed
    if (needsSecurityQuestions) {
        return (
            <SecurityQuestionsSetup
                onSetup={handleSecurityQuestionsSetup}
                onSkip={() => setNeedsSecurityQuestions(false)}
            />
        );
    }
    
    // Show onboarding wizard if not completed
    if (showOnboarding && !onboardingCompleted) {
        return (
            <OnboardingWizard
                systemStats={systemStats}
                upnpStatus={upnpStatus}
                onComplete={(data) => {
                    setOnboardingCompleted(true);
                    setShowOnboarding(false);
                    showToast('Welcome to ServerCraft! You\'re all set up.', 'success');
                }}
                onSkip={() => {
                    setShowOnboarding(false);
                    showToast('You can always access setup guides in the About tab', 'info');
                }}
            />
        );
    }

    return (
        <div className="app">
            {/* Snowflakes - Only show in winter months (Dec-Feb) */}
            <Snowflakes />
            
            {/* Header */}
            <header className="app-header">
                <div className="header-brand">
                    <span className="brand-icon"><i className="fas fa-gamepad"></i></span>
                    <span className="brand-text">ServerCraft</span>
                    <span className="brand-edition">Windows Edition</span>
                </div>
                <nav className="header-nav">
                    {['dashboard', 'servers', ...(settings.clustering_enabled ? ['clusters'] : []), 'steamcmd', 'workshop', 'marketplace', 'feedback', 'settings', 'about'].map(view => (
                        <button
                            key={view}
                            className={`nav-btn ${currentView === view ? 'active' : ''}`}
                            onClick={() => setCurrentView(view)}
                            data-testid={`nav-${view}`}
                        >
                            {view.charAt(0).toUpperCase() + view.slice(1)}
                        </button>
                    ))}
                </nav>
                <div className="header-actions">
                    <span className="user-badge" title="Logged in as">
                        <i className="fas fa-user"></i> {currentUsername}
                    </span>
                    <span className="version-badge" data-testid="version-badge">v2026.1.6.44D</span>
                    <button className="logout-btn" onClick={() => handleLogout(false)} title="Logout">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {/* Dashboard */}
                {currentView === 'dashboard' && (
                    <DashboardView
                        systemStats={systemStats}
                        servers={servers}
                        games={games}
                        runningServers={runningServers}
                        stoppedServers={stoppedServers}
                        onStartServer={startServer}
                        onStopServer={stopServer}
                        onOpenServer={openServerTab}
                        onNavigate={setCurrentView}
                    />
                )}

                {/* Servers */}
                {currentView === 'servers' && (
                    <ServersView
                        servers={servers}
                        games={games}
                        openTabs={openTabs}
                        activeTab={activeTab}
                        consoleOutputs={consoleOutputs}
                        onOpenTab={openServerTab}
                        onCloseTab={closeServerTab}
                        onSetActiveTab={setActiveTab}
                        onStartServer={startServer}
                        onStopServer={stopServer}
                        onRestartServer={restartServer}
                        onInstallServer={installServer}
                        onDeleteServer={deleteServer}
                        onSendCommand={sendConsoleCommand}
                        onCreateServer={() => setShowCreateModal(true)}
                    />
                )}

                {/* Clusters - Only show if enabled in settings */}
                {currentView === 'clusters' && settings.clustering_enabled && (
                    <ClustersView showToast={showToast} />
                )}

                {/* SteamCMD */}
                {currentView === 'steamcmd' && (
                    <SteamCMDView
                        status={steamcmdStatus}
                        onInstall={installSteamCMD}
                        onLogin={steamLogin}
                        onLogout={steamLogout}
                    />
                )}

                {/* Workshop */}
                {currentView === 'workshop' && (
                    <WorkshopView games={games} showToast={showToast} />
                )}

                {/* Marketplace (Disabled Preview) */}
                {currentView === 'marketplace' && (
                    <MarketplaceView showToast={showToast} />
                )}

                {/* Feedback */}
                {currentView === 'feedback' && (
                    <FeedbackView showToast={showToast} />
                )}

                {/* Settings */}
                {currentView === 'settings' && (
                    <SettingsView
                        settings={settings}
                        upnpStatus={upnpStatus}
                        showToast={showToast}
                    />
                )}

                {/* About */}
                {currentView === 'about' && (
                    <AboutView />
                )}
            </main>

            {/* Footer */}
            <footer className="app-footer" data-testid="app-footer">
                <span>© 2026 TierOne Development</span>
            </footer>

            {/* Create Server Modal */}
            {showCreateModal && (
                <CreateServerModal
                    games={games}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createServer}
                />
            )}

            {/* System Specs Acknowledgment Modal */}
            {showSpecsModal && (
                <SpecsAcknowledgmentModal onAcknowledge={acknowledgeSpecs} />
            )}

            {/* Toast Container */}
            <div id="toast-container" data-testid="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// System Specs Acknowledgment Modal
function SpecsAcknowledgmentModal({ onAcknowledge }) {
    return (
        <div className="modal specs-modal" data-testid="specs-modal" onClick={onAcknowledge}>
            <div className="modal-overlay"></div>
            <div className="modal-content specs-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><i className="fas fa-exclamation-triangle"></i> System Requirements</h2>
                    <button className="modal-close" onClick={onAcknowledge}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="modal-body">
                    <p className="specs-intro">
                        ServerCraft manages game servers which can be resource-intensive. 
                        Please review the requirements below before proceeding.
                    </p>
                    
                    <div className="specs-section">
                        <h3><i className="fas fa-circle" style={{color: '#ef4444', fontSize: '10px', marginRight: '8px'}}></i>Minimum Requirements</h3>
                        <div className="specs-grid">
                            <div className="spec-item">
                                <span className="spec-label">CPU:</span>
                                <span className="spec-value">4 Cores / 4 Threads</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">RAM:</span>
                                <span className="spec-value">8 GB</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Storage:</span>
                                <span className="spec-value">50 GB SSD</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Network:</span>
                                <span className="spec-value">10 Mbps Up/Down</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">OS:</span>
                                <span className="spec-value">Windows 10/11 or Server 2019+</span>
                            </div>
                        </div>
                    </div>

                    <div className="specs-section">
                        <h3><i className="fas fa-circle" style={{color: '#22c55e', fontSize: '10px', marginRight: '8px'}}></i>Recommended Requirements</h3>
                        <div className="specs-grid">
                            <div className="spec-item">
                                <span className="spec-label">CPU:</span>
                                <span className="spec-value">8+ Cores / 16 Threads</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">RAM:</span>
                                <span className="spec-value">32 GB or more</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Storage:</span>
                                <span className="spec-value">500 GB+ NVMe SSD</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Network:</span>
                                <span className="spec-value">100+ Mbps Up/Down</span>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">OS:</span>
                                <span className="spec-value">Windows Server 2022/2025</span>
                            </div>
                        </div>
                    </div>

                    <div className="specs-note">
                        <h4><i className="fas fa-chart-bar"></i> Resource Usage Notes:</h4>
                        <ul>
                            <li><strong>ServerCraft Panel:</strong> ~50MB RAM, &lt;1% CPU when idle</li>
                            <li><strong>Per Game Server:</strong> 2-16 GB RAM depending on game and player count</li>
                            <li><strong>Network:</strong> Varies by game - typically 1-5 Mbps per connected player</li>
                        </ul>
                    </div>

                    <div className="specs-warning">
                        <p><i className="fas fa-exclamation-triangle" style={{color: '#ef4444', marginRight: '8px'}}></i>Running game servers below minimum specifications may result in:</p>
                        <ul>
                            <li>Poor server performance and lag</li>
                            <li>Crashes and instability</li>
                            <li>Degraded gaming experience for players</li>
                        </ul>
                    </div>

                    <div className="specs-resource-warning">
                        <p><i className="fas fa-exclamation-triangle" style={{color: '#eab308', marginRight: '8px'}}></i>Running game servers can use an undetermined amount of resources in heavier instances like large gunfights, large scale maps and more. Please ensure your Windows OS has enough resources to run itself before setting up ServerCraft.</p>
                    </div>

                    <div className="specs-disclaimer">
                        <p><strong>DISCLAIMER:</strong> TierOne Development is not responsible for any damage done to any servers, computers or the hardware ServerCraft is running on. Absolutely no warranty will be given when running ServerCraft.</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button 
                        className="btn btn-green" 
                        onClick={onAcknowledge}
                        data-testid="acknowledge-specs-btn"
                    >
                        I acknowledge the risks of running ServerCraft with below the minimum Spec&apos;d recommendation
                    </button>
                </div>
            </div>
        </div>
    );
}

// Dashboard View Component
function DashboardView({ systemStats, servers, games, runningServers, stoppedServers, onStartServer, onStopServer, onOpenServer, onNavigate }) {
    const updateGauge = (percent) => {
        const dashLength = (percent / 100) * 110;
        return `${dashLength} 110`;
    };

    return (
        <section className="view active" data-testid="dashboard-view">
            <div className="view-header">
                <h1>Dashboard</h1>
                <p className="subtitle">System Overview & Server Status</p>
            </div>

            {/* System Stats */}
            <div className="stats-grid">
                <div className="stat-card" data-testid="stat-cpu">
                    <div className="stat-header">
                        <span className="stat-icon"><i className="fas fa-microchip"></i></span>
                        <span className="stat-title">CPU</span>
                    </div>
                    <div className="stat-gauge">
                        <svg viewBox="0 0 100 50" className="gauge-svg">
                            <path className="gauge-bg" d="M10,45 A35,35 0 0,1 90,45"></path>
                            <path className="gauge-fill gauge-blue" d="M10,45 A35,35 0 0,1 90,45" 
                                  strokeDasharray={updateGauge(systemStats?.cpu?.percent || 0)}></path>
                        </svg>
                        <div className="gauge-value">{Math.round(systemStats?.cpu?.percent || 0)}%</div>
                    </div>
                    <div className="stat-details">
                        <span>{systemStats?.cpu?.cores || 0} Cores</span>
                    </div>
                </div>

                <div className="stat-card" data-testid="stat-memory">
                    <div className="stat-header">
                        <span className="stat-icon"><i className="fas fa-memory"></i></span>
                        <span className="stat-title">Memory</span>
                    </div>
                    <div className="stat-gauge">
                        <svg viewBox="0 0 100 50" className="gauge-svg">
                            <path className="gauge-bg" d="M10,45 A35,35 0 0,1 90,45"></path>
                            <path className="gauge-fill gauge-green" d="M10,45 A35,35 0 0,1 90,45" 
                                  strokeDasharray={updateGauge(systemStats?.memory?.percent || 0)}></path>
                        </svg>
                        <div className="gauge-value">{Math.round(systemStats?.memory?.percent || 0)}%</div>
                    </div>
                    <div className="stat-details">
                        <span>{systemStats?.memory?.used_gb || 0} / {systemStats?.memory?.total_gb || 0} GB</span>
                    </div>
                </div>

                <div className="stat-card" data-testid="stat-network">
                    <div className="stat-header">
                        <span className="stat-icon"><i className="fas fa-wifi"></i></span>
                        <span className="stat-title">Network</span>
                    </div>
                    <div className="network-stats">
                        <div className="network-row">
                            <span className="network-label">↑ Upload</span>
                            <span className="network-value">{systemStats?.network?.upload_speed_mbps?.toFixed(2) || '0.00'} MB/s</span>
                        </div>
                        <div className="network-row">
                            <span className="network-label">↓ Download</span>
                            <span className="network-value">{systemStats?.network?.download_speed_mbps?.toFixed(2) || '0.00'} MB/s</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" data-testid="stat-disk">
                    <div className="stat-header">
                        <span className="stat-icon"><i className="fas fa-hdd"></i></span>
                        <span className="stat-title">Disk</span>
                    </div>
                    <div className="stat-gauge">
                        <svg viewBox="0 0 100 50" className="gauge-svg">
                            <path className="gauge-bg" d="M10,45 A35,35 0 0,1 90,45"></path>
                            <path className="gauge-fill gauge-brown" d="M10,45 A35,35 0 0,1 90,45" 
                                  strokeDasharray={updateGauge(systemStats?.disk?.percent || 0)}></path>
                        </svg>
                        <div className="gauge-value">{Math.round(systemStats?.disk?.percent || 0)}%</div>
                    </div>
                    <div className="stat-details">
                        <span>{systemStats?.disk?.used_gb || 0} / {systemStats?.disk?.total_gb || 0} GB</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
                <div className="quick-stat" data-testid="total-servers-card">
                    <span className="quick-stat-value">{servers.length}</span>
                    <span className="quick-stat-label">Total Servers</span>
                </div>
                <div className="quick-stat" data-testid="running-servers-card">
                    <span className="quick-stat-value">{runningServers}</span>
                    <span className="quick-stat-label">Running</span>
                </div>
                <div className="quick-stat" data-testid="stopped-servers-card">
                    <span className="quick-stat-value">{stoppedServers}</span>
                    <span className="quick-stat-label">Stopped</span>
                </div>
            </div>

            {/* Server Overview */}
            <div className="section">
                <div className="section-header">
                    <h2>Server Overview</h2>
                </div>
                <div className="server-grid" data-testid="server-overview">
                    {servers.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon"><i className="fas fa-server"></i></span>
                            <p>No servers yet. Create your first server to get started!</p>
                            <button className="btn btn-blue" onClick={() => onNavigate('servers')} data-testid="create-server-btn">
                                Create Server
                            </button>
                        </div>
                    ) : (
                        servers.map(server => (
                            <div key={server.id} className="server-card" onClick={() => onOpenServer(server.id)}>
                                <div className="server-card-header">
                                    <div>
                                        <div className="server-card-title">{server.name}</div>
                                        <div className="server-card-game">{games[server.game]?.name || server.game}</div>
                                        {games[server.game]?.tags && (
                                            <div className="server-card-tags">
                                                {games[server.game].tags.slice(0, 3).map((tag, idx) => (
                                                    <span key={idx} className="game-tag" style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}>
                                                        #{tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`status-indicator status-${server.status}`}>
                                        <span className="status-dot"></span>
                                        <span>{server.status}</span>
                                    </div>
                                </div>
                                <div className="server-card-stats">
                                    <div className="server-stat">
                                        <span className="server-stat-label">Port:</span>
                                        <span className="server-stat-value">{server.port}</span>
                                    </div>
                                    <div className="server-stat">
                                        <span className="server-stat-label">Players:</span>
                                        <span className="server-stat-value">0/{server.max_players}</span>
                                    </div>
                                </div>
                                <div className="server-card-actions">
                                    {server.status === 'running' ? (
                                        <button className="btn btn-red btn-sm" onClick={(e) => { e.stopPropagation(); onStopServer(server.id); }}>Stop</button>
                                    ) : (
                                        <button className="btn btn-green btn-sm" onClick={(e) => { e.stopPropagation(); onStartServer(server.id); }}>Start</button>
                                    )}
                                    <button className="btn btn-gray btn-sm" onClick={(e) => { e.stopPropagation(); onOpenServer(server.id); }}>Manage</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

// Servers View Component
function ServersView({ servers, games, openTabs, activeTab, consoleOutputs, onOpenTab, onCloseTab, onSetActiveTab, onStartServer, onStopServer, onRestartServer, onInstallServer, onDeleteServer, onSendCommand, onCreateServer }) {
    const [commandInput, setCommandInput] = useState('');
    const activeServer = servers.find(s => s.id === activeTab);

    const handleSendCommand = () => {
        if (commandInput.trim() && activeTab) {
            onSendCommand(activeTab, commandInput.trim());
            setCommandInput('');
        }
    };

    return (
        <section className="view active" data-testid="servers-view">
            <div className="view-header">
                <h1>Servers</h1>
                <button className="btn btn-green" onClick={onCreateServer} data-testid="new-server-btn">
                    <span>+</span> New Server
                </button>
            </div>

            {/* Server Tabs */}
            <div className="server-tabs">
                <div className="tabs-container">
                    {openTabs.map(serverId => {
                        const server = servers.find(s => s.id === serverId);
                        if (!server) return null;
                        return (
                            <button
                                key={serverId}
                                className={`server-tab ${activeTab === serverId ? 'active' : ''}`}
                                onClick={() => onSetActiveTab(serverId)}
                            >
                                <span className="status-dot" style={{ background: `var(--status-${server.status})` }}></span>
                                <span>{server.name}</span>
                                <span className="tab-close" onClick={(e) => { e.stopPropagation(); onCloseTab(serverId); }}>&times;</span>
                            </button>
                        );
                    })}
                </div>
                <button className="tab-add-btn" onClick={onCreateServer} data-testid="tab-add-btn">+</button>
            </div>

            {/* Server Content */}
            <div className="server-content" data-testid="server-content">
                {!activeServer ? (
                    <div className="empty-state">
                        <span className="empty-icon"><i className="fas fa-terminal"></i></span>
                        <p>Select a server tab or create a new server</p>
                    </div>
                ) : (
                    <div className="server-panel active">
                        <div className="server-panel-header">
                            <div className="server-panel-title">
                                <span className="status-dot" style={{ background: `var(--status-${activeServer.status})`, width: '12px', height: '12px' }}></span>
                                <h3>{activeServer.name}</h3>
                                <span className={`status-badge status-${activeServer.status}`}>{activeServer.status}</span>
                            </div>
                            <div className="server-panel-controls">
                                {activeServer.status === 'running' ? (
                                    <>
                                        <button className="btn btn-red" onClick={() => onStopServer(activeServer.id)}>⏹ Stop</button>
                                        <button className="btn btn-brown" onClick={() => onRestartServer(activeServer.id)}><i className="fas fa-sync-alt"></i> Restart</button>
                                    </>
                                ) : (
                                    <button className="btn btn-green" onClick={() => onStartServer(activeServer.id)}>▶ Start</button>
                                )}
                                <button className="btn btn-blue" onClick={() => onInstallServer(activeServer.id)}><i className="fas fa-download"></i> Install/Update</button>
                                <button className="btn btn-gray" onClick={() => onDeleteServer(activeServer.id)}><i className="fas fa-trash-alt"></i> Delete</button>
                            </div>
                        </div>

                        <div className="server-panel-stats">
                            <div className="panel-stat">
                                <div className="panel-stat-value">0%</div>
                                <div className="panel-stat-label">CPU</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-value">0 MB</div>
                                <div className="panel-stat-label">Memory</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-value">0/{activeServer.max_players}</div>
                                <div className="panel-stat-label">Players</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-value">0h 0m</div>
                                <div className="panel-stat-label">Uptime</div>
                            </div>
                        </div>

                        <div className="console-container">
                            <div className="console">
                                <div className="console-output">
                                    {(consoleOutputs[activeServer.id] || []).map((line, i) => (
                                        <div key={i} className="console-line">{line}</div>
                                    ))}
                                </div>
                                <div className="console-input-container">
                                    <input
                                        type="text"
                                        className="console-input"
                                        placeholder="Enter command..."
                                        value={commandInput}
                                        onChange={(e) => setCommandInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
                                    />
                                    <button className="console-send" onClick={handleSendCommand}>Send</button>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ margin: 'var(--spacing-md)' }}>
                            <div className="card-header">
                                <h3>Server Configuration</h3>
                            </div>
                            <div className="card-body">
                                <div className="info-row">
                                    <span className="info-label">Game:</span>
                                    <span className="info-value">{games[activeServer.game]?.name || activeServer.game}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Port:</span>
                                    <span className="info-value">{activeServer.port}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Query Port:</span>
                                    <span className="info-value">{activeServer.query_port || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Max Players:</span>
                                    <span className="info-value">{activeServer.max_players}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">UPnP:</span>
                                    <span className="info-value">{activeServer.upnp_enabled ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Auto-Start:</span>
                                    <span className="info-value">{activeServer.auto_start ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

// SteamCMD View Component
function SteamCMDView({ status, onInstall, onLogin, onLogout }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [guardCode, setGuardCode] = useState('');
    const [showGuardInput, setShowGuardInput] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        const result = await onLogin(username, password, guardCode || null);
        setIsLoggingIn(false);
        if (result.requiresGuard) {
            setShowGuardInput(true);
        } else if (result.success) {
            setShowGuardInput(false);
            setUsername('');
            setPassword('');
            setGuardCode('');
        }
    };

    return (
        <section className="view active" data-testid="steamcmd-view">
            <div className="view-header">
                <h1>SteamCMD</h1>
                <p className="subtitle">Steam Command Line Tool Management</p>
            </div>

            <div className="steamcmd-content">
                <div className="card">
                    <div className="card-header">
                        <h3>SteamCMD Status</h3>
                        <span className={`status-badge ${status.installed ? 'status-installed' : 'status-not-installed'}`} data-testid="steamcmd-status">
                            {status.installed ? 'Installed' : 'Not Installed'}
                        </span>
                    </div>
                    <div className="card-body">
                        {!status.installed ? (
                            <div className="steamcmd-install-prompt">
                                <p>SteamCMD is not installed. Click below to install it.</p>
                                <button className="btn btn-blue" onClick={onInstall} data-testid="install-steamcmd-btn">
                                    Install SteamCMD
                                </button>
                            </div>
                        ) : (
                            <div className="steamcmd-info">
                                <div className="info-row">
                                    <span className="info-label">Path:</span>
                                    <span className="info-value">{status.path}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Logged In:</span>
                                    <span className="info-value">{status.logged_in ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Username:</span>
                                    <span className="info-value">{status.username || '-'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>Steam Login</h3>
                    </div>
                    <div className="card-body">
                        <p className="card-description">Some games require Steam account ownership to download server files.</p>
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Steam username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    data-testid="steam-username-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Steam password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    data-testid="steam-password-input"
                                />
                            </div>
                            {showGuardInput && (
                                <div className="form-group">
                                    <label>Steam Guard Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter code from email/app"
                                        value={guardCode}
                                        onChange={(e) => setGuardCode(e.target.value)}
                                        maxLength={5}
                                        data-testid="steam-guard-input"
                                    />
                                    <p className="form-hint">Check your email or Steam app for the code</p>
                                </div>
                            )}
                            <div className="form-actions">
                                {!status.logged_in ? (
                                    <button type="submit" className="btn btn-blue" disabled={isLoggingIn} data-testid="steam-login-btn">
                                        {isLoggingIn ? 'Logging in...' : 'Login'}
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-gray" onClick={onLogout} data-testid="steam-logout-btn">
                                        Logout
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Workshop View Component
function WorkshopView({ games, showToast }) {
    const [selectedGame, setSelectedGame] = useState('');
    const [modId, setModId] = useState('');
    const [parsedMods, setParsedMods] = useState([]);
    const [workshopTab, setWorkshopTab] = useState('browse'); // browse, download, import, installed
    const [searchQuery, setSearchQuery] = useState('');
    const [installedMods, setInstalledMods] = useState({});
    const [workshopStatus, setWorkshopStatus] = useState(null);
    const [loadingMods, setLoadingMods] = useState(false);

    // Load workshop status and installed mods on mount
    useEffect(() => {
        const loadWorkshopData = async () => {
            try {
                // Load workshop status
                const statusRes = await fetch(`${API_BASE}/api/workshop/status`);
                if (statusRes.ok) {
                    const status = await statusRes.json();
                    setWorkshopStatus(status);
                }
            } catch (error) {
                console.log('Failed to load workshop status');
            }
        };
        loadWorkshopData();
    }, []);

    // Load installed mods when switching to installed tab or selecting a game
    useEffect(() => {
        const loadInstalledMods = async () => {
            if (workshopTab === 'installed') {
                setLoadingMods(true);
                try {
                    const res = await fetch(`${API_BASE}/api/workshop/mods`);
                    if (res.ok) {
                        const data = await res.json();
                        setInstalledMods(data);
                    }
                } catch (error) {
                    console.log('Failed to load installed mods');
                } finally {
                    setLoadingMods(false);
                }
            }
        };
        loadInstalledMods();
    }, [workshopTab]);

    const deleteMod = async (game, modId) => {
        try {
            const res = await fetch(`${API_BASE}/api/workshop/mods/${game}/${modId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast('Mod deleted successfully', 'success');
                // Refresh mods list
                const modsRes = await fetch(`${API_BASE}/api/workshop/mods`);
                if (modsRes.ok) {
                    setInstalledMods(await modsRes.json());
                }
            } else {
                showToast('Failed to delete mod', 'error');
            }
        } catch (error) {
            showToast('Failed to delete mod', 'error');
        }
    };

    const handleModlistUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const response = await fetch(`${API_BASE}/api/workshop/parse-modlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game: 'arma3', html_content: event.target.result })
                });
                const data = await response.json();
                setParsedMods(data.mod_ids);
                showToast(`Found ${data.count} mods`, 'success');
            } catch (error) {
                showToast('Failed to parse modlist', 'error');
            }
        };
        reader.readAsText(file);
    };

    const downloadMod = async (e) => {
        e.preventDefault();
        let extractedModId = modId;
        const urlMatch = modId.match(/id=(\d+)/);
        if (urlMatch) extractedModId = urlMatch[1];

        try {
            const response = await fetch(`${API_BASE}/api/workshop/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: selectedGame, mod_ids: [extractedModId] })
            });
            if (response.ok) {
                showToast('Mod download started', 'success');
            } else {
                showToast('Failed to download mod', 'error');
            }
        } catch (error) {
            showToast('Failed to download mod', 'error');
        }
    };

    const downloadAllParsedMods = async () => {
        if (parsedMods.length === 0) return;
        showToast('Starting mod downloads...', 'info');
        try {
            const response = await fetch(`${API_BASE}/api/workshop/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: 'arma3', mod_ids: parsedMods })
            });
            const data = await response.json();
            showToast(`Downloaded ${data.downloaded}/${data.total} mods`, data.success ? 'success' : 'error');
        } catch (error) {
            showToast('Failed to download mods', 'error');
        }
    };

    // Get games that have workshop support
    const workshopGames = Object.entries(games).filter(([key, game]) => game.workshop_id);

    return (
        <section className="view active" data-testid="workshop-view">
            <div className="view-header">
                <h1><i className="fas fa-wrench"></i> Workshop</h1>
                <p className="subtitle">Steam Workshop Mod Management - Browse & Download Mods</p>
            </div>

            {/* Workshop Navigation Tabs */}
            <div className="workshop-tabs">
                <button 
                    className={`workshop-tab ${workshopTab === 'browse' ? 'active' : ''}`}
                    onClick={() => setWorkshopTab('browse')}
                >
                    <i className="fas fa-globe"></i> Browse Mods
                </button>
                <button 
                    className={`workshop-tab ${workshopTab === 'download' ? 'active' : ''}`}
                    onClick={() => setWorkshopTab('download')}
                >
                    <i className="fas fa-download"></i> Download by ID
                </button>
                <button 
                    className={`workshop-tab ${workshopTab === 'import' ? 'active' : ''}`}
                    onClick={() => setWorkshopTab('import')}
                >
                    <i className="fas fa-file-import"></i> Import Modlist
                </button>
                <button 
                    className={`workshop-tab ${workshopTab === 'installed' ? 'active' : ''}`}
                    onClick={() => setWorkshopTab('installed')}
                >
                    <i className="fas fa-box"></i> Installed Mods
                </button>
            </div>

            <div className="workshop-content">
                {/* Browse Mods Tab */}
                {workshopTab === 'browse' && (
                    <div className="workshop-browse">
                        <div className="card">
                            <div className="card-header">
                                <h3><i className="fas fa-globe"></i> Browse Steam Workshop</h3>
                            </div>
                            <div className="card-body">
                                <div className="workshop-notice">
                                    <span className="notice-icon"><i className="fas fa-info-circle"></i></span>
                                    <div>
                                        <p><strong>Steam Workshop Integration</strong></p>
                                        <p>Browse and download mods for any supported game. You don&apos;t need to own the game to download server mods - as long as the game allows anonymous downloads.</p>
                                    </div>
                                </div>
                                
                                <div className="workshop-game-select">
                                    <label>Select Game:</label>
                                    <select 
                                        value={selectedGame} 
                                        onChange={(e) => setSelectedGame(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="">-- Select a game --</option>
                                        {workshopGames.map(([key, game]) => (
                                            <option key={key} value={key}>
                                                {game.name} {!game.requires_ownership && '(No ownership required)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedGame && games[selectedGame] && (
                                    <div className="selected-game-info">
                                        <div className="game-info-header">
                                            <h4>{games[selectedGame].name}</h4>
                                            <div className="game-tags-list">
                                                {games[selectedGame].tags?.map((tag, idx) => (
                                                    <span key={idx} className="game-tag-large" style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}>
                                                        #{tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="game-description">{games[selectedGame].description}</p>
                                        <div className="game-workshop-link">
                                            <a href={`https://steamcommunity.com/app/${games[selectedGame].workshop_id}/workshop/`} target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-sm">
                                                <i className="fas fa-external-link-alt"></i> Open Steam Workshop
                                            </a>
                                            <span className="workshop-id">Workshop ID: {games[selectedGame].workshop_id}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="workshop-search">
                                    <input 
                                        type="text" 
                                        placeholder="Search mods... (Coming Soon)" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="form-input"
                                        disabled
                                    />
                                    <button className="btn btn-blue" disabled>Search</button>
                                </div>

                                <div className="coming-soon-notice">
                                    <span><i className="fas fa-hard-hat"></i></span>
                                    <p>Full workshop browsing with mod previews, ratings, and one-click install coming in a future update!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Download by ID Tab */}
                {workshopTab === 'download' && (
                    <div className="workshop-download">
                        <div className="card">
                            <div className="card-header">
                                <h3><i className="fas fa-download"></i> Download Mod by ID</h3>
                            </div>
                            <div className="card-body">
                                <p className="card-description">Enter a Steam Workshop URL or Mod ID to download directly.</p>
                                <form onSubmit={downloadMod} className="mod-download-form">
                                    <div className="form-group">
                                        <label>Game:</label>
                                        <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="form-select" required>
                                            <option value="">Select Game</option>
                                            {workshopGames.map(([key, game]) => (
                                                <option key={key} value={key}>{game.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Workshop URL or Mod ID:</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=123456 or 123456" 
                                            value={modId}
                                            onChange={(e) => setModId(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-green">Download Mod</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Modlist Tab */}
                {workshopTab === 'import' && (
                    <div className="workshop-import">
                        <div className="card">
                            <div className="card-header">
                                <h3><i className="fas fa-file-import"></i> Arma 3 Modlist Import</h3>
                            </div>
                            <div className="card-body">
                                <p className="card-description">Upload your Arma 3 modlist.html file to automatically import mods.</p>
                                <div className="file-upload-zone" data-testid="modlist-dropzone">
                                    <input type="file" accept=".html" onChange={handleModlistUpload} style={{ display: 'none' }} id="modlist-file" />
                                    <span className="upload-icon"><i className="fas fa-file-upload"></i></span>
                                    <p>Drop modlist.html here or <button className="link-btn" onClick={() => document.getElementById('modlist-file').click()}>browse</button></p>
                                </div>
                                {parsedMods.length > 0 && (
                                    <div className="modlist-preview">
                                        <h4>Found Mods: {parsedMods.length}</h4>
                                        <div className="mod-list" data-testid="mod-list">
                                            {parsedMods.map(id => (
                                                <div key={id} className="mod-item"><span>{id}</span></div>
                                            ))}
                                        </div>
                                        <button className="btn btn-green" onClick={downloadAllParsedMods} data-testid="download-mods-btn">Download All Mods</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Installed Mods Tab */}
                {workshopTab === 'installed' && (
                    <div className="workshop-installed">
                        <div className="card">
                            <div className="card-header">
                                <h3><i className="fas fa-box"></i> Installed Mods</h3>
                                <span className="header-badge">
                                    {Object.values(installedMods).reduce((acc, g) => acc + g.count, 0)} total
                                </span>
                            </div>
                            <div className="card-body">
                                {/* Workshop Status */}
                                {workshopStatus && (
                                    <div className="workshop-status-bar">
                                        <span className={`status-item ${workshopStatus.steamcmd_installed ? 'status-ok' : 'status-warn'}`}>
                                            {workshopStatus.steamcmd_installed ? <i className="fas fa-check-circle"></i> : <i className="fas fa-exclamation-triangle"></i>} SteamCMD: {workshopStatus.steamcmd_installed ? 'Installed' : 'Not Installed'}
                                        </span>
                                        <span className={`status-item ${workshopStatus.logged_in ? 'status-ok' : 'status-info'}`}>
                                            {workshopStatus.logged_in ? <i className="fas fa-check-circle"></i> : <i className="fas fa-info-circle"></i>} Steam: {workshopStatus.logged_in ? 'Logged In' : 'Anonymous'}
                                        </span>
                                    </div>
                                )}

                                <div className="workshop-game-select">
                                    <label>Filter by Game:</label>
                                    <select 
                                        value={selectedGame} 
                                        onChange={(e) => setSelectedGame(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="">All Games</option>
                                        {workshopGames.map(([key, game]) => (
                                            <option key={key} value={key}>{game.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {loadingMods ? (
                                    <div className="loading-state">Loading mods...</div>
                                ) : Object.keys(installedMods).length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon"><i className="fas fa-inbox"></i></span>
                                        <p>No mods installed yet</p>
                                        <p className="empty-hint">Download mods from the Workshop to see them here</p>
                                    </div>
                                ) : (
                                    <div className="installed-mods-by-game">
                                        {Object.entries(installedMods)
                                            .filter(([gameKey]) => !selectedGame || gameKey === selectedGame)
                                            .map(([gameKey, gameData]) => (
                                            <div key={gameKey} className="game-mods-section">
                                                <div className="game-mods-header">
                                                    <h4>{gameData.game_name}</h4>
                                                    <span className="mod-count">{gameData.count} mods</span>
                                                </div>
                                                <div className="mods-list">
                                                    {gameData.mods.map(mod => (
                                                        <div key={mod.id} className="installed-mod-item">
                                                            <div className="mod-info">
                                                                <span className="mod-name">{mod.name}</span>
                                                                <span className="mod-id">ID: {mod.id}</span>
                                                                <span className="mod-size">{mod.size_mb?.toFixed(1) || '?'} MB</span>
                                                            </div>
                                                            <div className="mod-actions">
                                                                <button 
                                                                    className="btn btn-red btn-sm"
                                                                    onClick={() => deleteMod(gameKey, mod.id)}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

// Settings View Component
function SettingsView({ settings, upnpStatus, showToast }) {
    const [upnpEnabled, setUpnpEnabled] = useState(settings.upnp_enabled || false);
    const [clusteringEnabled, setClusteringEnabled] = useState(settings.clustering_enabled || false);
    
    // 2FA state
    const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false, setup_completed: false });
    const [showSetup2FA, setShowSetup2FA] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [disableCode, setDisableCode] = useState('');
    
    const getToken = () => localStorage.getItem('servercraft_auth_token') || '';
    
    useEffect(() => {
        fetch2FAStatus();
    }, []);
    
    const fetch2FAStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/2fa/status`);
            const data = await res.json();
            setTwoFAStatus(data);
        } catch (error) {
            console.error('Failed to fetch 2FA status:', error);
        }
    };
    
    const initiate2FASetup = async () => {
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/auth/2fa/setup?token=${token}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setQrCodeData(data);
                setBackupCodes(data.backup_codes);
                setShowSetup2FA(true);
            } else {
                showToast(data.error || 'Failed to initiate 2FA setup', 'error');
            }
        } catch (error) {
            showToast('Failed to initiate 2FA setup', 'error');
        }
    };
    
    const verify2FASetup = async () => {
        if (verificationCode.length !== 6) {
            showToast('Please enter a 6-digit code', 'error');
            return;
        }
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/auth/2fa/verify-setup?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: verificationCode })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Two-factor authentication enabled successfully!', 'success');
                setShowSetup2FA(false);
                setShowBackupCodes(true);
                fetch2FAStatus();
            } else {
                showToast(data.error || 'Invalid verification code', 'error');
            }
        } catch (error) {
            showToast('Failed to verify code', 'error');
        }
    };
    
    const disable2FA = async () => {
        if (!disableCode) {
            showToast('Please enter your current 2FA code', 'error');
            return;
        }
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/auth/2fa/disable?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: disableCode })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Two-factor authentication disabled', 'success');
                setDisableCode('');
                fetch2FAStatus();
            } else {
                showToast(data.error || 'Invalid code', 'error');
            }
        } catch (error) {
            showToast('Failed to disable 2FA', 'error');
        }
    };

    const toggleUPnP = async () => {
        const newValue = !upnpEnabled;
        setUpnpEnabled(newValue);
        try {
            await fetch(`${API_BASE}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upnp_enabled: newValue })
            });
            showToast(`UPnP ${newValue ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            showToast('Failed to update setting', 'error');
        }
    };

    const toggleClustering = async () => {
        const newValue = !clusteringEnabled;
        setClusteringEnabled(newValue);
        try {
            await fetch(`${API_BASE}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clustering_enabled: newValue })
            });
            showToast(`Node Clustering ${newValue ? 'enabled' : 'disabled'}. Refresh to see changes.`, 'success');
            // Reload settings to update nav
            window.location.reload();
        } catch (error) {
            showToast('Failed to update setting', 'error');
            setClusteringEnabled(!newValue); // Revert on error
        }
    };

    return (
        <section className="view active" data-testid="settings-view">
            <div className="view-header">
                <h1>Settings</h1>
                <p className="subtitle">Application Configuration</p>
            </div>

            <div className="settings-content">
                {/* DuckDNS Early Access Warning - matches version card orange theme */}
                <div className="card early-access-warning">
                    <div className="card-body" style={{ background: 'rgba(255, 140, 0, 0.12)', border: '1px solid rgba(255, 140, 0, 0.25)', borderLeft: '4px solid #ff6b00', borderRadius: '8px' }}>
                        <div className="warning-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#ff8c00', fontSize: '24px', marginTop: '2px' }}></i>
                            <div>
                                <h4 style={{ color: '#ff6b00', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fas fa-duck" style={{ color: '#ff8c00' }}></i>
                                    DuckDNS Integration - Early Access
                                </h4>
                                <p style={{ color: 'var(--text-primary)', margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
                                    The DuckDNS integration feature is currently in <strong>Early Access</strong>. 
                                    While functional, you may encounter occasional issues or limitations. 
                                    We are actively improving this feature based on user feedback. 
                                    Please report any issues via the Feedback tab or our Discord server.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3><i className="fas fa-network-wired"></i> Features</h3>
                    </div>
                    <div className="card-body">
                        <div className="setting-row">
                            <div className="setting-info">
                                <span className="setting-label">Node Clustering</span>
                                <span className="setting-description">Enable multi-machine server management. Only needed if you have multiple PCs/servers.</span>
                            </div>
                            <label className="toggle">
                                <input type="checkbox" checked={clusteringEnabled} onChange={toggleClustering} data-testid="clustering-toggle" />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="card twofa-card">
                    <div className="card-header">
                        <h3><i className="fas fa-shield-alt"></i> Two-Factor Authentication (2FA)</h3>
                    </div>
                    <div className="card-body">
                        <div className="twofa-status">
                            <div className="status-indicator">
                                <span className={`status-badge ${twoFAStatus.enabled ? 'enabled' : 'disabled'}`}>
                                    <i className={`fas ${twoFAStatus.enabled ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                                    {twoFAStatus.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className="twofa-description">
                                Add an extra layer of security to your ServerCraft panel using Google Authenticator or any TOTP-compatible app.
                                Each ServerCraft instance has its own unique QR code tied to your panel ID.
                            </p>
                        </div>

                        {!twoFAStatus.enabled ? (
                            <div className="twofa-setup">
                                {!showSetup2FA ? (
                                    <button className="btn btn-primary" onClick={initiate2FASetup}>
                                        <i className="fas fa-qrcode"></i> Enable 2FA
                                    </button>
                                ) : (
                                    <div className="twofa-setup-wizard">
                                        <div className="setup-step">
                                            <h4><i className="fas fa-mobile-alt"></i> Step 1: Scan QR Code</h4>
                                            <p>Scan this QR code with Google Authenticator, Authy, or any TOTP app:</p>
                                            {qrCodeData && (
                                                <div className="qr-code-container">
                                                    <img src={qrCodeData.qr_code} alt="2FA QR Code" className="qr-code-img" />
                                                    <p className="instance-id">Instance ID: <code>{qrCodeData.instance_id?.substring(0, 8)}...</code></p>
                                                </div>
                                            )}
                                            <p className="manual-entry">
                                                Can't scan? Enter this key manually: <code className="secret-code">{qrCodeData?.secret}</code>
                                            </p>
                                        </div>
                                        
                                        <div className="setup-step">
                                            <h4><i className="fas fa-key"></i> Step 2: Enter Verification Code</h4>
                                            <p>Enter the 6-digit code from your authenticator app:</p>
                                            <div className="verification-input">
                                                <input 
                                                    type="text" 
                                                    className="form-input code-input"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="000000"
                                                    maxLength={6}
                                                />
                                                <button className="btn btn-success" onClick={verify2FASetup}>
                                                    <i className="fas fa-check"></i> Verify & Enable
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <button className="btn btn-gray" onClick={() => setShowSetup2FA(false)}>
                                            <i className="fas fa-times"></i> Cancel Setup
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="twofa-enabled">
                                <div className="enabled-info">
                                    <p><i className="fas fa-check-circle" style={{color: '#22c55e'}}></i> Two-factor authentication is active on this ServerCraft instance.</p>
                                    {twoFAStatus.instance_id && (
                                        <p className="instance-info">Instance ID: <code>{twoFAStatus.instance_id.substring(0, 8)}...</code></p>
                                    )}
                                </div>
                                
                                <div className="twofa-actions">
                                    <div className="disable-section">
                                        <h4><i className="fas fa-ban"></i> Disable 2FA</h4>
                                        <p>Enter your current 2FA code to disable:</p>
                                        <div className="disable-input">
                                            <input 
                                                type="text" 
                                                className="form-input code-input"
                                                value={disableCode}
                                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="000000"
                                                maxLength={6}
                                            />
                                            <button className="btn btn-danger" onClick={disable2FA}>
                                                <i className="fas fa-trash"></i> Disable 2FA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Backup Codes Modal */}
                        {showBackupCodes && backupCodes.length > 0 && (
                            <div className="backup-codes-display">
                                <div className="backup-header">
                                    <h4><i className="fas fa-key"></i> Backup Codes</h4>
                                    <p>Save these codes securely. Each can be used once if you lose access to your authenticator app.</p>
                                </div>
                                <div className="backup-codes-grid">
                                    {backupCodes.map((code, index) => (
                                        <code key={index} className="backup-code">{code}</code>
                                    ))}
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowBackupCodes(false)}>
                                    <i className="fas fa-check"></i> I've Saved My Codes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3><i className="fas fa-globe"></i> Network Settings</h3>
                    </div>
                    <div className="card-body">
                        <div className="setting-row">
                            <div className="setting-info">
                                <span className="setting-label">UPnP Auto Port Forward</span>
                                <span className="setting-description">Automatically open ports on your router</span>
                            </div>
                            <label className="toggle">
                                <input type="checkbox" checked={upnpEnabled} onChange={toggleUPnP} data-testid="upnp-toggle" />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="upnp-status">
                            <div className="info-row">
                                <span className="info-label">UPnP Status:</span>
                                <span className="info-value" data-testid="upnp-status-text">
                                    {upnpStatus.available ? (upnpStatus.initialized ? 'Available' : 'Not initialized') : 'Not available'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">External IP:</span>
                                <span className="info-value" data-testid="upnp-external-ip">{upnpStatus.external_ip || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Domain Configuration */}
                <CustomDomainCard showToast={showToast} />

                {/* Server Selling Feature */}
                <ServerSalesCard showToast={showToast} />

                <div className="card">
                    <div className="card-header">
                        <h3><i className="fas fa-folder"></i> Paths</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Servers Directory</label>
                            <div className="path-input">
                                <input type="text" className="form-input" readOnly value={settings.servers_path || ''} data-testid="servers-path" />
                                <button className="btn btn-gray btn-sm">Browse</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Mods Directory</label>
                            <div className="path-input">
                                <input type="text" className="form-input" readOnly value={settings.mods_path || ''} data-testid="mods-path" />
                                <button className="btn btn-gray btn-sm">Browse</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3><i className="fas fa-info-circle"></i> About</h3>
                    </div>
                    <div className="card-body">
                        <div className="about-info">
                            <div className="info-row">
                                <span className="info-label">Version:</span>
                                <span className="info-value" data-testid="about-version">2026.1.6.44D</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Build:</span>
                                <span className="info-value">Windows Edition</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Marketplace View Component - Full Implementation
function MarketplaceView({ showToast }) {
    const [eligibility, setEligibility] = useState(null);
    const [uploadEligibility, setUploadEligibility] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('browse'); // browse, upload, my-templates
    const [tosAgreed, setTosAgreed] = useState(false);
    const [tosContent, setTosContent] = useState('');
    const [showTosModal, setShowTosModal] = useState(false);
    const [tosCheckbox, setTosCheckbox] = useState(false);
    const [selectedGame, setSelectedGame] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [myTemplates, setMyTemplates] = useState([]);
    
    // Upload form state with required security fields
    const [uploadForm, setUploadForm] = useState({
        template_name: '',
        version_id: '',
        author_name: '',
        template_date: new Date().toISOString().split('T')[0],
        template_identifier_id: '',
        game: '',
        description: '',
        screenshots: [],
        config: {},
        tags: []
    });
    const [screenshotPreviews, setScreenshotPreviews] = useState([]);

    const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
    
    // Get auth token from localStorage
    const getToken = () => localStorage.getItem('servercraft_auth_token') || '';

    useEffect(() => {
        checkEligibility();
    }, []);

    const checkEligibility = async () => {
        setLoading(true);
        const token = getToken();
        try {
            // Check marketplace access eligibility
            const eligRes = await fetch(`${API_BASE}/api/marketplace/check-eligibility?token=${token}`);
            const eligData = await eligRes.json();
            setEligibility(eligData);

            if (eligData.eligible) {
                // Check upload eligibility
                const uploadRes = await fetch(`${API_BASE}/api/marketplace/check-upload-eligibility?token=${token}`);
                const uploadData = await uploadRes.json();
                setUploadEligibility(uploadData);

                // Check ToS status
                const tosStatusRes = await fetch(`${API_BASE}/api/marketplace/tos/status?token=${token}`);
                const tosData = await tosStatusRes.json();
                setTosAgreed(tosData.agreed);

                // Load templates
                await loadTemplates();
                await loadMyTemplates();
            }
        } catch (error) {
            console.error('Error checking eligibility:', error);
            setEligibility({ eligible: false, reason: 'error', message: 'Failed to check eligibility' });
        }
        setLoading(false);
    };

    const loadTemplates = async (game = '') => {
        const token = getToken();
        try {
            const url = game 
                ? `${API_BASE}/api/marketplace/templates?game=${game}&token=${token}` 
                : `${API_BASE}/api/marketplace/templates?token=${token}`;
            const res = await fetch(url);
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const loadMyTemplates = async () => {
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/marketplace/my-templates?token=${token}`);
            const data = await res.json();
            setMyTemplates(data.templates || []);
        } catch (error) {
            console.error('Error loading my templates:', error);
        }
    };

    const loadTos = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/marketplace/tos`);
            const data = await res.json();
            setTosContent(data.tos);
            setShowTosModal(true);
        } catch (error) {
            showToast('Failed to load Terms of Service', 'error');
        }
    };

    const handleAgreeToTos = async () => {
        if (!tosCheckbox) {
            showToast('Please check the box to agree to the Terms of Service', 'error');
            return;
        }
        const token = getToken();
        try {
            await fetch(`${API_BASE}/api/marketplace/tos/agree?token=${token}`, { method: 'POST' });
            setTosAgreed(true);
            setShowTosModal(false);
            showToast('You have agreed to the Terms of Service', 'success');
            // Refresh upload eligibility
            const uploadRes = await fetch(`${API_BASE}/api/marketplace/check-upload-eligibility?token=${token}`);
            const uploadData = await uploadRes.json();
            setUploadEligibility(uploadData);
        } catch (error) {
            showToast('Failed to record agreement', 'error');
        }
    };

    const handleScreenshotUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + screenshotPreviews.length > 10) {
            showToast('Maximum 10 screenshots allowed', 'error');
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotPreviews(prev => [...prev, reader.result]);
                setUploadForm(prev => ({
                    ...prev,
                    screenshots: [...prev.screenshots, reader.result]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeScreenshot = (index) => {
        setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
        setUploadForm(prev => ({
            ...prev,
            screenshots: prev.screenshots.filter((_, i) => i !== index)
        }));
    };

    const handleUploadTemplate = async (e) => {
        e.preventDefault();

        // Validation for required security fields
        const missingFields = [];
        if (!uploadForm.template_name) missingFields.push('Template Name');
        if (!uploadForm.version_id) missingFields.push('Version ID');
        if (!uploadForm.author_name) missingFields.push('Author Name');
        if (!uploadForm.template_date) missingFields.push('Template Date');
        if (!uploadForm.template_identifier_id) missingFields.push('Template Identifier ID');
        if (!uploadForm.game) missingFields.push('Game');
        if (!uploadForm.description) missingFields.push('Description');

        if (missingFields.length > 0) {
            showToast(`Template rejected. Missing required fields: ${missingFields.join(', ')}. Please fill in all required information and resubmit.`, 'error');
            return;
        }

        if (uploadForm.screenshots.length < 3) {
            showToast('Template rejected. At least 3 screenshots are required. Please add more screenshots and resubmit.', 'error');
            return;
        }

        if (!tosAgreed) {
            showToast('You must agree to the Terms of Service first', 'error');
            loadTos();
            return;
        }

        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/marketplace/templates?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadForm)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Template uploaded successfully! It will be reviewed before publishing.', 'success');
                setUploadForm({ 
                    template_name: '', 
                    version_id: '', 
                    author_name: '',
                    template_date: new Date().toISOString().split('T')[0],
                    template_identifier_id: '',
                    game: '', 
                    description: '', 
                    screenshots: [], 
                    config: {}, 
                    tags: [] 
                });
                setScreenshotPreviews([]);
                await loadMyTemplates();
                setActiveTab('my-templates');
            } else {
                // Show detailed rejection message with missing fields
                if (data.rejected && data.missing_fields?.length > 0) {
                    showToast(`Template rejected. Missing required fields: ${data.missing_fields.join(', ')}. Please resubmit with all required information.`, 'error');
                } else if (data.reason === 'security_threat') {
                    showToast('Template rejected due to security concerns. Please remove any suspicious code and resubmit.', 'error');
                } else {
                    showToast(data.message || data.errors?.join(', ') || 'Upload failed', 'error');
                }
            }
        } catch (error) {
            showToast('Failed to upload template', 'error');
        }
    };

    const handleDownloadTemplate = async (templateId) => {
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/marketplace/templates/${templateId}/download?token=${token}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                // Create downloadable JSON file
                const template = data.template;
                const blob = new Blob([JSON.stringify(template.config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${template.name.replace(/\s+/g, '_')}_v${template.version}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Template downloaded successfully!', 'success');
            }
        } catch (error) {
            showToast('Failed to download template', 'error');
        }
    };

    const handleReportTemplate = async (templateId, reason) => {
        const token = getToken();
        try {
            await fetch(`${API_BASE}/api/marketplace/templates/${templateId}/report?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            showToast('Report submitted. Thank you for helping keep the marketplace safe!', 'success');
        } catch (error) {
            showToast('Failed to submit report', 'error');
        }
    };

    // Loading state
    if (loading) {
        return (
            <section className="view-section marketplace-view" data-testid="marketplace-view">
                <div className="section-header">
                    <h2><i className="fas fa-store"></i> Template Marketplace</h2>
                </div>
                <div className="loading-container">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Checking eligibility...</p>
                </div>
            </section>
        );
    }

    // Not eligible - show message
    if (!eligibility?.eligible) {
        return (
            <section className="view-section marketplace-view" data-testid="marketplace-view">
                <div className="section-header">
                    <h2><i className="fas fa-store"></i> Template Marketplace</h2>
                </div>
                <div className="marketplace-content">
                    <div className="marketplace-disabled-overlay">
                        <div className="disabled-message-card account-too-new">
                            <div className="disabled-icon">
                                <i className="fas fa-clock"></i>
                            </div>
                            <h3><i className="fas fa-exclamation-triangle"></i> Account Too New</h3>
                            <p className="disabled-text">
                                {eligibility?.message || "This account is too new to access our template marketplace. Please wait 24 hours. If you are facing any issues please submit a bug report in our Discord server."}
                            </p>
                            {eligibility?.hours_remaining && (
                                <div className="time-remaining">
                                    <i className="fas fa-hourglass-half"></i>
                                    <span>{Math.ceil(eligibility.hours_remaining)} hours remaining</span>
                                </div>
                            )}
                            <a 
                                href="https://discord.gg/ykkkjwDnAD" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="discord-link"
                            >
                                <i className="fab fa-discord"></i> Report Issue on Discord
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="view-section marketplace-view" data-testid="marketplace-view">
            <div className="section-header">
                <h2><i className="fas fa-store"></i> Template Marketplace</h2>
            </div>

            {/* Tabs */}
            <div className="marketplace-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                    onClick={() => setActiveTab('browse')}
                >
                    <i className="fas fa-search"></i> Browse Templates
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    <i className="fas fa-upload"></i> Upload Template
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'my-templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my-templates')}
                >
                    <i className="fas fa-folder"></i> My Templates
                </button>
            </div>

            {/* Browse Tab */}
            {activeTab === 'browse' && (
                <div className="marketplace-browse">
                    {/* Filters */}
                    <div className="marketplace-filters">
                        <select 
                            value={selectedGame} 
                            onChange={(e) => { setSelectedGame(e.target.value); loadTemplates(e.target.value); }}
                            className="form-select"
                        >
                            <option value="">All Games</option>
                            <option value="arma3">Arma 3</option>
                            <option value="dayz_vanilla">DayZ (Vanilla)</option>
                            <option value="dayz_modded">DayZ (Modded)</option>
                            <option value="rust">Rust</option>
                            <option value="minecraft">Minecraft</option>
                            <option value="valheim">Valheim</option>
                        </select>
                    </div>

                    {/* Templates Grid */}
                    <div className="templates-grid">
                        {templates.length === 0 ? (
                            <div className="no-templates">
                                <i className="fas fa-box-open"></i>
                                <p>No templates found. Be the first to upload one!</p>
                            </div>
                        ) : (
                            templates.map(template => (
                                <div key={template.id} className="template-card">
                                    <div className="template-image">
                                        {template.screenshots?.[0] ? (
                                            <img src={template.screenshots[0]} alt={template.name} />
                                        ) : (
                                            <div className="template-image-placeholder">
                                                <i className="fas fa-image"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="template-info">
                                        <h4>{template.name}</h4>
                                        <p className="template-version">v{template.version}</p>
                                        <p className="template-author">by {template.author}</p>
                                        <div className="template-stats">
                                            <span><i className="fas fa-download"></i> {template.downloads}</span>
                                            <span><i className="fas fa-gamepad"></i> {template.game}</span>
                                        </div>
                                    </div>
                                    <div className="template-actions">
                                        <button 
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleDownloadTemplate(template.id)}
                                        >
                                            <i className="fas fa-download"></i> Download
                                        </button>
                                        <button 
                                            className="btn btn-gray btn-sm"
                                            onClick={() => setSelectedTemplate(template)}
                                        >
                                            <i className="fas fa-eye"></i> View
                                        </button>
                                        <button 
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleReportTemplate(template.id, 'spam')}
                                            title="Report template"
                                        >
                                            <i className="fas fa-flag"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="marketplace-upload">
                    {/* Upload eligibility check */}
                    {!uploadEligibility?.eligible ? (
                        <div className="upload-blocked">
                            <div className="card warning-card">
                                <div className="card-body">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <h4>Cannot Upload</h4>
                                    <p>{uploadEligibility?.message || "You are not eligible to upload at this time."}</p>
                                    {uploadEligibility?.reason === 'tos_not_agreed' && (
                                        <button className="btn btn-primary" onClick={loadTos}>
                                            <i className="fas fa-file-contract"></i> View Terms of Service
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUploadTemplate} className="upload-form">
                            <div className="upload-info-card">
                                <h4><i className="fas fa-shield-alt"></i> Required Template Information</h4>
                                <p>All fields marked with * are required for security verification. Templates missing any required information will be rejected.</p>
                                <ul>
                                    <li><strong>Version ID</strong> - Unique version identifier</li>
                                    <li><strong>Author Name</strong> - Your display name</li>
                                    <li><strong>Template Date</strong> - Creation date</li>
                                    <li><strong>Template Name</strong> - Descriptive name</li>
                                    <li><strong>Template Identifier ID</strong> - Unique template ID</li>
                                    <li>At least 3 screenshots required</li>
                                    <li>You can upload 1 template per month</li>
                                </ul>
                            </div>

                            <div className="form-group">
                                <label>Template Name *</label>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    value={uploadForm.template_name}
                                    onChange={(e) => setUploadForm({...uploadForm, template_name: e.target.value})}
                                    placeholder="My Awesome Server Template"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Version ID *</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={uploadForm.version_id}
                                        onChange={(e) => setUploadForm({...uploadForm, version_id: e.target.value})}
                                        placeholder="1.0.0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Template Identifier ID *</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={uploadForm.template_identifier_id}
                                        onChange={(e) => setUploadForm({...uploadForm, template_identifier_id: e.target.value})}
                                        placeholder="unique-template-id-123"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Author Name *</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={uploadForm.author_name}
                                        onChange={(e) => setUploadForm({...uploadForm, author_name: e.target.value})}
                                        placeholder="Your display name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Template Date *</label>
                                    <input 
                                        type="date" 
                                        className="form-input"
                                        value={uploadForm.template_date}
                                        onChange={(e) => setUploadForm({...uploadForm, template_date: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Game *</label>
                                <select 
                                    className="form-select"
                                    value={uploadForm.game}
                                    onChange={(e) => setUploadForm({...uploadForm, game: e.target.value})}
                                    required
                                >
                                    <option value="">Select Game</option>
                                    <option value="arma3">Arma 3</option>
                                    <option value="dayz_vanilla">DayZ (Vanilla)</option>
                                    <option value="dayz_modded">DayZ (Modded)</option>
                                    <option value="rust">Rust</option>
                                    <option value="minecraft">Minecraft</option>
                                    <option value="valheim">Valheim</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea 
                                    className="form-textarea"
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                                    placeholder="Describe your template..."
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Screenshots * (Minimum 3, Maximum 10)</label>
                                <div className="screenshot-upload">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        onChange={handleScreenshotUpload}
                                        id="screenshot-input"
                                        style={{display: 'none'}}
                                    />
                                    <label htmlFor="screenshot-input" className="btn btn-gray">
                                        <i className="fas fa-images"></i> Add Screenshots ({screenshotPreviews.length}/10)
                                    </label>
                                </div>
                                <div className="screenshot-previews">
                                    {screenshotPreviews.map((preview, index) => (
                                        <div key={index} className="screenshot-preview">
                                            <img src={preview} alt={`Screenshot ${index + 1}`} />
                                            <button 
                                                type="button"
                                                className="remove-screenshot"
                                                onClick={() => removeScreenshot(index)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {screenshotPreviews.length < 3 && (
                                    <p className="help-text error">
                                        <i className="fas fa-exclamation-circle"></i> {3 - screenshotPreviews.length} more screenshot(s) required
                                    </p>
                                )}
                            </div>

                            {!tosAgreed && (
                                <div className="tos-agreement">
                                    <button type="button" className="btn btn-gray" onClick={loadTos}>
                                        <i className="fas fa-file-contract"></i> Read Terms of Service
                                    </button>
                                    <p className="help-text">You must agree to the Terms of Service before uploading</p>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-lg"
                                disabled={!tosAgreed || screenshotPreviews.length < 3}
                            >
                                <i className="fas fa-upload"></i> Upload Template
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* My Templates Tab */}
            {activeTab === 'my-templates' && (
                <div className="my-templates">
                    {myTemplates.length === 0 ? (
                        <div className="no-templates">
                            <i className="fas fa-folder-open"></i>
                            <p>You haven't uploaded any templates yet.</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                                <i className="fas fa-upload"></i> Upload Your First Template
                            </button>
                        </div>
                    ) : (
                        <div className="templates-list">
                            {myTemplates.map(template => (
                                <div key={template.id} className="my-template-card">
                                    <div className="template-status">
                                        <span className={`status-badge ${template.status}`}>
                                            {template.status === 'pending_review' && <><i className="fas fa-clock"></i> Pending Review</>}
                                            {template.status === 'approved' && <><i className="fas fa-check"></i> Approved</>}
                                            {template.status === 'rejected' && <><i className="fas fa-times"></i> Rejected</>}
                                        </span>
                                    </div>
                                    <h4>{template.name} <span className="version">v{template.version}</span></h4>
                                    <p>{template.description}</p>
                                    <div className="template-meta">
                                        <span><i className="fas fa-gamepad"></i> {template.game}</span>
                                        <span><i className="fas fa-download"></i> {template.downloads} downloads</span>
                                        <span><i className="fas fa-calendar"></i> {new Date(template.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Terms of Service Modal */}
            {showTosModal && (
                <div className="modal tos-modal">
                    <div className="modal-overlay" onClick={() => setShowTosModal(false)}></div>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3><i className="fas fa-file-contract"></i> Terms of Service</h3>
                            <button className="modal-close" onClick={() => setShowTosModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body tos-content">
                            <pre>{tosContent}</pre>
                        </div>
                        <div className="modal-footer tos-footer">
                            <label className="tos-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={tosCheckbox}
                                    onChange={(e) => setTosCheckbox(e.target.checked)}
                                />
                                <span>I have read and agree to the Terms of Service</span>
                            </label>
                            <button 
                                className="btn btn-danger btn-lg tos-agree-btn"
                                onClick={handleAgreeToTos}
                                disabled={!tosCheckbox}
                            >
                                I Agree to the Terms of Service
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Detail Modal */}
            {selectedTemplate && (
                <div className="modal template-detail-modal">
                    <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}></div>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{selectedTemplate.name}</h3>
                            <button className="modal-close" onClick={() => setSelectedTemplate(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="template-screenshots">
                                {selectedTemplate.screenshots?.map((ss, i) => (
                                    <img key={i} src={ss} alt={`Screenshot ${i + 1}`} />
                                ))}
                            </div>
                            <div className="template-details">
                                <p><strong>Version:</strong> {selectedTemplate.version}</p>
                                <p><strong>Author:</strong> {selectedTemplate.author}</p>
                                <p><strong>Game:</strong> {selectedTemplate.game}</p>
                                <p><strong>Downloads:</strong> {selectedTemplate.downloads}</p>
                                <p><strong>Description:</strong></p>
                                <p>{selectedTemplate.description}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-primary"
                                onClick={() => { handleDownloadTemplate(selectedTemplate.id); setSelectedTemplate(null); }}
                            >
                                <i className="fas fa-download"></i> Download Template
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={() => { handleReportTemplate(selectedTemplate.id, 'inappropriate'); setSelectedTemplate(null); }}
                            >
                                <i className="fas fa-flag"></i> Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

// About View Component
// Fallback version history data
const FALLBACK_VERSION_HISTORY = [
    {
        version: "2026.1.6.44D",
        date: "2026-01-06",
        type: "major",
        changes: [
            "Added Node Clustering system for multi-machine server management",
            "Node Cluster Linking via local Machine IPs - first node becomes master",
            "Resource pooling: CPU Cores/Threads, RAM, Storage, and Port Allocations",
            "Pterodactyl-style port allocation with IP:Port range assignments",
            "Color-coded resource tags (CPU=blue, RAM=green, Storage=purple, Ports=orange)",
            "Cluster health monitoring and node status tracking",
            "Shared network storage support (NAS/SAN paths)",
            "Central port registry to prevent conflicts across nodes",
            "🌐 Custom Domain Support - Replace DuckDNS with your own domain",
            "🔍 DNS Propagation Checker with real-time status indicators",
            "📝 Dynamic DNS Setup Instructions (DuckDNS CNAME method)",
            "📝 Static IP Configuration Support",
            "🛒 Server Selling Feature (Optional) - Sell game servers directly from ServerCraft",
            "💳 PayPal Integration with sandbox/live mode testing",
            "📦 3 Default Server Packages (Basic/Standard/Premium)",
            "💰 Customizable pricing and currency support",
            "🔐 Secure API credential storage with masked display",
            "🌐 Secondary subdomain support for server sales",
            "Masked API key display for security",
            "Full CRUD operations for clusters, nodes, ports, and storage",
            "🚀 QOL: Auto-Discovery of Local Network Nodes via UDP broadcast",
            "🎯 QOL: Automatic Port Management - Smart port allocation with 100-port range per game",
            "🛒 Template Marketplace preview (Coming Soon - Currently Disabled)",
            "🔐 Two-Factor Authentication (2FA) with QR code setup",
            "🌐 Website Integration: Connected to servercraft.dev for analytics sync"
        ]
    },
    {
        version: "2025.20.12.21C-bug",
        date: "2025-12-21",
        type: "minor",
        changes: [
            "Added local authentication system with username/password login",
            "Default credentials (Admin/Password123!) must be changed on first login",
            "Added security questions for password recovery (3 of 5 questions)",
            "Added 'Remember me for 30 days' option to stay logged in",
            "Added AFK auto-logout after 15 minutes of inactivity",
            "Added winter theme with animated falling snowflakes (Dec-Feb)",
            "Added user badge and logout button to header",
            "Replaced all placeholder emojis with Font Awesome icons"
        ]
    },
    {
        version: "2026.6.1.C",
        date: "2026-01-06",
        type: "major",
        changes: [
            "Added 6 new supported games: Ground Branch, ICARUS, No One Survived, GTA V RP (FiveM), Source Engine, expanded DayZ support",
            "Added game tags with color coding (milsim, survival, pvp, roleplay, etc.)",
            "Further optimized resource usage for both offline and online servers",
            "Added resource warning about heavy gameplay instances",
            "Started Steam Workshop integration - browse and download mods for any game",
            "Enhanced mod support for games not requiring ownership",
            "Added disclaimer and warranty notice to specs popup"
        ]
    },
    {
        version: "2025.19.12.19B-fix",
        date: "2025-12-19",
        type: "fix",
        changes: [
            "Fixed PyInstaller executable crash on startup",
            "Added comprehensive error handling and debugging output",
            "Added Start-ServerCraft.bat launcher for better error visibility",
            "Added 30+ hidden imports for PyInstaller compatibility",
            "Error logs now saved to servercraft_error.log",
            "Console window now shows import status during startup"
        ]
    },
    {
        version: "2025.19.12.0B",
        date: "2025-12-19",
        type: "minor",
        changes: [
            "Recompiled the full panel into a proper portable executable file instead of unpacked data",
            "Added PyInstaller to the required packages to compile the panel properly",
            "Added About tab with version history and update notes"
        ]
    },
    {
        version: "2025.18.12.0A",
        date: "2025-12-18",
        type: "major",
        changes: [
            "Initial release of ServerCraft Windows Edition",
            "Native Windows application without Docker dependency",
            "SteamCMD integration for downloading and updating game servers",
            "Support for Steam Guard 2FA codes",
            "UPnP automatic port forwarding",
            "Real-time system monitoring (CPU, RAM, Network, Disk)",
            "Tabbed interface for managing multiple servers",
            "Steam Workshop mod downloading support",
            "Support for Arma 3, DayZ, Rust, Arma Reforger, Project Zomboid, Valheim, Squad, Minecraft"
        ]
    }
];

function AboutView() {
    const [aboutData, setAboutData] = useState({
        name: 'ServerCraft - Windows Edition',
        version: '2026.1.6.44D',
        copyright: '© 2026 TierOne Development',
        version_history: FALLBACK_VERSION_HISTORY
    });

    useEffect(() => {
        const fetchAbout = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/about`);
                if (response.ok) {
                    const data = await response.json();
                    setAboutData(data);
                }
            } catch (error) {
                // Use fallback data - already set in initial state
                console.log('Using fallback about data');
            }
        };
        fetchAbout();
    }, []);

    return (
        <section className="view-section about-view" data-testid="about-view">
            <div className="section-header">
                <h2>About ServerCraft</h2>
            </div>
            <div className="about-content">
                {/* App Info Card */}
                <div className="card about-card">
                    <div className="card-header">
                        <h3><i className="fas fa-gamepad"></i> Application Info</h3>
                    </div>
                    <div className="card-body">
                        <div className="app-branding">
                            <div className="app-logo"><i className="fas fa-gamepad"></i></div>
                            <div className="app-details">
                                <h1 className="app-title">{aboutData?.name || 'ServerCraft - Windows Edition'}</h1>
                                <p className="app-version">Version {aboutData?.version || '2025.19.12.0B'}</p>
                                <p className="app-copyright">{aboutData?.copyright || '© 2026 TierOne Development'}</p>
                            </div>
                        </div>
                        <div className="app-description">
                            <p>
                                ServerCraft is a powerful, lightweight game server management panel designed for Windows. 
                                Manage multiple game servers with ease using our intuitive interface.
                            </p>
                        </div>
                        <div className="app-features">
                            <h4>Key Features:</h4>
                            <ul>
                                <li><i className="fas fa-crosshairs"></i> Multi-game server management</li>
                                <li><i className="fas fa-chart-line"></i> Real-time system monitoring</li>
                                <li><i className="fab fa-steam"></i> SteamCMD integration</li>
                                <li><i className="fas fa-network-wired"></i> UPnP automatic port forwarding</li>
                                <li><i className="fas fa-puzzle-piece"></i> Steam Workshop mod support</li>
                                <li><i className="fas fa-laptop"></i> Portable executable - no installation required</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Version History Card */}
                <div className="card version-history-card">
                    <div className="card-header">
                        <h3><i className="fas fa-history"></i> Version History</h3>
                    </div>
                    <div className="card-body">
                        <div className="version-list">
                            {aboutData?.version_history?.map((release, index) => (
                                <div key={release.version} className={`version-item ${index === 0 ? 'latest' : ''} ${release.type === 'fix' ? 'fix-release' : ''}`}>
                                    <div className="version-header">
                                        <span className="version-number">{release.version}</span>
                                        <span className={`version-type ${release.type}`}>
                                            {release.type === 'major' ? <><i className="fas fa-rocket"></i> Major Release</> : release.type === 'fix' ? <><i className="fas fa-wrench"></i> Bug Fix</> : <><i className="fas fa-code-branch"></i> Minor Update</>}
                                        </span>
                                        <span className="version-date">{release.date}</span>
                                    </div>
                                    <ul className="version-changes">
                                        {release.changes.map((change, i) => (
                                            <li key={i}>{change}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* System Info Card */}
                <div className="card system-info-card">
                    <div className="card-header">
                        <h3><i className="fas fa-desktop"></i> System Requirements</h3>
                    </div>
                    <div className="card-body">
                        <div className="requirements-grid">
                            <div className="requirement-section">
                                <h4><i className="fas fa-circle" style={{color: '#ef4444', fontSize: '8px', marginRight: '8px'}}></i>Minimum</h4>
                                <ul>
                                    <li><strong>CPU:</strong> 4 Cores</li>
                                    <li><strong>RAM:</strong> 8 GB</li>
                                    <li><strong>Storage:</strong> 50 GB SSD</li>
                                    <li><strong>OS:</strong> Windows 10/11</li>
                                </ul>
                            </div>
                            <div className="requirement-section">
                                <h4><i className="fas fa-circle" style={{color: '#22c55e', fontSize: '8px', marginRight: '8px'}}></i>Recommended</h4>
                                <ul>
                                    <li><strong>CPU:</strong> 8+ Cores</li>
                                    <li><strong>RAM:</strong> 32 GB+</li>
                                    <li><strong>Storage:</strong> 500 GB+ NVMe</li>
                                    <li><strong>OS:</strong> Windows Server 2022</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credits Card */}
                <div className="card credits-card">
                    <div className="card-header">
                        <h3><i className="fas fa-users"></i> Credits</h3>
                    </div>
                    <div className="card-body">
                        <p><strong>Developed by:</strong> TierOne Development</p>
                        <p><strong>Built with:</strong> Python, FastAPI, React</p>
                        <p><strong>Special Thanks:</strong> The gaming community</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Create Server Modal Component
function CreateServerModal({ games, onClose, onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        game: '',
        port: 27015,
        query_port: 27016,
        max_players: 32,
        custom_params: '',
        auto_start: false,
        upnp_enabled: false
    });

    const handleGameChange = (e) => {
        const game = e.target.value;
        const defaults = GAME_DEFAULTS[game] || { port: 27015, queryPort: 27016 };
        setFormData(prev => ({
            ...prev,
            game,
            port: defaults.port,
            query_port: defaults.queryPort
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(formData);
    };

    const requiresOwnership = formData.game && GAME_DEFAULTS[formData.game]?.requiresOwnership;

    return (
        <div className="modal" data-testid="create-server-modal">
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Create New Server</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Server Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="My Awesome Server"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                                data-testid="server-name-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Game</label>
                            <select
                                className="form-select"
                                value={formData.game}
                                onChange={handleGameChange}
                                required
                                data-testid="server-game-select"
                            >
                                <option value="">Select a game...</option>
                                <option value="arma3">Arma 3</option>
                                <option value="dayz">DayZ</option>
                                <option value="rust">Rust</option>
                                <option value="arma_reforger">Arma Reforger</option>
                                <option value="project_zomboid">Project Zomboid</option>
                                <option value="valheim">Valheim</option>
                                <option value="squad">Squad</option>
                                <option value="minecraft">Minecraft</option>
                            </select>
                            {requiresOwnership && (
                                <p className="form-warning">
                                    ⚠️ This game requires Steam account ownership to download server files.
                                </p>
                            )}
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Game Port</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.port}
                                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                                    required
                                    data-testid="server-port-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Query Port</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.query_port}
                                    onChange={(e) => setFormData(prev => ({ ...prev, query_port: parseInt(e.target.value) }))}
                                    data-testid="server-query-port-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Max Players</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.max_players}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_players: parseInt(e.target.value) }))}
                                    min="1"
                                    max="256"
                                    data-testid="server-max-players-input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Custom Parameters</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Additional launch parameters"
                                value={formData.custom_params}
                                onChange={(e) => setFormData(prev => ({ ...prev, custom_params: e.target.value }))}
                                data-testid="server-custom-params-input"
                            />
                        </div>
                        <div className="form-row">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.auto_start}
                                    onChange={(e) => setFormData(prev => ({ ...prev, auto_start: e.target.checked }))}
                                    data-testid="server-auto-start-checkbox"
                                />
                                <span>Auto-start on launch</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.upnp_enabled}
                                    onChange={(e) => setFormData(prev => ({ ...prev, upnp_enabled: e.target.checked }))}
                                    data-testid="server-upnp-checkbox"
                                />
                                <span>Enable UPnP</span>
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-gray" onClick={onClose} data-testid="cancel-create-btn">Cancel</button>
                        <button type="submit" className="btn btn-green" data-testid="submit-create-btn">Create Server</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default App;
