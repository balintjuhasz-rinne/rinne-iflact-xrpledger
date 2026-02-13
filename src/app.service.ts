import { Injectable, Logger } from '@nestjs/common';
import { Client, Wallet, TrustSetFlags } from 'xrpl';


@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  private client: Client;
  private readonly logger = new Logger(AppService.name);

  constructor() {
    // Testnet endpoint
    this.client = new Client('wss://s.altnet.rippletest.net:51233');
    this.client.connect();
  }

  // RLUSD currency HEX
  static RLUSD_HEX = '524C555344000000000000000000000000000000';

  getRlusdAmount(value: string, issuer: string) {
    return {
      currency: AppService.RLUSD_HEX,
      value: value,
      issuer,
    };
  }

  addMemo(tx: any, contractHash: string) {
    tx.Memos = [
      {
        Memo: {
          MemoData: Buffer.from(contractHash, 'utf8').toString('hex'),
        },
      },
    ];
  }

  async accountSet({
    secret,
    set_flag,
    clear_flag
  }: {
    secret: string,
    set_flag?: number,
    clear_flag?: number
  }) {
    const wallet = Wallet.fromSeed(secret);
    const tx: any = {
      TransactionType: 'AccountSet',
      Account: wallet.classicAddress,
    };
    if (set_flag) tx.SetFlag = set_flag;
    if (clear_flag) tx.ClearFlag = clear_flag;

    const prepared = await this.client.autofill(tx as any);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    this.logger.log(`AccountSet result: ${(result.result as any).engine_result}`);
    return result;
  }

  async enableRippling({ secret }: { secret: string }) {
    const wallet = Wallet.fromSeed(secret);
    const tx = {
      TransactionType: 'AccountSet',
      Account: wallet.classicAddress,
      Flags: 0x00800000, // lsfDefaultRipple
    };
    const prepared = await this.client.autofill(tx as any);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);
    return result;
  }

  async clientHasTrustline({
    account,
    issuer,
    currency = AppService.RLUSD_HEX,
  }: {
    account: string,
    issuer: string,
    currency?: string,
  }) {
    const res = await this.client.request({
      command: "account_lines",
      account
    });
    return res.result.lines.some(
      (l: any) =>
        l.currency === currency &&
        l.account === issuer
    );
  }

  async createTrustline({
    secret,
    issuer,
    currency = AppService.RLUSD_HEX,
    limit = '1000000',
  }: {
    secret: string;
    issuer: string;
    currency?: string;
    limit?: string;
  }) {
    const wallet = Wallet.fromSeed(secret);

    const tx = {
      TransactionType: 'TrustSet',
      Account: wallet.classicAddress,
      LimitAmount: {
        currency,
        issuer,
        value: limit,
      },
      Flags: TrustSetFlags.tfClearNoRipple,
      // ClearFlag: 131072, // tfClearNoRipple
    };
    const prepared = await this.client.autofill(tx as any);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);
    this.logger.log(
      `TrustLine created: ${wallet.classicAddress} -> ${issuer} [${currency}]`,
    );
    return result;
  }

  async ensureTrustlineForRlusd({
    clientSeed,
    clientAddress,
    issuer,
    currencyHex = AppService.RLUSD_HEX,
    limit = "1000000"
  }: {
    clientSeed: string,
    clientAddress: string,
    issuer: string,
    currencyHex?: string,
    limit?: string,
  }) {
    const has = await this.clientHasTrustline({
      account: clientAddress,
      issuer,
      currency: currencyHex,
    });
    if (has) {
      this.logger.log('Trustline exists.');
      return { created: false, tx: null };
    }

    const resultTx = await this.createTrustline({
      secret: clientSeed,
      issuer,
      currency: currencyHex,
      limit,
    });

    let waited = 0;
    let ok = false;
    while (waited < 20) {
      await new Promise(res => setTimeout(res, 500));
      if (await this.clientHasTrustline({ account: clientAddress, issuer, currency: currencyHex })) {
        ok = true;
        break;
      }
      waited++;
    }
    if (!ok) {
      throw new Error('Trustline creation failed!');
    }
    return { created: true, tx: resultTx };
  }

  // Payment
  async sendPayment({
    secret,
    destination,
    amount,
    currency,
    issuer,
    contractHash,
    destinationTag
  }: {
    secret: string,
    destination: string,
    amount: string,
    currency: string,
    issuer: string,
    contractHash: string,
    destinationTag?: number
  }) {
    const wallet = Wallet.fromSeed(secret);

    const tx: any = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: destination,
      Amount:
        currency === 'RLUSD'
          ? this.getRlusdAmount(amount, issuer)
          : {
              currency,
              value: amount,
              issuer,
            },
    };

    if (destinationTag) tx.DestinationTag = destinationTag;
    this.addMemo(tx, contractHash);

    const prepared = await this.client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);
    this.logger.log(`Payment: ${result.result.hash}`);

    return result;
  }

  // CheckCreate
  async createCheck({
    secret,
    destination,
    sendMax,
    currency,
    issuer,
    contractHash,
    destinationTag,
    expiration
  }: {
    secret: string,
    destination: string,
    sendMax: string,
    currency: string,
    issuer: string,
    contractHash: string,
    destinationTag?: number,
    expiration?: number
  }) {
    const wallet = Wallet.fromSeed(secret);

    const tx: any = {
      TransactionType: 'CheckCreate',
      Account: wallet.classicAddress,
      Destination: destination,
      SendMax:
        currency === 'RLUSD'
          ? this.getRlusdAmount(sendMax, issuer)
          : {
              currency,
              value: sendMax,
              issuer,
            },
    };

    if (destinationTag) tx.DestinationTag = destinationTag;
    if (expiration) tx.Expiration = expiration;
    this.addMemo(tx, contractHash);

    const prepared = await this.client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    this.logger.log(`CheckCreate: ${result.result.hash}`);

    return result;
  }

  // CheckCash
  async cashCheck({
    secret,
    checkId,
    amount,
    currency,
    issuer,
    contractHash
  }: {
    secret: string,
    checkId: string,
    amount: string,
    currency: string,
    issuer: string,
    contractHash: string,
  }) {
    const wallet = Wallet.fromSeed(secret);

    const tx: any = {
      TransactionType: 'CheckCash',
      Account: wallet.classicAddress,
      CheckID: checkId,
      Amount:
        currency === 'RLUSD'
          ? this.getRlusdAmount(amount, issuer)
          : {
              currency,
              value: amount,
              issuer,
            },
    };
    this.addMemo(tx, contractHash);

    const prepared = await this.client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    this.logger.log(`CheckCash: ${result.result.hash}`);
    return result;
  }

  // Account Checks
  async findCheckIdFor({
    account,
    destination,
    amount,
    currency,
    issuer,
  }: {
    account: string,
    destination: string,
    amount: string,
    currency: string,
    issuer: string,
  }): Promise<string | null> {
    // https://xrpl.org/account_objects.html
    const objects = await this.client.request({
      command: "account_objects",
      account,
      type: "check"
    });

    const check = objects.result.account_objects.find(
      (c: any) =>
        c.Destination === destination &&
        (currency === 'RLUSD'
          ? c.SendMax.currency === AppService.RLUSD_HEX
          : c.SendMax.currency === currency) &&
        c.SendMax.issuer === issuer &&
        c.SendMax.value === amount
    );

    return check ? check.index : null;
  }
}
