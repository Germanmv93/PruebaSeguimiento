import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const INDICATOR_FIELDS = [
  'customfield_10260', 'customfield_10261', 'customfield_10264',
  'customfield_10265', 'customfield_10266', 'customfield_10267',
  'customfield_10268', 'customfield_10269',
  'customfield_10270', 'customfield_10271', 'customfield_10272',
  'customfield_10273',
  'customfield_10274', 'customfield_10275', 'customfield_10276',
  'customfield_10277', 'customfield_10278',
  'customfield_10279', 'customfield_10281', 'customfield_10283',
  'customfield_10285', 'customfield_10287',
];

const PERCENT_FIELDS = [
  'customfield_10280', 'customfield_10282', 'customfield_10284',
  'customfield_10286', 'customfield_10288',
];

const DETAIL_FIELDS = [
  'customfield_10289', 'customfield_10290', 'customfield_10291',
  'customfield_10292', 'customfield_10293', 'customfield_10294',
  'customfield_10295', 'customfield_10296', 'customfield_10297',
  'customfield_10298', 'customfield_10299', 'customfield_10300',
  'customfield_10301', 'customfield_10302', 'customfield_10303',
  'customfield_10304', 'customfield_10305', 'customfield_10306',
  'customfield_10307', 'customfield_10308', 'customfield_10309',
  'customfield_10310',
];


const fetchAql = async (workspaceId, qlQuery) => {
  const r = await api.asApp().requestJira(
    route`/jsm/assets/workspace/${workspaceId}/v1/object/aql`,
    {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ qlQuery, startAt: 0, maxResults: 25 }),
    }
  );
  if (!r.ok) return [];
  const d = await r.json();
  return d.values || d.objectEntries || [];
};

resolver.define('getEspacios', async () => {
  try {
    // Paso 1: obtener workspaceId de Assets
    const wsResponse = await api.asApp().requestJira(
      route`/rest/servicedeskapi/assets/workspace`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!wsResponse.ok) {
      return { espacios: [], debug: `ws_status:${wsResponse.status}` };
    }

    const wsData = await wsResponse.json();
    const workspaceId = wsData.values?.[0]?.workspaceId;

    if (!workspaceId) {
      return { espacios: [], debug: `no_ws:${JSON.stringify(wsData).substring(0, 80)}` };
    }

    // Paso 2: tres queries con órdenes distintos para cubrir los 53 proyectos
    // ASC cubre A-M, DESC cubre Z-N, Key ASC cubre el hueco del medio
    const BASE = 'objectType = "Informacion de Proyecto"';
    const [asc, desc, byKeyAsc, byKeyDesc] = await Promise.all([
      fetchAql(workspaceId, `${BASE} ORDER BY Name ASC`),
      fetchAql(workspaceId, `${BASE} ORDER BY Name DESC`),
      fetchAql(workspaceId, `${BASE} ORDER BY Key ASC`),
      fetchAql(workspaceId, `${BASE} ORDER BY Key DESC`),
    ]);

    const allItems = [...asc, ...desc, ...byKeyAsc, ...byKeyDesc];

    // Deduplicar por objectKey
    const seen = new Set();
    const unique = allItems.filter(obj => {
      const key = obj.objectKey || obj.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

    return {
      espacios: unique.map(obj => ({
        key: obj.objectKey || obj.id,
        label: obj.label || obj.name,
      })),
    };
  } catch (e) {
    return { espacios: [], debug: `catch:${e.message}` };
  }
});

resolver.define('createIssue', async ({ payload }) => {
  const { formData } = payload;

  const fields = {
    project: { key: 'SDE' },
    issuetype: { id: '10063' },
    summary: formData.summary,
  };

  if (formData.espacioKey) {
    fields.customfield_10258 = [{ key: formData.espacioKey }];
  }

  if (formData.customfield_10259) {
    fields.customfield_10259 = formData.customfield_10259;
  }

  INDICATOR_FIELDS.forEach(f => {
    if (formData[f]) fields[f] = { value: formData[f] };
  });

  PERCENT_FIELDS.forEach(f => {
    if (formData[f] && formData[f] !== '') fields[f] = formData[f];
  });

  // Los campos de detalle son tipo Paragraph (ADF)
  const toAdf = (text) => ({
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  DETAIL_FIELDS.forEach(f => {
    if (formData[f] && formData[f] !== '') fields[f] = toAdf(formData[f]);
  });

  if (formData.description) {
    fields.description = {
      version: 1,
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: formData.description }],
      }],
    };
  }

  const response = await api.asApp().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear el issue: ${errorText}`);
  }

  const data = await response.json();
  return { issueKey: data.key, issueId: data.id };
});

export const handler = resolver.getDefinitions();
