/* Every backend call lives here. See API.md for request and response shapes. */
(() => {
  const C = window.CONFIG;
  async function request(method, path, body, asBlob) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), C.timeoutMs);
    const headers = {};
    const token = C.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const isForm = body instanceof FormData;
    if (body && !isForm) headers['Content-Type'] = 'application/json';
    try {
      const res = await fetch(C.apiBase + path, { method, headers, credentials: 'include', signal: ctrl.signal,
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
      const type = res.headers.get('content-type') || '';
      if (!res.ok) {
        const info = type.includes('json') ? await res.json().catch(() => ({})) : {};
        throw new Error(info.message || (res.status === 401 ? 'Please sign in to continue.' : `The request failed (${res.status}). Try again.`));
      }
      if (asBlob) return res;
      if (res.status === 204) return {};
      if (!type.includes('json')) throw new Error('The service is not connected. Check apiBase in config.js.');
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The request took too long. Try again.');
      if (e instanceof TypeError) throw new Error('The service could not be reached. Check your connection and try again.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  const id = encodeURIComponent;
  window.API = {
    session:      ()          => request('GET', '/session'),
    options:      ()          => request('GET', '/options'),
    assessment:   ()          => request('GET', '/assessment'),
    onboard:      data        => request('POST', '/onboarding', data),
    messages:     ()          => request('GET', '/messages'),
    send:         data        => request('POST', '/messages', data),
    topics:       ()          => request('GET', '/topics'),
    addTopic:     notes       => request('POST', '/topics', { notes }),
    startTask:    topicId     => request('POST', `/topics/${id(topicId)}/task`),
    task:         taskId      => request('GET', `/tasks/${id(taskId)}`),
    saveWork:     (t, work)   => request('PUT', `/tasks/${id(t)}/work`, { work }),
    checkWork:    (t, work)   => request('POST', `/tasks/${id(t)}/check`, { work }),
    hint:         t           => request('POST', `/tasks/${id(t)}/hint`),
    explain:      (t, text)   => request('POST', `/tasks/${id(t)}/explanation`, { text }),
    courses:      ()          => request('GET', '/courses'),
    quiz:         courseId    => request('GET', `/courses/${id(courseId)}/quiz`),
    proof:        (c, form)   => request('POST', `/courses/${id(c)}/proof`, form),
    path:         ()          => request('GET', '/path'),
    portfolio:    ()          => request('GET', '/portfolio'),
    exportFolio:  ()          => request('GET', '/portfolio/export', null, true),
    memory:       ()          => request('GET', '/memory'),
    pauseMemory:  paused      => request('PATCH', '/memory', { paused }),
    forget:       memoryId    => request('DELETE', `/memory/${id(memoryId)}`),
    forgetAll:    ()          => request('DELETE', '/memory')
  };
})();
