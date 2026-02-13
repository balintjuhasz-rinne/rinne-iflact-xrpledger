import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiInternalServerErrorResponse, ApiOkResponse } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';

interface ContractDTO {
  name: string
  start_date: string
  end_date: string
  description: string
  approval_ratio: number
  emergency: boolean
  company_id: number
  cosec_id: number
  type: number
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) { }

  @Get('/health-check')
  @ApiOkResponse({
    description: 'Application are healthy!'
  })
  @ApiInternalServerErrorResponse({
    description: "If the Application has any issue with starting up, or ha other issues!",
  })
  healthCheck() {
    return "ok"
  }

  @EventPattern('CREATE_PAYMENT')
  async handlePayment(@Payload() payload) {

    const body = {
      ...payload,
    }

    console.log("body", body);

    // 1. Payment from Our Wallet to Broker 1 Wallet
    await this.appService.sendPayment({
      secret: body.ourSeed,
      destination: body.broker1Address,
      amount: body.payment1Amount,
      currency: body.payment1Currency,
      issuer: body.issuer,
      contractHash: body.contractHash
    });

    // 2. CheckCreate from Our Wallet to Client Wallet
    const checkCreateTx = await this.appService.createCheck({
      secret: body.clientSeed,
      destination: body.ourAddress,
      sendMax: body.checkCreateSendMaxAmount,
      currency: body.checkCreateCurrency,
      issuer: body.issuer,
      contractHash: body.contractHash
    });

    // waiting 3-5s
    await new Promise(res => setTimeout(res, 5000));
    // CHECK_INDEX:
    const checkId = await this.appService.findCheckIdFor({
      account: body.clientAddress,
      destination: body.ourAddress,
      amount: body.checkCreateAmount,
      currency: body.checkCreateCurrency,
      issuer: body.issuer
    });
    if (!checkId) throw new Error('CheckID not found!');

    // 3. Payment from Broker 2 Wallet to Client Wallet
    await this.appService.sendPayment({
      secret: body.broker2Seed,
      destination: body.clientAddress,
      amount: body.payment2Amount,
      currency: body.payment2Currency,
      issuer: body.issuer,
      contractHash: body.contractHash
    });

    // 4. CheckCash from Our Wallet to Client Wallet
    const delay = (body.delaySeconds ?? 120) * 1000;
    console.log("delay", delay);
    new Promise(res => setTimeout(() => {
      //Delayed code in here
      console.warn("Delayed System run, tmp", delay)
      //Some delayed executions
      res(true);
    }, delay));

    const checkCashTx = await this.appService.cashCheck({
      secret: body.ourSeed,
      checkId: checkId,
      amount: body.checkCashAmount,
      currency: body.checkCashCurrency,
      issuer: body.issuer,
      contractHash: body.contractHash
    });
    console.log("Completed");
    //THis will be sent back to the other service
    return {
      status: 'done',
      checkCreateTx,
      checkCashTx,
    }
  }

}
