import type { DB } from "../store";
import { Backend, StoreApi } from "./types";

const DB_KEY = "dndtime:db";
const CHANNEL = "dndtime";

const EMPTY: DB = {
  campaigns: {},
  members: {},
  rounds: {},
  availability: {},
  sessions: {},
};

/**
 * Local-first backend: the whole snapshot lives in localStorage and changes
 * broadcast across tabs via BroadcastChannel (+ a storage-event fallback) so a
 * second tab updates in "realtime". Zero setup, no network.
 */
export class LocalBackend implements Backend {
  private api!: StoreApi;
  private channel: BroadcastChannel | null = null;

  init(api: StoreApi) {
    this.api = api;
  }

  start() {
    if (typeof window === "undefined") return;
    this.api.setSnapshot(this.read());
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = () => this.api.setSnapshot(this.read());
    }
    window.addEventListener("storage", (e) => {
      if (e.key === DB_KEY) this.api.setSnapshot(this.read());
    });
  }

  private read(): DB {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? { ...EMPTY, ...(JSON.parse(raw) as DB) } : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  private flush() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.api.getSnapshot()));
      this.channel?.postMessage("changed");
    } catch {
      // private mode etc. — keep working in-memory.
    }
  }

  // For the local backend every mutation just persists the whole snapshot.
  async ensureCampaign() {}
  async ensureMyCampaigns() {}
  async persistCreateCampaign() {
    this.flush();
  }
  async persistJoinMember() {
    this.flush();
  }
  async persistSetAvailability() {
    this.flush();
  }
  async persistConfirmSession() {
    this.flush();
  }

  reset() {
    try {
      localStorage.removeItem(DB_KEY);
    } catch {
      /* ignore */
    }
    this.channel?.postMessage("changed");
  }
}
