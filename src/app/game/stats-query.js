// 내 전적: 계정×모드 집계만 반환
// (집계는 저장소 뷰가 계산, 자기 행만 읽기 — ADR-0004 확정 7·8)
export function getMyStats({ gameRepository }, { user }) {
  return gameRepository.findStatsByUser(user.id);
}
