import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiErrorResponse, ERROR_CODES } from '@matabai/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';
    let errorCode: string = ERROR_CODES.INTERNAL_ERROR;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) || exception.message;
        error = (body.error as string) || exception.name;
        details = body.details as Record<string, unknown> | undefined;
      }

      switch (status) {
        case HttpStatus.UNAUTHORIZED:
          errorCode = ERROR_CODES.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = ERROR_CODES.FORBIDDEN;
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = ERROR_CODES.NOT_FOUND;
          break;
        case HttpStatus.BAD_REQUEST:
          errorCode = ERROR_CODES.VALIDATION_ERROR;
          break;
        case HttpStatus.CONFLICT:
          errorCode = ERROR_CODES.CONFLICT;
          break;
        default:
          errorCode = ERROR_CODES.INTERNAL_ERROR;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
    };

    response.status(status).json(errorPayload);
  }
}
