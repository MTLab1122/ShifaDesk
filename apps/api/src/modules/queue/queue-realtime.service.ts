import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface QueueRealtimeEvent {
  eventType:
    | 'TOKEN_CREATED'
    | 'TOKEN_CALLED'
    | 'PATIENT_SERVING'
    | 'CONSULTATION_COMPLETED'
    | 'TOKEN_SKIPPED'
    | 'TOKEN_RESTORED'
    | 'TOKEN_CANCELLED'
    | 'QUEUE_PAUSED'
    | 'QUEUE_RESUMED'
    | 'QUEUE_CLOSED'
    | 'QUEUE_POSITION_CHANGED';
  clinicId: string;
  sessionId: string;
  tokenId?: string;
  tokenDisplay?: string;
  queuePosition?: number;
  timestamp: string;
}

@Injectable()
export class QueueRealtimeService {
  private readonly logger = new Logger(QueueRealtimeService.name);
  private readonly eventSubject = new Subject<QueueRealtimeEvent>();

  /**
   * Broadcast a queue event to authorized subscribers
   */
  emit(event: Omit<QueueRealtimeEvent, 'timestamp'>): void {
    const fullEvent: QueueRealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.logger.debug(
      `QueueEvent [${fullEvent.eventType}] for session ${fullEvent.sessionId} token ${fullEvent.tokenDisplay || 'N/A'}`,
    );
    this.eventSubject.next(fullEvent);
  }

  /**
   * Subscribe to events for a specific queue session
   */
  subscribeSession(sessionId: string): Observable<QueueRealtimeEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((e) => e.sessionId === sessionId),
      map((e) => ({
        ...e,
        // Ensure privacy: strip any raw internal data from broadcast
      })),
    );
  }

  /**
   * Subscribe to events for a clinic
   */
  subscribeClinic(clinicId: string): Observable<QueueRealtimeEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((e) => e.clinicId === clinicId),
    );
  }
}

