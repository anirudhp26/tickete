"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const logger_middleware_1 = require("./middleware/logger.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
async function main() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(logger_middleware_1.logger);
    app.use(auth_middleware_1.authenticate);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    app.enableShutdownHooks();
}
main();
//# sourceMappingURL=main.js.map