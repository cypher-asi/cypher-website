/** A bounded request without swallowing cancellation or retrying writes. */
export function requestDeadline(signal?: AbortSignal, milliseconds = 12_000) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, {once: true});
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, milliseconds);
  return {signal: controller.signal, didTimeout: () => timedOut,
    dispose() { clearTimeout(timer); signal?.removeEventListener('abort', abort); }};
}
