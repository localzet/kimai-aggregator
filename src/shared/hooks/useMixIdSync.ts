import { useMixIdSync as useLibraryMixIdSync } from "@localzet/data-connector/hooks";
import { Settings, useSettings } from "./useSettings";
import { db } from "@/shared/api/db";

export function useMixIdSync() {
  const { settings, updateSettings } = useSettings();

  const {
    performSync,
    uploadSettings: uploadSettingsLib,
    uploadData: uploadDataLib,
  } = useLibraryMixIdSync({
    dataTypes: ["timesheets", "projects", "activities"],
    getLocalSettings: () => settings,
    getLocalData: async (dataType: string) => {
      if (dataType === "timesheets") {
        const timesheets = await db.getTimesheets();
        const data: Record<string, any> = {};
        timesheets.forEach((ts) => {
          data[ts.id.toString()] = {
            ...ts,
            updatedAt: new Date().toISOString(),
          };
        });
        return data;
      } else if (dataType === "projects") {
        const projects = await db.getProjects();
        const data: Record<string, any> = {};
        projects.forEach((p) => {
          data[p.id.toString()] = { ...p, updatedAt: new Date().toISOString() };
        });
        return data;
      } else if (dataType === "activities") {
        const activities = await db.getActivities();
        const data: Record<string, any> = {};
        activities.forEach((a) => {
          data[a.id.toString()] = { ...a, updatedAt: new Date().toISOString() };
        });
        return data;
      }
      return {};
    },
    saveLocalSettings: (newSettings: Settings) => {
      updateSettings(newSettings);
    },
    saveLocalData: async (dataType: string, data: Record<string, any>) => {
      if (dataType === "timesheets") {
        const local = await db.getTimesheets();
        const localMap = new Map(local.map((t) => [t.id.toString(), t]));
        const remoteMap = new Map(Object.entries(data));

        const merged: any[] = [];
        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

        for (const id of allIds) {
          const localItem = localMap.get(id);
          const remoteItem = remoteMap.get(id) as any;

          if (
            remoteItem &&
            (!localItem ||
              (remoteItem.updatedAt &&
                (!(localItem as any).updatedAt ||
                  new Date(remoteItem.updatedAt) >
                    new Date((localItem as any).updatedAt || 0))))
          ) {
            merged.push(remoteItem);
          } else if (localItem) {
            merged.push(localItem);
          }
        }

        await db.saveTimesheets(merged);
      } else if (dataType === "projects") {
        const local = await db.getProjects();
        const localMap = new Map(local.map((p) => [p.id.toString(), p]));
        const remoteMap = new Map(Object.entries(data));

        const merged: any[] = [];
        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

        for (const id of allIds) {
          const localItem = localMap.get(id);
          const remoteItem = remoteMap.get(id) as any;

          if (
            remoteItem &&
            (!localItem ||
              (remoteItem.updatedAt &&
                (!(localItem as any).updatedAt ||
                  new Date(remoteItem.updatedAt) >
                    new Date((localItem as any).updatedAt || 0))))
          ) {
            merged.push(remoteItem);
          } else if (localItem) {
            merged.push(localItem);
          }
        }

        await db.saveProjects(merged);
      } else if (dataType === "activities") {
        const local = await db.getActivities();
        const localMap = new Map(local.map((a) => [a.id.toString(), a]));
        const remoteMap = new Map(Object.entries(data));

        const merged: any[] = [];
        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

        for (const id of allIds) {
          const localItem = localMap.get(id);
          const remoteItem = remoteMap.get(id) as any;

          if (
            remoteItem &&
            (!localItem ||
              (remoteItem.updatedAt &&
                (!(localItem as any).updatedAt ||
                  new Date(remoteItem.updatedAt) >
                    new Date((localItem as any).updatedAt || 0))))
          ) {
            merged.push(remoteItem);
          } else if (localItem) {
            merged.push(localItem);
          }
        }

        await db.saveActivities(merged);
      }
    },
    onSettingsUpdate: (newSettings: Settings) => {
      updateSettings(newSettings);
    },
    onDataUpdate: (dataType: string, data: Record<string, any>) => {
      // Data is already saved in saveLocalData
      console.log(`Data updated: ${dataType}`, data);
    },
    mergeStrategy: "newer-wins",
  });

  const uploadSettings = async (settingsToUpload: Settings) => {
    await uploadSettingsLib(settingsToUpload);
  };

  const uploadData = async (dataType: string, data: Record<string, any>) => {
    await uploadDataLib(dataType, data);
  };

  return { performSync, uploadSettings, uploadData };
}
