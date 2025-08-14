import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const PORT = process.env.PORT ?? 3000;
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // cors
  app.enableCors({
    origin: '*', // allowing requests from all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // swagger
  const config = new DocumentBuilder()
    .setTitle('Amplify-Manager Api')
    .setDescription('Interfaces with the Amplify Web Dashboard')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header' }, 'x-api-key')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(PORT);
  console.log(`App is listening on port ${PORT}...`);
}
bootstrap()
  .then()
  .catch((error) => console.error(error));
