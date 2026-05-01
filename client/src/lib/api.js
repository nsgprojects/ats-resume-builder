import axios from 'axios';

// Default client — 90s for most calls
const api = axios.create({ baseURL: '/api', timeout: 90000 });

// Long-running client — 3 minutes for AI analysis calls (two sequential Claude calls)
const apiLong = axios.create({ baseURL: '/api', timeout: 180000 });

const interceptor = res => res.data;
const errHandler  = err => Promise.reject(new Error(err.response?.data?.error || err.message || 'Request failed'));

api.interceptors.response.use(interceptor, errHandler);
apiLong.interceptors.response.use(interceptor, errHandler);

export const resumeApi = {
  parse:     fd   => api.post('/resume/parse', fd, { headers:{ 'Content-Type':'multipart/form-data' } }),
  parseText: text => api.post('/resume/parse', { text })
};

export const jdApi = { parse: t => api.post('/jd/parse', { text: t }) };

// Analysis uses the long-timeout client — two sequential Sonnet calls can take 90-120s
export const analysisApi = {
  run:      p => apiLong.post('/analysis/run',      p),
  gaps:     p => apiLong.post('/analysis/gaps',     p),
  generate: p => apiLong.post('/analysis/generate', p),
};

export const gapsApi      = { run:   p => apiLong.post('/gaps/run',      p) };
export const integrateApi = { run:   p => api.post('/integrate/run',  p) };
export const healthApi    = { check: () => api.get('/health') };

export const exportApi = {
  docxFromBase64: async (base64) => {
    const res = await axios.post('/api/export/docx-from-base64', { base64 }, { responseType:'blob', timeout:60000 });
    _downloadBlob(res.data, 'optimized_resume.docx');
  },
  docxFromText: async (resumeText, insertedBullets) => {
    const res = await axios.post('/api/export/docx', { resumeText, insertedBullets }, { responseType:'blob', timeout:60000 });
    _downloadBlob(res.data, 'optimized_resume.docx');
  }
};

function _downloadBlob(data, filename) {
  const url = URL.createObjectURL(new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
