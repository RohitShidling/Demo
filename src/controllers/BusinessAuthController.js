const BusinessAuthService = require('../services/businessAuthService');

exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'username, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        const result = await BusinessAuthService.register({ username, email, password });
        res.status(201).json({ success: true, message: result.message, data: result.user });
    } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'email and password are required' });
        }
        const result = await BusinessAuthService.login({ email, password });
        res.status(200).json({ success: true, message: 'Login successful', data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
    try {
        const result = await BusinessAuthService.logout(req.user.id);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken is required' });
        const result = await BusinessAuthService.refreshToken(refreshToken);
        res.status(200).json({ success: true, message: 'Token refreshed', data: result });
    } catch (error) { next(error); }
};

exports.getProfile = async (req, res, next) => {
    try {
        const user = await BusinessAuthService.getProfile(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};
