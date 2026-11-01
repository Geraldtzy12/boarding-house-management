import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Room } from '../models/room';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/rooms';

  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(this.baseUrl);
  }

  create(room: Omit<Room, 'id'>): Observable<Room> {
    return this.http.post<Room>(this.baseUrl, room);
  }

  update(room: Room): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${room.id}`, room);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}