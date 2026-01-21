import './types';
import { config } from './config';
import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`ReJoEs backend listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});
