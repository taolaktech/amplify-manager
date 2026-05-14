import { Global, Injectable, Module } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface AssetStatusEvent {
  assetId: string;
  userId: string;
  status: 'completed' | 'failed';
}

@Injectable()
export class AssetEventsService {
  private readonly subject = new Subject<AssetStatusEvent>();

  emit(event: AssetStatusEvent) {
    this.subject.next(event);
  }

  subscribe(userId: string): Observable<AssetStatusEvent> {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.userId === userId));
  }
}
