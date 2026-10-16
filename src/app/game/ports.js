// app/game 저장소 및 부가 효과 포트 계약 (JSDoc)

/**
 * @typedef {Object} GameEntity
 * @property {string} id
 * @property {string} joinCode
 * @property {'waiting'|'playing'|'finished'} phase
 * @property {number} version
 * @property {number} hostSeat
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} SeatEntity
 * @property {string} gameId
 * @property {number} seat
 * @property {string|null} userId
 * @property {string|null} [userName]
 * @property {boolean} isBot
 * @property {number|null} [finishPosition]
 * @property {string|null} [leftAt]
 */

/**
 * @typedef {Object} PublicStateEntity
 * @property {string} gameId
 * @property {'waiting'|'playing'|'finished'} phase
 * @property {number} version
 * @property {number|null} currentTurnSeat
 * @property {Array<{ seat: number, userName: string, isBot: boolean, cardCount: number }>} seatSummary
 * @property {Object|null} lastPlay
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} GameAggregate
 * @property {GameEntity} game
 * @property {SeatEntity[]} seats
 * @property {PublicStateEntity} publicState
 */

/**
 * @typedef {Object} TrickEntity
 * @property {string} id
 * @property {string} gameId
 * @property {number} seq
 * @property {number} leaderSeat
 * @property {number} passes
 * @property {number|null} winnerSeat
 * @property {Array<{ turnNo: number, seat: number, action: 'play'|'pass', cards: any[] }>} plays
 */

/**
 * @typedef {Object} GameRepository
 * @property {(params: { game: GameEntity, seats: SeatEntity[], publicState: PublicStateEntity }) => Promise<void>} createGame
 * @property {(joinCode: string) => Promise<GameAggregate|null>} findGameByCode
 * @property {(gameId: string) => Promise<GameAggregate|null>} findGameById
 * @property {(gameId: string, seats: SeatEntity[]) => Promise<void>} saveSeats
 * @property {(gameId: string, hands: Record<number, any[]>) => Promise<void>} saveHands
 * @property {(gameId: string) => Promise<Record<number, any[]>|null>} findHands
 * @property {(gameId: string) => Promise<TrickEntity|null>} findCurrentTrick
 * @property {(gameId: string, trick: TrickEntity) => Promise<void>} saveTrick
 * @property {(params: { game: GameEntity, publicState: PublicStateEntity, expectedVersion: number }) => Promise<void>} saveGameAndPublic
 */

/**
 * @typedef {Object} ClockPort
 * @property {() => Date} now
 */

/**
 * @typedef {Object} RngPort
 * @property {() => number} random
 * @property {() => string} [generateJoinCode]
 */

export const PORTS_DOC = true;
