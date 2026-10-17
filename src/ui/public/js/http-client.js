// 응답 객체와 Problem Details 본문을 분리한다
function problemData(err) {
  const response = err ? err.response : undefined;
  return { response, data: (response && response.data) || {} };
}

function resolveStatus(data, response) {
  return data.status ?? (response && response.status) ?? 500;
}

function resolveCode(data, err) {
  return data.code ?? (err && err.code) ?? 'UNKNOWN_ERROR';
}

function resolveDetail(data, err, title) {
  return data.detail ?? (err && err.message) ?? title;
}

// 응답 오류를 status·code·title이 담긴 Error 객체로 정규화한다
export function toProblemError(err) {
  const { response, data } = problemData(err);
  const title = data.title ?? 'Error';
  const detail = resolveDetail(data, err, title);
  const normalized = new Error(detail);
  normalized.status = resolveStatus(data, response);
  normalized.code = resolveCode(data, err);
  normalized.title = title;
  normalized.detail = detail;
  return normalized;
}

// 매 요청마다 getToken() 결과를 읽어 Authorization: Bearer 헤더를 합친다
async function buildConfig(config, getToken) {
  const token = typeof getToken === 'function' ? await getToken() : null;
  const headers = { ...(config && config.headers) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { ...config, headers };
}

// 주입받은 axios로 baseURL '/' 인스턴스를 만들고 인증·오류 정규화를 연결한다
export function createHttpClient({ axios, getToken }) {
  const client = axios.create({ baseURL: '/' });

  async function run(action) {
    try {
      return await action();
    } catch (err) {
      throw toProblemError(err);
    }
  }

  return {
    get: (url, config) =>
      run(async () => client.get(url, await buildConfig(config, getToken))),
    post: (url, body, config) =>
      run(async () =>
        client.post(url, body, await buildConfig(config, getToken)),
      ),
  };
}
