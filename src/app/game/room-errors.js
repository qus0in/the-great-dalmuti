// app/game 유스케이스 에러 정의 (status-rules 매핑 규격)

export class NotFoundError extends Error {
  constructor(message = 'Room not found', code = 'ROOM_NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Room conflict', code = 'CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}
