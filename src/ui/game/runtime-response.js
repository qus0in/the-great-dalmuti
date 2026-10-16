// 명령 성공 후 런타임 진행을 태워 최신 결과로 바꾼다 (미주입이면 그대로)
export function applyRuntime(runtime, code, result) {
  if (!runtime) return result;
  return runtime.afterAction(code, result);
}
