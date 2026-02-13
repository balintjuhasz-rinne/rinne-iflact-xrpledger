import { Module } from '@nestjs/common';
import { AppController, PaymentsController } from './app.controller';
import { AppService } from './app.service';

@Module({
  exports: [],
  controllers: [AppController, PaymentsController],
  providers: [
    AppService,
  ],
})
export class AppModule { }

