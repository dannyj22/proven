window.CONFIG = {
  appName: 'Practice Desk',
  apiBase: '/api',
  timeoutMs: 60000,
  /* Return a bearer token if you use token sign-in. Cookie sign-in works without this. */
  getToken: () => null,
  /* The "agent" field on each message must match one of these keys. */
  agents: {
    mentor:   { name: 'Mentor',            role: 'Plans your next step',          color: '#63e2b0' },
    reader:   { name: 'Curriculum reader', role: 'Finds skills in lessons',       color: '#7ccbff' },
    client:   { name: 'Client',            role: 'Brings realistic problems',     color: '#ffc266' },
    reviewer: { name: 'Reviewer',          role: 'Checks work and asks why',      color: '#ff8f9c' },
    scout:    { name: 'Scout',             role: 'Suggests where to learn',       color: '#b9a2ff' }
  }
};
