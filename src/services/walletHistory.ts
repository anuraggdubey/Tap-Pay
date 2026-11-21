import {setHistoryScope} from './history';
import {loadHistoryJson, saveHistoryJson} from './secureHistoryStore';

export function setHistoryWallet(address: string | null): void {
  const owner = address?.toLowerCase();
  void setHistoryScope(owner ?? null, {
    load: () => owner ? loadHistoryJson(owner) : Promise.resolve(null),
    save: json => owner ? saveHistoryJson(json, owner) : Promise.resolve(),
  });
}
