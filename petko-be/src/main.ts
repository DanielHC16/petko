import { ConfigService } from '@nestjs/config'
import { API_PREFIX, createApp } from './bootstrap'

async function bootstrap(): Promise<void> {
  const app = await createApp()
  const config = app.get(ConfigService)

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
  console.log(`🐾 Petko API running on http://localhost:${port}/${API_PREFIX}`)
}

void bootstrap()
