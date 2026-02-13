import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {

  const microserviceApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:27194'],
      queue: 'xrp_queue',
      queueOptions: {
        durable: true
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('XRP Ledger Service')
    .setDescription('XRP Ledger Service')
    .setVersion('1.0')
    .build();

  await microserviceApp.listen();

  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
}

bootstrap();
