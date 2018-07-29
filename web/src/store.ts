import { User } from "../../common/user";
import { Site } from "../../common/site";
import api, { setToken } from "./api";

export { User } from "../../common/user";
export { Site } from "../../common/site";
export { SiteEvent } from "../../common/siteEvent";

type State = {
  user?: User;
  token?: string;
  currentSite?: Site;
};

export class Store {
  readonly state: State;

  static load(): Store {
    const state = loadState();
    return new Store(state);
  }

  private constructor(state: State) {
    this.state = state;
  }

  setUser(params: { user: User; token: string }) {
    const { user, token } = params;
    this.state.user = user;
    this.state.token = token;
    setToken(token);
    saveState(this.state);
  }
}

function loadStateFromStorage(): State {
  const json = localStorage.getItem("state");
  if (json != null) {
    return JSON.parse(json);
  }
  return { user: undefined };
}

function loadState(): State {
  const state = loadStateFromStorage();
  setToken(state.token);
  updateState(state).catch(err => {
    console.log("updateState failed", err);
  });
  return state;
}

async function updateState(state: State) {
  if (state.user == null) {
    return;
  }
  state.user = await fetchCurrentUser();

  const site = state.currentSite || state.user.sites[0];
  if (site != null) {
    state.currentSite = await fetchSite(site.thingId);
  }

  saveState(state);
}

async function fetchCurrentUser(): Promise<User> {
  return await api("/users/me");
}

async function fetchSite(thingId: string): Promise<Site> {
  return await api(`/sites/${thingId}`);
}

function saveState(state: State) {
  localStorage.setItem("state", JSON.stringify(state));
}

export default Store.load();
