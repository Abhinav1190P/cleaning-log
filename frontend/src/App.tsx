import { useState } from "react";
import { Equipment } from "./types";
import { EquipmentList } from "./components/EquipmentList";
import { CleaningRecordsPanel } from "./components/CleaningRecordsPanel";

const CURRENT_USER_KEY = "cleaning-log:current-user";

export default function App() {
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem(CURRENT_USER_KEY) ?? "jane.doe"
  );

  function handleUserChange(value: string) {
    setCurrentUser(value);
    localStorage.setItem(CURRENT_USER_KEY, value);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Equipment Cleaning Log</h1>
        <label className="current-user">
          Acting as
          <input value={currentUser} onChange={(e) => handleUserChange(e.target.value)} />
        </label>
      </header>

      <main className="app-body">
        <EquipmentList selectedId={selected?.id ?? null} onSelect={setSelected} />
        {selected ? (
          <CleaningRecordsPanel equipment={selected} currentUser={currentUser} />
        ) : (
          <div className="panel">
            <p className="muted">Select a piece of equipment to see its cleaning records.</p>
          </div>
        )}
      </main>
    </div>
  );
}
