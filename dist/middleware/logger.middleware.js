"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = logger;
function logger(req, res, next) {
    console.log(`Request URL: ${req.originalUrl} - Method: ${req.method} - Time: ${new Date()}`);
    next();
}
;
//# sourceMappingURL=logger.middleware.js.map