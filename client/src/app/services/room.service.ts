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

  // Upload a photo for a room (multipart, field name "file").
  // Returns the saved path, e.g. { imageUrl: '/uploads/rooms/3_ab12cd34.webp' }.
  uploadImage(id: number, file: File): Observable<{ imageUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.baseUrl}/${id}/image`, form);
  }

  // Remove the uploaded photo; the room goes back to its automatic type photo.
  removeImage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/image`);
  }
}
