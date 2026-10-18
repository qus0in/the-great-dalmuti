export async function createRuntime(deps) {
  try {
    const mod = await import('./app/game/runtime-controller.js');
    return mod.createGameRuntime(deps);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') return undefined;
    throw error;
  }
}
