import {
  Controller,
  Post,
  Body,
  Query,
  Headers,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { VoiceIvrService } from './voice-ivr.service';
import { VoiceAiReceptionistService } from './voice-ai-receptionist.service';
import { VoiceHandoverService } from './voice-handover.service';
import { VoiceCallSessionService } from './voice-call-session.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { CallStatus } from '@matabai/shared';

@Controller('webhooks/voice')
export class VoiceWebhookController {
  private readonly logger = new Logger(VoiceWebhookController.name);

  constructor(
    private readonly ivrService: VoiceIvrService,
    private readonly aiReceptionistService: VoiceAiReceptionistService,
    private readonly handoverService: VoiceHandoverService,
    private readonly sessionService: VoiceCallSessionService,
    private readonly twilioAdapter: TwilioVoiceAdapter
  ) {}

  /**
   * Root incoming call webhook from Twilio telephony carrier
   */
  @Post('incoming')
  async handleIncomingCall(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    this.logger.log(`Inbound voice call received from ${body.From || 'Unknown'}`);

    const isValid = this.twilioAdapter.verifyWebhookSignature({
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      params: body,
      signatureHeader: signature,
    });

    if (!isValid) {
      this.logger.warn('Incoming call rejected: Invalid Twilio signature');
    }

    const twiml = await this.ivrService.handleInboundCall({
      CallSid: body.CallSid,
      From: body.From,
      To: body.To,
    });

    res.status(HttpStatus.OK).type('text/xml').send(twiml);
  }

  /**
   * Handles user speech or DTMF responses collected from Twilio <Gather>
   */
  @Post('gather')
  async handleGather(
    @Body() body: any,
    @Query('step') step: string,
    @Query('callSid') queryCallSid: string,
    @Res() res: Response
  ) {
    const effectiveCallSid = body.CallSid || queryCallSid;

    let twiml: string;

    if (step === 'language') {
      twiml = await this.ivrService.handleLanguageSelection({
        CallSid: effectiveCallSid,
        Digits: body.Digits,
        SpeechResult: body.SpeechResult,
      });
    } else {
      twiml = await this.aiReceptionistService.processVoiceDialogue({
        CallSid: effectiveCallSid,
        SpeechResult: body.SpeechResult,
        Digits: body.Digits,
      });
    }

    res.status(HttpStatus.OK).type('text/xml').send(twiml);
  }

  /**
   * Status callback after dial transfer completes or fails
   */
  @Post('transfer-status')
  async handleTransferStatus(
    @Body() body: any,
    @Query('handoverId') handoverId: string,
    @Res() res: Response
  ) {
    const twiml = await this.handoverService.handleTransferStatus({
      handoverId,
      DialCallStatus: body.DialCallStatus,
      CallDuration: body.DialCallDuration ? parseInt(body.DialCallDuration, 10) : undefined,
    });

    res.status(HttpStatus.OK).type('text/xml').send(twiml);
  }

  /**
   * Final call termination status callback from telephony carrier
   */
  @Post('status')
  async handleCallStatus(@Body() body: any, @Res() res: Response) {
    if (body.CallSid) {
      let status = CallStatus.COMPLETED;
      if (body.CallStatus === 'busy') status = CallStatus.BUSY;
      else if (body.CallStatus === 'no-answer') status = CallStatus.NO_ANSWER;
      else if (body.CallStatus === 'failed') status = CallStatus.FAILED;
      else if (body.CallStatus === 'canceled') status = CallStatus.CANCELLED;

      const duration = body.CallDuration ? parseInt(body.CallDuration, 10) : undefined;
      await this.sessionService.endSession(body.CallSid, status, duration, body.RecordingUrl);
    }

    res.status(HttpStatus.OK).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
  }
}
