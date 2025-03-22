"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    const originalToken = process.env.TOKEN;
    if (token !== originalToken) {
        return res.status(401).send('Access Denied');
    }
    next();
}
;
//# sourceMappingURL=auth.middleware.js.map