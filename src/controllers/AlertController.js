const AlertService = require('../services/alertService');

exports.getAlerts = async (req, res, next) => {
    try {
        const alerts = await AlertService.getAlerts();
        res.json({ success: true, data: alerts });
    } catch (error) { next(error); }
};
