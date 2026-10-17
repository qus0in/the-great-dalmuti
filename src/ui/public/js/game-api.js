// 방 하위 경로를 조합한다
function roomPath(code, suffix = '') {
  return `/api/rooms/${code}${suffix}`;
}

// GET 요청 후 응답 data만 반환한다
async function getData(http, url) {
  const res = await http.get(url);
  return res.data;
}

// POST 요청 후 응답 data만 반환한다
async function postData(http, url, body) {
  const res = await http.post(url, body);
  return res.data;
}

// 서버 게임 라우트(/api/rooms*, /api/stats)를 호출하는 브라우저 API 어댑터
export function createGameApi(http) {
  return {
    createRoom: () => postData(http, '/api/rooms'),
    joinRoom: (code) => postData(http, roomPath(code, '/join')),
    getRoom: (code) => getData(http, roomPath(code)),
    startGame: (code) => postData(http, roomPath(code, '/start')),
    playCards: (code, version, cards) =>
      postData(http, roomPath(code, '/plays'), { version, cards }),
    pass: (code, version) =>
      postData(http, roomPath(code, '/pass'), { version }),
    tribute: (code, version, returns) =>
      postData(http, roomPath(code, '/tribute'), { version, returns }),
    revolution: (code, version) =>
      postData(http, roomPath(code, '/revolution'), { version }),
    getStats: () => getData(http, '/api/stats'),
  };
}
