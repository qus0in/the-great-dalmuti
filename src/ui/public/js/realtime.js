// game_public 행 변경을 구독하고 해제 함수를 반환한다
export function subscribeGame(client, gameId, onChange) {
  const channel = client
    .channel(`game-public:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_public',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => client.removeChannel(channel);
}
