import axios from "axios";

export function createKimaiClient(
  apiUrl: string,
  apiKey: string,
  useProxy = false,
) {
  const base = apiUrl.replace(/\/$/, "");
  const inst = axios.create({
    baseURL: base,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  return {
    async getProjects() {
      const all: any[] = [];
      let page = 1;
      const size = 50;
      while (true) {
        const res = await inst.get(`/api/projects`, { params: { size, page } });
        const data = res.data as any[];
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < size) break;
        page++;
      }
      return all;
    },

    async getTags() {
      const res = await inst.get("/api/tags");
      return res.data;
    },

    async getActivities() {
      const res = await inst.get("/api/activities");
      return res.data;
    },
  };
}

export default createKimaiClient;
