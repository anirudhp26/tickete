import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './middleware/logger.middleware';
import { authenticate } from './middleware/auth.middleware';
import { DbService } from './services/db/db.service';
import { ConfigService } from '@nestjs/config';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.use(logger)
  app.use(authenticate)
  
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  app.enableShutdownHooks();
}

main();
