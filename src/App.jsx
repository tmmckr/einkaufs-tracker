import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

function App() {
  const [entries, setEntries] = useState([]);
  
  // Formular States
  const [store, setStore] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPaidByTimo, setIsPaidByTimo] = useState(false);
  const [isCredit, setIsCredit] = useState(false); // NEU: Ist es ein Gutschein?

  const [selectedIds, setSelectedIds] = useState([]);

  // 1. DATEN LADEN
  useEffect(() => {
    const q = query(collection(db, "shoppingEntries"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(loadedEntries);
    });
    return () => unsubscribe();
  }, []);

  // 2. NEUEN EINTRAG ERSTELLEN
  const addEntry = async (e) => {
    e.preventDefault();
    if (!store || !amount || !date) return;

    // Logik: Wenn "Gutschrift" angehakt ist, machen wir ein Minus davor
    let finalAmount = parseFloat(amount.replace(',', '.'));
    if (isCredit) {
      finalAmount = -Math.abs(finalAmount); // Erzwingt negativen Wert
    } else {
      finalAmount = Math.abs(finalAmount); // Erzwingt positiven Wert
    }

    await addDoc(collection(db, "shoppingEntries"), {
      store: store,
      amount: finalAmount,
      date: date,
      isPaidByTimo: isPaidByTimo 
    });

    setStore('');
    setAmount('');
    setIsPaidByTimo(false);
    setIsCredit(false); // Reset
  };

  const deleteEntry = async (id) => {
    await deleteDoc(doc(db, "shoppingEntries", id));
    setSelectedIds(selectedIds.filter(itemId => itemId !== id));
  };

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const markSelectedAsPaid = async () => {
    const deletePromises = selectedIds.map(id => deleteDoc(doc(db, "shoppingEntries", id)));
    await Promise.all(deletePromises);
    setSelectedIds([]);
  };

  // --- BERECHNUNGEN ---
  const selectedTotal = entries
    .filter(entry => selectedIds.includes(entry.id))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const groupedEntries = entries.reduce((groups, entry) => {
    let groupKey = "";
    if (entry.isPaidByTimo) {
      groupKey = "💸 Bereits von Timo bezahlt";
    } else {
      const entryDate = new Date(entry.date);
      groupKey = entryDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    }
    
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(entry);
    return groups;
  }, {});

  const sortedGroupKeys = Object.keys(groupedEntries).sort((a, b) => {
    if (a.includes("Bereits von Timo")) return -1;
    if (b.includes("Bereits von Timo")) return 1;
    return 0; 
  });

  const formatMoney = (val) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="container">
      <h1>🔥 Einkaufs-Tracker</h1>
      
      {/* FORMULAR */}
      <div className="card add-form">
        <h2>Neuer Eintrag / Gutschein</h2>
        <form onSubmit={addEntry} className="form-grid">
          <div className="form-row">
            <input 
              type="text" 
              placeholder={isCredit ? "Grund (z.B. Eltern Gutschein)" : "Laden"}
              value={store}
              onChange={(e) => setStore(e.target.value)}
              required
            />
            <input 
              type="number" 
              step="0.01" 
              placeholder="Betrag" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* CHECKBOXEN */}
          <div className="form-row checkboxes-row">
             <label className={`checkbox-label ${isCredit ? 'active-credit' : ''}`}>
              <input 
                type="checkbox" 
                checked={isCredit}
                onChange={(e) => {
                  setIsCredit(e.target.checked);
                  if(e.target.checked) setIsPaidByTimo(false); // Nicht beides gleichzeitig
                }}
              />
              🎁 Ist Gutschrift
            </label>

            <label className="checkbox-label" style={{opacity: isCredit ? 0.5 : 1}}>
              <input 
                type="checkbox" 
                checked={isPaidByTimo}
                disabled={isCredit}
                onChange={(e) => setIsPaidByTimo(e.target.checked)}
              />
              Habe ich ausgelegt
            </label>
          </div>

          <button type="submit" className={isCredit ? 'btn-credit' : ''}>
            {isCredit ? 'Gutschrift speichern' : 'Hinzufügen'}
          </button>
        </form>
      </div>

      {/* INFO BOX */}
      <div className="card sticky-summary">
        <h3>Abrechnung für Mama</h3>
        <p>Ausgewählt: <strong>{selectedIds.length}</strong> Posten</p>
        <p className={`big-price ${selectedTotal < 0 ? 'is-credit' : ''}`}>
            {formatMoney(selectedTotal)}
        </p>
        {selectedIds.length > 0 && (
            <button onClick={markSelectedAsPaid} className="pay-btn">
              Als "Erledigt" markieren
            </button>
        )}
      </div>

      {/* LISTE */}
      <div className="entries-list">
        {sortedGroupKeys.map(groupName => {
            const monthTotal = groupedEntries[groupName].reduce((sum, e) => sum + e.amount, 0);
            const isTimoGroup = groupName.includes("Bereits von Timo");

            return (
              <div key={groupName} className={`month-group ${isTimoGroup ? 'special-group' : ''}`}>
                <div className="month-header">
                    <h3>{groupName}</h3>
                    <span>Bilanz: {formatMoney(monthTotal)}</span>
                </div>
                
                {groupedEntries[groupName].map(entry => (
                  <div 
                    key={entry.id} 
                    className={`entry-item ${selectedIds.includes(entry.id) ? 'selected' : ''} ${entry.amount < 0 ? 'credit-item' : ''}`}
                    onClick={() => toggleSelection(entry.id)}
                  >
                    <input type="checkbox" checked={selectedIds.includes(entry.id)} readOnly />
                    <div className="entry-info">
                        <span className="store">{entry.store}</span>
                        <span className="date">
                          {new Date(entry.date).toLocaleDateString()} 
                          {entry.isPaidByTimo && <span className="badge">Ausgelegt</span>}
                          {entry.amount < 0 && <span className="badge green">Gutschrift</span>}
                        </span>
                    </div>
                    <span className={`amount ${entry.amount < 0 ? 'green-text' : ''}`}>
                        {formatMoney(entry.amount)}
                    </span>
                    <button 
                        className="delete-btn"
                        onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                    >🗑️</button>
                  </div>
                ))}
              </div>
            );
        })}
      </div>
    </div>
  );
}

export default App;