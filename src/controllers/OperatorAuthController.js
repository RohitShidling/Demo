const OperatorAuthService = require('../services/operatorAuthService');

exports.register = async (req, res, next) => {
    try {
        const { name, email, otp } = req.body;
        if (!name || !email || !otp) {
            return res.status(400).json({ success: false, message: 'name, email, and otp are required' });
        }
        const result = await OperatorAuthService.register({ name, email, otp });
        res.status(201).json({ success: true, message: result.message, data: result.user });
    } catch (error) { next(error); }
};

exports.requestRegisterOtp = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'name and email are required' });
        }
        const result = await OperatorAuthService.requestRegisterOtp({ name, email });
        res.status(200).json({ success: true, message: result.message, data: { email, expiresAt: result.expiresAt } });
    } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'email and otp are required' });
        }
        const result = await OperatorAuthService.login({ email, otp });
        res.status(200).json({ success: true, message: 'Login successful', data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (error) { next(error); }
};

exports.requestLoginOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'email is required' });
        }
        const result = await OperatorAuthService.requestLoginOtp({ email });
        res.status(200).json({ success: true, message: result.message, data: { email, expiresAt: result.expiresAt } });
    } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
    try {
        const result = await OperatorAuthService.logout(req.user.id);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken is required' });
        const result = await OperatorAuthService.refreshToken(refreshToken);
        res.status(200).json({ success: true, message: 'Token refreshed', data: result });
    } catch (error) { next(error); }
};

exports.getProfile = async (req, res, next) => {
    try {
        const user = await OperatorAuthService.getProfile(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};
