export function substitutionText({
  lastSubstitution,
  mySeat = 0,
  publicState,
} = {}) {
  if (!lastSubstitution) return '';
  const { seat, action } = lastSubstitution;
  if (seat === mySeat) {
    return action === 'pass'
      ? '시간이 지나 대신 패스했어요'
      : '시간이 지나 대신 냈어요';
  }
  const player = publicState?.seatSummary?.find((item) => item.seat === seat);
  const name = player?.userName || `좌석 ${seat}`;
  return `${name} 차례가 시간이 지나 대신 진행됐어요`;
}

export function renderSubstitution(doc, view = {}) {
  const region = doc.querySelector('[data-play="substitution"]');
  if (!region) return;
  const text = substitutionText(view);
  region.textContent = text;
  region.hidden = !text;
}
